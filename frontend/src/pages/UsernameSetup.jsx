import { useState } from "react";
import { Link, Navigate } from "react-router";
import { getErrorMessage } from "../api/client.js";
import { Footer } from "../components/Footer.jsx";
import { Logo } from "../components/Logo.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";

export function UsernameSetupPage() {
  const { isAuthenticated, needsUsername, user, setUsername } = useAuth();
  const [username, setValue] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (!isAuthenticated) return <Navigate to="/inloggen" replace />;
  if (!needsUsername) return <Navigate to="/bord" replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await setUsername(username.trim());
    } catch (submitError) {
      setError(getErrorMessage(submitError, "Deze naam kon niet worden opgeslagen."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10 pt-[max(2.5rem,env(safe-area-inset-top))]">
        <Link to="/" aria-label="Naar home">
          <Logo />
        </Link>
        <form onSubmit={handleSubmit} className="card mt-6 rounded-lg p-5 sm:p-7">
          <h1 className="page-title">Kies een naam</h1>
          <p className="mt-3 text-primary-600 dark:text-primary-200">
            Deze naam zien huisgenoten op het bord. Je e-mailadres blijft geheim
            {user?.email ? ", ook voor hen." : "."}
          </p>
          <label className="label mt-6" htmlFor="username">
            Jouw naam op het bord
          </label>
          <input
            id="username"
            className="input"
            value={username}
            onChange={(event) => setValue(event.target.value)}
            placeholder="bijvoorbeeld anne_zorg"
            autoComplete="username"
            minLength={3}
            maxLength={24}
            required
          />
          <p className="muted mt-2 text-sm">3 tot 24 tekens. Letters, cijfers of _ zijn goed.</p>
          {error ? <p className="note-error mt-3 text-sm">{error}</p> : null}
          <button type="submit" className="btn btn-primary mt-6" disabled={saving}>
            {saving ? "Opslaan…" : "Naar het bord"}
          </button>
        </form>
      </div>
      <Footer />
    </div>
  );
}
