import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

const DialogContext = createContext(null);

export function DialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolveRef = useRef(null);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      resolveRef.current?.(false);
      resolveRef.current = resolve;
      setDialog({
        title: options.title || "Weet je het zeker?",
        message: options.message || "",
        confirmLabel: options.confirmLabel || "Doorgaan",
        cancelLabel: options.cancelLabel || "Annuleren",
        danger: Boolean(options.danger),
      });
    });
  }, []);

  const finish = useCallback((value) => {
    resolveRef.current?.(value);
    resolveRef.current = null;
    setDialog(null);
  }, []);

  useEffect(() => {
    if (!dialog) return undefined;
    function onKey(event) {
      if (event.key === "Escape") finish(false);
    }
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [dialog, finish]);

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <DialogContext.Provider value={value}>
      {children}
      {dialog ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center">
          <button
            type="button"
            className="absolute inset-0 bg-primary-900/60"
            aria-label="Sluiten"
            onClick={() => finish(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="site-dialog-title"
            className="card relative z-10 w-full max-w-md rounded-lg p-5 text-ink sm:p-6"
          >
            <h2 id="site-dialog-title" className="font-serif text-2xl">
              {dialog.title}
            </h2>
            <p className="mt-3 text-primary-600 dark:text-primary-200">{dialog.message}</p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" className="btn btn-secondary w-full sm:w-auto" onClick={() => finish(false)}>
                {dialog.cancelLabel}
              </button>
              <button
                type="button"
                autoFocus
                className={`btn w-full sm:w-auto ${dialog.danger ? "btn-brick" : "btn-primary"}`}
                onClick={() => finish(true)}
              >
                {dialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) throw new Error("useDialog must be used within DialogProvider");
  return context;
}
