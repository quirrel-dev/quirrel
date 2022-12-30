#!/usr/bin/env node
import { env } from "process"

import { Command, program } from "commander";
import registerUI from "./commands/ui.js";
import registerCI from "./commands/ci.js";
import registerDetectCron from "./commands/detect-cron.js";
import registerUpdateCron from "./commands/update-cron.js";
import registerRun from "./commands/index.js";

program.version(env.npm_package_version ?? "unknown");

const command = program as Command;

registerRun(command);
registerUI(command);
registerCI(command);
registerDetectCron(command);
registerUpdateCron(command);

program.parse(process.argv);
