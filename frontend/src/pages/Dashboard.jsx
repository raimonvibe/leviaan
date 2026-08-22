import { useEffect, useState } from "react";
import { Link } from "react-router";
import { api, getErrorMessage } from "../api/client.js";
import { useAuth } from "../contexts/AuthContext.jsx";

export function DashboardPage() {
  const { isEditor, isCreator } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/stats")
      .then((response) => setStats(response.data))
      .catch((loadError) => setError(getErrorMessage(loadError)));
  }, []);

  const cards = [
    { label: "Totaal berichten", value: stats?.totalPosts ?? "—" },
    { label: "Komende activiteiten", value: stats?.upcomingPosts ?? "—" },
    { label: "Activiteitenmanagers", value: stats?.editors ?? "—" },
    ...(isEditor ? [{ label: "In de prullenbak", value: stats?.trash ?? "—" }] : []),
  ];

  return (
    <section>
      <h1 className="page-title">Overzicht</h1>
      {error ? <p className="mt-4 text-brick-600">{error}</p> : null}
      <div className={`mt-8 grid gap-4 ${isEditor ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3"}`}>
        {cards.map((card) => (
          <article key={card.label} className="card rounded-lg p-4 sm:p-5">
            <p className="text-xs text-primary-500 dark:text-primary-300">{card.label}</p>
            <p className="mt-2 font-serif text-3xl">{card.value}</p>
          </article>
        ))}
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
        {isCreator ? (
          <Link to="/redactie" className="btn btn-secondary">
            Managers beheren
          </Link>
        ) : null}
      </div>
    </section>
  );
}
