import { Link } from "react-router";
import { Footer } from "../components/Footer.jsx";
import { Logo } from "../components/Logo.jsx";
import { useTheme } from "../contexts/ThemeContext.jsx";

export function PrivacyPage() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-primary-100/70 bg-paper/95 dark:border-primary-700 dark:bg-primary-900/90">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" aria-label="Naar home">
            <Logo />
          </Link>
          <button type="button" onClick={toggleTheme} className="btn btn-ghost">
            {isDark ? "Licht" : "Donker"}
          </button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:py-10">
        <p className="text-sm text-brick-600 dark:text-accent-300">Duidelijke taal</p>
        <h1 className="page-title mt-1">Privacy-verklaring</h1>
        <p className="mt-3 text-primary-600 dark:text-primary-200">
          Deze pagina legt in gewone woorden uit wat Leviaan Campus met je gegevens doet. Geen kleine lettertjes.
        </p>

        <div className="mt-8 space-y-6 text-primary-800 dark:text-primary-100">
          <section className="card rounded-lg p-5">
            <h2 className="font-serif text-xl">Wat is dit?</h2>
            <p className="mt-2 leading-relaxed">
              Leviaan Campus is een activiteitenbord voor huisgenoten. De redactie hangt kaarten op met een
              foto, tekst en datum. Jij logt in om mee te kijken. Dit bord hoort bij jullie huis. Meer over
              de organisatie Leviaan staat op{" "}
              <a className="underline decoration-accent-400 underline-offset-4" href="https://www.leviaan.nl" target="_blank" rel="noreferrer">
                leviaan.nl
              </a>
              .
            </p>
          </section>

          <section className="card rounded-lg p-5">
            <h2 className="font-serif text-xl">Wat slaan we op?</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 leading-relaxed">
              <li>Je Google-inlog, zodat we weten dat jij het bent</li>
              <li>Je e-mailadres, alleen voor het account</li>
              <li>De gebruikersnaam die jij zelf kiest</li>
              <li>Berichten: foto, tekst en datum</li>
            </ul>
          </section>

          <section className="card rounded-lg p-5">
            <h2 className="font-serif text-xl">Wat zien anderen?</h2>
            <p className="mt-2 leading-relaxed">
              Op het bord zien huisgenoten alleen je <strong>gebruikersnaam</strong>, plus de kaarten van de
              redactie. Je e-mailadres is niet zichtbaar. De beheerder ziet een e-mailadres alleen als die
              zelf iemand als redacteur uitnodigt.
            </p>
          </section>

          <section className="card rounded-lg p-5">
            <h2 className="font-serif text-xl">Google</h2>
            <p className="mt-2 leading-relaxed">
              Je logt in met Google. Wij krijgen van Google een bevestiging van je account. We slaan geen
              wachtwoord van je op. Google heeft een eigen privacy-beleid.
            </p>
          </section>

          <section className="card rounded-lg p-5">
            <h2 className="font-serif text-xl">Foto’s</h2>
            <p className="mt-2 leading-relaxed">
              Foto’s bij activiteiten worden bewaard bij het bericht, zodat iedereen op het bord ze kan
              zien. Alleen redactie en de beheerder kunnen foto’s plaatsen of weghalen. Weggehaalde
              berichten staan eerst in de prullenbak.
            </p>
          </section>

          <section className="card rounded-lg p-5">
            <h2 className="font-serif text-xl">Iets laten verwijderen?</h2>
            <p className="mt-2 leading-relaxed">
              Vraag het aan de beheerder van dit bord. Die kan een account-rol aanpassen of een bericht
              terugzetten of wissen. Voor privacy van de organisatie Leviaan zelf, kijk op{" "}
              <a className="underline decoration-accent-400 underline-offset-4" href="https://www.leviaan.nl" target="_blank" rel="noreferrer">
                leviaan.nl
              </a>
              .
            </p>
          </section>
        </div>

        <Link to="/" className="btn btn-secondary mt-8">
          Terug naar home
        </Link>
      </main>
      <Footer />
    </div>
  );
}
