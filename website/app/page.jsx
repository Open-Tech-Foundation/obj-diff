import { diff, patch } from "@opentf/obj-diff";
import { strReplace, isTypedArray } from "@opentf/std";
import { EditorView, basicSetup } from "codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";

const scenarios = [
  {
    id: "profile",
    label: "Profile update",
    detail: "Nested values and arrays",
    before: `{
  user: { id: 42, name: 'Ari', role: 'viewer' },
  teams: ['platform', 'docs'],
  flags: { beta: false }
}`,
    after: `{
  user: { id: 42, name: 'Ari', role: 'admin' },
  teams: ['platform', 'design', 'docs'],
  flags: { beta: true },
  lastSeen: new Date('2026-07-15')
}`,
  },
  {
    id: "collections",
    label: "Native collections",
    detail: "Map, Set, Date, BigInt, TypedArray",
    before: `{
  inventory: new Map([['tea', 4], ['coffee', 8]]),
  tags: new Set(['stable', 'public']),
  released: new Date('2025-01-01'),
  downloads: 9007199254740993n,
  buffer: new Uint8Array([1, 2, 3])
}`,
    after: `{
  inventory: new Map([['tea', 2], ['coffee', 8], ['cocoa', 3]]),
  tags: new Set(['stable', 'featured']),
  released: new Date('2026-07-15'),
  downloads: 9007199254741993n,
  buffer: new Uint8Array([1, 4, 3])
}`,
  },
  {
    id: "sparse",
    label: "Sparse arrays",
    detail: "Holes and nested structures",
    before: `{
  queue: [, { id: 'a', state: 'waiting' }, , 'done'],
  retries: [0, 1, 1]
}`,
    after: `{
  queue: [, { id: 'a', state: 'running' }, { id: 'b' }, 'done'],
  retries: [0, 2, 1]
}`,
  },
  {
    id: "circular",
    label: "Circular objects",
    detail: "Cycle-safe comparison",
    before: `(() => { const item = { id: 1, status: 'draft' }; item.self = item; return item; })()`,
    after: `(() => { const item = { id: 1, status: 'published' }; item.self = item; return item; })()`,
  },
];

function replacer(key, value) {
  if (typeof value === "bigint") return `__INTERNAL__BIGINT__${value}n`;
  if (value === undefined) return `__INTERNAL__UNDEFINED`;
  if (value instanceof Map) return `Map(${value.size}) ${JSON.stringify(Array.from(value))}`;
  if (value instanceof Set) return `Set(${value.size}) ${JSON.stringify(Array.from(value))}`;
  if (isTypedArray(value)) return `${value.constructor.name}(${value.length}) ${JSON.stringify(Array.from(value))}`;
  return value;
}

function getDiffResults(diffResult) {
  if (!diffResult) return "";
  let out = JSON.stringify(diffResult, replacer, 4);
  out = strReplace(out, `"__INTERNAL__UNDEFINED"`, "undefined", { all: true });
  const test = /"__INTERNAL__BIGINT__(\d+)n"/;
  function convert(str, p1) { return `${p1}n`; }
  out = strReplace(out, test, convert, { all: true });
  return out;
}

const OP_META = {
  0: { label: "Deleted", kind: "removed", hasValue: false },
  1: { label: "Added", kind: "added", hasValue: true },
  2: { label: "Changed", kind: "changed", hasValue: true },
  3: { label: "Inserted", kind: "added", hasValue: true },
  4: { label: "Removed", kind: "removed", hasValue: false },
};

function opMeta(type) {
  return OP_META[type] || OP_META[2];
}

function formatValue(value) {
  if (value === undefined) return "undefined";
  if (typeof value === "bigint") return `${value}n`;
  if (value instanceof Date) return `Date(${value.toISOString()})`;
  if (value instanceof Map) return `Map(${value.size})`;
  if (value instanceof Set) return `Set(${value.size})`;
  if (isTypedArray(value)) return `${value.constructor.name}(${value.length})`;
  if (typeof value === "string") return `“${value}”`;
  if (value && typeof value === "object") return Array.isArray(value) ? `Array(${value.length})` : "Object";
  return String(value);
}

function formatPath(path) {
  if (!path || path.length === 0) return "root";
  return path.map((part) => typeof part === "number" ? `[${part}]` : `.${part}`).join("").replace(/^\./, "");
}

