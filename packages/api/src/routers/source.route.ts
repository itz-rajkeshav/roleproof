import { z } from "zod";

import { protectedProcedure } from "../index";
import {
  createSourceFromFile,
  createSourceFromText,
  deleteSource,
  getSource,
  listSources,
} from "../services/source.service";

// Vercel rejects request bodies over 4.5 MB.
const MAX_FILE_SIZE = 4 * 1024 * 1024;

// REPO is added later with repo ingest.
const documentKind = z.enum(["RESUME", "JOB_DESCRIPTION", "NOTES"]);
const title = z.string().trim().min(1).max(120);

export const sourceRouter = {
  upload: protectedProcedure
    .input(
      z.object({
        kind: documentKind,
        title: title.optional(),
        file: z
          .file()
          .min(1, "Please choose a file.")
          .max(MAX_FILE_SIZE, "Maximum file size is 4 MB.")
          .mime(["application/pdf", "text/plain"], "Only PDF and .txt files are allowed."),
      }),
    )
    .handler(({ input, context }) =>
      createSourceFromFile(context.db, context.llm, context.session.user.id, input),
    ),

  createText: protectedProcedure
    .input(
      z.object({
        kind: documentKind,
        title,
        text: z.string().trim().min(1, "Please paste some text."),
      }),
    )
    .handler(({ input, context }) =>
      createSourceFromText(context.db, context.llm, context.session.user.id, input),
    ),

  list: protectedProcedure
    .input(z.object({ kind: documentKind.optional() }).optional())
    .handler(({ input, context }) => listSources(context.db, context.session.user.id, input?.kind)),

  get: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .handler(({ input, context }) => getSource(context.db, context.session.user.id, input.id)),

  delete: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .handler(({ input, context }) => deleteSource(context.db, context.session.user.id, input.id)),
};
