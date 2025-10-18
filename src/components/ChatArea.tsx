import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { Conversation, Message } from '../types';
import { Sparkles } from 'lucide-react';

interface ChatAreaProps {
  conversation: Conversation | undefined;
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  isQuizLoading: boolean;
  isFlowchartLoading: boolean;
  streamingMessage?: Message | null;
  hasApiKey: boolean;
  onStopGenerating: () => void;
  onSaveAsNote: (content: string) => void;
  onGenerateQuiz: () => void;
  onGenerateFlowchart: () => void;
  onEditMessage?: (messageId: string, newContent: string) => void;
  onRegenerateResponse?: (messageId: string) => void;
}

export function ChatArea({
  conversation,
  onSendMessage,
  isLoading,
  isQuizLoading,
  isFlowchartLoading,
  streamingMessage,
  hasApiKey,
  onStopGenerating,
  onSaveAsNote,
  onGenerateQuiz,
  onGenerateFlowchart,
  onEditMessage,
  onRegenerateResponse,
}: ChatAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatMessagesRef = useRef<HTMLDivElement>(null);

  const allMessages = useMemo(() =>
    streamingMessage ? [...(conversation?.messages || []), streamingMessage] : conversation?.messages || [],
    [conversation?.messages, streamingMessage]
  );

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timeoutId);
  }, [allMessages.length, streamingMessage?.content, scrollToBottom]);

  const canGenerateQuiz = conversation && conversation.messages.length > 2;
  const canGenerateFlowchart = conversation && conversation.messages.length > 2;

  // Show welcome screen ONLY if there's no conversation selected
  if (!conversation) {
    return (
      <div className="chat-area">
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="text-center max-w-2xl w-full">
            {/* Logo/Icon - Large */}
            <div className="mb-12 flex justify-center">
              <div className="relative w-32 h-32 sm:w-40 sm:h-40">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/30 to-purple-500/30 rounded-full blur-3xl animate-pulse" />
                <div className="relative w-full h-full bg-gradient-to-br from-[var(--color-card)] to-[var(--color-sidebar)] rounded-full flex items-center justify-center border-2 border-[var(--color-border)] shadow-2xl">
                  <Sparkles className="w-20 h-20 sm:w-24 sm:h-24 text-blue-400" />
                </div>
              </div>
            </div>

            {/* Main heading - Very large */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-[var(--color-text-primary)] mb-6 leading-tight">
              Start Learning Today
            </h1>

            {/* Subheading */}
            <p className="text-lg sm:text-xl text-[var(--color-text-secondary)] mb-12 leading-relaxed max-w-xl mx-auto opacity-90">
              Your personal AI tutor is ready to help. Ask any question and start your learning journey.
            </p>

            {/* CTA-style button-like text */}
            <div className="inline-block px-8 py-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]/50 backdrop-blur mb-8">
              <p className="text-sm text-[var(--color-text-secondary)] font-medium">
                Type your question in the input below to begin
              </p>
            </div>
          </div>
        </div>
        <div className="chat-input-container">
          <ChatInput
            onSendMessage={onSendMessage}
            isLoading={isLoading}
            isQuizLoading={isQuizLoading}
            isFlowchartLoading={isFlowchartLoading}
            disabled={!hasApiKey}
            onStopGenerating={onStopGenerating}
            onGenerateQuiz={onGenerateQuiz}
            onGenerateFlowchart={onGenerateFlowchart}
            canGenerateQuiz={false}
            canGenerateFlowchart={false}
          />
        </div>
      </div>
    );
  }

  // If conversation exists (even with 0 messages), show the chat interface
  return (
    <div className="chat-area">
      <div
        ref={chatMessagesRef}
        className="chat-messages scroll-container"
      >
        <div className="chat-messages-container">
          {conversation.messages.length === 0 && !streamingMessage ? (
            // Empty state for existing conversation with no messages yet
            <div className="flex items-center justify-center h-full py-12">
              <div className="text-center max-w-2xl w-full px-4">
                {/* Logo/Icon */}
                <div className="mb-10 flex justify-center">
                  <div className="relative w-28 h-28 sm:w-32 sm:h-32">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-2xl" />
                    <div className="relative w-full h-full bg-gradient-to-br from-[var(--color-card)] to-[var(--color-sidebar)] rounded-full flex items-center justify-center border-2 border-[var(--color-border)]">
                      <Sparkles className="w-16 h-16 sm:w-20 sm:h-20 text-blue-400 animate-pulse" />
                    </div>
                  </div>
                </div>

                {/* Conversation title as heading */}
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[var(--color-text-primary)] mb-4">
                  {conversation.title}
                </h2>

                {/* Subtext */}
                <p className="text-base sm:text-lg text-[var(--color-text-secondary)] opacity-85">
                  Ready to learn? Start typing your first question below.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6 py-4 sm:py-6">
              {allMessages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isStreaming={streamingMessage?.id === message.id}
                  onSaveAsNote={onSaveAsNote}
                  onEditMessage={onEditMessage}
                  onRegenerateResponse={onRegenerateResponse}
                />
              ))}
            </div>
          )}
          <div ref={messagesEndRef} className="h-1 flex-shrink-0" />
        </div>
      </div>

      <div className="chat-input-container mobile-chat-area">
        <ChatInput
          onSendMessage={onSendMessage}
          isLoading={isLoading}
          isQuizLoading={isQuizLoading}
          isFlowchartLoading={isFlowchartLoading}
          disabled={!hasApiKey}
          onStopGenerating={onStopGenerating}
          onGenerateQuiz={onGenerateQuiz}
          onGenerateFlowchart={onGenerateFlowchart}
          canGenerateQuiz={!!canGenerateQuiz}
          canGenerateFlowchart={!!canGenerateFlowchart}
        />
      </div>
    </div>
  );
}
