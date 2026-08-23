import { useCallback, useEffect, useRef, useState } from "react";

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const STEP = 0.6;
const DOUBLE_TAP_MS = 350;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function pointerDistance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function fileNameFromAlt(alt, type) {
  const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : type.includes("gif") ? "gif" : "jpg";
  const base = String(alt || "foto")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${base || "foto"}.${ext}`;
}

async function fileFromSrc(src, alt) {
  const response = await fetch(src);
  const blob = await response.blob();
  const type = blob.type && blob.type !== "text/plain" ? blob.type : "image/jpeg";
  return new File([blob], fileNameFromAlt(alt, type), { type });
}

function canShareFile(file) {
  try {
    return Boolean(navigator.canShare?.({ files: [file] }));
  } catch {
    return false;
  }
}

function prefersShareSheet() {
  const touchPoints = Number(navigator.maxTouchPoints || 0);
  if (touchPoints > 0) return true;
  return Boolean(window.matchMedia?.("(any-pointer: coarse)")?.matches);
}

function downloadFile(file) {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function Lightbox({ src, alt = "", onClose }) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const viewportRef = useRef(null);
  const pointersRef = useRef(new Map());
  const pinchRef = useRef(null);
  const panRef = useRef(null);
  const lastTapRef = useRef(0);
  const movedRef = useRef(false);
  const startedOnImageRef = useRef(false);
  const scaleRef = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });

  scaleRef.current = scale;
  offsetRef.current = offset;

  const resetZoom = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const zoomFrom = useCallback((baseScale, baseOffset, nextScale, origin) => {
    const clamped = clamp(nextScale, MIN_SCALE, MAX_SCALE);
    if (clamped === 1) {
      setScale(1);
      setOffset({ x: 0, y: 0 });
      return;
    }

    const viewport = viewportRef.current;
    if (!viewport || !origin || baseScale === 0) {
      setScale(clamped);
      return;
    }

    const rect = viewport.getBoundingClientRect();
    const rx = origin.x - (rect.left + rect.width / 2);
    const ry = origin.y - (rect.top + rect.height / 2);
    const ratio = clamped / baseScale;
    setScale(clamped);
    setOffset({
      x: rx - (rx - baseOffset.x) * ratio,
      y: ry - (ry - baseOffset.y) * ratio,
    });
  }, []);

  const zoomBy = useCallback(
    (delta, origin) => {
      const viewport = viewportRef.current;
      const rect = viewport?.getBoundingClientRect();
      const center = origin || (rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : null);
      zoomFrom(scaleRef.current, offsetRef.current, scaleRef.current + delta, center);
    },
    [zoomFrom],
  );

  const toggleZoom = useCallback(
    (origin) => {
      if (scaleRef.current > 1) {
        resetZoom();
        return;
      }
      zoomFrom(1, { x: 0, y: 0 }, 2.4, origin);
    },
    [resetZoom, zoomFrom],
  );

  const savePhoto = useCallback(async () => {
    if (!src || saving) return;
    setSaving(true);
    setSaveError("");
    try {
      const file = await fileFromSrc(src, alt);
      if (prefersShareSheet() && canShareFile(file)) {
        try {
          await navigator.share({ files: [file], title: alt || "Foto" });
          return;
        } catch (error) {
          if (error?.name === "AbortError") return;
        }
      }
      downloadFile(file);
    } catch (error) {
      if (error?.name === "AbortError") return;
      setSaveError("De foto kon niet worden bewaard.");
    } finally {
      setSaving(false);
    }
  }, [alt, saving, src]);

  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        zoomBy(STEP);
      }
      if (event.key === "-" || event.key === "_") {
        event.preventDefault();
        zoomBy(-STEP);
      }
      if (event.key === "0") {
        event.preventDefault();
        resetZoom();
      }
    }

    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, resetZoom, zoomBy]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;

    function onWheel(event) {
      event.preventDefault();
      const direction = event.deltaY > 0 ? -0.35 : 0.35;
      zoomBy(direction, { x: event.clientX, y: event.clientY });
    }

    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, [zoomBy]);

  function capturePointer(event) {
    if (!event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  }

  function onPointerDown(event) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    movedRef.current = false;
    startedOnImageRef.current = Boolean(event.target.closest("img"));
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointersRef.current.size === 2) {
      capturePointer(event);
      const [a, b] = [...pointersRef.current.values()];
      pinchRef.current = {
        distance: pointerDistance(a, b) || 1,
        scale: scaleRef.current,
        offset: { ...offsetRef.current },
      };
      panRef.current = null;
      return;
    }

    if (scaleRef.current > 1) {
      capturePointer(event);
      panRef.current = {
        x: event.clientX,
        y: event.clientY,
        ox: offsetRef.current.x,
        oy: offsetRef.current.y,
      };
    }
  }

  function onPointerMove(event) {
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointersRef.current.size >= 2 && pinchRef.current) {
      capturePointer(event);
      const [a, b] = [...pointersRef.current.values()];
      const dist = pointerDistance(a, b);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const next = pinchRef.current.scale * (dist / pinchRef.current.distance);
      zoomFrom(pinchRef.current.scale, pinchRef.current.offset, next, mid);
      movedRef.current = true;
      return;
    }

    if (!panRef.current || scaleRef.current <= 1) return;
    const dx = event.clientX - panRef.current.x;
    const dy = event.clientY - panRef.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      movedRef.current = true;
      capturePointer(event);
    }
    setOffset({
      x: panRef.current.ox + dx,
      y: panRef.current.oy + dy,
    });
  }

  function onPointerUp(event) {
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (pointersRef.current.size > 0) return;

    const didMove = movedRef.current;
    panRef.current = null;
    if (didMove) return;

    const onImage = startedOnImageRef.current;
    const now = Date.now();
    if (onImage && now - lastTapRef.current < DOUBLE_TAP_MS) {
      lastTapRef.current = 0;
      toggleZoom({ x: event.clientX, y: event.clientY });
      return;
    }
    if (onImage) {
      lastTapRef.current = now;
      return;
    }

    onClose();
  }

  function onPointerCancel(event) {
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (pointersRef.current.size === 0) {
      panRef.current = null;
      movedRef.current = true;
    }
  }

  if (!src) return null;

  const zoomed = scale > 1;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-primary-900/90 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Foto groter bekijken"
    >
      <div className="flex shrink-0 justify-end px-3 sm:px-6">
        <button
          type="button"
          className="rounded-md bg-white/90 px-3 py-2 text-sm font-medium text-primary-800"
          onClick={onClose}
        >
          Sluiten
        </button>
      </div>

      <div
        ref={viewportRef}
        className={`relative min-h-0 flex-1 overflow-hidden ${zoomed ? "touch-none cursor-grab" : "cursor-zoom-in"}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onClick={(event) => event.stopPropagation()}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          className={`absolute left-1/2 top-1/2 max-h-[calc(100%-0.5rem)] max-w-[calc(100%-1.5rem)] rounded-md object-contain ${
            zoomed ? "touch-none select-none" : "photo-keep"
          }`}
          style={{
            transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${scale})`,
          }}
        />
      </div>

      <div className="flex shrink-0 flex-col items-center gap-2 px-3 pt-2 tight:gap-1 tight:pt-1 sm:px-6">
        <p className="text-center text-xs text-white/80 tight:hidden sm:text-sm">
          Tik twee keer, knijp of gebruik de knoppen om in te zoomen.
        </p>
        <div className="flex max-w-full flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            className="btn min-w-12 bg-white/90 text-lg text-primary-800"
            onClick={() => zoomBy(-STEP)}
            disabled={scale <= MIN_SCALE}
            aria-label="Uitzoomen"
          >
            −
          </button>
          <button
            type="button"
            className="btn min-w-12 bg-white/90 text-lg text-primary-800"
            onClick={() => zoomBy(STEP)}
            disabled={scale >= MAX_SCALE}
            aria-label="Inzoomen"
          >
            +
          </button>
          {zoomed ? (
            <button type="button" className="btn bg-white/90 text-primary-800" onClick={resetZoom}>
              Passend
            </button>
          ) : null}
          <button type="button" className="btn bg-white/90 text-primary-800" onClick={savePhoto} disabled={saving}>
            {saving ? "Bewaren…" : "Bewaren"}
          </button>
        </div>
        {saveError ? <p className="text-center text-sm text-accent-200">{saveError}</p> : null}
      </div>
    </div>
  );
}
