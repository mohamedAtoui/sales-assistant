'use client';

import { useEffect, useRef } from 'react';
import { UIMessage } from 'ai';
import ReactMarkdown from 'react-markdown';
import { User, Bot, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CitationCard } from './citation-card';
import { cn } from '@/lib/utils';

interface ChatMessagesProps {
  messages: UIMessage[];
  isLoading: boolean;
}

interface PubMedResult {
  pmid: string;
  title: string;
  authors: string;
  journal: string;
  year: string;
  abstract: string;
  pubmedUrl: string;
}

interface ToolInvocationResult {
  success: boolean;
  message: string;
  results: PubMedResult[];
}

function getTextContent(message: UIMessage): string {
  if (!message.parts) return '';
  return message.parts
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => part.text)
    .join('');
}

function getToolResults(message: UIMessage): ToolInvocationResult[] {
  const results: ToolInvocationResult[] = [];
  if (!message.parts) return results;

  for (const part of message.parts) {
    // Check for tool-related parts (type starts with 'tool-')
    if (part.type.startsWith('tool-')) {
      const toolPart = part as unknown as {
        toolName?: string;
        state?: string;
        result?: ToolInvocationResult;
        output?: ToolInvocationResult;
      };
      if (
        toolPart.toolName === 'searchPubMed' &&
        toolPart.state === 'result' &&
        (toolPart.result || toolPart.output)
      ) {
        const toolResult = toolPart.result || toolPart.output;
        if (toolResult) {
          results.push(toolResult);
        }
      }
    }
  }

  return results;
}

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <ScrollArea ref={scrollRef} className="flex-1 p-4">
      <div className="space-y-4 max-w-3xl mx-auto">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <Bot className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="font-medium text-gray-700 mb-2">
              Assistant Synapgen®
            </h3>
            <p className="text-sm">
              Posez vos questions sur le Magnésium L-thréonate, les études cliniques, ou les comparaisons avec d&apos;autres solutions.
            </p>
          </div>
        )}

        {messages.map((message) => {
          const textContent = getTextContent(message);
          const toolResults = message.role === 'assistant'
            ? getToolResults(message)
            : [];

          return (
            <div
              key={message.id}
              className={cn(
                'flex gap-3',
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.role === 'assistant' && (
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback className="bg-blue-100 text-blue-700">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              )}

              <div
                className={cn(
                  'rounded-lg px-4 py-2 max-w-[80%]',
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                )}
              >
                {message.role === 'user' ? (
                  <p className="whitespace-pre-wrap">{textContent}</p>
                ) : (
                  <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-headings:font-semibold prose-h1:text-lg prose-h2:text-base prose-h3:text-sm prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-strong:font-semibold prose-code:bg-gray-200 prose-code:px-1 prose-code:rounded prose-pre:bg-gray-800 prose-pre:text-gray-100">
                    {textContent && (
                      <ReactMarkdown>{textContent}</ReactMarkdown>
                    )}
                  </div>
                )}

                {/* Display tool results */}
                {toolResults.map((result, index) => {
                  if (result.success && result.results.length > 0) {
                    return (
                      <div key={index} className="mt-3 space-y-2">
                        <p className="text-xs text-gray-500 font-medium">
                          Sources PubMed trouvées:
                        </p>
                        {result.results.map((r) => (
                          <CitationCard key={r.pmid} result={r} />
                        ))}
                      </div>
                    );
                  }
                  return null;
                })}
              </div>

              {message.role === 'user' && (
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback className="bg-gray-200 text-gray-700">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-3 justify-start">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarFallback className="bg-blue-100 text-blue-700">
                <Bot className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="rounded-lg px-4 py-2 bg-gray-100 text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
