import "./env.js";
import { once } from "node:events";
import { createApp } from "../../src/app.js";
import { TEST_ENV } from "./env.js";

export const SESSION_COOKIE = "leviaan_session";

/** Boot the real Express app on a throwaway port. No listen() in src/app.js. */
export async function startServer({ rateLimits = false } = {}) {
  const server = createApp({ rateLimits }).listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    client: () => new Client(`http://127.0.0.1:${port}`),
    async close() {
      server.close();
      await once(server, "close");
    },
  };
}

/**
 * A browser-ish client: it keeps cookies the way a browser would, so tests can
 * see exactly what the page would and would not have.
 */
export class Client {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.cookies = new Map();
    this.lastSetCookies = [];
  }

  get sessionCookie() {
    return this.cookies.get(SESSION_COOKIE) ?? null;
  }

  cookieHeader() {
    if (this.cookies.size === 0) return null;
    return [...this.cookies].map(([name, value]) => `${name}=${value}`).join("; ");
  }

  storeCookies(response) {
    const raw = response.headers.getSetCookie?.() ?? [];
    this.lastSetCookies = raw;
    for (const line of raw) {
      const [pair, ...attributes] = line.split(";");
      const separator = pair.indexOf("=");
      if (separator === -1) continue;
      const name = pair.slice(0, separator).trim();
      const value = pair.slice(separator + 1).trim();
      const expired = attributes.some((attribute) => /^\s*Max-Age=0\s*$/i.test(attribute));
      if (expired || value === "") {
        this.cookies.delete(name);
      } else {
        this.cookies.set(name, value);
      }
    }
  }

  async request(method, path, { body, rawBody, headers = {}, origin } = {}) {
    const sent = { ...headers };
    const mutating = !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());

    // A real page always sends Origin on mutating calls. Tests that care about
    // the origin rule pass their own (origin: null drops the header).
    if (origin !== null) {
      const value = origin ?? (mutating ? TEST_ENV.frontendUrl : undefined);
      if (value) sent.Origin = value;
    }

    const cookie = this.cookieHeader();
    if (cookie) sent.Cookie = cookie;

    let payload;
    if (rawBody !== undefined) {
      payload = rawBody;
      sent["Content-Type"] = sent["Content-Type"] ?? "application/json";
    } else if (body !== undefined) {
      payload = JSON.stringify(body);
      sent["Content-Type"] = "application/json";
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: sent,
      body: payload,
      redirect: "manual",
    });

    this.storeCookies(response);

    const text = await response.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }

    return {
      status: response.status,
      headers: response.headers,
      setCookies: this.lastSetCookies,
      text,
      body: json,
    };
  }

  get(path, options) {
    return this.request("GET", path, options);
  }

  post(path, body, options) {
    return this.request("POST", path, { body, ...options });
  }

  put(path, body, options) {
    return this.request("PUT", path, { body, ...options });
  }

  patch(path, body, options) {
    return this.request("PATCH", path, { body, ...options });
  }

  delete(path, options) {
    return this.request("DELETE", path, options);
  }
}

/** Did this response hand the browser a session? */
export function sessionCookieFrom(response) {
  return (
    response.setCookies.find(
      (line) => line.startsWith(`${SESSION_COOKIE}=`) && !/Max-Age=0/i.test(line),
    ) ?? null
  );
}
