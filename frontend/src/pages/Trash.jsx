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
  const [emptying, setEmptying] = useState(false);

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
    if (!window.confirm(`“${post.title}” voorgoed wissen? Dit kun je daarna niet meer terughalen.`)) return;
    try {
      await api.delete(`/posts/${post.id}/permanent`);
      setPosts((current) => current.filter((item) => item.id !== post.id));
      toast.show({ message: "De activiteit is voorgoed weg.", duration: 4000 });
    } catch (wipeError) {
      setError(getErrorMessage(wipeError, "Wissen is niet gelukt."));
    }
  }

  async function emptyTrash() {
    if (
      !window.confirm(
        `Alles in de prullenbak wissen (${posts.length} ${posts.length === 1 ? "activiteit" : "activiteiten"})? Dit kun je daarna niet meer terughalen.`,
      )
    ) {
      return;
    }
    setEmptying(true);
    try {
      await api.delete("/posts/trash");
      setPosts([]);
      toast.show({ message: "Prullenbak is leeg.", duration: 4000 });
    } catch (emptyError) {
      setError(getErrorMessage(emptyError, "Legen is niet gelukt."));
    } finally {
      setEmptying(false);
    }
  }

  return (
    <section>
      <h1 className="page-title">Prullenbak</h1>
      <div className="card mt-4 rounded-lg border-accent-400/60 p-4 sm:p-5">
        <p className="font-medium">We hebben 500 MB opslag</p>
        <p className="mt-2 text-sm text-primary-600 dark:text-primary-200">
          Dit bord draait op een gratis database. Verwijderde foto’s blijven ruimte innemen tot je
          de prullenbak leegt. Doe dat als het kan, dan blijft er plek voor nieuwe activiteiten.
        </p>
      </div>
      <p className="mt-4 max-w-2xl text-primary-600 dark:text-primary-200">
        Wat je van het bord haalt, blijft hier staan. Je kunt het terugzetten of voorgoed wissen.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link to="/bord" className="btn btn-secondary">
          Terug naar het bord
        </Link>
        {posts.length > 0 ? (
          <button type="button" className="btn btn-brick" onClick={emptyTrash} disabled={emptying}>
            {emptying ? "Legen…" : "Prullenbak legen"}
          </button>
        ) : null}
      </div>
      {error ? <p className="mt-6 text-brick-600">{error}</p> : null}
      {loading ? <p className="mt-6 text-primary-500">Prullenbak wordt geopend…</p> : null}
      {!loading && posts.length === 0 ? (
        <div className="card mt-6 rounded-lg p-10 text-center">
          <h2 className="font-serif text-2xl">Prullenbak is leeg</h2>
          <p className="mt-2 text-primary-600 dark:text-primary-200">Er staat hier niets meer.</p>
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
