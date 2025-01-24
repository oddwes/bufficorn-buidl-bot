import { Provider } from "@elizaos/core";

export const venueProvider: Provider = {
    get: async () => {
        return "Venue details: National Western Stock Show, 4655 Humboldt Street, Denver, CO 80216";
    },
};

