import assert from "node:assert/strict";
import test, { describe, mock } from "node:test";
import { log, redactEmail, redactText } from "../src/log.js";

describe("operational logs keep emails off the page", () => {
  test("an address is shortened, never written in full", () => {
    assert.equal(redactEmail("jane.doe@gmail.com"), "j***@g***.com");
    assert.equal(redactEmail("A@Huis.nl"), "a***@h***.nl");
    assert.equal(redactEmail(""), "[redacted]");
    assert.doesNotMatch(redactEmail("beheerder@leviaan.nl"), /beheerder@leviaan\.nl/i);
  });

  test("a sentence that names an inbox is cleaned the same way", () => {
    const cleaned = redactText("Google login failed for pat@example.test: token expired");
    assert.match(cleaned, /p\*\*\*@e\*\*\*\.test/);
    assert.doesNotMatch(cleaned, /pat@example\.test/);
  });

  test("a log line is one JSON object and drops secrets", () => {
    const printed = mock.method(console, "warn", () => {});

    log("warn", "auth.login", {
      outcome: "denied",
      reason: "not_on_list",
      email: "nieuw@huis.nl",
      credential: "should-never-appear",
      token: "should-never-appear",
    });

    printed.mock.restore();
    assert.equal(printed.mock.calls.length, 1);
    const line = printed.mock.calls[0].arguments[0];
    const payload = JSON.parse(line);

    assert.equal(payload.event, "auth.login");
    assert.equal(payload.level, "warn");
    assert.equal(payload.email, "n***@h***.nl");
    assert.equal(payload.reason, "not_on_list");
    assert.equal("credential" in payload, false);
    assert.equal("token" in payload, false);
    assert.doesNotMatch(line, /nieuw@huis\.nl/);
  });
});
