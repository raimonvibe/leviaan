import { useEffect } from "react";

export function Lightbox({ src, alt = "", onClose }) {
  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  if (!src) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-primary-900/85 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Foto groter bekijken"
    >
      <button
        type="button"
        className="absolute right-4 top-4 rounded-md bg-white/90 px-3 py-2 text-sm font-medium text-primary-800"
        onClick={onClose}
      >
        Sluiten
      </button>
      <img
        src={src}
        alt={alt}
        className="max-h-[90vh] max-w-full rounded-md object-contain shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      />
    </div>
  );
}
