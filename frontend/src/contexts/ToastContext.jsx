import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setToast(null);
  }, []);

  const show = useCallback(
    ({ message, actionLabel, onAction, duration = 10000 }) => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ message, actionLabel, onAction });
      timer.current = setTimeout(hide, duration);
    },
    [hide],
  );

  const value = useMemo(() => ({ show, hide }), [show, hide]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <div className="fixed bottom-5 left-1/2 z-50 w-[min(36rem,calc(100%-2rem))] -translate-x-1/2 rounded-lg bg-primary-600 px-4 py-3 text-white shadow-lg dark:bg-primary-800">
          <div className="flex items-center justify-between gap-3">
            <p>{toast.message}</p>
            <div className="flex shrink-0 gap-2">
              {toast.actionLabel && toast.onAction ? (
                <button
                  type="button"
                  className="rounded-md bg-accent-400 px-3 py-1.5 text-sm font-semibold text-primary-900"
                  onClick={() => {
                    toast.onAction();
                    hide();
                  }}
                >
                  {toast.actionLabel}
                </button>
              ) : null}
              <button type="button" className="rounded-md px-2 py-1.5 text-sm hover:bg-white/10" onClick={hide}>
                Sluiten
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
