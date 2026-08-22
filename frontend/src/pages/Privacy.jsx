import { Link } from "react-router";
import { Footer } from "../components/Footer.jsx";
import { Logo } from "../components/Logo.jsx";
import { ThemeToggle } from "../components/ThemeToggle.jsx";

export function PrivacyPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-primary-200 bg-paper/95 dark:border-primary-400 dark:bg-primary-900/90">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <Link to="/" aria-label="Naar home">
            <Logo />
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:py-10">
        <p className="text-sm text-brick-600 dark:text-accent-300">Gewone taal</p>
        <h1 className="page-title mt-1">Hoe we met je gegevens omgaan</h1>
        <p className="mt-3 text-primary-600 dark:text-primary-200">
          Kort en duidelijk. Geen kleine lettertjes.
        </p>

        <div className="mt-8 space-y-6 text-primary-800 dark:text-primary-100">
          <section className="card rounded-lg p-5">
            <h2 className="font-serif text-xl">Wat is dit bord?</h2>
            <p className="mt-2 leading-relaxed">
              Leviaan Campus is het activiteitenbord van dit huis. Wie mag plaatsen hangt een kaart
              op met een foto, een tekst en een datum. Jij logt in om mee te kijken. Meer over
              Leviaan zelf staat op{" "}
              <a className="underline decoration-accent-400 underline-offset-4" href="https://www.leviaan.nl" target="_blank" rel="noreferrer">
                leviaan.nl
              </a>
              .
            </p>
          </section>

          <section className="card rounded-lg p-5">
            <h2 className="font-serif text-xl">Wat bewaren we?</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 leading-relaxed">
              <li>Je Google-inlog, zodat we weten dat jij het bent</li>
              <li>Je e-mailadres, alleen voor je account</li>
              <li>De naam die jij kiest. Die kun je later wijzigen</li>
              <li>Activiteiten: foto, tekst en datum</li>
              <li>Of je hebt gezegd dat je meedoet</li>
            </ul>
          </section>

          <section className="card rounded-lg p-5">
            <h2 className="font-serif text-xl">Wat zien anderen?</h2>
            <p className="mt-2 leading-relaxed">
              Bewoners en begeleiders zien elkaars namen op het bord, bijvoorbeeld wie meedoet. Op
              het overzicht kun je tikken op Begeleiders of Bewoners om de namen te zien. Je
              e-mailadres blijft geheim.
            </p>
          </section>

          <section className="card rounded-lg p-5">
            <h2 className="font-serif text-xl">Inloggen met Google</h2>
            <p className="mt-2 leading-relaxed">
              Je komt binnen met je Google-account. Wij krijgen van Google een bevestiging, geen
              wachtwoord. Google heeft een eigen privacybeleid.
            </p>
          </section>

          <section className="card rounded-lg p-5">
            <h2 className="font-serif text-xl">Foto’s</h2>
            <p className="mt-2 leading-relaxed">
              Een foto hoort bij de activiteit, zodat iedereen die kan zien. Alleen mensen die
              mogen plaatsen kunnen een foto toevoegen of weghalen. Wat van het bord gaat, staat
              eerst in de prullenbak.
            </p>
          </section>
        </div>

        <Link to="/" className="btn btn-secondary mt-8">
          Terug naar het bord
        </Link>
      </main>
      <div className="pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Footer />
      </div>
    </div>
  );
}
