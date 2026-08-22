import { useEffect, useState } from "react";
import { Link } from "react-router";
import { api, getErrorMessage } from "../api/client.js";
import { PostCard } from "../components/PostCard.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";

export function BoardPage() {
  const { isEditor } = useAuth();
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

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

  async function handleDelete(post) {
    if (!window.confirm(`Bericht “${post.title}” verwijderen?`)) return;
    try {
      await api.delete(`/posts/${post.id}`);
      setPosts((current) => current.filter((item) => item.id !== post.id));
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, "Verwijderen is niet gelukt."));
    }
  }

  return (
    <section>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-brick-600 dark:text-accent-300">Actueel</p>
          <h1 className="page-title mt-1">Het activiteitenbord</h1>
          <p className="mt-2 max-w-2xl text-primary-600 dark:text-primary-200">
            Foto, tekst en datum — zoals een klassiek campusprikbord. Alleen redactie kan kaarten
            plaatsen of weghalen.
          </p>
        </div>
        {isEditor ? (
          <Link to="/berichten/nieuw" className="btn btn-brick">
            Nieuw bericht
          </Link>
        ) : null}
      </div>
      {error ? <p className="mb-6 text-brick-600">{error}</p> : null}
      {loading ? <p className="text-primary-500">Kaarten worden opgehangen…</p> : null}
      {!loading && posts.length === 0 ? (
        <div className="card rounded-lg p-10 text-center">
          <h2 className="font-serif text-2xl">Nog geen activiteiten</h2>
          <p className="mt-2 text-primary-600 dark:text-primary-200">
            Zodra de redactie een bericht plaatst, verschijnt het hier.
          </p>
        </div>
      ) : null}
      <div className="grid gap-6 md:grid-cols-2">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} canEdit={isEditor} onDelete={handleDelete} />
        ))}
      </div>
    </section>
  );
}
