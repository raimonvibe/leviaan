import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router";
import { api, getErrorMessage } from "../api/client.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useDialog } from "../contexts/DialogContext.jsx";
import { useToast } from "../contexts/ToastContext.jsx";

function InviteBox({
  eyebrow,
  title,
  help,
  label,
  inputId,
  email,
  onEmailChange,
  onSubmit,
  buttonLabel,
  buttonClass,
  pending,
  pendingHelp,
  onRevoke,
  error,
}) {
  return (
    <form onSubmit={onSubmit} className="card flex flex-col rounded-lg p-4 sm:p-6">
      <p className="text-xs uppercase tracking-[0.2em] text-brick-600 dark:text-accent-300">{eyebrow}</p>
      <h2 className="font-serif mt-1 text-xl text-ink">{title}</h2>
      <p className="mt-2 text-sm text-primary-600 dark:text-primary-200">{help}</p>
      <label className="label mt-5" htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        type="email"
        className="input"
        value={email}
        onChange={(event) => onEmailChange(event.target.value)}
        placeholder="naam@gmail.com"
        autoComplete="off"
        required
      />
      <button type="submit" className={`btn mt-3 w-full sm:w-auto ${buttonClass}`}>
        {buttonLabel}
      </button>
      {error ? <p className="note-error mt-3 text-sm">{error}</p> : null}
      {pending.length > 0 ? (
        <div className="mt-6 border-t border-primary-100 pt-4 dark:border-primary-400">
          <p className="text-sm text-primary-600 dark:text-primary-200">{pendingHelp}</p>
          <ul className="mt-3 divide-y divide-primary-100 dark:divide-primary-400">
            {pending.map((inviteItem) => (
              <li key={inviteItem.id} className="flex items-center justify-between gap-3 py-3">
                <span className="min-w-0 break-all text-ink">{inviteItem.email}</span>
                <button type="button" className="btn btn-ghost shrink-0" onClick={() => onRevoke(inviteItem)}>
                  Intrekken
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </form>
  );
}

export function EditorsPage() {
  const { user: me, isOwner, isEditor, setRole } = useAuth();
  const dialog = useDialog();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [residentEmail, setResidentEmail] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [residentError, setResidentError] = useState("");
  const [staffError, setStaffError] = useState("");
  const [error, setError] = useState("");

  const begeleiders = users.filter((user) => {
    const actual = user.baseRole || user.role;
    return actual === "editor";
  });
  const bewoners = users.filter((user) => {
    const actual = user.baseRole || user.role;
    return actual === "visitor";
  });
  const pendingBewoners = invites.filter((item) => item.role !== "editor");
  const pendingBegeleiders = invites.filter((item) => item.role === "editor");

  async function load() {
    const response = await api.get("/editors");
    setUsers(response.data.users);
    setInvites(response.data.invites);
  }

  useEffect(() => {
    if (!isEditor) return;
    load().catch((loadError) => setError(getErrorMessage(loadError)));
  }, [isEditor]);

  async function invite(role, rawEmail) {
    const setFormError = role === "editor" ? setStaffError : setResidentError;
    const clearEmail = role === "editor" ? setStaffEmail : setResidentEmail;
    setError("");
    setResidentError("");
    setStaffError("");
    if (!rawEmail.trim()) {
      setFormError("Vul het Google-e-mailadres in.");
      return;
    }
    try {
      const response = await api.post("/editors/invites", { email: rawEmail, role });
      clearEmail("");
      if (response.data.promoted) {
        toast.show({
          message: `${response.data.user.username} is nu begeleider en mag kaarten ophangen.`,
        });
      } else if (response.data.upgraded) {
        toast.show({
          message: "Dit adres is nu uitgenodigd als begeleider.",
        });
      } else if (role === "editor") {
        toast.show({
          message: "Begeleider is uitgenodigd. Die persoon logt in met dit Google-adres.",
        });
      } else {
        toast.show({
          message: "Bewoner is toegevoegd. Die persoon kan nu inloggen met dit Google-adres.",
        });
      }
      await load();
    } catch (inviteError) {
      setFormError(getErrorMessage(inviteError));
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
          Alleen mensen die jij hier zet, kunnen inloggen. Bewoners kijken mee. Begeleiders mogen
          ook kaarten ophangen. Nog geen Google-account?{" "}
          <Link to="/google-account" className="underline decoration-accent-400 underline-offset-4">
            Zo maak je er een
          </Link>
          .
        </p>
        {error ? <p className="note-error mt-3 text-sm">{error}</p> : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <InviteBox
          eyebrow="Bewoners"
          title="Bewoner toevoegen"
          help="Typ het Google-adres van een bewoner. Daarna kan die persoon inloggen en het bord zien."
          label="Google-e-mail van de bewoner"
          inputId="resident-email"
          email={residentEmail}
          onEmailChange={setResidentEmail}
          onSubmit={(event) => {
            event.preventDefault();
            invite("visitor", residentEmail);
          }}
          buttonLabel="Bewoner toevoegen"
          buttonClass="btn-secondary"
          pending={pendingBewoners}
          pendingHelp="Deze bewoner is al toegevoegd en moet nog inloggen."
          onRevoke={revokeInvite}
          error={residentError}
        />
        <InviteBox
          eyebrow="Begeleiding"
          title="Begeleider uitnodigen"
          help="Typ het Google-adres van een begeleider. Die persoon mag daarna ook activiteiten plaatsen."
          label="Google-e-mail van de begeleider"
          inputId="staff-email"
          email={staffEmail}
          onEmailChange={setStaffEmail}
          onSubmit={(event) => {
            event.preventDefault();
            invite("editor", staffEmail);
          }}
          buttonLabel="Begeleider uitnodigen"
          buttonClass="btn-primary"
          pending={pendingBegeleiders}
          pendingHelp="Deze begeleider is al uitgenodigd en moet nog inloggen."
          onRevoke={revokeInvite}
          error={staffError}
        />
      </div>

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
            Nog geen bewoner. Gebruik de kaart Bewoner toevoegen hierboven.
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
