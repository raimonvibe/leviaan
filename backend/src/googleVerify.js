import { OAuth2Client } from "google-auth-library";

// The one place that talks to Google. Kept thin on purpose: tests replace it so
// the suite never needs the network, and everything around it (shape checks,
// audience, issuer, the house list) keeps running for real.
async function verifyWithGoogle(idToken) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID is required");
  }
  const ticket = await new OAuth2Client(clientId).verifyIdToken({
    idToken,
    audience: clientId,
  });
  return ticket.getPayload();
}

let verifier = verifyWithGoogle;

export function verifyGoogleIdToken(idToken) {
  return verifier(idToken);
}

// Test seam. Refused in production so a live server can never be pointed away
// from Google.
export function setGoogleVerifier(fn) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("The Google verifier cannot be replaced in production");
  }
  verifier = typeof fn === "function" ? fn : verifyWithGoogle;
}
