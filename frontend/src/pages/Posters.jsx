import { useEffect, useState } from "react";
import { Link } from "react-router";
import { api, getErrorMessage } from "../api/client.js";

export function PostersPage() {
  const [names, setNames] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/stats/editors")
      .then((response) => setNames(response.data.editors.map((item) => item.username)))
      .catch((loadError) => setError(getErrorMessage(loadError, "De namen konden niet worden geladen.")))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="mx-auto max-w-xl">
      <h1 className="page-title">Redacteuren</h1>
      <p className="mt-2 text-primary-600 dark:text-primary-200">
        Dit zijn de mensen die activiteiten op het bord mogen zetten. Alleen hun naam is zichtbaar.
      </p>

      {error ? <p className="mt-4 text-brick-600">{error}</p> : null}
      {loading ? <p className="mt-4 text-primary-500">Namen worden opgehaald…</p> : null}

      {!loading && names.length === 0 ? (
        <div className="card mt-6 rounded-lg p-6">
          <p className="text-primary-600 dark:text-primary-200">Er staat nu niemand als redacteur.</p>
        </div>
      ) : null}

      {names.length > 0 ? (
        <ul className="card mt-6 divide-y divide-primary-100 overflow-hidden rounded-lg dark:divide-primary-700">
          {names.map((name) => (
            <li key={name} className="px-4 py-3 font-medium sm:px-5">
              {name}
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
