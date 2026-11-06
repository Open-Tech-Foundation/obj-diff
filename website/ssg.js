// Release prerender step for `esdev build` (the `site-ssg` target, `"then": "run"`).
//
// Runs after every target is built. Its outputs land in the staged site; the
// `siteOutputPlugin` in esdev.json then indexes the prerendered HTML and
// generates feeds and LLM files. Development never runs here: without a
// staging area the step skips (the dev loop serves the live CSR shell).
import { env, exit } from "runtime:process";
import { basename, dirname, fromFileURL, join, toFileURL } from "runtime:path";

const t0 = performance.now();

// Anchor on this bundle's own path: under a full `esdev build` it is the
// staged copy (`<root>/.esdev-build-*/…`), otherwise the final output.
const bundlePath = fromFileURL(import.meta.url).replace(/\\/g, "/");
const bundleDir = dirname(bundlePath);
let stagingRoot = null;
for (let dir = bundleDir; ; ) {
  if (basename(dir).startsWith(".esdev-build-")) {
    stagingRoot = dir;
    break;
  }
  const up = dirname(dir);
  if (up === dir) break;
  dir = up;
}
if (!stagingRoot) {
  console.log("ssg: no staging area — prerender runs on a release `esdev build`, skipping.");
  exit(0);
}
// Keep package-relative binary paths intact: load installed tooling at runtime.
const ssgModule = ["@opentf", "afw-cli", "ssg"].join("/");
const {
  assertNoRouteConflicts,
  closeCompilers,
  discoverPages,
  exists,
  fmtMs,
  loadConfig,
  loadDocsPlugins,
  readText,
  runLastUpdated,
  resolveCompiler,
  resolveFrom,
  runPrerender,
  stampHydrateSentinel,
  step,
  writePrerenderReport,
} = await import(ssgModule);
const { realPath } = await import("runtime:fs");

const root = dirname(stagingRoot);
const outName = "dist";
const appDir = join(root, "app");
const stagedOut = join(stagingRoot, outName);
if (!(await exists(appDir))) {
  console.error(`✗ ssg: cannot anchor sources (bundle at ${bundleDir})`);
  exit(1);
}

const shellPath = join(stagedOut, "index.html");
if (!(await exists(shellPath))) {
  console.error(
    `✗ ssg: no staged site at ${shellPath}\n` +
      `  Build the site target first (a full \`esdev build\` builds every target).`,
  );
  exit(1);
}

const exclude = new Set((env.EXCLUDE_ROUTES ?? "").split(",").filter(Boolean));
const config = await loadConfig(root);
const baseUrl = String(config?.site?.url ?? "").replace(/\/+$/, "");
if (!baseUrl && (config?.docs || config?.blog)) {
  console.error(
    `✗ site.url is required for this production build.\n` +
      `  Add it to afw.config.js:\n\n` +
      `  export default defineDocsConfig({\n` +
      `    site: { url: "https://example.com" }\n` +
      `  })`,
  );
  exit(1);
}

const pages = await discoverPages(appDir, exclude);
if (pages.length === 0) {
  console.error(`✗ no page.jsx files found under ${appDir}`);
  exit(1);
}
await assertNoRouteConflicts(appDir, exclude);

const docsPlugins = await loadDocsPlugins(root, appDir, config, exclude);
// Per-page "Last updated" dates, from each source file's last git commit.
const lastUpdated = await runLastUpdated(root, appDir, config, exclude);

// The site target composed this shell (bundle + stylesheet already injected);
// stamp the `#app` sentinel so the client adopts the server markup.
const shellHtml = stampHydrateSentinel(await readText(shellPath));

// Use the same canonical package path as the bundler's package resolver; pnpm
// symlink paths otherwise create separate router instances in the server bundle.
const afwEntry = await resolveFrom("@opentf/afw", root).then(realPath).catch(() => {
  console.error(`✗ cannot resolve "@opentf/afw" from ${root}`);
  exit(1);
});
const { afwc } = await resolveCompiler();

const ssgStep = step("Pre-rendering pages");
let ssgCompiled = 0;
const ssg = await runPrerender({
  root,
  pages,
  afwEntry,
  afwc,
  shellHtml,
  outDir: stagedOut,
  baseUrl,
  docsPlugins,
  lastUpdated,
  chunkManifest: null,
  onCompile: (id) => ssgStep.update(`compiling ${id.split("/").pop()}  (${++ssgCompiled})`),
  onRender: (done, total) => ssgStep.update(`rendering ${done}/${total}`),
});
if (!ssg.count || ssg.failed.length) {
  await closeCompilers();
  throw new Error(`Site prerender failed: ${ssg.count} page(s) rendered, ${ssg.failed.length} failed`);
}
ssgStep.done(`Pre-rendered ${ssg.count} page(s)`);

// The finish plugin consumes this handoff and generates search, feeds and LLM files.
await writePrerenderReport(stagedOut, ssg);

// Stop the `afwc serve` children: an open reader on a child's stdout keeps the
// runtime alive, so this is what lets a finished build actually exit.
await closeCompilers();

console.log(`\n  → ${outName}/  prerendered in ${fmtMs(performance.now() - t0)}\n`);
