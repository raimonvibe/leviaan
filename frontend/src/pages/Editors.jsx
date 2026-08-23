import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router";
import { api, getErrorMessage } from "../api/client.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useDialog } from "../contexts/DialogContext.jsx";
import { useToast } from "../contexts/ToastContext.jsx";

export function EditorsPage() {
  const { user: me, isOwner, isEditor, setRole } = useAuth();
  const dialog = useDialog();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const begeleiders = users.filter((user) => {
    const actual = user.baseRole || user.role;
    return actual === "editor";
  });
  const bewoners = users.filter((user) => {
    const actual = user.baseRole || user.role;
    return actual === "visitor";
  });

  async function load() {
    const response = await api.get("/editors");
    setUsers(response.data.users);
    setInvites(response.data.invites);
  }

  useEffect(() => {
    if (!isEditor) return;
    load().catch((loadError) => setError(getErrorMessage(loadError)));
  }, [isEditor]);

  async function invite(role) {
    setError("");
    if (!email.trim()) {
      setError("Vul een geldig e-mailadres in.");
      return;
    }
    try {
      const response = await api.post("/editors/invites", { email, role });
      setEmail("");
      if (response.data.promoted) {
        toast.show({
          message: `${response.data.user.username} is nu begeleider en ziet wie er meedoet.`,
        });
      } else if (response.data.upgraded) {
        toast.show({
          message: "Dit adres is nu uitgenodigd als begeleider.",
        });
      } else if (role === "editor") {
        toast.show({
          message: "Uitnodiging is gezet. Met datzelfde Google-e-mailadres wordt deze persoon automatisch begeleider.",
        });
      } else {
        toast.show({
          message: "E-mail is toegevoegd. Met datzelfde Google-adres kan deze bewoner inloggen.",
        });
      }
      await load();
    } catch (inviteError) {
      setError(getErrorMessage(inviteError));
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

  async function removeUser(user) {
    setError("");
    const name = user.username || "Deze persoon";
    const ok = await dialog.confirm({
      title: "Van het bord halen?",
      message: `${name} wordt van het bord gehaald en kan daarna niet meer inloggen. Activiteiten die deze persoon plaatste gaan ook weg.`,
      confirmLabel: "Van het bord halen",
      cancelLabel: "Annuleren",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/editors/${user.id}`);
      toast.show({ message: `${name} is van het bord gehaald.` });
      await load();
    } catch (removeError) {
      setError(getErrorMessage(removeError, "Verwijderen is niet gelukt."));
    }
  }

  async function revokeInvite(inviteItem) {
    setError("");
    const ok = await dialog.confirm({
      title: "Uitnodiging intrekken?",
      message: `De uitnodiging voor ${inviteItem.email} wordt ingetrokken. Dit adres kan daarna niet meer inloggen.`,
      confirmLabel: "Intrekken",
      cancelLabel: "Annuleren",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/editors/invites/${inviteItem.id}`);
      toast.show({ message: "De uitnodiging is ingetrokken." });
      await load();
    } catch (revokeError) {
      setError(getErrorMessage(revokeError));
    }
  }

  function canRemove(user) {
    const actual = user.baseRole || user.role;
    if (user.id === me?.id) return false;
    if (actual === "creator" || user.role === "creator") return false;
    return true;
  }

  if (!isEditor) {
    return <Navigate to="/bord" replace />;
  }

  return (
    <section className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-brick-600 dark:text-accent-300">
          {isOwner ? "Beheerder" : "Begeleiding"}
        </p>
        <h1 className="page-title mt-1">Beheer</h1>
        <p className="mt-2 max-w-2xl text-primary-600 dark:text-primary-200">
          Alleen mensen op deze lijst kunnen inloggen. Zet hier het Google-e-mailadres van een
          bewoner of begeleider. Activiteiten van het huis blijven zo privé. Uitleg over een
          account staat bij{" "}
          <Link to="/google-account" className="underline decoration-accent-400 underline-offset-4">
            Hoe maak ik een Google-account?
          </Link>
          .
        </p>
        {error ? <p className="note-error mt-3 text-sm">{error}</p> : null}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          invite("visitor");
        }}
        className="card rounded-lg p-4 sm:p-6"
      >
        <label className="label" htmlFor="email">
          Google-e-mail van iemand uit het huis
        </label>
        <div className="flex flex-col gap-3">
          <input
            id="email"
            type="email"
            className="input"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="naam@gmail.com"
            required
          />
          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="submit" className="btn btn-secondary">
              Bewoner toevoegen
            </button>
            <button type="button" className="btn btn-primary" onClick={() => invite("editor")}>
              Begeleider uitnodigen
            </button>
          </div>
        </div>
      </form>

      {invites.length > 0 ? (
        <div className="card rounded-lg p-4 sm:p-6">
          <h2 className="font-serif text-xl text-ink">Nog niet ingelogd</h2>
          <p className="mt-1 text-sm text-primary-600 dark:text-primary-200">
            Wacht tot deze persoon inlogt met hetzelfde Google-adres.
          </p>
          <ul className="mt-4 divide-y divide-primary-100 dark:divide-primary-400">
            {invites.map((inviteItem) => (
              <li key={inviteItem.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <span className="break-all text-ink">{inviteItem.email}</span>
                  <p className="mt-1 text-sm text-primary-600 dark:text-primary-200">
                    {inviteItem.role === "editor" ? "Wordt begeleider" : "Wordt bewoner"}
                  </p>
                </div>
                <button type="button" className="btn btn-ghost shrink-0" onClick={() => revokeInvite(inviteItem)}>
                  Intrekken
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div>
        <h2 className="font-serif text-xl text-ink">Begeleiders</h2>
        <p className="mt-1 text-sm text-primary-600 dark:text-primary-200">Mogen plaatsen.</p>
        {begeleiders.length === 0 ? (
          <div className="card mt-4 rounded-lg p-5 text-primary-600 dark:text-primary-200">
            Er is nog geen begeleider toegevoegd.
          </div>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {begeleiders.map((user) => (
              <li key={user.id} className="card rounded-lg p-4">
                <p className="font-serif text-lg text-ink">{user.username || "Nog geen naam gekozen"}</p>
                <p className="mt-1 text-sm text-primary-600 dark:text-primary-200">
                  {user.id === me?.id ? "Dit ben jij · begeleider" : "Begeleider · ziet wie meedoet"}
                </p>
                {canRemove(user) ? (
                  <button type="button" className="btn btn-brick mt-4" onClick={() => removeUser(user)}>
                    Van het bord halen
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2 className="font-serif text-xl text-ink">Bewoners</h2>
        <p className="mt-1 text-sm text-primary-600 dark:text-primary-200">
          Zij komen in deze lijst nadat hun e-mail is toegevoegd en zij inloggen.
        </p>
        {bewoners.length === 0 ? (
          <div className="card mt-4 rounded-lg p-5 text-primary-600 dark:text-primary-200">
            Nog geen bewoner. Voeg hierboven een Google-e-mail toe.
          </div>
        ) : (
          <ul className="card mt-4 divide-y divide-primary-100 overflow-hidden rounded-lg dark:divide-primary-400">
            {bewoners.map((user) => (
              <li key={user.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
                <p className="font-medium text-ink">{user.username || "Nog geen naam gekozen"}</p>
                {canRemove(user) ? (
                  <button type="button" className="btn btn-brick" onClick={() => removeUser(user)}>
                    Van het bord halen
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      {isOwner ? (
        <div className="card rounded-lg p-4 sm:p-6">
          <h2 className="font-serif text-xl text-ink">Zelf meekijken</h2>
          <p className="mt-2 text-sm text-primary-600 dark:text-primary-200">
            Zo ziet het bord eruit voor een begeleider of bewoner.
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
      ) : null}
    </section>
  );
}
