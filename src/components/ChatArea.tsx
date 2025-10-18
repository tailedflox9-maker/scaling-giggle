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
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center max-w-lg w-full px-4 py-12">
            {/* Icon */}
            <div className="mb-8 flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-3xl blur-2xl" />
                <div className="relative w-24 h-24 bg-[var(--color-card)] rounded-3xl flex items-center justify-center border border-[var(--color-border)]">
                  <Sparkles className="w-12 h-12 text-blue-400 animate-pulse" />
                </div>
              </div>
            </div>

            {/* Main text */}
            <h2 className="text-4xl sm:text-5xl font-bold text-[var(--color-text-primary)] mb-4 leading-tight">
              What would you like to learn?
            </h2>
            <p className="text-base sm:text-lg text-[var(--color-text-secondary)] mb-10 leading-relaxed opacity-85">
              Start a conversation with your personal AI tutor. Ask anything, explore topics, and get instant explanations.
            </p>

            {/* Feature highlights */}
            <div className="grid grid-cols-2 gap-3 mb-8 text-sm">
              <div className="bg-[var(--color-card)]/50 border border-[var(--color-border)] rounded-lg p-3 hover:bg-[var(--color-card)]/80 transition-colors">
                <div className="text-blue-400 text-lg mb-1">💡</div>
                <div className="text-[var(--color-text-secondary)]">Learn Anything</div>
              </div>
              <div className="bg-[var(--color-card)]/50 border border-[var(--color-border)] rounded-lg p-3 hover:bg-[var(--color-card)]/80 transition-colors">
                <div className="text-green-400 text-lg mb-1">✨</div>
                <div className="text-[var(--color-text-secondary)]">Get Instant Help</div>
              </div>
              <div className="bg-[var(--color-card)]/50 border border-[var(--color-border)] rounded-lg p-3 hover:bg-[var(--color-card)]/80 transition-colors">
                <div className="text-purple-400 text-lg mb-1">📚</div>
                <div className="text-[var(--color-text-secondary)]">Save Notes</div>
              </div>
              <div className="bg-[var(--color-card)]/50 border border-[var(--color-border)] rounded-lg p-3 hover:bg-[var(--color-card)]/80 transition-colors">
                <div className="text-orange-400 text-lg mb-1">🎯</div>
                <div className="text-[var(--color-text-secondary)]">Take Quizzes</div>
              </div>
            </div>

            {/* Suggestion text */}
            <div className="text-[var(--color-text-placeholder)] text-sm">
              Type your first question below or select a conversation to continue
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
              <div className="text-center max-w-lg w-full px-4">
                {/* Icon */}
                <div className="mb-8 flex justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-3xl blur-2xl" />
                    <div className="relative w-20 h-20 bg-[var(--color-card)] rounded-3xl flex items-center justify-center border border-[var(--color-border)]">
                      <Sparkles className="w-10 h-10 text-blue-400 animate-pulse" />
                    </div>
                  </div>
                </div>

                {/* Text */}
                <h3 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)] mb-2">
                  {conversation.title}
                </h3>
                <p className="text-sm sm:text-base text-[var(--color-text-secondary)] opacity-85">
                  Start chatting below to begin your learning journey
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
