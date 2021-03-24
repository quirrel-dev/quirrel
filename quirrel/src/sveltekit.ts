import { registerDevelopmentDefaults } from "./client/config";

registerDevelopmentDefaults({
  applicationBaseUrl: "localhost:3000",
});

export * from "./redwood";
