import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { getErrorMessage } from "../api/client.js";
import { Footer } from "../components/Footer.jsx";
import { Logo } from "../components/Logo.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useToast } from "../contexts/ToastContext.jsx";

export function UsernameSetupPage({ changing = false }) {
  const { isAuthenticated, needsUsername, user, setUsername } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [username, setValue] = useState(changing ? user?.username || "" : "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (!isAuthenticated) return <Navigate to="/inloggen" replace />;
  if (!changing && !needsUsername) return <Navigate to="/bord" replace />;
  if (changing && needsUsername) return <Navigate to="/welkom" replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await setUsername(username.trim());
      if (changing) {
        toast.show({ message: "Je naam op het bord is aangepast.", duration: 4000 });
        navigate("/bord");
      }
    } catch (submitError) {
      setError(getErrorMessage(submitError, "Deze naam kon niet worden opgeslagen."));
    } finally {
      setSaving(false);
    }
  }

  const form = (
    <form onSubmit={handleSubmit} className={`card rounded-lg p-5 sm:p-7 ${changing ? "" : "mt-6"}`}>
      <h1 className="page-title">{changing ? "Naam wijzigen" : "Kies een naam"}</h1>
      <p className="mt-3 text-primary-600 dark:text-primary-200">
        Deze naam zien huisgenoten en begeleiders op het bord. Je e-mailadres blijft geheim
        {user?.email ? ", ook voor hen." : "."} Je mag de naam later weer veranderen.
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
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
        {changing ? (
          <Link to="/bord" className="btn btn-secondary w-full sm:w-auto">
            Annuleren
          </Link>
        ) : null}
        <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={saving}>
          {saving ? "Opslaan…" : changing ? "Opslaan" : "Naar het bord"}
        </button>
      </div>
    </form>
  );

  if (changing) {
    return <section className="mx-auto w-full max-w-md">{form}</section>;
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10 pt-[max(2.5rem,env(safe-area-inset-top))]">
        <Link to="/" aria-label="Naar home">
          <Logo />
        </Link>
        {form}
      </div>
      <Footer />
    </div>
  );
}
