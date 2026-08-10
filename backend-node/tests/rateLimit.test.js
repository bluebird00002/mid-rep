import { rateLimit } from "../middleware/rateLimit.js";
import { jest } from "@jest/globals";

describe("rateLimit", () => {
  test("blocks requests after the configured per-IP limit", () => {
    const middleware = rateLimit(2, 60_000, `test-${Date.now()}`);
    const request = { ip: "127.0.0.99" };
    const response = {
      headers: {},
      setHeader(name, value) { this.headers[name] = value; },
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(payload) { this.payload = payload; return this; },
    };
    const next = jest.fn();

    middleware(request, response, next);
    middleware(request, response, next);
    middleware(request, response, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(response.statusCode).toBe(429);
    expect(response.headers["Retry-After"]).toBeDefined();
  });
});
