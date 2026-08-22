import { Link } from "react-router";
import { Footer } from "../components/Footer.jsx";
import { Logo } from "../components/Logo.jsx";
import { useTheme } from "../contexts/ThemeContext.jsx";

const GOOGLE_SIGNUP = "https://accounts.google.com/signup?hl=nl";

export function GoogleAccountPage() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-primary-200 bg-paper/95 dark:border-primary-400 dark:bg-primary-900/90">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <Link to="/" aria-label="Naar home">
            <Logo />
          </Link>
          <button type="button" onClick={toggleTheme} className="btn btn-ghost">
            {isDark ? "Licht" : "Donker"}
          </button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:py-10">
        <p className="text-sm text-brick-600 dark:text-accent-300">Hulp bij inloggen</p>
        <h1 className="page-title mt-1">Hoe maak ik een Google-account?</h1>
        <p className="mt-3 text-primary-600 dark:text-primary-200">
          Dit bord werkt met Google. Heb je nog geen account? Dan maak je er eerst een. Dat mag op
          je telefoon of op een computer. Vraag gerust een begeleider om mee te kijken.
        </p>

        <div className="mt-8 space-y-6 text-primary-800 dark:text-primary-100">
          <section className="card rounded-lg p-5">
            <h2 className="font-serif text-xl">Wat heb je nodig?</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 leading-relaxed">
              <li>Een telefoon of computer met internet</li>
              <li>Je voornaam en achternaam</li>
              <li>Een e-mailadres, of je maakt een nieuw Gmail-adres</li>
              <li>Een wachtwoord dat je kunt onthouden of ergens veilig opschrijven</li>
            </ul>
            <p className="mt-3 leading-relaxed text-primary-600 dark:text-primary-200">
              Google vraagt soms om je telefoonnummer. Dat is zodat jij je account later kunt
              terugkrijgen als je het wachtwoord kwijt bent.
            </p>
          </section>

          <section className="card rounded-lg p-5">
            <h2 className="font-serif text-xl">Stap voor stap</h2>
            <ol className="mt-3 list-decimal space-y-3 pl-5 leading-relaxed">
              <li>
                Open de aanmeldpagina van Google:{" "}
                <a
                  className="underline decoration-accent-400 underline-offset-4"
                  href={GOOGLE_SIGNUP}
                  target="_blank"
                  rel="noreferrer"
                >
                  Google-account maken
                </a>
                .
              </li>
              <li>Vul je naam in.</li>
              <li>
                Kies een e-mailadres. Je mag een adres gebruiken dat je al hebt, of een nieuw
                Gmail-adres maken.
              </li>
              <li>Kies een wachtwoord. Typ het twee keer, precies hetzelfde.</li>
              <li>Volg de vragen van Google tot het account klaar is.</li>
              <li>
                Kom terug naar dit bord en tik op <strong>Doorgaan met Google</strong>.
              </li>
            </ol>
          </section>

          <section className="card rounded-lg p-5">
            <h2 className="font-serif text-xl">Daarna op dit bord</h2>
            <p className="mt-2 leading-relaxed">
              De eerste keer kies je een naam voor dit bord. Die naam zien bewoners en begeleiders.
              Je mag de naam later wijzigen. Je e-mailadres blijft geheim.
            </p>
          </section>

          <section className="card rounded-lg p-5">
            <h2 className="font-serif text-xl">Lukt het niet?</h2>
            <p className="mt-2 leading-relaxed">
              Vraag een begeleider of de beheerder van dit huis. Zij kunnen naast je zitten en de
              stappen samen doen. Google zelf heeft ook uitleg, maar die is soms wat lang.
            </p>
          </section>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <a className="btn btn-primary" href={GOOGLE_SIGNUP} target="_blank" rel="noreferrer">
            Google-account maken
          </a>
          <Link to="/inloggen" className="btn btn-secondary">
            Naar inloggen
          </Link>
        </div>
      </main>
      <div className="pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Footer />
      </div>
    </div>
  );
}
