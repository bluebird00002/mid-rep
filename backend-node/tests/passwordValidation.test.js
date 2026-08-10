import { validatePasswordStrength } from "../utils/passwordValidation.js";

describe("password validation", () => {
  test("accepts a password satisfying every advertised rule", () => {
    expect(validatePasswordStrength("Strong#8").valid).toBe(true);
  });

  test.each(["Short#1", "lowercase#8", "UPPERCASE#8", "NoNumber#", "NoSymbol8", "Has Space#8"])(
    "rejects weak password %s",
    (password) => expect(validatePasswordStrength(password).valid).toBe(false),
  );
});
