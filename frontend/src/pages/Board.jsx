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
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    api
      .get("/posts")
      .then((response) => setPosts(response.data.posts))
      .catch((loadError) => setError(getErrorMessage(loadError, "Het bord kon niet worden geladen.")))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const id = searchParams.get("bericht");
    if (!id || loading) return;
    const card = document.getElementById(`bericht-${id}`);
    if (!card) return;
    card.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [searchParams, loading, posts]);

  async function handleDelete(post) {
    try {
      await api.delete(`/posts/${post.id}`);
      setPosts((current) => current.filter((item) => item.id !== post.id));
      toast.show({
        message: `“${post.title}” is van het bord gehaald.`,
        actionLabel: "Terugzetten",
        onAction: async () => {
          const response = await api.post(`/posts/${post.id}/restore`);
          setPosts((current) =>
            [...current, response.data.post].sort((a, b) => String(b.activityDate).localeCompare(String(a.activityDate))),
          );
        },
      });
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, "Verwijderen is niet gelukt."));
    }
  }

  async function handleAttend(post) {
    try {
      const response = post.attending
        ? await api.delete(`/posts/${post.id}/attend`)
        : await api.post(`/posts/${post.id}/attend`);
      setPosts((current) => current.map((item) => (item.id === post.id ? response.data.post : item)));
    } catch (attendError) {
      setError(getErrorMessage(attendError, "Aanmelden is niet gelukt."));
    }
  }

  const visible = useMemo(() => {
    return posts.filter((post) => {
      if (filter === "upcoming" && !isUpcoming(post)) return false;
      if (filter === "past" && isUpcoming(post)) return false;
      return true;
    });
  }, [posts, filter]);

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="page-title">Wat speelt er?</h1>
          <p className="mt-1 max-w-xl text-sm text-primary-600 dark:text-primary-200">
            {isEditor
              ? "Jij ziet wie er meedoet. Bewoners zien alleen hun eigen vinkje."
              : "Zeg of je meedoet. Andere bewoners zien niet wie er nog meer komt."}
          </p>
        </div>
        {isEditor ? (
          <Link to="/berichten/nieuw" className="btn btn-brick">
            Nieuwe activiteit
          </Link>
        ) : null}
      </div>

      <div className="mb-5">
        <div className="chip-row">
          {[
            ["all", "Alles"],
            ["upcoming", "Komend"],
            ["past", "Geweest"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={filter === id ? "btn btn-primary" : "btn btn-secondary"}
              onClick={() => setFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error ? <p className="mb-4 text-brick-600">{error}</p> : null}
      {loading ? <p className="text-primary-500">Het bord wordt geladen…</p> : null}
      {!loading && visible.length === 0 ? (
        <div className="card rounded-lg p-8 text-center">
          <h2 className="font-serif text-xl">
            {posts.length === 0
              ? "Er hangt nog niets op het bord"
              : filter === "upcoming"
                ? "Er staat niets gepland"
                : "Er is nog niets geweest"}
          </h2>
        </div>
      ) : null}
      <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
        {visible.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            canEdit={isEditor}
            onDelete={handleDelete}
            onAttend={handleAttend}
          />
        ))}
      </div>
    </section>
  );
}
