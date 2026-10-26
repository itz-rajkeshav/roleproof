import {
  Annotation,
  type BaseCheckpointSaver,
  END,
  interrupt,
  MemorySaver,
  START,
  StateGraph,
} from "@langchain/langgraph";

import { complete, type ModelClient } from "../model";
import { EVALUATOR_SYSTEM, INTERVIEWER_SYSTEM } from "../prompts/interviewer";

export type Turn = {
  question: string;
  answer: string;
  feedback: string;
};

export const InterviewState = Annotation.Root({
  role: Annotation<string>,
  topic: Annotation<string>,
  maxQuestions: Annotation<number>,
  currentQuestion: Annotation<string>,
  currentAnswer: Annotation<string>,
  turns: Annotation<Turn[]>({
    reducer: (existing, added) => existing.concat(added),
    default: () => [],
  }),
});

type State = typeof InterviewState.State;

function formatHistory(turns: Turn[]) {
  if (turns.length === 0) return "No questions asked yet.";
  return turns.map((t, i) => `Q${i + 1}: ${t.question}\nA${i + 1}: ${t.answer}`).join("\n\n");
}

export function createInterviewGraph(
  client: ModelClient,
  checkpointer: BaseCheckpointSaver = new MemorySaver(),
) {
  async function askQuestion(state: State) {
    const question = await complete(client, {
      system: INTERVIEWER_SYSTEM,
      messages: [
        {
          role: "user",
          content: `Target role: ${state.role}\nTopic: ${state.topic}\n\nInterview so far:\n${formatHistory(state.turns)}\n\nAsk the next question.`,
        },
      ],
    });
    return { currentQuestion: question };
  }

  // Kept separate from askQuestion: on resume, LangGraph re-runs the interrupted
  // node from the top, so it must not contain an LLM call.
  function waitForAnswer(state: State) {
    const answer = interrupt<{ question: string }, string>({ question: state.currentQuestion });
    return { currentAnswer: answer };
  }

  async function evaluate(state: State) {
    const feedback = await complete(client, {
      system: EVALUATOR_SYSTEM,
      messages: [
        {
          role: "user",
          content: `Target role: ${state.role}\nTopic: ${state.topic}\n\nQuestion: ${state.currentQuestion}\n\nCandidate's answer: ${state.currentAnswer}`,
        },
      ],
    });
    return {
      turns: [{ question: state.currentQuestion, answer: state.currentAnswer, feedback }],
    };
  }

  function nextStep(state: State) {
    return state.turns.length >= state.maxQuestions ? END : "askQuestion";
  }

  return new StateGraph(InterviewState)
    .addNode("askQuestion", askQuestion)
    .addNode("waitForAnswer", waitForAnswer)
    .addNode("evaluate", evaluate)
    .addEdge(START, "askQuestion")
    .addEdge("askQuestion", "waitForAnswer")
    .addEdge("waitForAnswer", "evaluate")
    .addConditionalEdges("evaluate", nextStep, ["askQuestion", END])
    .compile({ checkpointer });
}

export type InterviewGraph = ReturnType<typeof createInterviewGraph>;
