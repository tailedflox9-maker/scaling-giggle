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
    }, 4000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const isSuccess = type === 'success';
  const bgColor = isSuccess 
    ? 'bg-emerald-500/10 border-emerald-500/30 backdrop-blur-md' 
    : 'bg-red-500/10 border-red-500/30 backdrop-blur-md';
  const iconColor = isSuccess ? 'text-emerald-500' : 'text-red-500';

  return (
    <div className={`fixed bottom-4 right-4 max-w-xs ${bgColor} border rounded-lg p-3 z-[100] animate-slide-up shadow-lg`}>
      <div className="flex items-center gap-2">
        <div className="flex-shrink-0">
          {isSuccess ? (
            <CheckCircle className={`w-4 h-4 ${iconColor}`} />
          ) : (
            <XCircle className={`w-4 h-4 ${iconColor}`} />
          )}
        </div>
        <p className="text-sm font-medium text-[var(--color-text-primary)] flex-1 break-words line-clamp-2">
          {message}
        </p>
        <button
          onClick={onClose}
          className="flex-shrink-0 ml-1 hover:bg-[var(--color-border)]/50 rounded p-0.5 transition-colors"
          aria-label="Close notification"
        >
          <X className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
        </button>
      </div>
    </div>
  );
}
