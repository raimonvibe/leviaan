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
    ({ message, actionLabel, onAction, duration = 6000 }) => {
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
        <div className="pointer-events-none fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 flex justify-center px-4">
          <div className="pointer-events-auto card w-full max-w-lg rounded-lg p-4 text-ink shadow-lg sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm sm:text-base">{toast.message}</p>
              <div className="flex shrink-0 flex-wrap gap-2">
                {toast.actionLabel && toast.onAction ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      toast.onAction();
                      hide();
                    }}
                  >
                    {toast.actionLabel}
                  </button>
                ) : null}
                <button type="button" className="btn btn-secondary" onClick={hide}>
                  Sluiten
                </button>
              </div>
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
