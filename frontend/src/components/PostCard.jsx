import { useState } from "react";
import { Link } from "react-router";
import { useToast } from "../contexts/ToastContext.jsx";
import { friendlyDate, formatShortDate, isToday, isUpcoming } from "../utils/dates.js";
import { Lightbox } from "./Lightbox.jsx";

export function PostCard({ post, canEdit, onDelete, onRestore, compact = false }) {
  const [open, setOpen] = useState(false);
  const toast = useToast();

  async function copyLink() {
    const url = `${window.location.origin}/bord?bericht=${post.id}`;
    await navigator.clipboard.writeText(url);
    toast.show({ message: "Link gekopieerd.", duration: 4000 });
  }
  const stamp = formatShortDate(post.activityDate);
  const upcoming = isUpcoming(post.activityDate);
  const today = isToday(post.activityDate);

  return (
    <article id={`bericht-${post.id}`} className="card overflow-hidden rounded-lg">
      <div className="relative aspect-[4/3] bg-primary-100 dark:bg-primary-900">
        {post.imageData ? (
          <button
            type="button"
            className="group h-full w-full"
            onClick={() => setOpen(true)}
            aria-label={`Vergroot foto van ${post.title}`}
          >
            <img src={post.imageData} alt={post.title} className="h-full w-full object-cover" />
            <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-primary-900/55 px-3 py-2 text-left text-sm text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              Klik om de foto groter te zien
            </span>
          </button>
        ) : (
          <div className="grid h-full place-items-center font-serif text-primary-400">Geen foto</div>
        )}
        <div className="pointer-events-none absolute left-4 top-4 flex h-16 w-16 flex-col items-center justify-center rounded-md bg-paper text-primary-700 shadow-sm dark:bg-primary-800 dark:text-accent-200">
          <span className="font-serif text-2xl leading-none">{stamp.day}</span>
          <span className="text-xs uppercase tracking-wider">{stamp.month}</span>
        </div>
        {today ? (
          <span className="pointer-events-none absolute right-4 top-4 rounded-full bg-accent-400 px-3 py-1 text-xs font-semibold text-primary-900">
            Vandaag
          </span>
        ) : upcoming ? (
          <span className="pointer-events-none absolute right-4 top-4 rounded-full bg-brick-600 px-3 py-1 text-xs font-semibold text-white">
            Binnenkort
          </span>
        ) : (
          <span className="pointer-events-none absolute right-4 top-4 rounded-full bg-primary-600/80 px-3 py-1 text-xs font-semibold text-white">
            Geweest
          </span>
        )}
      </div>
      <div className="space-y-3 p-5">
        <div>
          <p className="text-sm font-medium text-brick-600 dark:text-accent-300">{friendlyDate(post.activityDate)}</p>
          <h2 className="font-serif text-2xl leading-tight">{post.title}</h2>
        </div>
        {compact ? null : (
          <p className="whitespace-pre-wrap text-primary-700 dark:text-primary-100">{post.body}</p>
        )}
        <p className="text-sm text-primary-500 dark:text-primary-300">
          Geplaatst door {post.author?.username || "redactie"}
        </p>
        {canEdit ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {onRestore ? (
              <>
                <button type="button" className="btn btn-primary" onClick={() => onRestore(post)}>
                  Terugzetten
                </button>
                <button type="button" className="btn btn-brick" onClick={() => onDelete(post)}>
                  Definitief wissen
                </button>
              </>
            ) : (
              <>
                <Link to={`/berichten/${post.id}/bewerken`} className="btn btn-secondary">
                  Bewerken
                </Link>
                <button type="button" className="btn btn-brick" onClick={() => onDelete(post)}>
                  Verwijderen
                </button>
                <button type="button" className="btn btn-ghost" onClick={copyLink}>
                  Kopieer link
                </button>
              </>
            )}
          </div>
        ) : (
          <button type="button" className="btn btn-ghost px-0" onClick={copyLink}>
            Kopieer link
          </button>
        )}
      </div>
      {open ? <Lightbox src={post.imageData} alt={post.title} onClose={() => setOpen(false)} /> : null}
    </article>
  );
}
