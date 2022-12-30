import { registerDevelopmentDefaults } from "./client/config.js";

registerDevelopmentDefaults({
  applicationBaseUrl: "http://localhost:8888",
});

export * from "./redwood.js";
