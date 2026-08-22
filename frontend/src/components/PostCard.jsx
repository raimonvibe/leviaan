import { Link } from "react-router";
import { formatShortDate, isUpcoming } from "../utils/dates.js";

export function PostCard({ post, canEdit, onDelete }) {
  const stamp = formatShortDate(post.activityDate);
  const upcoming = isUpcoming(post.activityDate);

  return (
    <article className="card overflow-hidden rounded-lg">
      <div className="relative aspect-[4/3] bg-primary-100 dark:bg-primary-900">
        {post.imageData ? (
          <img src={post.imageData} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center font-serif text-primary-400">Geen foto</div>
        )}
        <div className="absolute left-4 top-4 flex h-16 w-16 flex-col items-center justify-center rounded-md bg-paper text-primary-700 shadow-sm dark:bg-primary-800 dark:text-accent-200">
          <span className="font-serif text-2xl leading-none">{stamp.day}</span>
          <span className="text-xs uppercase tracking-wider">{stamp.month}</span>
        </div>
        {upcoming ? (
          <span className="absolute right-4 top-4 rounded-full bg-brick-600 px-3 py-1 text-xs font-semibold text-white">
            Binnenkort
          </span>
        ) : null}
      </div>
      <div className="space-y-3 p-5">
        <h2 className="font-serif text-2xl leading-tight">{post.title}</h2>
        <p className="whitespace-pre-wrap text-primary-700 dark:text-primary-100">{post.body}</p>
        <p className="text-sm text-primary-500 dark:text-primary-300">
          Geplaatst door {post.author?.username || "redactie"}
        </p>
        {canEdit ? (
          <div className="flex gap-2 pt-1">
            <Link to={`/berichten/${post.id}/bewerken`} className="btn btn-secondary">
              Bewerken
            </Link>
            <button type="button" className="btn btn-brick" onClick={() => onDelete(post)}>
              Verwijderen
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}
