import { useState } from "react";
import { Link } from "react-router";
import { useToast } from "../contexts/ToastContext.jsx";
import { formatRange, formatShortDate, isToday, isUpcoming } from "../utils/dates.js";
import { Lightbox } from "./Lightbox.jsx";

export function PostCard({ post, canEdit, onDelete, onRestore, onAttend, compact = false }) {
  const [open, setOpen] = useState(false);
  const toast = useToast();
  const stamp = formatShortDate(post.activityDate);
  const upcoming = isUpcoming(post);
  const today = isToday(post);
  const range = formatRange(post.activityDate, post.activityEndDate);

  async function copyLink() {
    const url = `${window.location.origin}/bord?bericht=${post.id}`;
    await navigator.clipboard.writeText(url);
    toast.show({ message: "De link staat op je klembord.", duration: 4000 });
  }

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
            <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-primary-900/50 px-3 py-2 text-left text-xs text-white opacity-0 sm:text-sm sm:group-hover:opacity-100 group-focus-visible:opacity-100">
              Tik voor een grotere foto
            </span>
          </button>
        ) : (
          <div className="grid h-full place-items-center font-serif text-primary-400">Geen foto</div>
        )}
        <div className="pointer-events-none absolute left-3 top-3 flex h-14 w-14 flex-col items-center justify-center rounded-md bg-paper/95 text-primary-700 dark:bg-primary-800 dark:text-accent-200">
          <span className="font-serif text-xl leading-none">{stamp.day}</span>
          <span className="text-[0.65rem] uppercase tracking-wider">{stamp.month}</span>
        </div>
        <span
          className={`pointer-events-none absolute right-3 top-3 rounded-full px-2.5 py-1 text-[0.7rem] font-medium text-white ${
            today ? "bg-accent-400 text-primary-900" : upcoming ? "bg-brick-600" : "bg-primary-600/80"
          }`}
        >
          {today ? "Nu" : upcoming ? "Komt" : "Was"}
        </span>
      </div>
      <div className="space-y-2.5 p-4 sm:p-5">
        <div>
          <p className="text-sm text-brick-600 dark:text-accent-300">{range}</p>
          <h2 className="font-serif text-xl leading-tight sm:text-2xl">{post.title}</h2>
        </div>
        {compact ? null : (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-primary-700 sm:text-base dark:text-primary-100">
            {post.body}
          </p>
        )}
        {canEdit && post.author?.username ? (
          <p className="text-xs text-primary-500 sm:text-sm">{post.author.username}</p>
        ) : null}
        {compact ? null : (
          <div className="space-y-2 pt-1">
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
              <input
                type="checkbox"
                className="h-5 w-5 accent-primary-600"
                checked={Boolean(post.attending)}
                onChange={() => onAttend?.(post)}
              />
              <span>{post.attending ? "Je doet mee" : "Ik doe mee"}</span>
            </label>
            {Array.isArray(post.attendees) ? (
              <div className="rounded-md bg-primary-50/80 px-3 py-2 text-sm dark:bg-primary-900/60">
                <p className="text-primary-500">Wie doen mee ({post.attendeeCount ?? post.attendees.length})</p>
                {post.attendees?.length ? (
                  <ul className="mt-1 space-y-0.5">
                    {post.attendees.map((name) => (
                      <li key={name}>{name}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-primary-500">Nog niemand heeft zich opgegeven.</p>
                )}
              </div>
            ) : null}
          </div>
        )}
        {canEdit ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {onRestore ? (
              <>
                <button type="button" className="btn btn-primary" onClick={() => onRestore(post)}>
                  Terugzetten
                </button>
                <button type="button" className="btn btn-brick" onClick={() => onDelete(post)}>
                  Voorgoed weg
                </button>
              </>
            ) : (
              <>
                <Link to={`/berichten/${post.id}/bewerken`} className="btn btn-secondary">
                  Aanpassen
                </Link>
                <button type="button" className="btn btn-brick" onClick={() => onDelete(post)}>
                  Verwijderen
                </button>
                <button type="button" className="btn btn-ghost" onClick={copyLink}>
                  Deel link
                </button>
              </>
            )}
          </div>
        ) : (
          <button type="button" className="btn btn-ghost px-0" onClick={copyLink}>
            Deel deze activiteit
          </button>
        )}
      </div>
      {open ? <Lightbox src={post.imageData} alt={post.title} onClose={() => setOpen(false)} /> : null}
    </article>
  );
}
