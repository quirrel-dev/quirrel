// adapted from https://github.com/blitz-js/blitz/blob/59c839c65fb96f21535491f4c167998fb2c6707c/packages/server/src/parse-chokidar-rules-from-gitignore.ts

import spawn from "cross-spawn";
import expandTilde from "expand-tilde";
import fastGlob from "fast-glob";
import * as fs from "fs";
import parseGitignore from "parse-gitignore";

function partition<A, B>(
  arr: (A | B)[],
  predicate: (v: A | B) => v is A
): [truthy: A[], falsy: B[]] {
  const truthy: A[] = [];
  const falsy: B[] = [];

  for (const v of arr) {
    if (predicate(v)) {
      truthy.push(v);
    } else {
      falsy.push(v);
    }
  }

  return [truthy, falsy];
}

const { GIT_DIR = ".git" } = process.env;

function globalGitIgnore() {
  const versionResult = spawn.sync("git", ["version"]);
  if (!(versionResult.status === 0)) {
    console.log(
      "Git doesn't seem to be installed. Get it here: https://git-scm.com/downloads."
    );
    return null;
  }

  const configResult = spawn.sync(
    "git",
    ["config", "--get", "core.excludesfile"],
    {
      stdio: "pipe",
    }
  );
  if (!(configResult.status === 0)) {
    // Git config core.excludesFile is unset. Inferring .gitignore file locations.
    return null;
  }

  const output = String(configResult.stdout).trim();
  return process.platform === "win32" ? output : expandTilde(output);
}

export function isControlledByUser(file: string) {
  if (file.startsWith("node_modules")) {
    return false;
  }

  return true;
}

export function getAllGitIgnores(rootFolder: string) {
  const globalIgnore = globalGitIgnore();
  const localRepoIgnore = `${GIT_DIR}/info/exclude`;

  const files = fastGlob.sync(
    [localRepoIgnore, `**/${localRepoIgnore}`, "**/.gitignore"],
    {
      cwd: rootFolder,
    }
  );

  if (globalIgnore && fs.existsSync(globalIgnore)) files.push(globalIgnore);

  return files.filter(isControlledByUser).map((file) => {
    let prefix = "";

    if (file.match(localRepoIgnore)) prefix = file.split(localRepoIgnore)[0];
    else if (globalIgnore && file.match(globalIgnore)) prefix = "";
    else prefix = file.split(".gitignore")[0];

    return {
      gitIgnore: fs.readFileSync(file, { encoding: "utf8" }),
      prefix,
    };
  });
}

export function chokidarRulesFromGitignore({
  gitIgnore,
  prefix,
}: {
  gitIgnore: string;
  prefix: string;
}) {
  const rules = parseGitignore(gitIgnore);

  const isInclusionRule = (rule: string): rule is string =>
    rule.startsWith("!");
  const [includePaths, ignoredPaths] = partition(rules, isInclusionRule);

  const trimExclamationMark = (rule: string) => rule.substring(1);
  const prefixPath = (rule: string) => {
    if (rule.startsWith("/")) {
      rule = rule.substring(1);
    }

    if (rule.endsWith("/")) {
      rule = rule.substring(0, rule.length - 1);
    }

    if (!prefix) {
      return rule;
    } else {
      return prefix + rule;
    }
  };

  return {
    includePaths: includePaths.map(trimExclamationMark).map(prefixPath),
    ignoredPaths: ignoredPaths.map(prefixPath),
  };
}

export function parseChokidarRulesFromGitignore(rootFolder: string) {
  const result: { ignoredPaths: string[]; includePaths: string[] } = {
    includePaths: [],
    ignoredPaths: [],
  };

  getAllGitIgnores(rootFolder)
    .map(chokidarRulesFromGitignore)
    .forEach(({ ignoredPaths, includePaths }) => {
      result.includePaths.push(...includePaths);
      result.ignoredPaths.push(...ignoredPaths);
    });

  return result;
}
