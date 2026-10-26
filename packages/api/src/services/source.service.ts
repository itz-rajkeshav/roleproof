import path from "node:path";

import { ORPCError } from "@orpc/server";
import { AgentError, type ModelClient, parseJobDescription, parseResume } from "@roleproof/agent";
import type { Database } from "@roleproof/db";
import { extractText } from "unpdf";

export type DocumentKind = "RESUME" | "JOB_DESCRIPTION" | "NOTES";

const PDF_MAGIC = Buffer.from("%PDF-");
const MAX_TEXT_CHARS = 50_000;

// Everything except rawText/parsed, so lists stay small.
const summarySelect = {
  id: true,
  kind: true,
  format: true,
  title: true,
  originalName: true,
  sizeBytes: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

function cleanText(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function assertTextUsable(text: string) {
  if (!text) {
    throw new ORPCError("BAD_REQUEST", {
      message: "No readable text found. Scanned or image-only PDFs aren't supported yet.",
    });
  }
  if (text.length > MAX_TEXT_CHARS) {
    throw new ORPCError("BAD_REQUEST", {
      message: `Document is too long (max ${MAX_TEXT_CHARS.toLocaleString()} characters).`,
    });
  }
}

async function readFile(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());

  // The extension and MIME type come from the client, so check the actual bytes.
  if (buffer.subarray(0, PDF_MAGIC.length).equals(PDF_MAGIC)) {
    try {
      const { text } = await extractText(new Uint8Array(buffer), { mergePages: true });
      return { format: "PDF" as const, text: cleanText(text) };
    } catch {
      throw new ORPCError("BAD_REQUEST", { message: "Could not read this PDF." });
    }
  }

  if (file.type === "text/plain") {
    try {
      const text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
      return { format: "TXT" as const, text: cleanText(text) };
    } catch {
      throw new ORPCError("BAD_REQUEST", { message: "Text file must be UTF-8." });
    }
  }

  throw new ORPCError("BAD_REQUEST", { message: "Only PDF and .txt files are supported." });
}

// Parsing failures reject the upload instead of saving a broken source, so the user just re-uploads.
async function parseDocument(llm: ModelClient, kind: DocumentKind, text: string) {
  try {
    if (kind === "RESUME") {
      const parsed = await parseResume(llm, text);
      if (!parsed.isResume) {
        throw new ORPCError("BAD_REQUEST", { message: "This doesn't look like a resume." });
      }
      return parsed;
    }
    if (kind === "JOB_DESCRIPTION") {
      const parsed = await parseJobDescription(llm, text);
      if (!parsed.isJobDescription) {
        throw new ORPCError("BAD_REQUEST", { message: "This doesn't look like a job description." });
      }
      return parsed;
    }
    return null;
  } catch (error) {
    if (error instanceof AgentError) {
      if (error.code === "RATE_LIMITED") {
        throw new ORPCError("TOO_MANY_REQUESTS", { message: "Too many requests. Try again in a minute." });
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Couldn't read this document. Please try uploading it again.",
        cause: error,
      });
    }
    throw error;
  }
}

export async function createSourceFromFile(
  db: Database,
  llm: ModelClient,
  userId: string,
  input: { kind: DocumentKind; title?: string; file: File },
) {
  const { format, text } = await readFile(input.file);
  assertTextUsable(text);
  const parsed = await parseDocument(llm, input.kind, text);

  const originalName = path.basename(input.file.name);

  return db.source.create({
    data: {
      userId,
      kind: input.kind,
      format,
      title: input.title ?? path.parse(originalName).name,
      originalName,
      mimeType: input.file.type || null,
      sizeBytes: input.file.size,
      rawText: text,
      parsed: parsed ?? undefined,
      status: "READY",
    },
    select: summarySelect,
  });
}

export async function createSourceFromText(
  db: Database,
  llm: ModelClient,
  userId: string,
  input: { kind: DocumentKind; title: string; text: string },
) {
  const text = cleanText(input.text);
  assertTextUsable(text);
  const parsed = await parseDocument(llm, input.kind, text);

  return db.source.create({
    data: {
      userId,
      kind: input.kind,
      format: "TEXT",
      title: input.title,
      rawText: text,
      parsed: parsed ?? undefined,
      status: "READY",
    },
    select: summarySelect,
  });
}

export async function listSources(db: Database, userId: string, kind?: DocumentKind) {
  return db.source.findMany({
    where: { userId, ...(kind && { kind }) },
    orderBy: { createdAt: "desc" },
    select: summarySelect,
  });
}

export async function getSource(db: Database, userId: string, id: string) {
  const source = await db.source.findFirst({ where: { id, userId } });
  if (!source) {
    throw new ORPCError("NOT_FOUND", { message: "Source not found." });
  }
  return source;
}

export async function deleteSource(db: Database, userId: string, id: string) {
  const { count } = await db.source.deleteMany({ where: { id, userId } });
  if (count === 0) {
    throw new ORPCError("NOT_FOUND", { message: "Source not found." });
  }
  return { id };
}
