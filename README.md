# Leviaan Campus

Activiteitenbord voor huisgenoten. De verpleegkundige (redacteur) hangt kaarten op met een foto, tekst en datum. Bezoekers loggen in met Google, kiezen een gebruikersnaam en kijken mee. E-mailadressen blijven privé.

De opzet volgt [TaskFlow](https://github.com/raimonvibe/TaskFlow): React + Vite-frontend, Express-API, PostgreSQL. Geen Docker, Kubernetes of monitoring. Hosting: **Vercel** (frontend), **Render** (API), **Neon** (database).

## Wat erin zit

- Google-login voor iedereen
- Gebruikersnaam bij de eerste keer; die naam is het enige publieke label
- Berichtkaarten: afbeelding, tekst, datum
- Alleen beheerder en redacteuren kunnen plaatsen, bewerken en verwijderen
- Beheerder nodigt redacteuren uit via e-mail of promoveert bestaande bezoekers
- Licht- en donkermodus, klassieke campusstijl

## Geheimhouding

Zet echte sleutels **nooit** in git, in deze README of in issues.

- Kopieer `backend/.env.example` naar `backend/.env` en `frontend/.env.example` naar `frontend/.env`.
- Vul de waarden alleen in die lokale `.env`-bestanden of in de dashboards van Neon, Render, Vercel en Google Cloud.
- `.env` en `.env.*` staan in `.gitignore`. Alleen de `.env.example`-bestanden (met nepwaarden) mogen in de repo.
- Deel geen connection strings, JWT-geheimen of OAuth-clientgegevens in chat of screenshots.

Controleer voor een commit:

```powershell
git status
```

Er mag geen `.env` in de lijst staan.

## Lokaal starten

### 1. Neon

1. Maak een project op [neon.tech](https://neon.tech).
2. Kopieer de **directe** connection string uit het Neon-dashboard.
3. Plak die alleen in `backend/.env` bij `DATABASE_URL`. Voeg `?sslmode=require` toe als die er nog niet staat.
4. Het schema wordt automatisch toegepast bij het starten van de API. Je hoeft geen SQL handmatig te draaien.

### 2. Google-login

1. Open [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials.
2. Maak een OAuth-client van het type **Web application**.
3. Authorized JavaScript origins (lokaal): `http://localhost:5173`
4. Authorized redirect URIs zijn voor deze app niet nodig (Google Identity-token).
5. Kopieer de **Client ID** naar:
   - `GOOGLE_CLIENT_ID` in `backend/.env`
   - `VITE_GOOGLE_CLIENT_ID` in `frontend/.env` (dezelfde waarde)
6. Zet `CREATOR_EMAIL` in `backend/.env` op het Google-adres dat beheerder moet worden. De eerste login met dat adres krijgt de rol beheerder.

### 3. Env-bestanden

```powershell
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env
```

Vul daarna de placeholders. `JWT_SECRET` is een lange willekeurige tekst die je zelf bedenkt. Die komt niet uit Google of Neon.

| Bestand | Variabele | Waar vandaan |
| --- | --- | --- |
| `backend/.env` | `DATABASE_URL` | Neon-dashboard |
| `backend/.env` | `JWT_SECRET` | Zelf verzinnen |
| `backend/.env` | `GOOGLE_CLIENT_ID` | Google Cloud |
| `backend/.env` | `CREATOR_EMAIL` | Jouw Google-account |
| `backend/.env` | `FRONTEND_URL` | `http://localhost:5173` lokaal |
| `frontend/.env` | `VITE_API_URL` | `http://localhost:3000` lokaal |
| `frontend/.env` | `VITE_GOOGLE_CLIENT_ID` | Dezelfde Client ID als de API |

### 4. Installeren en starten

```powershell
npm install
npm run install:all
npm run dev
```

- Frontend: http://localhost:5173
- API-health: http://localhost:3000/health

Log in met Google. Het account in `CREATOR_EMAIL` wordt beheerder. Nodig daarna redacteuren uit via **Redactie**.

## Online zetten

Werk in deze volgorde: Neon (al klaar) → Render → Vercel → Google origins bijwerken.

### Render (API)

1. New → Web Service, koppel deze GitHub-repo.
2. Root directory: `backend`
3. Build: `npm install`
4. Start: `npm start`
5. Health check: `/health`
6. Zet deze environment variables **in het Render-dashboard**, niet in git:

| Variabele | Toelichting |
| --- | --- |
| `DATABASE_URL` | Neon, directe string |
| `JWT_SECRET` | Nieuwe geheime tekst, anders dan lokaal mag |
| `GOOGLE_CLIENT_ID` | Dezelfde Google Client ID |
| `CREATOR_EMAIL` | Beheerders-Google-adres |
| `FRONTEND_URL` | Later jouw Vercel-url, zonder slash aan het eind |
| `NODE_ENV` | `production` |

Je kunt ook `render.yaml` gebruiken; de geheime waarden blijven `sync: false` en vul je in het dashboard in.

### Vercel (frontend)

1. Import de repo in Vercel.
2. Root directory: `frontend`
3. Zet environment variables **in het Vercel-dashboard**:

| Variabele | Toelichting |
| --- | --- |
| `VITE_API_URL` | Render-url, bijvoorbeeld `https://jouw-service.onrender.com` (zonder `/` aan het eind) |
| `VITE_GOOGLE_CLIENT_ID` | Dezelfde Google Client ID |

4. Na de eerste deploy: zet de Vercel-url in Render bij `FRONTEND_URL`.
5. In Google Cloud: voeg de Vercel-url toe aan Authorized JavaScript origins.

## Rollen

| Rol | Mag |
| --- | --- |
| Bezoeker | Bord en overzicht bekijken |
| Redacteur | Berichten plaatsen, bewerken, verwijderen |
| Beheerder | Alles van redacteur, plus redactie uitnodigen |

E-mailadressen van bezoekers zijn nergens zichtbaar op het bord. Alleen de beheerder ziet een e-mailadres bij een open uitnodiging die die zelf heeft ingevoerd.

## Stack

- Frontend: React 19, Vite, Tailwind CSS 4, React Router, Google Identity
- Backend: Node.js, Express, JWT, `google-auth-library`
- Database: PostgreSQL via Neon
