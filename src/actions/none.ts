import type {
  ActionExample,
  IAgentRuntime,
  Memory,
  Action,
} from "@elizaos/core";

export const noneAction: Action = {
  name: "NONE",
  similes: [
      "NO_ACTION",
      "NO_RESPONSE",
      "NO_REACTION",
      "RESPONSE",
      "REPLY",
      "DEFAULT",
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
                action: "NONE"
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
                action: "NONE"
            }
        },
    ],
    [
        {
            user: "{{user1}}",
            content: {
                text: "Where is ethdenver this year?"
            }
        },
        {
            user: "unicorn",
            content: {
                text: "ETHDenver 2025 takes place at the National Western Complex located at 4655 Humboldt Street, Denver, CO 80216. The event uses two connected buildings - the Event Center (known as the BUIDLHub) and the $SPORK Castle. They are located right next to each other at the same venue complex.",
                action: "NONE"
            }
        },
    ],
  ] as ActionExample[][],
} as Action;