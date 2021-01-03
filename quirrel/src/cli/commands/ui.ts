import type { Command } from "commander";
import open from "open";

function getChromeName() {
  switch (process.platform) {
    case "win32":
      return "chrome";
    case "darwin":
      return "google chrome";
    case "linux":
      return "google-chrome";
    default:
      throw new Error("OS not supported yet, please open an issue.");
  }
}

export default async function registerUI(program: Command) {
  program
    .command("ui")
    .description("Opens the Quirrel UI")
    .action(async () => {
      console.log("Opening Quirrel UI ...");

      open("https://ui.quirrel.dev", { app: getChromeName() });
    });
}
