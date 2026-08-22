import { GoogleLogin } from "@react-oauth/google";
import { useState } from "react";
import { Navigate } from "react-router";
import { getErrorMessage } from "../api/client.js";
import { Logo } from "../components/Logo.jsx";
import { GOOGLE_CLIENT_ID } from "../config.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useTheme } from "../contexts/ThemeContext.jsx";

export function LoginPage() {
  const { isAuthenticated, needsUsername, loginWithGoogle } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [error, setError] = useState("");

  if (isAuthenticated && needsUsername) return <Navigate to="/welkom" replace />;
  if (isAuthenticated) return <Navigate to="/bord" replace />;

  return (
    <div className="auth-shell relative min-h-screen overflow-hidden bg-primary-600 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(196,163,90,0.22),transparent_40%),radial-gradient(circle_at_90%_80%,rgba(196,59,46,0.18),transparent_35%)]" />
      <div className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-12 px-6 py-12 lg:grid-cols-2">
        <div>
          <Logo />
          <p className="mt-10 font-serif text-4xl leading-tight md:text-5xl">
            Jouw huis.
            <br />
            Jouw activiteiten.
          </p>
          <p className="mt-6 max-w-md text-lg text-primary-100">
            De verpleegkundige plaatst foto, tekst en datum. Huisgenoten loggen in met Google
            en zien alleen elkaars gebruikersnaam — nooit een e-mailadres.
          </p>
          <ul className="mt-8 space-y-2 text-primary-100">
            <li>Klassiek campusbord met lichte en donkere modus</li>
            <li>Alleen redactie kan berichten plaatsen of verwijderen</li>
            <li>Beheerder nodigt redacteuren uit</li>
          </ul>
        </div>
        <div className="card rounded-lg p-8 text-ink">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h1 className="font-serif text-3xl">Inloggen</h1>
              <p className="mt-2 text-primary-600 dark:text-primary-200">
                Bezoekers en redactie gebruiken dezelfde Google-knop.
              </p>
            </div>
            <button type="button" onClick={toggleTheme} className="btn btn-secondary">
              {isDark ? "Licht" : "Donker"}
            </button>
          </div>
          {!GOOGLE_CLIENT_ID ? (
            <p className="text-sm text-brick-600">
              Zet <code>VITE_GOOGLE_CLIENT_ID</code> in <code>frontend/.env</code> om de Google-knop te tonen.
            </p>
          ) : (
          <GoogleLogin
            onSuccess={async (response) => {
              setError("");
              try {
                await loginWithGoogle(response.credential);
              } catch (loginError) {
                setError(getErrorMessage(loginError, "Inloggen is niet gelukt."));
              }
            }}
            onError={() => setError("Google kon niet worden geopend.")}
            theme={isDark ? "filled_black" : "outline"}
            size="large"
            width="320"
            text="continue_with"
            shape="rectangular"
            locale="nl"
          />
          )}
          {error ? <p className="mt-4 text-sm text-brick-600">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
