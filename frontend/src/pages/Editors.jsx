import { useEffect, useState } from "react";
import { api, getErrorMessage } from "../api/client.js";

function roleLabel(role) {
  if (role === "creator") return "Beheerder";
  if (role === "editor") return "Redacteur";
  return "Bezoeker";
}

export function EditorsPage() {
  const [users, setUsers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

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
        setNotice(`${response.data.user.username} is nu redacteur.`);
      } else {
        setNotice("Uitnodiging is klaar. Zodra deze persoon inlogt, wordt die redacteur.");
      }
      await load();
    } catch (inviteError) {
      setError(getErrorMessage(inviteError));
    }
  }

  async function changeRole(user, role) {
    setError("");
    try {
      await api.patch(`/editors/${user.id}/role`, { role });
      await load();
    } catch (roleError) {
      setError(getErrorMessage(roleError));
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
        <h1 className="page-title mt-1">Redactie</h1>
        <p className="mt-2 max-w-2xl text-primary-600 dark:text-primary-200">
          Nodig redacteuren uit via e-mail. Dat adres blijft privé: op het bord zien anderen
          alleen de gekozen gebruikersnaam.
        </p>
      </div>

      <form onSubmit={invite} className="card rounded-lg p-6">
        <label className="label" htmlFor="email">
          E-mail van een nieuwe redacteur
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="email"
            type="email"
            className="input"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="verpleegkundige@example.com"
            required
          />
          <button type="submit" className="btn btn-primary shrink-0">
            Uitnodigen
          </button>
        </div>
        {notice ? <p className="mt-3 text-sm text-primary-600 dark:text-accent-300">{notice}</p> : null}
        {error ? <p className="mt-3 text-sm text-brick-600">{error}</p> : null}
      </form>

      {invites.length > 0 ? (
        <div className="card rounded-lg p-6">
          <h2 className="font-serif text-xl">Open uitnodigingen</h2>
          <ul className="mt-4 divide-y divide-primary-100 dark:divide-primary-700">
            {invites.map((inviteItem) => (
              <li key={inviteItem.id} className="flex items-center justify-between gap-4 py-3">
                <span>{inviteItem.email}</span>
                <button type="button" className="btn btn-ghost" onClick={() => revokeInvite(inviteItem.id)}>
                  Intrekken
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="card overflow-hidden rounded-lg">
        <div className="border-b border-primary-100 px-6 py-4 dark:border-primary-700">
          <h2 className="font-serif text-xl">Mensen op het bord</h2>
        </div>
        <ul className="divide-y divide-primary-100 dark:divide-primary-700">
          {users.map((user) => (
            <li key={user.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
              <div>
                <p className="font-semibold">{user.username || "Nog geen gebruikersnaam"}</p>
                <p className="text-sm text-primary-500">{roleLabel(user.role)}</p>
              </div>
              {user.role === "creator" ? null : (
                <div className="flex gap-2">
                  {user.role === "editor" ? (
                    <button type="button" className="btn btn-secondary" onClick={() => changeRole(user, "visitor")}>
                      Maak bezoeker
                    </button>
                  ) : (
                    <button type="button" className="btn btn-primary" onClick={() => changeRole(user, "editor")}>
                      Maak redacteur
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
