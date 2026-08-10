import assert from "node:assert/strict";
import test from "node:test";
import { validateAccountPassword, validateAccountUsername } from "../src/accountValidation.js";

test("account usernames accept four characters and reject invalid input immediately", () => {
  assert.equal(validateAccountUsername("user").valid, true);
  assert.match(validateAccountUsername("abc").error, /at least 4/);
  assert.match(validateAccountUsername("12_3").error, /one letter/);
  assert.match(validateAccountUsername("bad name").error, /spaces/);
  assert.equal(validateAccountUsername("ceo-tech").valid, true);
  assert.equal(validateAccountUsername("Ceo0001").username, "ceo0001");
});

test("account passwords require all advertised strength properties", () => {
  assert.equal(validateAccountPassword("Strong#8").valid, true);
  assert.match(validateAccountPassword("password").error, /uppercase letter/);
  assert.match(validateAccountPassword("Password8").error, /symbol/);
  assert.match(validateAccountPassword("Good #88").error, /no spaces/);
});
