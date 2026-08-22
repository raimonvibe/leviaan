import { useEffect, useState } from "react";
import { Link } from "react-router";
import { api, getErrorMessage } from "../api/client.js";
import { useAuth } from "../contexts/AuthContext.jsx";

export function DashboardPage() {
  const { isEditor } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/stats")
      .then((response) => setStats(response.data))
      .catch((loadError) => setError(getErrorMessage(loadError)));
  }, []);

  const cards = [
    { label: "Activiteiten", value: stats?.totalPosts ?? "—" },
    { label: "Nog te doen", value: stats?.upcomingPosts ?? "—" },
    { label: "Begeleiders", value: stats?.editors ?? "—", to: "/begeleiders", hint: "Tik om namen te zien" },
    { label: "Bewoners", value: stats?.visitors ?? "—", to: "/bewoners", hint: "Tik om namen te zien" },
    ...(isEditor ? [{ label: "In de prullenbak", value: stats?.trash ?? "—", to: "/prullenbak" }] : []),
  ];

  return (
    <section>
      <h1 className="page-title">Overzicht</h1>
      <p className="mt-2 max-w-xl text-sm text-primary-600 dark:text-primary-200">
        Een korte stand van het bord. Niks ingewikkelds, alleen tellingen.
      </p>
      {error ? <p className="mt-4 note-error">{error}</p> : null}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const inner = (
            <>
              <p className="muted text-xs">{card.label}</p>
              <p className="mt-2 font-serif text-3xl text-ink">{card.value}</p>
              {card.hint ? <p className="muted mt-2 text-sm">{card.hint}</p> : null}
            </>
          );
          return card.to ? (
            <Link key={card.label} to={card.to} className="card rounded-lg p-4 sm:p-5">
              {inner}
            </Link>
          ) : (
            <article key={card.label} className="card rounded-lg p-4 sm:p-5">
              {inner}
            </article>
          );
        })}
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/bord" className="btn btn-primary">
          Naar het bord
        </Link>
        {isEditor ? (
          <>
            <Link to="/berichten/nieuw" className="btn btn-brick">
              Activiteit plaatsen
            </Link>
            <Link to="/prullenbak" className="btn btn-secondary">
              Prullenbak
            </Link>
          </>
        ) : null}
        {isEditor ? (
          <Link to="/redactie" className="btn btn-secondary">
            Begeleiders beheren
          </Link>
        ) : null}
      </div>
    </section>
  );
}
