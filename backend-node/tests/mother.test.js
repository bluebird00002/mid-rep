import { runMother } from "../services/mother.js";
import { jest } from "@jest/globals";

const response = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => JSON.stringify(body),
});

describe("Mother Groq orchestration", () => {
  test("returns a normal companion response without a tool call", async () => {
    const result = await runMother({
      apiKey: "test-key",
      systemPrompt: "You are Mother",
      messages: [{ role: "user", content: "Hello" }],
      executeTool: jest.fn(),
      fetchImpl: jest.fn(async () => response({
        choices: [{ message: { role: "assistant", content: "Hello, I'm here." } }],
      })),
    });
    expect(result.message).toBe("Hello, I'm here.");
    expect(result.actions).toEqual([]);
  });

  test("executes a requested memory tool and returns its result to Groq", async () => {
    const fetchImpl = jest.fn()
      .mockResolvedValueOnce(response({
        choices: [{ message: { role: "assistant", content: null, tool_calls: [{ id: "call-1", type: "function", function: { name: "save_memory", arguments: '{"content":"A milestone"}' } }] } }],
      }))
      .mockResolvedValueOnce(response({
        choices: [{ message: { role: "assistant", content: "I've saved that milestone." } }],
      }));
    const executeTool = jest.fn(async () => ({ saved: true, id: "mem-1", action: { type: "memory_saved", id: "mem-1" } }));
    const result = await runMother({
      apiKey: "test-key",
      systemPrompt: "You are Mother",
      messages: [{ role: "user", content: "Remember my milestone" }],
      executeTool,
      fetchImpl,
    });
    expect(executeTool).toHaveBeenCalledWith("save_memory", { content: "A milestone" });
    expect(result.actions).toEqual([{ type: "memory_saved", id: "mem-1" }]);
    const continuation = JSON.parse(fetchImpl.mock.calls[1][1].body);
    expect(continuation.model).toBe("openai/gpt-oss-120b");
    expect(continuation.messages.at(-1)).toEqual(expect.objectContaining({ role: "tool", tool_call_id: "call-1" }));
  });
});
