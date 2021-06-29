#!/usr/bin/env node
import pack from "../../package.json";

import { Command, program } from "commander";
import registerUI from "./commands/ui";
import registerCI from "./commands/ci";
import registerDetectCron from "./commands/detect-cron";
import registerUpdateCron from "./commands/update-cron";
import registerRun from "./commands/index";

program.version(pack.version);

const command = program as Command;

registerRun(command);
registerUI(command);
registerCI(command);
registerDetectCron(command);
registerUpdateCron(command);

program.parse(process.argv);
