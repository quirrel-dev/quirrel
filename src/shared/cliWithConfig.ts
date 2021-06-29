import { program } from "commander";
import pack from "../../package.json";
import yaml from "js-yaml";
import { promises as fs } from "fs";

async function readYaml(filename: string): Promise<NodeJS.Dict<string>> {
  const contents = await fs.readFile(filename, { encoding: "utf-8" });
  const result = yaml.load(contents);
  return result as any;
}

export async function cliWithConfig(
  doIt: (config: NodeJS.Dict<string>) => Promise<{ teardown(): Promise<void> }>
) {
  process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
    process.exit(1);
  });

  program
    .version(pack.version)
    .option("-c, --config <path>", "path to config file (json or yaml)");
  program.parse(process.argv);

  const { config: configLocation } = program.opts();

  const { teardown } = await doIt(
    !!configLocation ? await readYaml(configLocation) : process.env
  );

  async function _teardown(signal: string) {
    console.log("Received %s - terminating ...", signal);
    await teardown();
    process.exit(2);
  }

  process.on("SIGTERM", _teardown);
  process.on("SIGINT", _teardown);
}
