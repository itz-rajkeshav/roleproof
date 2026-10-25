import z from "zod";

import { publicProcedure } from "../index";

export const todoRouter = {
  getAll: publicProcedure.handler(async ({ context }) => {
    return await context.db.todo.findMany({
      orderBy: {
        id: "asc",
      },
    });
  }),

  create: publicProcedure
    .input(z.object({ text: z.string().min(1) }))
    .handler(async ({ input, context }) => {
      return await context.db.todo.create({
        data: {
          text: input.text,
        },
      });
    }),

  toggle: publicProcedure
    .input(z.object({ id: z.number(), completed: z.boolean() }))
    .handler(async ({ input, context }) => {
      return await context.db.todo.update({
        where: { id: input.id },
        data: { completed: input.completed },
      });
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .handler(async ({ input, context }) => {
      return await context.db.todo.delete({
        where: { id: input.id },
      });
    }),
};
