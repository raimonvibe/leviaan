import { GoogleLogin } from "@react-oauth/google";
import { useState } from "react";
import { Link, Navigate } from "react-router";
import { getErrorMessage } from "../api/client.js";
import { Footer } from "../components/Footer.jsx";
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
    <div className="flex min-h-dvh flex-col bg-primary-600 text-white">
      <div className="mx-auto grid w-full max-w-5xl flex-1 items-center gap-8 px-5 py-10 lg:grid-cols-2 lg:gap-12">
        <div>
          <div className="flex items-center justify-between gap-3">
            <Logo />
            <button type="button" onClick={toggleTheme} className="btn btn-secondary text-primary-800 lg:hidden">
              {isDark ? "Licht" : "Donker"}
            </button>
          </div>
          <p className="mt-8 font-serif text-4xl leading-tight sm:text-5xl">
            Jouw huis.
            <br />
            Jouw activiteiten.
          </p>
          <p className="mt-4 max-w-md text-primary-100">
            Foto, tekst en datum op het bord. Alleen je gebruikersnaam is zichtbaar.
          </p>
        </div>
        <div className="card w-full rounded-lg p-5 text-ink sm:p-7">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl">Inloggen</h1>
              <p className="mt-1 text-sm text-primary-600 dark:text-primary-200">Met Google, voor iedereen.</p>
            </div>
            <button type="button" onClick={toggleTheme} className="btn btn-secondary hidden lg:inline-flex">
              {isDark ? "Licht" : "Donker"}
            </button>
          </div>
          {!GOOGLE_CLIENT_ID ? (
            <p className="text-sm text-brick-600">Zet VITE_GOOGLE_CLIENT_ID in frontend/.env.</p>
          ) : (
            <div className="overflow-x-auto">
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
            </div>
          )}
          {error ? <p className="mt-4 text-sm text-brick-600">{error}</p> : null}
          <p className="mt-5 text-sm text-primary-500">
            Door in te loggen ga je akkoord met de{" "}
            <Link to="/privacy" className="underline decoration-accent-400 underline-offset-4">
              privacy-verklaring
            </Link>
            .
          </p>
        </div>
      </div>
      <Footer light />
    </div>
  );
}
