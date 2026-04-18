import React, { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'loading';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

export interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  hideToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextType | null>(null);

const iconMap: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={18} className="text-green-500" />,
  error: <AlertCircle size={18} className="text-red-500" />,
  info: <Info size={18} className="text-blue-500" />,
  loading: (
    <div className="flex h-4 w-4 items-center justify-center">
      <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
    </div>
  ),
};

const bgMap: Record<ToastType, string> = {
  success: 'bg-green-50 border-green-200',
  error: 'bg-red-50 border-red-200',
  info: 'bg-blue-50 border-blue-200',
  loading: 'bg-gray-50 border-gray-200',
};

const textMap: Record<ToastType, string> = {
  success: 'text-green-800',
  error: 'text-red-800',
  info: 'text-blue-800',
  loading: 'text-gray-800',
};

interface ToastItemProps {
  toast: ToastMessage;
  onClose: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onClose }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      className={`mb-2 flex items-center gap-2 rounded-xl border px-3 py-2.5 shadow-lg ${bgMap[toast.type]} ${textMap[toast.type]}`}
    >
      {iconMap[toast.type]}
      <span className="flex-1 text-xs font-medium">{toast.message}</span>
      {toast.type !== 'loading' && (
        <button
          type="button"
          className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          onClick={() => onClose(toast.id)}
        >
          <X size={14} />
        </button>
      )}
    </motion.div>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = React.useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration: number = 3000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const newToast: ToastMessage = { id, type, message, duration };

    setToasts((prev) => [...prev, newToast]);

    if (type !== 'loading' && duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <div className="pointer-events-none fixed bottom-20 left-0 right-0 z-50 flex flex-col items-center px-4">
        <AnimatePresence>
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onClose={hideToast} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

export const createToastShow = () => {
  let currentResolve: ((value: ToastMessage) => void) | null = null;
  let currentToast: ToastMessage | null = null;

  const showToast = (message: string, type: ToastType = 'info', duration: number = 3000): Promise<ToastMessage> => {
    return new Promise((resolve) => {
      currentResolve = resolve;
      const id = `toast-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
      currentToast = { id, type, message, duration };
      
      setTimeout(() => {
        if (currentResolve && currentToast) {
          currentResolve(currentToast);
          currentResolve = null;
          currentToast = null;
        }
      }, duration);
    });
  };

  return { showToast };
};
