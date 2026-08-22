# 🏠 Leviaan Campus

Het activiteitenbord van het huis. Een verpleegkundige hangt kaarten op. Huisgenoten kijken mee, zeggen of ze erbij zijn, en zien alleen elkaars gebruikersnaam.

Live: [leviaan.vercel.app](https://leviaan.vercel.app) · Code: [github.com/raimonvibe/leviaan](https://github.com/raimonvibe/leviaan) · Over Leviaan: [leviaan.nl](https://www.leviaan.nl)

## ✨ Wat is dit?

Leviaan Campus is een klein, rustig bord voor het echte huis — geen taken-app, geen chat, geen publiek social netwerk. Op elke kaart staat wat er speelt: een foto, een korte tekst en een datum (van–tot).

Iedereen logt in met **Google** en kiest één keer een **gebruikersnaam**. Die naam is het enige wat anderen zien. E-mailadressen blijven privé, ook voor huisgenoten.

De sfeer is klassiek campus: navy, goud, baksteen. Licht en donker. Nederlands.

## 👥 Wie doet wat?

| Rol | Mag |
| --- | --- |
| 👀 Bezoeker | Bord bekijken, zoeken, filteren, “ik ben erbij” aanzetten |
| ✏️ Redacteur | Kaarten maken, bewerken, naar de prullenbak, herstellen |
| 🔑 Beheerder | Alles van redacteur, plus redacteuren uitnodigen |

Bezoekers zien **niet** wie er nog meer komt. Redacteuren en de beheerder wel, als gebruikersnaam.

## 📌 Wat erin zit

- Google-login, daarna zelf een gebruikersnaam kiezen
- Kaarten met foto, titel, tekst en datumreeks
- Alleen / komend / geweest, plus zoeken
- Link naar één bericht kopiëren
- Soft delete met undo en een prullenbak
- Aanwezigheid: bezoeker vinkt zichzelf aan, zonder namen te zien
- Licht- en donkermodus
- Privacy-pagina in gewone taal

De opzet lijkt op [TaskFlow](https://github.com/raimonvibe/TaskFlow) (React + Express + Postgres), maar zonder Docker, Kubernetes of monitoring. Hosting is expres simpel: **Vercel** (site), **Render** (API), **Neon** (database).

## 🛠️ Stack

- Frontend: React 19, Vite, Tailwind CSS 4, React Router, Google Identity
- Backend: Node.js, Express, JWT, `google-auth-library`
- Database: PostgreSQL via Neon

## 🔐 Geheimhouding

Zet echte sleutels **nooit** in git, in deze README of in issues.

- Kopieer `backend/.env.example` naar `backend/.env` en `frontend/.env.example` naar `frontend/.env`.
- Vul waarden alleen in die lokale bestanden of in de dashboards van Neon, Render, Vercel en Google Cloud.
- `.env` staat in `.gitignore`. Alleen de `.env.example`-bestanden (met nepwaarden) mogen in de repo.

Controleer voor een commit:

```powershell
git status
```

Er mag geen `.env` in de lijst staan.

## 💻 Lokaal starten

### 1. Neon

1. Maak een project op [neon.tech](https://neon.tech).
2. Kopieer de **directe** connection string (host zonder `-pooler` in de naam).
3. Plak die in `backend/.env` bij `DATABASE_URL`. Voeg `?sslmode=require` toe als die er nog niet staat. De pooler-url kan het schema bij opstarten weigeren.
4. Het schema wordt automatisch toegepast als de API start.

### 2. Google-login

1. Open [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials.
2. Maak een OAuth-client van het type **Web application**.
3. Authorized JavaScript origins (lokaal): `http://localhost:5173`
4. Redirect URIs zijn voor deze app niet nodig (Google Identity-token).
5. Zet dezelfde **Client ID** in:
   - `GOOGLE_CLIENT_ID` in `backend/.env`
   - `VITE_GOOGLE_CLIENT_ID` in `frontend/.env`
6. Zet `CREATOR_EMAIL` op het Google-adres dat beheerder moet worden.

### 3. Env-bestanden

```powershell
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env
```

`JWT_SECRET` is een lange willekeurige tekst die je zelf bedenkt.

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

## ☁️ Online zetten

Volgorde: Neon → Render → Vercel → Google origins bijwerken.

### Render (API)

1. New → Web Service, koppel deze GitHub-repo.
2. Root directory: `backend`
3. Build: `npm install`
4. Start: `npm start`
5. Health check: `/health`
6. Zet deze variabelen **in het Render-dashboard**, niet in git:

| Variabele | Toelichting |
| --- | --- |
| `DATABASE_URL` | Neon **direct** host (`ep-….neon.tech`), niet de pooler |
| `JWT_SECRET` | Nieuwe geheime tekst |
| `GOOGLE_CLIENT_ID` | Dezelfde Google Client ID |
| `CREATOR_EMAIL` | Beheerders-Google-adres |
| `FRONTEND_URL` | `https://leviaan.vercel.app` (zonder slash) |
| `NODE_ENV` | `production` |

### Vercel (frontend)

Dit is een **Vite**-app, geen Create React App.

| Vercel-veld | Waarde |
| --- | --- |
| Root Directory | `frontend` |
| Framework Preset | **Vite** |
| Build Command | `npm run build` |
| Output Directory | `dist` (niet `build`) |

| Variabele | Toelichting |
| --- | --- |
| `VITE_API_URL` | Render-url, zonder slash aan het eind |
| `VITE_GOOGLE_CLIENT_ID` | Dezelfde Client ID |

Live frontend: `https://leviaan.vercel.app`

In Google Cloud → Authorized JavaScript origins:

- `http://localhost:5173`
- `https://leviaan.vercel.app`

### Fout 401: invalid_client

Google herkent de Client ID niet. Dat is geen code-fout in deze repo.

1. Maak of herstel een **OAuth 2.0 Client ID** (Web application).
2. Zet diezelfde Client ID lokaal, op Render en op Vercel.
3. Op Vercel: **Redeploy** (Vite bakt de waarde in bij de build).

Gebruik alleen de Client ID, niet de Client Secret.

### Keep-alive

Render free slaapt na ~15 minuten. `.github/workflows/keepalive.yml` pingt `/health` elke 10 minuten.

GitHub-repo → Settings → Secrets and variables → Actions → Variables → `RENDER_BACKEND_URL` = de publieke Render-url (geen geheim).

## 📷 Foto's bij berichten

Redacteuren kiezen een afbeelding in het formulier. Die gaat niet naar Vercel- of Render-schijf.

1. De browser verkleint de foto tot max 1280 px en slaat die op als JPEG.
2. De API bewaart de foto als data-URL in Neon.
3. Alleen een geldige `data:image/...` tot ongeveer 1,8 miljoen tekens wordt geaccepteerd.

Voor een huisbord is dit genoeg. Heel veel of hele grote foto's maken Neon zwaarder.

## 🔒 Privacy in het kort

- Alleen je gebruikersnaam is zichtbaar.
- E-mail blijft privé.
- Bezoekers zien geen namenlijst bij “ik ben erbij”.
- De volledige tekst staat op de [privacy-pagina](https://leviaan.vercel.app/privacy) in de app.
