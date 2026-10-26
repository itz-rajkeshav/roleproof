import { completeJson, type ModelClient } from "../model";
import { PARSE_JD_SYSTEM, PARSE_RESUME_SYSTEM, wrapDocument } from "../prompts/parse";
import { ParsedJobDescription, ParsedResume } from "./schemas";

export { ParsedJobDescription, ParsedResume } from "./schemas";

export function parseResume(client: ModelClient, text: string) {
  return completeJson(client, {
    system: PARSE_RESUME_SYSTEM,
    messages: [{ role: "user", content: wrapDocument(text) }],
    schema: ParsedResume,
    schemaName: "parsed_resume",
  });
}

export function parseJobDescription(client: ModelClient, text: string) {
  return completeJson(client, {
    system: PARSE_JD_SYSTEM,
    messages: [{ role: "user", content: wrapDocument(text) }],
    schema: ParsedJobDescription,
    schemaName: "parsed_job_description",
  });
}
