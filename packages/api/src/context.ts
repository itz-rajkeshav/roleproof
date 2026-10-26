import type { ModelClient } from "@roleproof/agent";
import type { Session } from "@roleproof/auth";
import type { Database } from "@roleproof/db";

export type Context = {
  session: Session | null;
  db: Database;
  llm: ModelClient;
};
