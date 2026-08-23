// In production the page talks to /api on the same host. Vercel forwards that
// to Render, so Safari on iPhone/iPad can keep the session cookie.
export const API_URL = import.meta.env.DEV ? import.meta.env.VITE_API_URL || "http://localhost:3000" : "";
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
