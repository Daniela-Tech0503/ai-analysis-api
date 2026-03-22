export type ChatRole = "user" | "assistant" | "system";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
};

export type ChatThread = {
  id: string;
  title: string;
  updatedAt: string;
  messageCount: number;
};

export type ChatResponse = {
  thread: ChatThread;
  messages: ChatMessage[];
  analysisContext: string | null;
  storage: "kv" | "memory";
};
