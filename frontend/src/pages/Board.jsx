import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { api, getErrorMessage } from "../api/client.js";
import { PostCard } from "../components/PostCard.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useToast } from "../contexts/ToastContext.jsx";
import { isUpcoming } from "../utils/dates.js";

export function BoardPage() {
  const { isEditor } = useAuth();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  async function loadPosts() {
    setLoading(true);
    try {
      const response = await api.get("/posts");
      setPosts(response.data.posts);
      setError("");
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Het bord kon niet worden geladen."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPosts();
  }, []);

  useEffect(() => {
    const id = searchParams.get("bericht");
    if (!id || loading) return;
    const card = document.getElementById(`bericht-${id}`);
    if (card) {
      card.scrollIntoView({ behavior: "smooth", block: "center" });
      card.classList.add("ring-2", "ring-accent-400");
      const timer = setTimeout(() => card.classList.remove("ring-2", "ring-accent-400"), 2500);
      return () => clearTimeout(timer);
    }
  }, [searchParams, loading, posts]);

  async function handleDelete(post) {
    try {
      await api.delete(`/posts/${post.id}`);
      setPosts((current) => current.filter((item) => item.id !== post.id));
      toast.show({
        message: `“${post.title}” staat in de prullenbak.`,
        actionLabel: "Ongedaan maken",
        onAction: async () => {
          try {
            const response = await api.post(`/posts/${post.id}/restore`);
            setPosts((current) =>
              [...current, response.data.post].sort((a, b) => String(b.activityDate).localeCompare(String(a.activityDate))),
            );
          } catch (restoreError) {
            setError(getErrorMessage(restoreError, "Terugzetten is niet gelukt."));
          }
        },
      });
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, "Verwijderen is niet gelukt."));
    }
  }

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return posts.filter((post) => {
      if (filter === "upcoming" && !isUpcoming(post.activityDate)) return false;
      if (filter === "past" && isUpcoming(post.activityDate)) return false;
      if (!needle) return true;
      return (
        post.title.toLowerCase().includes(needle) ||
        post.body.toLowerCase().includes(needle) ||
        (post.author?.username || "").toLowerCase().includes(needle)
      );
    });
  }, [posts, query, filter]);

  const filters = [
    { id: "all", label: "Alles" },
    { id: "upcoming", label: "Komend" },
    { id: "past", label: "Geweest" },
  ];

  return (
    <section>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-brick-600 dark:text-accent-300">Actueel</p>
          <h1 className="page-title mt-1">Het activiteitenbord</h1>
          <p className="mt-2 max-w-2xl text-primary-600 dark:text-primary-200">
            Foto, tekst en datum — zoals een klassiek campusprikbord. Klik op een foto om die groter te zien.
          </p>
        </div>
        {isEditor ? (
          <div className="flex flex-wrap gap-2">
            <Link to="/berichten/nieuw" className="btn btn-brick">
              Nieuw bericht
            </Link>
            <Link to="/prullenbak" className="btn btn-secondary">
              Prullenbak
            </Link>
          </div>
        ) : null}
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="sr-only" htmlFor="zoeken">
          Zoeken
        </label>
        <input
          id="zoeken"
          className="input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Zoek op titel, tekst of naam"
        />
        <div className="flex gap-2">
          {filters.map((item) => (
            <button
              key={item.id}
              type="button"
              className={filter === item.id ? "btn btn-primary" : "btn btn-secondary"}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {error ? <p className="mb-6 text-brick-600">{error}</p> : null}
      {loading ? <p className="text-primary-500">Kaarten worden opgehangen…</p> : null}
      {!loading && visible.length === 0 ? (
        <div className="card rounded-lg p-10 text-center">
          <h2 className="font-serif text-2xl">{posts.length === 0 ? "Nog geen activiteiten" : "Niets gevonden"}</h2>
          <p className="mt-2 text-primary-600 dark:text-primary-200">
            {posts.length === 0
              ? "Zodra de redactie een bericht plaatst, verschijnt het hier."
              : "Probeer een andere zoekterm of filter."}
          </p>
        </div>
      ) : null}
      <div className="grid gap-6 md:grid-cols-2">
        {visible.map((post) => (
          <PostCard key={post.id} post={post} canEdit={isEditor} onDelete={handleDelete} />
        ))}
      </div>
    </section>
  );
}
