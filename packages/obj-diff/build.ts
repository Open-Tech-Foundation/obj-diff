import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";

const outDir = "./dist";

if (fs.existsSync(outDir)) {
  fs.rmSync(outDir, { recursive: true });
}

console.log("Building ESM...");
spawnSync("bun", [
  "x",
  "esbuild",
  "./src/index.ts",
  "--bundle",
  "--outfile=" + path.join(outDir, "index.js"),
  "--platform=node",
  "--format=esm",
  "--external:@opentf/std",
], { stdio: "inherit" });

console.log("Building CJS...");
spawnSync("bun", [
  "x",
  "esbuild",
  "./src/index.ts",
  "--bundle",
  "--outfile=" + path.join(outDir, "index.cjs"),
  "--platform=node",
  "--format=cjs",
  "--external:@opentf/std",
], { stdio: "inherit" });

console.log("Generating types...");
spawnSync("bun", [
  "x", 
  "tsc", 
  "--project", "tsconfig.json", 
  "--declaration", 
  "--emitDeclarationOnly", 
  "--rootDir", "src",
  "--outDir", outDir
], {
  stdio: "inherit",
});

if (fs.existsSync(path.join(outDir, "index.d.ts"))) {
  fs.copyFileSync(
    path.join(outDir, "index.d.ts"),
    path.join(outDir, "index.d.cts")
  );
}

// Final cleanup: remove any accidentally created folders
const extraDirs = ["src", "__tests__"];
extraDirs.forEach(dir => {
  const fullPath = path.join(outDir, dir);
  if (fs.existsSync(fullPath)) {
    fs.rmSync(fullPath, { recursive: true });
  }
});

console.log("Build completed successfully.");
