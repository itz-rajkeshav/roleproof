import { z } from "zod";

// Groq strict mode: every field is required, so "maybe missing" is .nullable(), never .optional().

export const ParsedResume = z.strictObject({
  isResume: z.boolean().describe("false if the document is clearly not a resume/CV"),
  name: z.string().nullable(),
  headline: z.string().nullable().describe("one line, e.g. 'Backend engineer, 3 years, Go and Postgres'"),
  yearsOfExperience: z.number().nullable(),
  skills: z.array(z.string()),
  experience: z.array(
    z.strictObject({
      company: z.string(),
      title: z.string(),
      start: z.string().nullable(),
      end: z.string().nullable().describe("null if current"),
      highlights: z.array(z.string()),
    }),
  ),
  projects: z.array(
    z.strictObject({
      name: z.string(),
      description: z.string(),
      techStack: z.array(z.string()),
      repoUrl: z.string().nullable(),
    }),
  ),
  education: z.array(
    z.strictObject({
      institution: z.string(),
      degree: z.string().nullable(),
      year: z.string().nullable(),
    }),
  ),
  claims: z
    .array(
      z.strictObject({
        text: z.string().describe("the claim, close to the candidate's own wording"),
        topic: z.string().describe("short topic an interviewer would file it under, e.g. 'caching'"),
      }),
    )
    .describe("specific, probe-able statements: metrics, systems built, technologies used in depth"),
});

export type ParsedResume = z.infer<typeof ParsedResume>;

export const ParsedJobDescription = z.strictObject({
  isJobDescription: z.boolean().describe("false if the document is clearly not a job description"),
  title: z.string().nullable(),
  company: z.string().nullable(),
  level: z.string().nullable().describe("as written, e.g. 'Senior', 'SDE-2', 'New grad'"),
  mustHave: z.array(z.string()),
  niceToHave: z.array(z.string()),
  responsibilities: z.array(z.string()),
  interviewTopics: z
    .array(z.string())
    .describe("technical topics an interviewer for this role would likely cover"),
});

export type ParsedJobDescription = z.infer<typeof ParsedJobDescription>;
