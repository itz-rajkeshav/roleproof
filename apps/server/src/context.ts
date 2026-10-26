import type { Context as ApiContext } from "@roleproof/api/context";
import type { Context as HonoContext } from "hono";

import { auth, db, llm } from "./services";

export type CreateContextOptions = {
  context: HonoContext;
};

export async function createContext({ context }: CreateContextOptions): Promise<ApiContext> {
  const session = await auth.api.getSession({
    headers: context.req.raw.headers,
  });
  return {
    db,
    llm,
    session,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
