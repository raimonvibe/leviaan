import { GoogleLogin } from "@react-oauth/google";
import { useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router";
import { getErrorMessage } from "../api/client.js";
import { Footer } from "../components/Footer.jsx";
import { Logo } from "../components/Logo.jsx";
import { ThemeToggle } from "../components/ThemeToggle.jsx";
import { GOOGLE_CLIENT_ID } from "../config.js";
import { useAuth } from "../contexts/AuthContext.jsx";

// Google draws its own button with a 1px border and rounded corners. Asking for
// exactly the width of the box puts that border on the clipping edge, where a
// screen with a fractional pixel ratio shaves it off. A couple of pixels of room
// keeps the outline whole.
const BORDER_ROOM = 2;

function GoogleSignIn({ onCredential, onError }) {
  const boxRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return undefined;

    function measure() {
      const room = Math.floor(box.getBoundingClientRect().width) - BORDER_ROOM;
      const next = Math.min(400, room);
      if (next > 0) setWidth(next);
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
      <div
        ref={boxRef}
        className="flex w-full min-w-0 justify-center overflow-hidden [&_div]:max-w-full [&_iframe]:max-w-full"
      >
        {width > 0 ? (
          <GoogleLogin
            key={width}
            locale="nl"
            text="continue_with"
            theme="outline"
            size="large"
            shape="rectangular"
            width={String(width)}
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
          <div className="h-12 w-full" aria-hidden="true" />
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
      <header className="flex items-center justify-between gap-3 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6">
        <Link to="/" className="min-w-0" aria-label="Naar het begin">
          <Logo />
        </Link>
        <ThemeToggle />
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

        <div className="card order-1 w-full min-w-0 overflow-hidden rounded-lg p-4 text-ink sm:p-6 lg:order-2 lg:p-7">
          <h1 className="font-serif text-2xl text-ink sm:text-3xl">Inloggen</h1>
          <p className="muted mt-1 text-sm">
            Alleen mensen van het huis kunnen binnenkomen. Jouw Google-adres moet eerst op de lijst
            staan. Nog geen account?{" "}
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
                onCredential={async (credential) => {
                  setError("");
                  await loginWithGoogle({ credential });
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
