import { createAuth } from "@roleproof/auth";
import { createPrismaClient } from "@roleproof/db";

import { ENV } from "./env.server";

export const db = createPrismaClient(ENV);
export const auth = createAuth(ENV, db);
