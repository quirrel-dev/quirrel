#!/usr/bin/env node
import pack from "../../package.json";

import { Command, program } from "commander";
import registerUI from "./commands/ui";
import registerCI from "./commands/ci";
import registerRun from "./commands";

program.version(pack.version);

registerRun(program as Command);
registerUI(program as Command);
registerCI(program as Command);

program.parse(process.argv);
