'use client';

import { useEffect } from 'react';
import { useToast } from '@/lib/toast/toast-context';

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, 3000);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const colorClass =
    toast.type === 'success'
      ? 'bg-green-600 text-white'
      : toast.type === 'error'
        ? 'bg-red-600 text-white'
        : 'bg-blue-600 text-white';

  return (
    <div
      className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg min-w-[280px] max-w-sm ${colorClass}`}
      role="alert"
    >
      <span className="flex-1 text-sm">{toast.message}</span>
      <button
        onClick={() => onRemove(toast.id)}
        className="text-white/80 hover:text-white transition-colors"
        aria-label="닫기"
      >
        ✕
      </button>
    </div>
  );
}
