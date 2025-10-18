// src/components/ChatArea.tsx

import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { Conversation, Message } from '../types';

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

  // State 1: No conversation is selected at all. Show the main welcome screen.
  if (!conversation) {
    return (
      <div className="chat-area">
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="text-center">
            <div className="mb-12 flex justify-center">
              <img
                src="/white-logo.png"
                alt="AI Tutor Logo"
                className="w-24 h-24 sm:w-28 sm:h-28"
              />
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-[var(--color-text-primary)] mb-4">
              AI Tutor
            </h1>
            <p className="text-lg sm:text-xl text-[var(--color-text-secondary)]">
              Start a conversation to begin learning
            </p>
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

  // State 2: A conversation is selected (either new and empty, or with messages).
  return (
    <div className="chat-area">
      <div
        ref={chatMessagesRef}
        className="chat-messages scroll-container"
      >
        <div className="chat-messages-container h-full">
          {allMessages.length === 0 ? (
            // State 2a: The selected conversation is empty.
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-4">
                 <div className="mb-10 flex justify-center">
                  <img
                    src="/white-logo.png"
                    alt="AI Tutor Logo"
                    className="w-20 h-20 sm:w-24 sm:h-24"
                  />
                </div>
                <h2 className="text-4xl sm:text-5xl font-bold text-[var(--color-text-primary)] mb-3">
                  {conversation.title}
                </h2>
                <p className="text-lg text-[var(--color-text-secondary)]">
                  Ready to learn? Ask your first question below.
                </p>
              </div>
            </div>
          ) : (
            // State 2b: The conversation has messages.
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
