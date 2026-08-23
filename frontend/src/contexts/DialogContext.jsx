import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

const DialogContext = createContext(null);
const CLICK_THROUGH_MS = 450;

function WarningMark() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4.5M12 17h.01" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.4 4.8 2.7 18.2A1.8 1.8 0 0 0 4.3 21h15.4a1.8 1.8 0 0 0 1.6-2.8L13.6 4.8a1.8 1.8 0 0 0-3.2 0Z" />
    </svg>
  );
}

export function DialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolveRef = useRef(null);
  const cancelRef = useRef(null);
  const confirmRef = useRef(null);
  const openedAtRef = useRef(0);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      resolveRef.current?.(false);
      resolveRef.current = resolve;
      openedAtRef.current = Date.now();
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

    const frame = window.requestAnimationFrame(() => {
      const target = dialog.danger ? cancelRef.current : confirmRef.current;
      target?.focus();
    });

    function onKey(event) {
      if (event.key === "Escape") finish(false);
    }

    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [dialog, finish]);

  const value = useMemo(() => ({ confirm }), [confirm]);
  const paragraphs = dialog?.message ? dialog.message.split("\n\n").filter(Boolean) : [];

  return (
    <DialogContext.Provider value={value}>
      {children}
      {dialog ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-primary-900/55 backdrop-blur-[2px]"
            aria-label="Sluiten"
            onClick={() => finish(false)}
          />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="site-dialog-title"
            aria-describedby="site-dialog-message"
            className="card relative z-10 w-full max-w-md overflow-hidden rounded-lg text-ink shadow-lg"
          >
            <div className={`h-1.5 ${dialog.danger ? "bg-brick-600" : "bg-accent-400"}`} />
            <div className="p-5 sm:p-6">
              {dialog.danger ? (
                <p className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-brick-600 dark:text-brick-100">
                  <WarningMark />
                  Let op
                </p>
              ) : null}
              <h2 id="site-dialog-title" className={`font-serif text-2xl ${dialog.danger ? "mt-2" : ""}`}>
                {dialog.title}
              </h2>
              <div id="site-dialog-message">
                {paragraphs.map((paragraph) => (
                  <p key={paragraph} className="mt-3 text-primary-600 dark:text-primary-200">
                    {paragraph}
                  </p>
                ))}
              </div>
              <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  ref={cancelRef}
                  type="button"
                  className="btn btn-secondary w-full sm:w-auto"
                  onClick={() => finish(false)}
                >
                  {dialog.cancelLabel}
                </button>
                <button
                  ref={confirmRef}
                  type="button"
                  className={`btn w-full sm:w-auto ${dialog.danger ? "btn-brick" : "btn-primary"}`}
                  onClick={() => {
                    if (dialog.danger && Date.now() - openedAtRef.current < CLICK_THROUGH_MS) return;
                    finish(true);
                  }}
                >
                  {dialog.confirmLabel}
                </button>
              </div>
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
