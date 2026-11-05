import React, { createContext, useContext, useState, useCallback } from "react";
import styles from "./Toast.module.css";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
  isExiting?: boolean;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isExiting: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 200);
  }, []);

  const showToast = useCallback((message: string, type: ToastType = "info", duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const renderIcon = (type: ToastType) => {
    switch (type) {
      case "success":
        return <CheckCircle2 size={16} className={styles.iconSuccess} />;
      case "error":
        return <AlertCircle size={16} className={styles.iconError} />;
      case "warning":
        return <AlertTriangle size={16} className={styles.iconWarning} />;
      default:
        return <Info size={16} className={styles.iconInfo} />;
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      <div className={styles.toastContainer} aria-live="polite">
        {toasts.map((t) => {
          const typeClass = styles[`toast${t.type.charAt(0).toUpperCase() + t.type.slice(1)}` as keyof typeof styles];
          const exitClass = t.isExiting ? styles.exiting : "";
          return (
            <div key={t.id} className={`${styles.toast} ${typeClass} ${exitClass}`}>
              <div className={styles.toastBody}>
                <div className={styles.contentGroup}>
                  {renderIcon(t.type)}
                  <span className={styles.message}>{t.message}</span>
                </div>
                <button
                  className={styles.dismissButton}
                  onClick={() => removeToast(t.id)}
                  aria-label="Dismiss toast"
                >
                  <X size={14} />
                </button>
              </div>
              {t.duration > 0 && (
                <div
                  className={styles.progressBar}
                  style={{ animationDuration: `${t.duration}ms` }}
                />
              )}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
};
