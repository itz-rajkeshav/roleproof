import { Command } from "@langchain/langgraph";

import type { AgentConfig } from "./config";
import { createInterviewGraph, type InterviewGraph, type Turn } from "./graphs/interview.graph";
import { createModelClient } from "./model";

export type { AgentConfig } from "./config";
export type { Turn } from "./graphs/interview.graph";

export type StartInterviewInput = {
  role: string;
  topic: string;
  maxQuestions: number;
};

export type InterviewStatus = {
  question: string | null;
  turns: Turn[];
  done: boolean;
};

async function readStatus(graph: InterviewGraph, threadId: string): Promise<InterviewStatus> {
  const snapshot = await graph.getState({ configurable: { thread_id: threadId } });
  const done = snapshot.next.length === 0;
  return {
    question: done ? null : snapshot.values.currentQuestion,
    turns: snapshot.values.turns ?? [],
    done,
  };
}

export function createAgent(env: AgentConfig) {
  const client = createModelClient(env);
  const interview = createInterviewGraph(client);

  return {
    async startInterview(threadId: string, input: StartInterviewInput) {
      await interview.invoke(input, { configurable: { thread_id: threadId } });
      return readStatus(interview, threadId);
    },

    async submitAnswer(threadId: string, answer: string) {
      await interview.invoke(new Command({ resume: answer }), {
        configurable: { thread_id: threadId },
      });
      return readStatus(interview, threadId);
    },
  };
}

export type Agent = ReturnType<typeof createAgent>;
