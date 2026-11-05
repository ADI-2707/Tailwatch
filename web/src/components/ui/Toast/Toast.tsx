import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import styles from "./Toast.module.css";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from "../Icon";

export type ToastType = "success" | "error" | "warning" | "info" | "loading";

export interface ToastAction {
  label: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export interface ToastOptions {
  type?: ToastType;
  duration?: number;
  description?: string;
  action?: ToastAction;
  id?: string;
}

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  description?: string;
  duration: number;
  action?: ToastAction;
  isExiting?: boolean;
}

type ToastListener = (action: {
  type: "add" | "update" | "dismiss";
  item?: ToastItem;
  id?: string;
}) => void;

let activeListener: ToastListener | null = null;

export const toast = {
  custom: (message: string, options: ToastOptions = {}) => {
    const id = options.id || Math.random().toString(36).substring(2, 9);
    const item: ToastItem = {
      id,
      message,
      description: options.description,
      type: options.type || "info",
      duration: options.duration !== undefined ? options.duration : options.type === "loading" ? 0 : 4000,
      action: options.action,
    };
    if (activeListener) {
      activeListener({ type: "add", item });
    }
    return id;
  },
  success: (message: string, options?: Omit<ToastOptions, "type">) => {
    return toast.custom(message, { ...options, type: "success" });
  },
  error: (message: string, options?: Omit<ToastOptions, "type">) => {
    return toast.custom(message, { ...options, type: "error" });
  },
  warning: (message: string, options?: Omit<ToastOptions, "type">) => {
    return toast.custom(message, { ...options, type: "warning" });
  },
  info: (message: string, options?: Omit<ToastOptions, "type">) => {
    return toast.custom(message, { ...options, type: "info" });
  },
  loading: (message: string, options?: Omit<ToastOptions, "type">) => {
    return toast.custom(message, { ...options, type: "loading", duration: 0 });
  },
  dismiss: (id?: string) => {
    if (activeListener) {
      activeListener({ type: "dismiss", id });
    }
  },
  promise: async <T,>(
    promise: Promise<T> | (() => Promise<T>),
    options: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((err: any) => string);
      description?: string;
    }
  ): Promise<T> => {
    const id = toast.loading(options.loading, { description: options.description });
    try {
      const p = typeof promise === "function" ? promise() : promise;
      const res = await p;
      const successMsg = typeof options.success === "function" ? options.success(res) : options.success;
      if (activeListener) {
        activeListener({
          type: "update",
          item: {
            id,
            message: successMsg,
            type: "success",
            duration: 4000,
          },
        });
      }
      return res;
    } catch (err: any) {
      const errorMsg = typeof options.error === "function" ? options.error(err) : options.error;
      if (activeListener) {
        activeListener({
          type: "update",
          item: {
            id,
            message: errorMsg,
            type: "error",
            duration: 4000,
          },
        });
      }
      throw err;
    }
  },
};

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, duration?: number, options?: Omit<ToastOptions, "type" | "duration">) => string;
  removeToast: (id: string) => void;
  toast: typeof toast;
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

  const showToast = useCallback(
    (message: string, type: ToastType = "info", duration = 4000, options: Omit<ToastOptions, "type" | "duration"> = {}) => {
      const id = options.id || Math.random().toString(36).substring(2, 9);
      const item: ToastItem = {
        id,
        message,
        description: options.description,
        type,
        duration: type === "loading" ? 0 : duration,
        action: options.action,
      };

      setToasts((prev) => {
        const existingIdx = prev.findIndex((t) => t.id === id);
        if (existingIdx >= 0) {
          const next = [...prev];
          next[existingIdx] = item;
          return next;
        }
        return [...prev, item];
      });

      if (item.duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, item.duration);
      }

      return id;
    },
    [removeToast]
  );

  useEffect(() => {
    activeListener = (action) => {
      if (action.type === "add" && action.item) {
        const item = action.item;
        setToasts((prev) => {
          const existingIdx = prev.findIndex((t) => t.id === item.id);
          if (existingIdx >= 0) {
            const next = [...prev];
            next[existingIdx] = item;
            return next;
          }
          return [...prev, item];
        });

        if (item.duration > 0) {
          setTimeout(() => {
            removeToast(item.id);
          }, item.duration);
        }
      } else if (action.type === "update" && action.item) {
        const item = action.item;
        setToasts((prev) =>
          prev.map((t) => (t.id === item.id ? { ...t, ...item } : t))
        );
        if (item.duration > 0) {
          setTimeout(() => {
            removeToast(item.id);
          }, item.duration);
        }
      } else if (action.type === "dismiss") {
        if (action.id) {
          removeToast(action.id);
        } else {
          setToasts((prev) => prev.map((t) => ({ ...t, isExiting: true })));
          setTimeout(() => setToasts([]), 200);
        }
      }
    };

    return () => {
      activeListener = null;
    };
  }, [removeToast]);

  const renderIcon = (type: ToastType) => {
    switch (type) {
      case "success":
        return <CheckCircle2 size={16} className={styles.iconSuccess} />;
      case "error":
        return <AlertCircle size={16} className={styles.iconError} />;
      case "warning":
        return <AlertTriangle size={16} className={styles.iconWarning} />;
      case "loading":
        return <span className={styles.spinner} />;
      default:
        return <Info size={16} className={styles.iconInfo} />;
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, removeToast, toast }}>
      {children}
      <div className={styles.toastContainer} aria-live="polite">
        {toasts.map((t, idx) => {
          const typeClass =
            styles[`toast${t.type.charAt(0).toUpperCase() + t.type.slice(1)}` as keyof typeof styles];
          const exitClass = t.isExiting ? styles.exiting : "";
          const stackIndex = toasts.length - 1 - idx;
          const hiddenBehindClass = stackIndex > 2 ? styles.hiddenBehind : "";

          return (
            <div
              key={t.id}
              className={`${styles.toast} ${typeClass} ${exitClass} ${hiddenBehindClass}`}
              style={{
                "--stack-index": stackIndex,
                zIndex: 100 - stackIndex,
              } as React.CSSProperties}
            >
              <div className={styles.toastBody}>
                <div className={styles.contentGroup}>
                  {renderIcon(t.type)}
                  <div className={styles.textStack}>
                    <span className={styles.message}>{t.message}</span>
                    {t.description && (
                      <span className={styles.description}>{t.description}</span>
                    )}
                  </div>
                </div>

                <div className={styles.actionsGroup}>
                  {t.action && (
                    <button
                      className={styles.actionBtn}
                      onClick={(e) => {
                        t.action?.onClick(e);
                        removeToast(t.id);
                      }}
                    >
                      {t.action.label}
                    </button>
                  )}
                  <button
                    className={styles.dismissButton}
                    onClick={() => removeToast(t.id)}
                    aria-label="Dismiss toast"
                  >
                    <X size={14} />
                  </button>
                </div>
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
