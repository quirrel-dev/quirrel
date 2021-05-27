#!/usr/bin/env node
import pack from "../../package.json";

import { Command, program } from "commander";
import registerUI from "./commands/ui";
import registerCI from "./commands/ci";
import registerDetectCron from "./commands/detect-cron";
import registerRun from "./commands/index";

program.version(pack.version);

registerRun(program as Command);
registerUI(program as Command);
registerCI(program as Command);
registerDetectCron(program as Command);

program.parse(process.argv);
