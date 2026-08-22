import { useState } from "react";
import { Navigate } from "react-router";
import { getErrorMessage } from "../api/client.js";
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
    <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-4 py-12">
      <Logo />
      <form onSubmit={handleSubmit} className="card mt-8 rounded-lg p-8">
        <h1 className="page-title">Kies je gebruikersnaam</h1>
        <p className="mt-3 text-primary-600 dark:text-primary-200">
          Alleen deze naam is zichtbaar op het bord. Je e-mailadres blijft privé
          {user?.email ? " — ook voor huisgenoten." : "."}
        </p>
        <label className="label mt-6" htmlFor="username">
          Gebruikersnaam
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
        <p className="mt-2 text-sm text-primary-500">3 tot 24 tekens: letters, cijfers of _</p>
        {error ? <p className="mt-3 text-sm text-brick-600">{error}</p> : null}
        <button type="submit" className="btn btn-primary mt-6" disabled={saving}>
          {saving ? "Opslaan…" : "Naar het bord"}
        </button>
      </form>
    </div>
  );
}
