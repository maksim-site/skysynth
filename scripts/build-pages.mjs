import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, mkdir, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(await readFile(path.join(root, "releases/pages.json"), "utf8"));
const output = path.join(root, "dist-pages");
const vite = path.join(root, "node_modules/vite/bin/vite.js");
const sourcePaths = ["package.json", "package-lock.json", "index.html", "src", "public", "vite.config.mjs"];

if (!/^\/[a-z0-9-]+\/$/.test(config.base) || !/^v[1-9]\d*$/.test(config.current)) {
  throw new Error("Invalid Pages base or current version");
}
const paths = new Set([config.current]);
for (const release of config.preserved) {
  if ((release.path !== "" && !/^v[1-9]\d*$/.test(release.path)) ||
      !/^[a-f0-9]{40}$/.test(release.revision) || paths.has(release.path)) {
    throw new Error("Invalid or duplicate preserved release");
  }
  paths.add(release.path);
}

function build(source, version) {
  const base = `${config.base}${version ? `${version}/` : ""}`;
  execFileSync(process.execPath, [vite, "build", "--base", base,
    "--outDir", path.join(output, version), "--emptyOutDir"], { cwd: source, stdio: "inherit" });
}

// Build the original public root from its pinned source, then add the new
// version in its own directory. The dirty working copy never enters v1.
const scratch = await mkdtemp(path.join(os.tmpdir(), "sks-pages-"));
try {
  const preserved = [...config.preserved].sort((a, b) => a.path.length - b.path.length);
  for (const [index, release] of preserved.entries()) {
    const checkout = path.join(scratch, `release-${index}`);
    const archive = path.join(scratch, `release-${index}.tar`);
    await mkdir(checkout);
    execFileSync("git", ["archive", "--format=tar", "--output", archive,
      release.revision, ...sourcePaths], { cwd: root, stdio: "inherit" });
    execFileSync("tar", ["-xf", archive, "-C", checkout], { stdio: "inherit" });
    const [oldLock, currentLock] = await Promise.all([
      readFile(path.join(checkout, "package-lock.json")),
      readFile(path.join(root, "package-lock.json")),
    ]);
    if (!oldLock.equals(currentLock)) {
      throw new Error("Preserved release dependencies differ; install its pinned lock separately");
    }
    await symlink(path.join(root, "node_modules"), path.join(checkout, "node_modules"), "dir");
    build(checkout, release.path);
  }
  build(root, config.current);
  const revision = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  await writeFile(path.join(output, config.current, "release.json"),
    `${JSON.stringify({ version: config.current, revision, base: `${config.base}${config.current}/` }, null, 2)}\n`);
} finally {
  await rm(scratch, { recursive: true, force: true });
}
