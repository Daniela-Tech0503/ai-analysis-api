import { redis } from './redis';
import { ChatMessage, ChatThread } from './types';

const MEMORY_STORE = {
  threads: [] as ChatThread[],
  messages: {} as Record<string, ChatMessage[]>,
};

export async function loadThreads(): Promise<ChatThread[]> {
  if (redis) {
    const raw = await redis.get<ChatThread[]>('levelwellness:threads');
    return raw || [];
  }
  return MEMORY_STORE.threads;
}

export async function saveThreads(threads: ChatThread[]): Promise<void> {
  if (redis) {
    await redis.set('levelwellness:threads', threads);
    return;
  }
  MEMORY_STORE.threads = threads;
}

export async function loadMessages(threadId: string): Promise<ChatMessage[]> {
  if (redis) {
    const raw = await redis.get<ChatMessage[]>(`levelwellness:thread:${threadId}`);
    return raw || [];
  }
  return MEMORY_STORE.messages[threadId] || [];
}

export async function saveMessages(threadId: string, messages: ChatMessage[]): Promise<void> {
  if (redis) {
    await redis.set(`levelwellness:thread:${threadId}`, messages);
    return;
  }
  MEMORY_STORE.messages[threadId] = messages;
}
