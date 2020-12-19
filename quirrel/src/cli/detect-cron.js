const fs = require("fs").promises;
const path = require("path");
const globby = require("globby");

async function grepForJavascriptFiles(directory) {
  return await globby(["**/*.[jt]s", "**/*.[jt]sx"], {
    cwd: directory,
    gitignore: true,
    dot: true,
    absolute: true,
  });
}

async function readFiles(paths) {
  return await Promise.all(paths.map((path) => fs.readFile(path, "utf-8")));
}

function detectQuirrelCronJob(file) {
  const quirrelImport = /"quirrel\/(.*)"/.exec(file);
  if (!quirrelImport) {
    return null;
  }

  const clientFramework = quirrelImport[1];
  const isNextBased = ["blitz", "next"].includes(clientFramework);

  const jobNameResult = /CronJob\(['"](.*)["'],\s*["'](.*)["']/.exec(file);
  if (!jobNameResult) {
    return null;
  }

  let jobName = jobNameResult[1];
  const cronSchedule = jobNameResult[2];

  if (isNextBased && !jobName.startsWith("api/")) {
    jobName = "api/" + jobName;
  }

  return {
    route: jobName,
    schedule: cronSchedule,
  };
}

async function detectCronJobs(rootDirectory) {
  const filePaths = await grepForJavascriptFiles(rootDirectory);
  const fileContents = await readFiles(filePaths);
  const cronJobs = fileContents.map(detectQuirrelCronJob).filter((v) => !!v);
  return cronJobs;
}

detectCronJobs(path.join(__dirname, "../../../examples/next")).then(
  console.log
);
