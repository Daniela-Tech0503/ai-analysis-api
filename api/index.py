import json
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

try:
    from upstash_redis import Redis
except ImportError:
    Redis = None


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


class Settings(BaseSettings):
    deepseek_api_key: str | None = None
    deepseek_model: str = "deepseek-chat"
    deepseek_api_base: str = "https://api.deepseek.com"
    ai_analysis_api_url: str | None = None
    ai_analysis_api_key: str | None = None
    ai_analysis_api_auth_header: str = "Authorization"
    kv_rest_api_url: str | None = None
    kv_rest_api_token: str | None = None

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()

app = FastAPI(title="Level Wellness AI API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MEMORY_STORE: dict[str, Any] = {
    "threads": [],
    "messages": {},
}


class ChatMessage(BaseModel):
    id: str
    role: str
    content: str
    createdAt: str


class ChatThread(BaseModel):
    id: str
    title: str
    updatedAt: str
    messageCount: int = 0


class ChatRequest(BaseModel):
    thread_id: str = Field(alias="thread_id")
    message: str


def get_redis() -> Any | None:
    if not Redis or not settings.kv_rest_api_url or not settings.kv_rest_api_token:
        return None
    return Redis(url=settings.kv_rest_api_url, token=settings.kv_rest_api_token)


def list_key() -> str:
    return "levelwellness:threads"


def thread_key(thread_id: str) -> str:
    return f"levelwellness:thread:{thread_id}"


def load_threads(storage: Any | None) -> list[dict[str, Any]]:
    if storage:
        raw = storage.get(list_key())
        return json.loads(raw) if raw else []
    return MEMORY_STORE["threads"]


def save_threads(storage: Any | None, threads: list[dict[str, Any]]) -> None:
    if storage:
        storage.set(list_key(), json.dumps(threads))
        return
    MEMORY_STORE["threads"] = threads


def load_messages(storage: Any | None, thread_id: str) -> list[dict[str, Any]]:
    if storage:
        raw = storage.get(thread_key(thread_id))
        return json.loads(raw) if raw else []
    return MEMORY_STORE["messages"].get(thread_id, [])


def save_messages(storage: Any | None, thread_id: str, messages: list[dict[str, Any]]) -> None:
    if storage:
        storage.set(thread_key(thread_id), json.dumps(messages))
        return
    MEMORY_STORE["messages"][thread_id] = messages


async def fetch_analysis_context(user_message: str) -> str | None:
    if not settings.ai_analysis_api_url:
        return None

    headers = {"Content-Type": "application/json"}
    if settings.ai_analysis_api_key:
        headers[settings.ai_analysis_api_auth_header] = f"Bearer {settings.ai_analysis_api_key}"

    payload = {
        "query": user_message,
        "focus": ["cost", "performance", "radix-ui", "shadcn"],
    }

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(settings.ai_analysis_api_url, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()

    if isinstance(data, dict):
        if "summary" in data and isinstance(data["summary"], str):
            return data["summary"]
        return json.dumps(data, ensure_ascii=True)
    return str(data)


async def call_deepseek(messages: list[dict[str, str]]) -> str:
    if not settings.deepseek_api_key:
        raise HTTPException(status_code=503, detail="DEEPSEEK_API_KEY is not configured.")

    url = f"{settings.deepseek_api_base.rstrip('/')}/chat/completions"
    payload = {
        "model": settings.deepseek_model,
        "messages": messages,
        "temperature": 0.3,
    }
    headers = {
        "Authorization": f"Bearer {settings.deepseek_api_key}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=45.0) as client:
        response = await client.post(url, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()

    try:
        return data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as error:
        raise HTTPException(status_code=502, detail=f"Unexpected DeepSeek response: {error}") from error


def build_system_prompt(analysis_context: str | None) -> str:
    base_prompt = (
        "You are the Level Wellness product AI assistant. "
        "Answer in a concise, practical style. "
        "Focus on LLM cost, performance, deployment trade-offs, Radix UI, shadcn/ui, Vercel, and FastAPI. "
        "When relevant, explain assumptions and separate facts from estimates."
    )
    if not analysis_context:
        return base_prompt
    return f"{base_prompt}\n\nExternal analysis context:\n{analysis_context}"


def make_thread_title(message: str) -> str:
    compact = " ".join(message.strip().split())
    return compact[:60] + ("..." if len(compact) > 60 else "")


@app.get("/")
def root() -> dict[str, str]:
    return {"status": "ok", "service": "levelwellness-ai-api"}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "healthy"}


@app.get("/threads")
def get_threads() -> dict[str, list[ChatThread]]:
    storage = get_redis()
    threads = sorted(load_threads(storage), key=lambda item: item["updatedAt"], reverse=True)
    return {"threads": [ChatThread(**item) for item in threads]}


@app.get("/threads/{thread_id}")
def get_thread(thread_id: str) -> dict[str, list[ChatMessage]]:
    storage = get_redis()
    messages = load_messages(storage, thread_id)
    return {"messages": [ChatMessage(**item) for item in messages]}


@app.post("/chat")
async def chat(request: ChatRequest) -> dict[str, Any]:
    storage = get_redis()
    storage_mode = "kv" if storage else "memory"
    now = utc_now()

    threads = load_threads(storage)
    messages = load_messages(storage, request.thread_id)

    user_message = ChatMessage(
        id=str(uuid4()),
        role="user",
        content=request.message.strip(),
        createdAt=now,
    )
    messages.append(user_message.model_dump())

    analysis_context = await fetch_analysis_context(request.message.strip())
    llm_messages = [{"role": "system", "content": build_system_prompt(analysis_context)}]
    llm_messages.extend({"role": item["role"], "content": item["content"]} for item in messages[-12:])
    assistant_text = await call_deepseek(llm_messages)

    assistant_message = ChatMessage(
        id=str(uuid4()),
        role="assistant",
        content=assistant_text,
        createdAt=utc_now(),
    )
    messages.append(assistant_message.model_dump())
    save_messages(storage, request.thread_id, messages)

    thread = next((item for item in threads if item["id"] == request.thread_id), None)
    if not thread:
        thread = {
            "id": request.thread_id,
            "title": make_thread_title(request.message),
            "updatedAt": assistant_message.createdAt,
            "messageCount": len(messages),
        }
        threads.append(thread)
    else:
        thread["updatedAt"] = assistant_message.createdAt
        thread["messageCount"] = len(messages)
        if thread.get("title", "New chat") == "New chat":
            thread["title"] = make_thread_title(request.message)

    save_threads(storage, threads)

    return {
        "thread": ChatThread(**thread).model_dump(),
        "messages": messages,
        "analysisContext": analysis_context,
        "storage": storage_mode,
    }


handler = app
