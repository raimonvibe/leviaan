import { useEffect, useState } from "react";
import { Link } from "react-router";
import { api, getErrorMessage } from "../api/client.js";

export function ResidentsPage() {
  const [names, setNames] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/stats/visitors")
      .then((response) => setNames(response.data.visitors.map((item) => item.username)))
      .catch((loadError) => setError(getErrorMessage(loadError, "De namen konden niet worden geladen.")))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="mx-auto max-w-2xl">
      <h1 className="page-title">Bewoners</h1>
      <p className="mt-2 text-primary-600 dark:text-primary-200">
        Dit zijn de bewoners van het huis. Alleen hun naam is zichtbaar, geen e-mailadres. Bewoners
        zelf zien elkaars namen niet.
      </p>

      {error ? <p className="mt-4 text-brick-600">{error}</p> : null}
      {loading ? <p className="mt-4 text-primary-500">Namen worden opgehaald…</p> : null}

      {!loading && names.length === 0 ? (
        <div className="card mt-6 rounded-lg p-6">
          <p className="text-primary-600 dark:text-primary-200">Er is nog geen bewoner ingelogd.</p>
        </div>
      ) : null}

      {names.length > 0 ? (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {names.map((name) => (
            <li key={name} className="card rounded-lg p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-brick-600 dark:text-accent-300">
                Bewoner
              </p>
              <p className="mt-2 font-serif text-xl">{name}</p>
            </li>
          ))}
        </ul>
      ) : null}

      <Link to="/overzicht" className="btn btn-secondary mt-6">
        Terug naar het overzicht
      </Link>
    </section>
  );
}
