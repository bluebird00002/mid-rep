import { runMother } from "../services/mother.js";
import { jest } from "@jest/globals";

const response = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => JSON.stringify(body),
});

describe("Mother Grok orchestration", () => {
  test("returns a normal companion response without a tool call", async () => {
    const result = await runMother({
      apiKey: "test-key",
      systemPrompt: "You are Mother",
      messages: [{ role: "user", content: "Hello" }],
      conversationId: "conversation_123",
      executeTool: jest.fn(),
      fetchImpl: jest.fn(async () => response({
        id: "resp-1",
        output: [{ type: "message", content: [{ type: "output_text", text: "Hello, I'm here." }] }],
      })),
    });
    expect(result.message).toBe("Hello, I'm here.");
    expect(result.actions).toEqual([]);
  });

  test("executes a requested memory tool and returns its result to Grok", async () => {
    const fetchImpl = jest.fn()
      .mockResolvedValueOnce(response({
        id: "resp-1",
        output: [{ type: "function_call", call_id: "call-1", name: "save_memory", arguments: '{"content":"A milestone"}' }],
      }))
      .mockResolvedValueOnce(response({
        id: "resp-2",
        output: [{ type: "message", content: [{ type: "output_text", text: "I've saved that milestone." }] }],
      }));
    const executeTool = jest.fn(async () => ({ saved: true, id: "mem-1", action: { type: "memory_saved", id: "mem-1" } }));
    const result = await runMother({
      apiKey: "test-key",
      systemPrompt: "You are Mother",
      messages: [{ role: "user", content: "Remember my milestone" }],
      conversationId: "conversation_123",
      executeTool,
      fetchImpl,
    });
    expect(executeTool).toHaveBeenCalledWith("save_memory", { content: "A milestone" });
    expect(result.actions).toEqual([{ type: "memory_saved", id: "mem-1" }]);
    const continuation = JSON.parse(fetchImpl.mock.calls[1][1].body);
    expect(continuation.previous_response_id).toBe("resp-1");
    expect(continuation.input[0]).toEqual(expect.objectContaining({ type: "function_call_output", call_id: "call-1" }));
  });
});
