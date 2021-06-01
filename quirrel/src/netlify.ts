import { registerDevelopmentDefaults } from "./client/config";

registerDevelopmentDefaults({
  applicationBaseUrl: "http://localhost:8888",
});

export * from "./redwood";
