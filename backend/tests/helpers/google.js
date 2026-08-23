import "./env.js";
import crypto from "node:crypto";
import { setGoogleVerifier } from "../../src/googleVerify.js";
import { TEST_ENV } from "./env.js";

// A stand-in for Google. The suite must never reach the network, and CI has no
// way to click a real consent screen.
const payloads = new Map();

export const googleCalls = { count: 0, lastToken: null };

function jwtShaped() {
  // Three dot-separated parts, long enough to pass the shape check in
  // routes/auth.js. The contents are never parsed: the verifier is stubbed.
  const part = () => crypto.randomBytes(24).toString("base64url");
  return `${part()}.${part()}.${part()}`;
}

export function installFakeGoogle() {
  setGoogleVerifier(async (idToken) => {
    googleCalls.count += 1;
    googleCalls.lastToken = idToken;
    if (!payloads.has(idToken)) {
      // Google refuses tokens it did not issue.
      throw new Error("Invalid token signature");
    }
    return payloads.get(idToken);
  });
}

export function resetFakeGoogle() {
  payloads.clear();
  googleCalls.count = 0;
  googleCalls.lastToken = null;
}

/**
 * Hand out a credential our fake Google will accept, with a payload you control.
 * Defaults describe a normal, verified Google account. Passing a field as
 * `undefined` leaves it out of the payload, so tests can describe an answer that
 * is missing a piece.
 */
export function googleCredential(overrides = {}) {
  const payload = {
    aud: TEST_ENV.googleClientId,
    iss: "https://accounts.google.com",
    sub: `google-${crypto.randomBytes(6).toString("hex")}`,
    email: "iemand@example.test",
    email_verified: true,
    name: "Test Persoon",
  };

  const named = { emailVerified: "email_verified" };
  for (const [key, value] of Object.entries(overrides)) {
    const field = named[key] ?? key;
    if (value === undefined) {
      delete payload[field];
    } else {
      payload[field] = value;
    }
  }

  const token = jwtShaped();
  payloads.set(token, payload);
  return token;
}

/** A credential Google itself would refuse (unknown signature). */
export function forgedCredential() {
  return jwtShaped();
}

/** A credential where Google answers, but with nothing usable. */
export function emptyPayloadCredential() {
  const token = jwtShaped();
  payloads.set(token, null);
  return token;
}
