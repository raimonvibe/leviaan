import { useEffect, useState } from "react";
import { api, getErrorMessage } from "../api/client.js";
import { useAuth } from "../contexts/AuthContext.jsx";

export function EditorsPage() {
  const { setRole } = useAuth();
  const [users, setUsers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const begeleiders = users.filter((user) => (user.baseRole || user.role) === "editor");
  const bewoners = users.filter((user) => (user.baseRole || user.role) === "visitor");

  async function load() {
    const response = await api.get("/editors");
    setUsers(response.data.users);
    setInvites(response.data.invites);
  }

  useEffect(() => {
    load().catch((loadError) => setError(getErrorMessage(loadError)));
  }, []);

  async function invite(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      const response = await api.post("/editors/invites", { email });
      setEmail("");
      if (response.data.promoted) {
        setNotice(`${response.data.user.username} is nu begeleider en ziet wie er meedoet.`);
      } else {
        setNotice("De uitnodiging staat klaar. Na het inloggen is deze persoon begeleider.");
      }
      await load();
    } catch (inviteError) {
      setError(getErrorMessage(inviteError));
    }
  }

  async function changeRole(user, role) {
    setError("");
    if (
      role === "visitor" &&
      !window.confirm(`${user.username || "Deze persoon"} wordt weer bewoner en ziet daarna niet meer wie er meedoet.`)
    ) {
      return;
    }
    try {
      await api.patch(`/editors/${user.id}/role`, { role });
      setNotice(
        role === "editor"
          ? `${user.username || "Deze persoon"} is nu begeleider.`
          : `${user.username || "Deze persoon"} is weer bewoner.`,
      );
      await load();
    } catch (roleError) {
      setError(getErrorMessage(roleError));
    }
  }

  async function testAs(role) {
    setError("");
    try {
      await setRole(role);
    } catch (roleError) {
      setError(getErrorMessage(roleError, "Wisselen is niet gelukt."));
    }
  }

  async function revokeInvite(id) {
    try {
      await api.delete(`/editors/invites/${id}`);
      await load();
    } catch (revokeError) {
      setError(getErrorMessage(revokeError));
    }
  }

  return (
    <section className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-brick-600 dark:text-accent-300">Beheer</p>
        <h1 className="page-title mt-1">Begeleiders</h1>
        <p className="mt-2 max-w-2xl text-primary-600 dark:text-primary-200">
          Voeg een begeleider toe met een e-mailadres. Die persoon mag activiteiten plaatsen en ziet
          de namen van bewoners die meedoen. Jij blijft beheerder en staat niet in hun lijst. Een
          begeleider kan zelf even als bewoner meekijken en daarna terug.
        </p>
      </div>

      <form onSubmit={invite} className="card rounded-lg p-4 sm:p-6">
        <label className="label" htmlFor="email">
          E-mail van een begeleider
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="email"
            type="email"
            className="input"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="begeleider@example.com"
            required
          />
          <button type="submit" className="btn btn-primary shrink-0">
            Toevoegen
          </button>
        </div>
        {notice ? <p className="mt-3 text-sm text-primary-600 dark:text-accent-300">{notice}</p> : null}
        {error ? <p className="mt-3 text-sm text-brick-600">{error}</p> : null}
      </form>

      {invites.length > 0 ? (
        <div className="card rounded-lg p-4 sm:p-6">
          <h2 className="font-serif text-xl">Nog niet ingelogd</h2>
          <p className="mt-1 text-sm text-primary-500">Deze uitnodiging wacht tot iemand inlogt met Google.</p>
          <ul className="mt-4 divide-y divide-primary-100 dark:divide-primary-700">
            {invites.map((inviteItem) => (
              <li key={inviteItem.id} className="flex items-center justify-between gap-4 py-3">
                <span className="break-all">{inviteItem.email}</span>
                <button type="button" className="btn btn-ghost" onClick={() => revokeInvite(inviteItem.id)}>
                  Intrekken
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div>
        <h2 className="font-serif text-xl">Begeleiders</h2>
        <p className="mt-1 text-sm text-primary-500">Zij mogen plaatsen en zien wie er meedoet.</p>
        {begeleiders.length === 0 ? (
          <div className="card mt-4 rounded-lg p-5 text-primary-600 dark:text-primary-200">
            Er is nog geen begeleider toegevoegd.
          </div>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {begeleiders.map((user) => (
              <li key={user.id} className="card rounded-lg p-4">
                <p className="font-serif text-lg">{user.username || "Nog geen naam gekozen"}</p>
                <p className="mt-1 text-sm text-primary-500">Begeleider · ziet wie meedoet</p>
                <button type="button" className="btn btn-brick mt-4" onClick={() => changeRole(user, "visitor")}>
                  Maak weer bewoner
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2 className="font-serif text-xl">Bewoners</h2>
        <p className="mt-1 text-sm text-primary-500">Zij zien alleen hun eigen vinkje, geen namen.</p>
        {bewoners.length === 0 ? (
          <div className="card mt-4 rounded-lg p-5 text-primary-600 dark:text-primary-200">
            Er is nog geen bewoner ingelogd.
          </div>
        ) : (
          <ul className="card mt-4 divide-y divide-primary-100 overflow-hidden rounded-lg dark:divide-primary-700">
            {bewoners.map((user) => (
              <li key={user.id} className="px-4 py-3 sm:px-5">
                <p className="font-medium">{user.username || "Nog geen naam gekozen"}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card rounded-lg p-4 sm:p-6">
        <h2 className="font-serif text-xl">Zelf meekijken</h2>
        <p className="mt-2 text-sm text-primary-600 dark:text-primary-200">
          Kijk hoe het bord eruitziet voor een begeleider of bewoner. Rechtsboven kun je terug naar
          beheer.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn btn-secondary" onClick={() => testAs("editor")}>
            Kijk als begeleider
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => testAs("visitor")}>
            Kijk als bewoner
          </button>
        </div>
      </div>
    </section>
  );
}
