import Anthropic from "@anthropic-ai/sdk";

import type { AgentConfig } from "./config";

export const MODEL = "claude-opus-5-5";

export type ModelClient = Anthropic;
export type Message = Anthropic.Beta.BetaMessageParam;

export function createModelClient(env: AgentConfig): ModelClient {
  return new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
}

type CompleteOptions = {
  system: string;
  messages: Message[];
  effort?: "low" | "medium" | "high" | "xhigh" | "max";
};

export async function complete(
  client: ModelClient,
  { system, messages, effort = "medium" }: CompleteOptions,
): Promise<string> {
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    system,
    messages,
    output_config: { effort },
    // If a safety classifier declines, the API retries on a fallback model in the same call.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
  });

  if (response.stop_reason === "refusal") {
    throw new Error(`Model refused: ${response.stop_details?.explanation ?? "no details"}`);
  }

  return response.content
    .flatMap((block) => (block.type === "text" ? [block.text] : []))
    .join("")
    .trim();
}
