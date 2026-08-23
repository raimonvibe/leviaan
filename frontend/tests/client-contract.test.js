// Light checks on the page side. These read the source rather than a browser:
// they cannot prove what React renders, but they can prove the promises the
// backend tests lean on — the session rides on a cookie, and the page never
// keeps a token of its own.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test, { describe } from "node:test";
import { fileURLToPath } from "node:url";

const frontendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = path.join(frontendDir, "src");

function sourceFiles() {
  return fs
    .readdirSync(srcDir, { recursive: true })
    .map((entry) => path.join(srcDir, String(entry)))
    .filter((file) => /\.(js|jsx)$/.test(file) && fs.statSync(file).isFile());
}

function read(relative) {
  return fs.readFileSync(path.join(srcDir, relative), "utf8");
}

/** Comments describe intentions; only code can break a promise. */
function withoutComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("the page keeps nothing", () => {
  test("every call carries the cookie", () => {
    const client = withoutComments(read("api/client.js"));

    assert.match(client, /withCredentials:\s*true/, "axios was not told to send the cookie");
  });

  test("no request sets an Authorization header", () => {
    for (const file of sourceFiles()) {
      const source = withoutComments(fs.readFileSync(file, "utf8"));
      assert.doesNotMatch(
        source,
        /Authorization\s*[:=]/i,
        `${path.relative(frontendDir, file)} sets an Authorization header`,
      );
      assert.doesNotMatch(
        source,
        /Bearer\s/i,
        `${path.relative(frontendDir, file)} mentions a bearer token`,
      );
    }
  });

  test("no token is written to localStorage or sessionStorage", () => {
    const allowed = /^(theme|leviaan_theme)$/;

    for (const file of sourceFiles()) {
      const source = withoutComments(fs.readFileSync(file, "utf8"));
      assert.doesNotMatch(
        source,
        /sessionStorage/,
        `${path.relative(frontendDir, file)} uses sessionStorage`,
      );

      for (const match of source.matchAll(/localStorage\.setItem\(\s*([^,]+),/g)) {
        const key = match[1].trim().replace(/^["'`]|["'`]$/g, "");
        const constantValue = key === "THEME_KEY" ? "theme" : key;
        assert.match(
          constantValue,
          allowed,
          `${path.relative(frontendDir, file)} stores "${key}" in localStorage`,
        );
      }

      for (const match of source.matchAll(/localStorage\.getItem\(\s*([^,)]+)\)/g)) {
        const key = match[1].trim().replace(/^["'`]|["'`]$/g, "");
        const constantValue = key === "THEME_KEY" ? "theme" : key;
        assert.match(
          constantValue,
          allowed,
          `${path.relative(frontendDir, file)} reads "${key}" from localStorage`,
        );
      }
    }
  });

  test("a leftover token from the old login style is thrown away on load", () => {
    const auth = withoutComments(read("contexts/AuthContext.jsx"));

    assert.match(auth, /localStorage\.removeItem\(\s*["']leviaan_token["']\s*\)/);
  });

  test("logging in sends the Google credential and nothing else", () => {
    const auth = withoutComments(read("contexts/AuthContext.jsx"));

    const call = auth.match(/api\.post\(\s*["']\/auth\/google["']\s*,\s*([^)]*)\)/);
    assert.ok(call, "AuthContext does not post to /auth/google");
    assert.equal(call[1].replace(/\s/g, ""), "{credential}", `it posts ${call[1].trim()}`);

    assert.doesNotMatch(auth, /access_?token/i, "AuthContext still knows about access tokens");
  });

  test("the login page hands over only what Google gave it", () => {
    const login = withoutComments(read("pages/Login.jsx"));

    assert.match(login, /loginWithGoogle\(\s*\{\s*credential\s*\}\s*\)/);
    assert.doesNotMatch(login, /access_?token/i);
    assert.doesNotMatch(login, /localStorage/, "the login page touches localStorage");
  });

  test("nothing pops a system dialog", () => {
    for (const file of sourceFiles()) {
      const source = withoutComments(fs.readFileSync(file, "utf8"));
      assert.doesNotMatch(
        source,
        /\bwindow\.(alert|confirm|prompt)\s*\(/,
        `${path.relative(frontendDir, file)} uses a system popup`,
      );
    }
  });

  test("editors confirm in the site dialog before removing someone", () => {
    const editors = withoutComments(read("pages/Editors.jsx"));
    const removeFn = editors.slice(editors.indexOf("function removeUser"), editors.indexOf("function revokeInvite"));

    assert.match(removeFn, /dialog\.confirm\(/);
    assert.ok(
      removeFn.indexOf("dialog.confirm") < removeFn.indexOf("api.delete"),
      "the delete ran before the site dialog",
    );
    assert.match(removeFn, /Ja, begeleider verwijderen/);
    assert.match(removeFn, /Ja, bewoner verwijderen/);
  });

  test("nothing talks to the API around the shared client", () => {
    for (const file of sourceFiles()) {
      if (file.endsWith(path.join("api", "client.js"))) continue;
      const source = withoutComments(fs.readFileSync(file, "utf8"));
      assert.doesNotMatch(
        source,
        /\baxios\s*\.\s*(get|post|put|patch|delete|request)\b/,
        `${path.relative(frontendDir, file)} calls axios directly, so it may miss the cookie`,
      );
      assert.doesNotMatch(
        source,
        /\bfetch\s*\(\s*["'`]?https?:/,
        `${path.relative(frontendDir, file)} calls the API with fetch, so it may miss the cookie`,
      );
    }
  });
});
