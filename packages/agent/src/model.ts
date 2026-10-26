import Groq from "groq-sdk";
import { z } from "zod";

import type { AgentConfig } from "./config";

export const MODELS = {
  // Interviewer and evaluator.
  main: "openai/gpt-oss-120b",
  // Cheap, fast work like parsing a resume or JD into JSON.
  fast: "openai/gpt-oss-20b",
} as const;

export type ModelName = (typeof MODELS)[keyof typeof MODELS];
export type ModelClient = Groq;
export type Message = Groq.Chat.ChatCompletionMessageParam;

export function createModelClient(env: AgentConfig): ModelClient {
  // The SDK already retries 429s and 5xx with backoff, which matters on the free tier.
  return new Groq({ apiKey: env.GROQ_API_KEY, maxRetries: 3 });
}

type CompleteOptions = {
  system: string;
  messages: Message[];
  model?: ModelName;
  reasoningEffort?: "low" | "medium" | "high";
  maxTokens?: number;
};

export async function complete(
  client: ModelClient,
  { system, messages, model = MODELS.main, reasoningEffort = "medium", maxTokens = 4096 }: CompleteOptions,
): Promise<string> {
  const response = await client.chat.completions.create({
    model,
    messages: [{ role: "system", content: system }, ...messages],
    reasoning_effort: reasoningEffort,
    max_completion_tokens: maxTokens,
  });

  const choice = response.choices[0];
  if (!choice?.message.content) {
    throw new Error("Model returned an empty response.");
  }
  if (choice.finish_reason === "length") {
    throw new Error("Model response was cut off (hit max tokens).");
  }

  return choice.message.content.trim();
}

export type AgentErrorCode = "RATE_LIMITED" | "INVALID_OUTPUT" | "PROVIDER_ERROR";

export class AgentError extends Error {
  constructor(
    public code: AgentErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AgentError";
  }
}

type CompleteJsonOptions<T> = Omit<CompleteOptions, "model"> & {
  model?: ModelName;
  // Name sent to the API: letters, digits and underscores only.
  schemaName: string;
  // Groq strict mode: use z.strictObject and .nullable() instead of .optional().
  schema: z.ZodType<T>;
};

export async function completeJson<T>(
  client: ModelClient,
  {
    system,
    messages,
    schema,
    schemaName,
    model = MODELS.fast,
    reasoningEffort = "low",
    maxTokens = 8192,
  }: CompleteJsonOptions<T>,
): Promise<T> {
  const { $schema: _, ...jsonSchema } = z.toJSONSchema(schema) as Record<string, unknown>;

  // Strict mode makes bad output rare, so one retry is enough.
  for (let attempt = 1; ; attempt++) {
    let content: string | null | undefined;
    try {
      const response = await client.chat.completions.create({
        model,
        messages: [{ role: "system", content: system }, ...messages],
        reasoning_effort: reasoningEffort,
        max_completion_tokens: maxTokens,
        response_format: {
          type: "json_schema",
          json_schema: { name: schemaName, strict: true, schema: jsonSchema },
        },
      });
      content = response.choices[0]?.message.content;
    } catch (error) {
      // Groq validates strict output after generating it and returns a 400 on a mismatch.
      if (isJsonValidationError(error)) {
        if (attempt >= 2) {
          throw new AgentError("INVALID_OUTPUT", "The model returned output that didn't match the schema.");
        }
        continue;
      }
      if (error instanceof Groq.RateLimitError) {
        throw new AgentError("RATE_LIMITED", "The model is rate limited. Try again in a minute.");
      }
      if (error instanceof Groq.APIError) {
        throw new AgentError("PROVIDER_ERROR", `Model request failed: ${error.message}`);
      }
      throw error;
    }

    const result = schema.safeParse(content ? safeJsonParse(content) : undefined);
    if (result.success) return result.data;
    if (attempt >= 2) {
      throw new AgentError("INVALID_OUTPUT", "The model returned output that didn't match the schema.");
    }
  }
}

function isJsonValidationError(error: unknown) {
  if (!(error instanceof Groq.BadRequestError)) return false;
  const body = error.error as { error?: { code?: string } } | undefined;
  return body?.error?.code === "json_validate_failed";
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
