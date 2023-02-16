import { registerDevelopmentDefaults } from "./client/config.js";

registerDevelopmentDefaults({
  applicationPort: 8888,
});

export * from "./redwood.js";
