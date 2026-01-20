import { streamText, UIMessage } from 'ai';
import { mistral, MISTRAL_MODEL } from '@/lib/ai/mistral-client';
import { SYNAPGEN_SYSTEM_PROMPT } from '@/lib/ai/system-prompt';
import { pubmedSearchTool } from '@/lib/ai/tools/pubmed-search';

export const maxDuration = 60;

type SimplifiedMessage = {
  role: 'user' | 'assistant';
  content: string;
};

// Convert UIMessage to simple message format
function convertToMessages(uiMessages: UIMessage[]): SimplifiedMessage[] {
  return uiMessages.map((msg) => {
    // Extract text content from parts
    const textContent = msg.parts
      ?.filter((part): part is { type: 'text'; text: string } => part.type === 'text')
      .map((part) => part.text)
      .join('') || '';

    return {
      role: msg.role as 'user' | 'assistant',
      content: textContent,
    };
  }).filter(msg => msg.content); // Remove empty messages
}

export async function POST(req: Request) {
  const body = await req.json();
  console.log('=== INCOMING REQUEST ===');
  console.log(JSON.stringify(body, null, 2));

  const { messages } = body;

  // Convert UIMessages to simple messages
  const convertedMessages = convertToMessages(messages || []);
  console.log('=== CONVERTED MESSAGES ===');
  console.log(JSON.stringify(convertedMessages, null, 2));

  const result = streamText({
    model: mistral(MISTRAL_MODEL),
    system: SYNAPGEN_SYSTEM_PROMPT,
    messages: convertedMessages,
    tools: {
      searchPubMed: pubmedSearchTool,
    },
  });

  return result.toUIMessageStreamResponse();
}
