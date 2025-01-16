import {
  ActionExample,
  IAgentRuntime,
  Memory,
  type Action,
} from "@elizaos/core";

export const greetAction: Action = {
  name: "GREET",
  similes: [
      "GREET",
      "WELCOME",
      "HI",
      "HELLO",
      "GOOD_MORNING",
      "GOOD_AFTERNOON",
      "GOOD_EVENING",
      "NONE",
  ],
  validate: async (_runtime: IAgentRuntime, _message: Memory) => {
      return true;
  },
  description:
      "Respond but perform no additional action. This is the default if the agent is speaking and not doing anything additional.",
  handler: async (
      _runtime: IAgentRuntime,
      _message: Memory
  ): Promise<boolean> => {
      return true;
  },
  examples: [
      [
          {
              user: "{{user1}}",
              content: { text: "Hi" },
          },
          {
              user: "{{user2}}",
              content: {
                  text: "Hi! I can provide information about ETHDenver 2025. What information are you looking for?",
                  action: "GREET"
              },
          },
      ],
      [
          {
              user: "{{user1}}",
              content: {
                  text: "Do you have info on ETHDenver 2025?"
              }
          },
          {
              user: "unicorn",
              content: {
                  text:
                      `Yes, I have comprehensive information about ETHDenver 2025. I can help you with details about:
                          - Dates, venue and schedule
                          - Registration and ticket types
                          - Hackathon/BUIDLathon details
                          - Speaker sessions and tracks
                          - Venue logistics
                          - Travel and accommodation
                          - Sponsor information

                          What specific aspects would you like to know more about?`,
                  action: "GREET"
              }
          },
      ],
  ] as ActionExample[][],
} as Action;
