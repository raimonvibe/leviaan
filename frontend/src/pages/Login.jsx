import { GoogleLogin } from "@react-oauth/google";
import { useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router";
import { getErrorMessage } from "../api/client.js";
import { Footer } from "../components/Footer.jsx";
import { Logo } from "../components/Logo.jsx";
import { ThemeToggle } from "../components/ThemeToggle.jsx";
import { GOOGLE_CLIENT_ID } from "../config.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useTheme } from "../contexts/ThemeContext.jsx";

// Google Identity Services: width is official, max 400. Personalized "Continue
// as…" needs at least 200, which this card is. Ask for a couple of pixels less
// than the box so the 1px stroke is not clipped. Do not stretch the iframe.
const MAX_WIDTH = 400;
const BORDER_ROOM = 2;

function GoogleSignIn({ onCredential, onError }) {
  const { isDark } = useTheme();
  const boxRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [width, setWidth] = useState(0);
  const theme = isDark ? "filled_black" : "outline";

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return undefined;

    function measure() {
      const room = Math.floor(box.getBoundingClientRect().width) - BORDER_ROOM;
      if (room <= 0) return;
      const next = Math.min(MAX_WIDTH, room);
      setWidth((current) => (Math.abs(current - next) <= 1 ? current : next));
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    window.addEventListener("orientationchange", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("orientationchange", measure);
    };
  }, []);

  return (
    <div className="w-full min-w-0 space-y-3">
      <div ref={boxRef} className="google-signin">
        {width > 0 ? (
          <GoogleLogin
            key={theme}
            locale="nl"
            text="continue_with"
            theme={theme}
            size="large"
            shape="rectangular"
            width={String(width)}
            logo_alignment="left"
            useOneTap={false}
            onSuccess={async (response) => {
              if (!response.credential) {
                onError("Inloggen is niet gelukt.");
                return;
              }
              try {
                setBusy(true);
                await onCredential(response.credential);
              } catch (loginError) {
                onError(getErrorMessage(loginError, "Inloggen is niet gelukt."));
              } finally {
                setBusy(false);
              }
            }}
            onError={() => onError("Google kon niet worden geopend.")}
          />
        ) : (
          <div className="h-10 w-full" aria-hidden="true" />
        )}
      </div>
      {busy ? <p className="muted text-center text-sm">Even geduld…</p> : null}
    </div>
  );
}

export function LoginPage() {
  const { isAuthenticated, needsUsername, loginWithGoogle } = useAuth();
  const [error, setError] = useState("");

  if (isAuthenticated && needsUsername) return <Navigate to="/welkom" replace />;
  if (isAuthenticated) return <Navigate to="/bord" replace />;

  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden">
      <header className="flex items-center justify-between gap-3 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] short:pb-2 sm:px-6">
        <Link to="/" className="min-w-0" aria-label="Naar het begin">
          <Logo />
        </Link>
        <ThemeToggle />
      </header>

      <div className="mx-auto flex w-full max-w-lg grow shrink-0 flex-col justify-center gap-6 px-4 py-4 sm:px-6 lg:max-w-5xl lg:grid lg:grid-cols-2 lg:items-center lg:gap-12 lg:py-10 short:gap-4 short:py-3 short:lg:items-start short:lg:gap-8 short:lg:py-4">
        <div className="order-2 text-center lg:order-1 lg:text-left">
          <p className="font-serif text-3xl leading-tight text-ink sm:text-4xl lg:text-5xl short:text-3xl short:lg:text-4xl">
            Jouw huis.
            <br />
            Jouw activiteiten.
          </p>
          <p className="muted mx-auto mt-3 max-w-md text-sm sm:text-base lg:mx-0 short:mt-2">
            Hier zie je wat er in huis speelt: een foto, een korte tekst en wanneer het is.
          </p>
        </div>

        <div className="card order-1 w-full min-w-0 overflow-hidden rounded-lg p-4 text-ink sm:p-6 lg:order-2 lg:p-7 short:p-4 short:sm:p-5 short:lg:p-5">
          <h1 className="font-serif text-2xl text-ink sm:text-3xl short:text-2xl">Inloggen</h1>
          <p className="muted mt-1 text-sm">
            Alleen mensen van het huis kunnen binnenkomen. Jouw Google-adres moet eerst op de lijst
            staan. Nog geen account?{" "}
            <Link to="/google-account" className="underline decoration-accent-400 underline-offset-4">
              Zo maak je er een
            </Link>
            .
          </p>
          <div className="mt-5 min-w-0 short:mt-3">
            {!GOOGLE_CLIENT_ID ? (
              <p className="note-error text-sm">Zet VITE_GOOGLE_CLIENT_ID in frontend/.env.</p>
            ) : (
              <GoogleSignIn
                onCredential={async (credential) => {
                  setError("");
                  await loginWithGoogle({ credential });
                }}
                onError={setError}
              />
            )}
          </div>
          {error ? <p className="note-error mt-4 text-sm">{error}</p> : null}
          <p className="muted mt-5 text-sm short:mt-3">
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
