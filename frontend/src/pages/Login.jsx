import { useGoogleLogin } from "@react-oauth/google";
import { useState } from "react";
import { Link, Navigate } from "react-router";
import { getErrorMessage } from "../api/client.js";
import { Footer } from "../components/Footer.jsx";
import { Logo } from "../components/Logo.jsx";
import { GOOGLE_CLIENT_ID } from "../config.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useTheme } from "../contexts/ThemeContext.jsx";

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function GoogleSignIn({ onAccessToken, onError }) {
  const [busy, setBusy] = useState(false);
  const login = useGoogleLogin({
    scope: "openid email profile",
    onSuccess: async (response) => {
      try {
        setBusy(true);
        await onAccessToken(response.access_token);
      } catch (loginError) {
        onError(getErrorMessage(loginError, "Inloggen is niet gelukt."));
      } finally {
        setBusy(false);
      }
    },
    onError: () => onError("Google kon niet worden geopend."),
  });

  return (
    <button
      type="button"
      onClick={() => login()}
      disabled={busy}
      className="btn w-full border border-primary-200 bg-white text-primary-800 hover:bg-campus dark:border-white/40 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
    >
      <GoogleMark />
      {busy ? "Even geduld…" : "Doorgaan met Google"}
    </button>
  );
}

export function LoginPage() {
  const { isAuthenticated, needsUsername, loginWithGoogle } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [error, setError] = useState("");

  if (isAuthenticated && needsUsername) return <Navigate to="/welkom" replace />;
  if (isAuthenticated) return <Navigate to="/bord" replace />;

  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden">
      <header className="flex items-center justify-between gap-3 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6">
        <Link to="/" className="min-w-0" aria-label="Naar het begin">
          <Logo />
        </Link>
        <button type="button" onClick={toggleTheme} className="btn btn-ghost shrink-0">
          {isDark ? "Licht" : "Donker"}
        </button>
      </header>

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-6 px-4 py-4 sm:px-6 lg:max-w-5xl lg:grid lg:grid-cols-2 lg:items-center lg:gap-12 lg:py-10">
        <div className="order-2 text-center lg:order-1 lg:text-left">
          <p className="font-serif text-3xl leading-tight text-ink sm:text-4xl lg:text-5xl">
            Jouw huis.
            <br />
            Jouw activiteiten.
          </p>
          <p className="muted mx-auto mt-3 max-w-md text-sm sm:text-base lg:mx-0">
            Hier zie je wat er in huis speelt: een foto, een korte tekst en wanneer het is.
          </p>
        </div>

        <div className="card order-1 w-full min-w-0 rounded-lg p-4 text-ink sm:p-6 lg:order-2 lg:p-7">
          <h1 className="font-serif text-2xl text-ink sm:text-3xl">Inloggen</h1>
          <p className="muted mt-1 text-sm">
            Gebruik je Google-account. Dat is genoeg om binnen te komen. Nog geen account?{" "}
            <Link to="/google-account" className="underline decoration-accent-400 underline-offset-4">
              Zo maak je er een
            </Link>
            .
          </p>
          <div className="mt-5">
            {!GOOGLE_CLIENT_ID ? (
              <p className="note-error text-sm">Zet VITE_GOOGLE_CLIENT_ID in frontend/.env.</p>
            ) : (
              <GoogleSignIn
                onAccessToken={async (accessToken) => {
                  setError("");
                  await loginWithGoogle({ accessToken });
                }}
                onError={setError}
              />
            )}
          </div>
          {error ? <p className="note-error mt-4 text-sm">{error}</p> : null}
          <p className="muted mt-5 text-sm">
            Door in te loggen ga je akkoord met hoe we met je gegevens omgaan. Lees de{" "}
            <Link to="/privacy" className="underline decoration-accent-400 underline-offset-4">
              privacy-uitleg
            </Link>
            .
          </p>
        </div>
      </div>

      <div className="pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <Footer />
      </div>
    </div>
  );
}