function safeEval(code) {
  try {
    return new Function(`return ${code}`)();
  } catch (e) {
    return null;
  }
}

function getDiff(a, b) {
  if (!a || !b) return [];
  try { return diff(a, b); } catch (e) { return []; }
}

function getPatch(code, d) {
  if (!code || !d || d.length === 0) return null;
  try { return patch(safeEval(code), d); } catch (e) { return null; }
}

export default function Home() {
  let obj1Val = $state(scenarios[0].before);
  let obj2Val = $state(scenarios[0].after);

  let parsedA = $derived(safeEval(obj1Val));
  let parsedB = $derived(safeEval(obj2Val));

  let diffResult = $derived(getDiff(parsedA, parsedB));
  let patchResult = $derived(getPatch(obj1Val, diffResult));
  let changeSummary = $derived(() => {
    const count = (kind) => diffResult.filter((item) => opMeta(item.type).kind === kind).length;
    return { added: count("added"), changed: count("changed"), removed: count("removed") };
  });

  let activeTab = $state("overview");
  let selectedPath = $state("");
  let copied = $state("");

  let editor1 = $ref();
  let editor2 = $ref();

  let patchVerification = $derived(() => {
    if (!parsedA || !parsedB) return { valid: false, label: "Fix both inputs to run the patch proof" };
    try {
      const patched = patch(safeEval(obj1Val), diffResult);
      return diff(patched, parsedB).length === 0
        ? { valid: true, label: "Patch reconstructs the target" }
        : { valid: false, label: "Patch result differs from target" };
    } catch (error) {
      return { valid: false, label: "Could not verify this patch" };
    }
  });

  function loadScenario(scenario) {
    obj1Val = scenario.before;
    obj2Val = scenario.after;
    selectedPath = "";
  }

  async function copy(text, label) {
    try {
      await navigator.clipboard.writeText(text);
      copied = label;
      setTimeout(() => copied = "", 1800);
    } catch (error) {
      copied = "Copy unavailable";
    }
  }

  $effect(() => {
    if (!editor1) return;
    const view1 = new EditorView({
      doc: obj1Val,
      extensions: [basicSetup, javascript(), oneDark, EditorView.updateListener.of((v) => {
        if (v.docChanged) obj1Val = v.state.doc.toString();
      })],
      parent: editor1
    });
    return () => view1.destroy();
  });

  $effect(() => {
    if (!editor2) return;
    const view2 = new EditorView({
      doc: obj2Val,
      extensions: [basicSetup, javascript(), oneDark, EditorView.updateListener.of((v) => {
        if (v.docChanged) obj2Val = v.state.doc.toString();
      })],
      parent: editor2
    });
    return () => view2.destroy();
  });

  return (
    <main class="diff-lab">
      <section class="lab-hero">
        <div class="eyebrow">JavaScript object diff</div>
        <h1>See every change. <span>Prove every patch.</span></h1>
        <p>Explore a structural diff engine built for real JavaScript—not just JSON.</p>
        <div class="hero-actions">
          <a class="button button-primary" href="/docs">Get started</a>
        </div>
        <div class="capability-row" aria-label="Supported JavaScript values">
          <span>Map</span><span>Set</span><span>Date</span><span>BigInt</span><span>TypedArray</span><span>Cycles</span><span>Sparse arrays</span>
        </div>
      </section>

      <section class="scenario-section" aria-labelledby="scenarios-title">
        <div><div class="section-kicker">Try an edge case</div><h2 id="scenarios-title">Built for values JSON cannot hold.</h2></div>
        <div class="scenario-list">
          {scenarios.map((scenario) => (
            <button class="scenario-card" onclick={() => loadScenario(scenario)}>
              <strong>{scenario.label}</strong><span>{scenario.detail}</span>
            </button>
          ))}
        </div>
      </section>

      <section id="lab" class="lab-workspace" aria-labelledby="lab-title">
        <div class="workspace-heading">
          <div><div class="section-kicker">Interactive playground</div><h2 id="lab-title">Object diff</h2></div>
          <div class={patchVerification.valid ? "patch-status is-valid" : "patch-status"}>
            <span class="status-dot"></span>{patchVerification.label}
          </div>
        </div>

        <div class="editor-grid">
          <section class="code-pane">
            <div class="pane-heading"><div><span class="pane-label">Before</span><strong>Original object</strong></div><span class="pane-language">JavaScript</span></div>
            <div class="editor-wrapper" ref={editor1}></div>
          </section>
          <section class="code-pane">
            <div class="pane-heading"><div><span class="pane-label pane-label-target">After</span><strong>Target object</strong></div><span class="pane-language">JavaScript</span></div>
            <div class="editor-wrapper" ref={editor2}></div>
          </section>
        </div>

        <section class="results-pane">
          <div class="result-topbar">
            <div class="tabs" role="tablist">
              <button class={activeTab === "overview" ? "active" : ""} onclick={() => activeTab = "overview"}>Overview</button>
              <button class={activeTab === "changes" ? "active" : ""} onclick={() => activeTab = "changes"}>Changes <span>{diffResult.length}</span></button>
              <button class={activeTab === "diff" ? "active" : ""} onclick={() => activeTab = "diff"}>Raw diff</button>
              <button class={activeTab === "patch" ? "active" : ""} onclick={() => activeTab = "patch"}>Patch</button>
            </div>
            <button class="copy-button" onclick={() => copy(activeTab === "patch" ? getDiffResults(patchResult) : getDiffResults(diffResult), activeTab === "patch" ? "Patch copied" : "Diff copied")}>{copied || "Copy"}</button>
          </div>
          <div class="results-content">
            {activeTab === "overview" && (
              <div class="diff-overview">
                <div class="overview-heading"><div><span class="section-kicker">Change visualization</span><h3>{diffResult.length === 0 ? "Objects are in sync" : `${diffResult.length} operations to reach the target`}</h3></div><span class={patchVerification.valid ? "overview-proof is-valid" : "overview-proof"}>{patchVerification.valid ? "Verified patch" : "Awaiting valid input"}</span></div>
                <div class="summary-grid">
                  <button class="summary-card added" onclick={() => activeTab = "changes"}><strong>{changeSummary.added}</strong><span>Added</span></button>
                  <button class="summary-card changed" onclick={() => activeTab = "changes"}><strong>{changeSummary.changed}</strong><span>Changed</span></button>
                  <button class="summary-card removed" onclick={() => activeTab = "changes"}><strong>{changeSummary.removed}</strong><span>Removed</span></button>
                </div>
                {diffResult.length > 0 ? <div class="change-plot" aria-label="One bar for each diff operation">{diffResult.map((item) => <button class={`plot-bar kind-${opMeta(item.type).kind}`} onclick={() => { selectedPath = formatPath(item.path); activeTab = "changes"; }} aria-label={`${formatPath(item.path)}: ${opMeta(item.type).label}`}></button>)}</div> : <div class="empty-state">No differences yet. Change either object to inspect its operations.</div>}
                {diffResult.length > 0 && <p class="plot-caption">Each marker is one patch operation. Select a marker to inspect its path in the complete change list.</p>}
              </div>
            )}
            {activeTab === "changes" && (
              <div class="change-list">
                {diffResult.length === 0 ? <div class="empty-state">No differences yet. Change either object to inspect its operations.</div> : diffResult.map((item) => (
                  <button class={selectedPath === formatPath(item.path) ? "change-card selected" : `change-card kind-${opMeta(item.type).kind}`} onclick={() => selectedPath = formatPath(item.path)}>
                    <span class="change-type">{opMeta(item.type).label}</span>
                    <code>{formatPath(item.path)}</code>
                    {opMeta(item.type).hasValue ? <span class="change-value">{formatValue(item.value)}</span> : <span class="change-value">removed from target</span>}
                  </button>
                ))}
              </div>
            )}
            {activeTab === "diff" && <pre class="json-viewer">{getDiffResults(diffResult)}</pre>}
            {activeTab === "patch" && <pre class="json-viewer">{getDiffResults(patchResult)}</pre>}
          </div>
        </section>
      </section>

      <section class="proof-grid" aria-label="obj-diff advantages">
        <article><span class="proof-number">01</span><h2>Readable operations</h2><p>Start with a human change list, then open the raw data only when you need it.</p></article>
        <article><span class="proof-number">02</span><h2>Patch proof included</h2><p>Every edit is checked by applying the generated diff back to a fresh source object.</p></article>
        <article><span class="proof-number">03</span><h2>JavaScript-native</h2><p>Test collections, cycles, dates, BigInts, TypedArrays, and sparse arrays without flattening them into JSON.</p></article>
      </section>
    </main>
  );
}
