const XAI_RESPONSES_URL = "https://api.x.ai/v1/responses";
const MAX_TOOL_ROUNDS = 5;
const REQUEST_TIMEOUT_MS = 60_000;

export const MOTHER_TOOLS = [
  {
    type: "function",
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
  {
    type: "function",
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
  {
    type: "function",
    name: "library_stats",
    description: "Count the signed-in user's memories and images.",
    parameters: { type: "object", properties: {} },
  },
];

function responseText(response) {
  if (typeof response.output_text === "string" && response.output_text.trim()) return response.output_text.trim();
  return (response.output || [])
    .filter((item) => item.type === "message")
    .flatMap((item) => item.content || [])
    .filter((item) => item.type === "output_text" && typeof item.text === "string")
    .map((item) => item.text)
    .join("\n")
    .trim();
}

async function xaiRequest(payload, { apiKey, fetchImpl }) {
  const response = await fetchImpl(XAI_RESPONSES_URL, {
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
    const error = new Error(body?.error?.message || body?.error || `xAI returned ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return body;
}

export async function runMother({
  apiKey,
  model = "grok-4.5",
  systemPrompt,
  messages,
  conversationId,
  executeTool,
  fetchImpl = fetch,
}) {
  let response = await xaiRequest({
    model,
    input: [{ role: "system", content: systemPrompt }, ...messages],
    tools: MOTHER_TOOLS,
    tool_choice: "auto",
    parallel_tool_calls: false,
    max_output_tokens: 700,
    prompt_cache_key: conversationId,
  }, { apiKey, fetchImpl });
  const actions = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const calls = (response.output || []).filter((item) => item.type === "function_call");
    if (!calls.length) {
      return { message: responseText(response) || "I'm here with you. What would you like to remember?", actions };
    }
    const outputs = [];
    for (const call of calls) {
      let args = {};
      try {
        args = JSON.parse(call.arguments || "{}");
      } catch {
        args = {};
      }
      let result;
      try {
        result = await executeTool(call.name, args);
        if (result?.action) actions.push(result.action);
      } catch (error) {
        result = { error: error.message || "Tool failed" };
      }
      outputs.push({
        type: "function_call_output",
        call_id: call.call_id,
        output: JSON.stringify(result),
      });
    }
    response = await xaiRequest({
      model,
      previous_response_id: response.id,
      input: outputs,
      tools: MOTHER_TOOLS,
      parallel_tool_calls: false,
      max_output_tokens: 700,
      prompt_cache_key: conversationId,
    }, { apiKey, fetchImpl });
  }
  throw new Error("Mother reached the maximum number of memory actions for one message");
}
