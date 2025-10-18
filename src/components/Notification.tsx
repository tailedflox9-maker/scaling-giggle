// src/components/Notification.tsx
import React, { useEffect } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

interface NotificationProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

export function Notification({ message, type, onClose }: NotificationProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000); // Auto-dismiss after 4 seconds

    return () => clearTimeout(timer);
  }, [onClose]);

  const isSuccess = type === 'success';

  return (
    <div className="fixed bottom-6 left-6 right-6 sm:left-auto sm:right-6 sm:max-w-sm bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg shadow-xl p-4 z-[100] animate-slide-up">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          {isSuccess ? (
            <CheckCircle className="w-5 h-5 text-emerald-500" />
          ) : (
            <XCircle className="w-5 h-5 text-red-500" />
          )}
        </div>
        <p className="text-sm font-medium text-[var(--color-text-primary)] flex-1 break-words">
          {message}
        </p>
        <button
          onClick={onClose}
          className="flex-shrink-0 ml-2 interactive-button w-5 h-5 flex items-center justify-center rounded hover:bg-[var(--color-border)] transition-colors"
          aria-label="Close notification"
        >
          <X className="w-4 h-4 text-[var(--color-text-secondary)]" />
        </button>
      </div>
    </div>
  );
}
