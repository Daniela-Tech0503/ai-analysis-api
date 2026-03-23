import { NextRequest, NextResponse } from 'next/server';
import { loadMessages, loadThreads, saveMessages, saveThreads } from '@/lib/store';
import { redis } from '@/lib/redis';
import { ChatMessage, ChatThread } from '@/lib/types';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY || '',
  baseURL: process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com',
});

async function fetchAnalysisContext(query: string) {
  const url = process.env.AI_ANALYSIS_API_URL || 'https://artificialanalysis.ai/api/v2/data/llms/models';
  const apiKey = process.env.AI_ANALYSIS_API_KEY;
  if (!url) return null;

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }

    const response = await fetch(url, { headers, next: { revalidate: 3600 } });
    if (!response.ok) {
      console.warn('Failed to fetch analysis context, status:', response.status);
      return null;
    }

    const data = await response.json();
    if (data?.data && Array.isArray(data.data)) {
      const ranked = data.data
        .filter((i: any) => typeof i === 'object')
        .sort((a: any, b: any) => {
          const idxA = a.evaluations?.artificial_analysis_intelligence_index || 0;
          const idxB = b.evaluations?.artificial_analysis_intelligence_index || 0;
          const priceA = a.pricing?.price_1m_blended_3_to_1 || Infinity;
          const priceB = b.pricing?.price_1m_blended_3_to_1 || Infinity;
          if (idxA !== idxB) return idxB - idxA;
          return priceA - priceB;
        });

      const shortlist = ranked.slice(0, 8).map((item: any) => ({
        name: item.name,
        slug: item.slug,
        creator: item.model_creator?.name,
        intelligence_index: item.evaluations?.artificial_analysis_intelligence_index,
        coding_index: item.evaluations?.artificial_analysis_coding_index,
        price_1m_input_tokens: item.pricing?.price_1m_input_tokens,
        price_1m_output_tokens: item.pricing?.price_1m_output_tokens,
        price_1m_blended_3_to_1: item.pricing?.price_1m_blended_3_to_1,
        median_output_tokens_per_second: item.median_output_tokens_per_second,
        median_time_to_first_token_seconds: item.median_time_to_first_token_seconds,
      }));

      return JSON.stringify({
        query_focus: query,
        note: 'Artificial Analysis models dataset filtered for cost and performance comparisons.',
        models: shortlist,
      });
    }

    if (data?.summary) return data.summary;
    return JSON.stringify(data);
  } catch (err) {
    console.error('Error fetching analysis context:', err);
    return null;
  }
}

function makeThreadTitle(message: string): string {
  const compact = message.trim().replace(/\s+/g, ' ');
  return compact.length > 60 ? compact.substring(0, 60) + '...' : compact;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { thread_id, message } = body;

    if (!thread_id || !message) {
      return NextResponse.json({ error: 'Missing thread_id or message' }, { status: 400 });
    }

    const threads = await loadThreads();
    const messages = await loadMessages(thread_id);
    const now = new Date().toISOString();

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message.trim(),
      createdAt: now,
    };
    messages.push(userMessage);

    const context = await fetchAnalysisContext(message.trim());
    
    const basePrompt = "You are the Level Wellness product AI assistant. Answer in a concise, practical style. Focus on LLM cost, performance, deployment trade-offs, Radix UI, shadcn/ui, Vercel, and FastAPI. When relevant, explain assumptions and separate facts from estimates.";
    const systemContent = context ? `${basePrompt}\n\nExternal analysis context:\n${context}` : basePrompt;

    const llmMessages = [
      { role: 'system', content: systemContent },
      ...messages.slice(-12).map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    ];

    if (!process.env.DEEPSEEK_API_KEY) {
      throw new Error('DEEPSEEK_API_KEY is not configured');
    }

    const completion = await openai.chat.completions.create({
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      messages: llmMessages as any,
      temperature: 0.3,
    });

    const assistantContent = completion.choices[0]?.message?.content;
    if (!assistantContent) {
      throw new Error('No content returned from deepseek');
    }

    const assistantCreatedAt = new Date().toISOString();
    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: assistantContent,
      createdAt: assistantCreatedAt,
    };
    messages.push(assistantMessage);

    await saveMessages(thread_id, messages);

    let thread = threads.find((t) => t.id === thread_id);
    if (!thread) {
      thread = {
        id: thread_id,
        title: makeThreadTitle(message),
        updatedAt: assistantCreatedAt,
        messageCount: messages.length,
      };
      threads.push(thread);
    } else {
      thread.updatedAt = assistantCreatedAt;
      thread.messageCount = messages.length;
      if (thread.title === 'New chat') {
        thread.title = makeThreadTitle(message);
      }
    }

    await saveThreads(threads);

    return NextResponse.json({
      thread,
      messages,
      analysisContext: context,
      storage: redis ? 'kv' : 'memory',
    });
  } catch (error: any) {
    console.error('Chat error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
