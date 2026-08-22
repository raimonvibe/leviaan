import { useEffect, useState } from "react";
import { Link } from "react-router";
import { api, getErrorMessage } from "../api/client.js";
import { PostCard } from "../components/PostCard.jsx";
import { useToast } from "../contexts/ToastContext.jsx";

export function TrashPage() {
  const toast = useToast();
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const response = await api.get("/posts/trash");
      setPosts(response.data.posts);
      setError("");
    } catch (loadError) {
      setError(getErrorMessage(loadError, "De prullenbak kon niet worden geladen."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function restore(post) {
    try {
      await api.post(`/posts/${post.id}/restore`);
      setPosts((current) => current.filter((item) => item.id !== post.id));
      toast.show({ message: `“${post.title}” staat weer op het bord.`, duration: 5000 });
    } catch (restoreError) {
      setError(getErrorMessage(restoreError, "Terugzetten is niet gelukt."));
    }
  }

  async function wipe(post) {
    if (!window.confirm(`“${post.title}” definitief wissen? Dit kan niet meer ongedaan.`)) return;
    try {
      await api.delete(`/posts/${post.id}/permanent`);
      setPosts((current) => current.filter((item) => item.id !== post.id));
      toast.show({ message: "Bericht is definitief gewist.", duration: 4000 });
    } catch (wipeError) {
      setError(getErrorMessage(wipeError, "Wissen is niet gelukt."));
    }
  }

  return (
    <section>
      <p className="text-xs uppercase tracking-[0.2em] text-brick-600 dark:text-accent-300">Redactie</p>
      <h1 className="page-title mt-1">Prullenbak</h1>
      <p className="mt-2 max-w-2xl text-primary-600 dark:text-primary-200">
        Verwijderde activiteiten blijven hier staan tot je ze terugzet of definitief wist.
      </p>
      <Link to="/bord" className="btn btn-secondary mt-4">
        Terug naar het bord
      </Link>
      {error ? <p className="mt-6 text-brick-600">{error}</p> : null}
      {loading ? <p className="mt-6 text-primary-500">Prullenbak wordt geopend…</p> : null}
      {!loading && posts.length === 0 ? (
        <div className="card mt-6 rounded-lg p-10 text-center">
          <h2 className="font-serif text-2xl">Prullenbak is leeg</h2>
          <p className="mt-2 text-primary-600 dark:text-primary-200">Er staan geen verwijderde berichten.</p>
        </div>
      ) : null}
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} canEdit compact onRestore={restore} onDelete={wipe} />
        ))}
      </div>
    </section>
  );
}
