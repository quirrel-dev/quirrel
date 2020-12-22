import { registerDevelopmentDefaults } from "./client/config";

registerDevelopmentDefaults({
  applicationBaseUrl: "http://localhost:3000",
});

export * from "./connect";
