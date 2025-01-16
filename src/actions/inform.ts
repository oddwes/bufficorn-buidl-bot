import {
  ActionExample,
  IAgentRuntime,
  Memory,
  type Action,
} from "@elizaos/core";

export const informAction: Action = {
  name: "INFORM",
  similes: [
      "RESPOND",
      "RESPONSE",
      "REPLY",
      "DEFAULT",
      "INFORMATION",
      "ANSWER",
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
              content: { text: "Can you give me some key information for the hackathon?" },
          },
          {
              user: "{{user2}}",
              content: {
                  text: "Certainly!Here are the key hackathon (BUIDLathon) details for ETHDenver 2025: ",
                  action: "INFORM"
              },
          },
      ],
      [
          {
              user: "{{user1}}",
              content: {
                  text: "Where is ethdenver happening?"
              }
          },
          {
              user: "unicorn",
              content: {
                  text: "ETHDenver 2025 takes place at the National Western Complex located at 4655 Humboldt Street, Denver, CO 80216. The event uses two connected buildings - the Event Center (known as the BUIDLHub) and the $SPORK Castle. They are located right next to each other at the same venue complex.",
                  action: "INFORM"
              }
          },
      ],
  ] as ActionExample[][],
} as Action;
