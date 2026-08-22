import { GoogleLogin } from "@react-oauth/google";
import { useLayoutEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router";
import { getErrorMessage } from "../api/client.js";
import { Footer } from "../components/Footer.jsx";
import { Logo } from "../components/Logo.jsx";
import { GOOGLE_CLIENT_ID } from "../config.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useTheme } from "../contexts/ThemeContext.jsx";

function GoogleSignIn({ isDark, onCredential, onError }) {
  const slotRef = useRef(null);
  const [width, setWidth] = useState(250);

  useLayoutEffect(() => {
    const node = slotRef.current;
    if (!node) return;

    function measure() {
      const next = Math.floor(node.getBoundingClientRect().width);
      setWidth(Math.min(400, Math.max(200, next));
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={slotRef} className="google-login-slot w-full max-w-full">
      <GoogleLogin
        onSuccess={async (response) => {
          try {
            await onCredential(response.credential);
          } catch (loginError) {
            onError(getErrorMessage(loginError, "Inloggen is niet gelukt."));
          }
        }}
        onError={() => onError("Google kon niet worden geopend.")}
        theme={isDark ? "filled_black" : "outline"}
        size="large"
        width={width}
        text="continue_with"
        shape="rectangular"
        locale="nl"
        useOneTap={false}
      />
    </div>
  );
}

export function LoginPage() {
  const { isAuthenticated, needsUsername, loginWithGoogle } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [error, setError] = useState("");

  if (isAuthenticated && needsUsername) return <Navigate to="/welkom" replace />;
  if (isAuthenticated) return <Navigate to="/bord" replace />;

  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden bg-primary-600 text-white">
      <header className="flex items-center justify-between gap-3 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6">
        <Link to="/" className="min-w-0" aria-label="Naar het begin">
          <Logo />
        </Link>
        <button
          type="button"
          onClick={toggleTheme}
          className="btn btn-secondary shrink-0 px-3 text-primary-800"
        >
          {isDark ? "Licht" : "Donker"}
        </button>
      </header>

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-6 px-4 py-4 sm:px-6 lg:max-w-5xl lg:grid lg:grid-cols-2 lg:items-center lg:gap-12 lg:py-10">
        <div className="order-2 text-center lg:order-1 lg:text-left">
          <p className="font-serif text-3xl leading-tight sm:text-4xl lg:text-5xl">
            Jouw huis.
            <br />
            Jouw activiteiten.
          </p>
          <p className="mx-auto mt-3 max-w-md text-sm text-primary-100 sm:text-base lg:mx-0">
            Hier zie je wat er in huis speelt: een foto, een korte tekst en wanneer het is.
            Anderen zien alleen de naam die jij kiest.
          </p>
        </div>

        <div className="card order-1 w-full min-w-0 rounded-lg p-4 text-ink sm:p-6 lg:order-2 lg:p-7">
          <h1 className="font-serif text-2xl sm:text-3xl">Inloggen</h1>
          <p className="mt-1 text-sm text-primary-600 dark:text-primary-200">
            Gebruik je Google-account. Dat is genoeg om binnen te komen.
          </p>
          <div className="mt-5">
            {!GOOGLE_CLIENT_ID ? (
              <p className="text-sm text-brick-600">Zet VITE_GOOGLE_CLIENT_ID in frontend/.env.</p>
            ) : (
              <GoogleSignIn
                isDark={isDark}
                onCredential={async (credential) => {
                  setError("");
                  await loginWithGoogle(credential);
                }}
                onError={setError}
              />
            )}
          </div>
          {error ? <p className="mt-4 text-sm text-brick-600">{error}</p> : null}
          <p className="mt-5 text-sm text-primary-500">
            Door in te loggen ga je akkoord met hoe we met je gegevens omgaan. Lees de{" "}
            <Link to="/privacy" className="underline decoration-accent-400 underline-offset-4">
              privacy-uitleg
            </Link>
            .
          </p>
        </div>
      </div>

      <div className="pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <Footer light />
      </div>
    </div>
  );
}
