const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
const MAX_TOOL_ROUNDS = 5;
const REQUEST_TIMEOUT_MS = 60_000;

export const MOTHER_TOOLS = [
  {
    type: "function",
    function: {
      name: "search_memories",
      description: "Search or browse only the signed-in user's MiD memories. Use this when the user asks what they remember, mentions a topic/date/tag/category, or asks for recent memories.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Words to find in memory content, description, category, or tags." },
          category: { type: "string", description: "Optional exact category filter." },
          tags: { type: "array", items: { type: "string" }, description: "Optional tags; a memory matching any supplied tag is returned." },
          limit: { type: "integer", minimum: 1, maximum: 20, default: 10 },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "save_memory",
      description: "Save a new text memory for the signed-in user. Call only when the user clearly asks Mother to remember, record, note, or save something.",
      parameters: {
        type: "object",
        properties: {
          content: { type: "string", description: "The memory text to save, preserving the user's meaning." },
          category: { type: "string", description: "Optional organizational category." },
          tags: { type: "array", items: { type: "string" }, description: "Optional short lowercase labels." },
        },
        required: ["content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "library_stats",
      description: "Count the signed-in user's memories and images.",
      parameters: { type: "object", properties: {} },
    },
  },
];

async function groqRequest(payload, { apiKey, fetchImpl }) {
  const response = await fetchImpl(GROQ_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = {};
  }
  if (!response.ok) {
    const error = new Error(body?.error?.message || body?.error || `Groq returned ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return body;
}

export async function runMother({
  apiKey,
  model = "openai/gpt-oss-120b",
  systemPrompt,
  messages,
  executeTool,
  fetchImpl = fetch,
}) {
  const conversation = [{ role: "system", content: systemPrompt }, ...messages];
  const actions = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const response = await groqRequest({
      model,
      messages: conversation,
      tools: MOTHER_TOOLS,
      tool_choice: "auto",
      parallel_tool_calls: false,
      max_completion_tokens: 700,
    }, { apiKey, fetchImpl });
    const assistant = response?.choices?.[0]?.message;
    if (!assistant) throw new Error("Groq returned an empty response");
    const calls = Array.isArray(assistant.tool_calls) ? assistant.tool_calls : [];
    if (!calls.length) {
      const content = typeof assistant.content === "string" ? assistant.content.trim() : "";
      return { message: content || "I'm here with you. What would you like to remember?", actions };
    }

    conversation.push({
      role: "assistant",
      content: assistant.content || null,
      tool_calls: calls,
    });
    for (const call of calls) {
      let args = {};
      try {
        args = JSON.parse(call.function?.arguments || "{}");
      } catch {
        args = {};
      }
      let result;
      try {
        result = await executeTool(call.function?.name, args);
        if (result?.action) actions.push(result.action);
      } catch (error) {
        result = { error: error.message || "Tool failed" };
      }
      conversation.push({
        role: "tool",
        tool_call_id: call.id,
        name: call.function?.name,
        content: JSON.stringify(result),
      });
    }
  }
  throw new Error("Mother reached the maximum number of memory actions for one message");
}
