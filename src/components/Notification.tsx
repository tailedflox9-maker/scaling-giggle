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
    }, 5000); // Auto-dismiss after 5 seconds

    return () => clearTimeout(timer);
  }, [onClose]);

  const isSuccess = type === 'success';

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 w-full max-w-sm sm:max-w-md bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl shadow-2xl p-4 z-[100] animate-fade-in-up">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 mt-0.5">
          {isSuccess ? (
            <CheckCircle className="w-6 h-6 text-green-500" />
          ) : (
            <XCircle className="w-6 h-6 text-red-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[var(--color-text-primary)] text-base">
            {isSuccess ? 'Success' : 'Error'}
          </h3>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1 break-words">
            {message}
          </p>
        </div>
        <div className="flex-shrink-0">
          <button
            onClick={onClose}
            className="interactive-button w-7 h-7 flex items-center justify-center rounded-full hover:bg-[var(--color-border)] transition-colors"
            aria-label="Close notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
