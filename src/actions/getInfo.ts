import {
  type ActionExample,
  type IAgentRuntime,
  type Memory,
  type Action,
  type HandlerCallback,
  type State,
  ModelClass,
  composeContext,
  generateText,
} from "@elizaos/core";
import { getRelevantDocuments } from "../utils/ragUtil.js";

const PROMPT_TEMPLATE = `
  {{providers}}
  {{documents}}
  
  Answer ONLY the user's most recent question based on the content above: {{recentMessages}}
`;

export const getInfoAction: Action = {
  name: "GET_INFO",
  similes: ["GET_INFO", "RESPOND", "NONE"],
  suppressInitialMessage: true,
  validate: async (_runtime: IAgentRuntime, _message: Memory) => {
    return true;
  },
  description:
    "Fetches the current ETHDenver schedule and adds it to the context for reference.",
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: { [key: string]: unknown },
    callback: HandlerCallback
  ): Promise<boolean> => {
    try {
      // Get schedule and relevant context
      const documents = await getRelevantDocuments(message.content.text);

      const currentState = await runtime.composeState(message, {
        documents: documents,
        providers: state.providers,
      });

      const context = composeContext({
        state: currentState,
        template: PROMPT_TEMPLATE,
      });

      // Generate response
      const response = await generateText({
        runtime,
        context,
        modelClass: ModelClass.LARGE,
      });
      callback({
        text: response,
        action: "GET_INFO",
      });
      return true;
    } catch (error) {
      console.error("Error in getSchedule handler:", error);
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "What's on the schedule today?" },
      },
      {
        user: "{{agent}}",
        content: {
          text: "Here are today's events in chronological order...",
          action: "GET_INFO",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "Show me the talks happening tomorrow." },
      },
      {
        user: "{{agent}}",
        content: {
          text: `Today (February 23, 2025) is the start of BUIDLWeek. Here's the schedule:
            12:00 PM - BUIDLWeek Welcome & Camp BUIDL (Captain Ethereum Stage)
            12:10 PM - BUIDL Peptalk with Austin Griffith (Captain Ethereum Stage)
            12:20 PM - BUIDLWeek Experience - Networking, Team Formation, Judging, Socials (Captain Ethereum Stage)
            1:00 PM - BUIDL Peptalk with Nader Dabit (Captain Ethereum Stage)
            1:10 PM - Hackathons for Newbs (Captain Ethereum Stage)
            1:30 PM - Bounty Presentations (Captain Ethereum Stage)
          `,
          action: "NONE",
        },
      },
    ],
  ] as ActionExample[][],
} as Action;
