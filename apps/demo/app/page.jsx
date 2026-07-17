import { untracked } from "@opentf/web";
import { diff, patch, serialize, deserialize } from "@opentf/obj-diff";
import { EditorView, basicSetup } from "codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import {
  scenarios,
  getDiffResults,
  opMeta,
  formatValue,
  formatPath,
  buildDiffRows,
  diffKey,
  diffMark,
  safeEval,
  getDiff,
  getPatch
} from "./diffUtils.js";

export default function Home() {
  let obj1Val = $state(scenarios[0].before);
  let obj2Val = $state(scenarios[0].after);

  let parsedA = $derived(safeEval(obj1Val));
  let parsedB = $derived(safeEval(obj2Val));

  let diffResult = $derived(getDiff(parsedA, parsedB));
  let changeSummary = $derived(() => {
    const count = (kind) => diffResult.filter((item) => opMeta(item.type).kind === kind).length;
    return { added: count("added"), changed: count("changed"), removed: count("removed") };
  });

  let activeTab = $state("visual");
  let selectedPath = $state("");
  let copied = $state("");

  let editor1 = $ref();
  let editor2 = $ref();
  let view1 = null;
  let view2 = null;

  let roundtrippedDiff = $derived(() => {
    try {
      return deserialize(serialize(diffResult));
    } catch (e) {
      return [];
    }
  });

  let patchResult = $derived(getPatch(obj1Val, roundtrippedDiff));

  let patchVerification = $derived(() => {
    if (!parsedA || !parsedB) return { valid: false, label: "Fix both inputs to run the patch proof" };
    try {
      const patched = patch(safeEval(obj1Val), diffResult);
      return diff(patched, parsedB).length === 0
        ? { valid: true, label: "Raw patch verified" }
        : { valid: false, label: "Raw patch mismatch" };
    } catch (error) {
      return { valid: false, label: "Could not verify raw patch" };
    }
  });

  let serializationVerification = $derived(() => {
    if (!parsedA || !parsedB) return { valid: false, label: "Awaiting valid input" };
    try {
      const patched = patch(safeEval(obj1Val), roundtrippedDiff);
      return diff(patched, parsedB).length === 0
        ? { valid: true, label: "Round-trip verified" }
        : { valid: false, label: "Round-trip mismatch" };
    } catch (error) {
      return { valid: false, label: "Round-trip check failed" };
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
    view1 = new EditorView({
      doc: untracked(() => obj1Val),
      extensions: [basicSetup, javascript(), oneDark, EditorView.updateListener.of((v) => {
        if (v.docChanged) obj1Val = v.state.doc.toString();
      })],
      parent: editor1
    });
    return () => { view1.destroy(); view1 = null; };
  });

  $effect(() => {
    if (!editor2) return;
    view2 = new EditorView({
      doc: untracked(() => obj2Val),
      extensions: [basicSetup, javascript(), oneDark, EditorView.updateListener.of((v) => {
        if (v.docChanged) obj2Val = v.state.doc.toString();
      })],
      parent: editor2
    });
    return () => { view2.destroy(); view2 = null; };
  });

  $effect(() => {
    const val = obj1Val;
    if (view1 && view1.state.doc.toString() !== val)
      view1.dispatch({ changes: { from: 0, to: view1.state.doc.length, insert: val } });
  });

  $effect(() => {
    const val = obj2Val;
    if (view2 && view2.state.doc.toString() !== val)
      view2.dispatch({ changes: { from: 0, to: view2.state.doc.length, insert: val } });
  });

  return (
    <main class="diff-lab" style="padding: 1.5rem 0 0 0; width: 100%; max-width: 100%; margin: 0; box-sizing: border-box;">
      <section id="lab" class="lab-workspace">
        <div class="workspace-heading" style="padding: 1rem 1.5rem; display: flex; justify-content: flex-end; gap: 1rem;">
          <div class={patchVerification.valid ? "patch-status is-valid" : "patch-status"}>
            <span class="status-dot"></span>{patchVerification.label}
          </div>
          <div class={serializationVerification.valid ? "patch-status is-valid" : "patch-status"}>
            <span class="status-dot"></span>{serializationVerification.label}
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); border-top: 1px solid var(--lab-line);">
          <section class="code-pane">
            <div class="pane-heading">
              <div>
                <span class="pane-label">Before</span>
                <strong>Original object</strong>
              </div>
              <span class="pane-language">JavaScript</span>
            </div>
            <div class="editor-wrapper" ref={editor1}></div>
          </section>
          <section class="code-pane">
            <div class="pane-heading">
              <div>
                <span class="pane-label pane-label-target">After</span>
                <strong>Target object</strong>
              </div>
              <span class="pane-language">JavaScript</span>
            </div>
            <div class="editor-wrapper" ref={editor2}></div>
          </section>
          <section class="results-pane" style="border-top: none; border-left: 1px solid var(--lab-line);">
            <div class="result-topbar" style="border-bottom: 1px solid var(--lab-line); background: var(--lab-paper);">
              <div class="tabs" role="tablist">
                <button class={activeTab === "visual" ? "active" : ""} onclick={() => activeTab = "visual"}>Visual</button>
                <button class={activeTab === "changes" ? "active" : ""} onclick={() => activeTab = "changes"}>Changes <span>{diffResult.length}</span></button>
                <button class={activeTab === "diff" ? "active" : ""} onclick={() => activeTab = "diff"}>Raw diff</button>
                <button class={activeTab === "wire" ? "active" : ""} onclick={() => activeTab = "wire"}>Wire format</button>
                <button class={activeTab === "patch" ? "active" : ""} onclick={() => activeTab = "patch"}>Patch</button>
              </div>
              <button class="copy-button" onclick={() => {
                let text = "";
                let label = "Copied";
                if (activeTab === "patch") {
                  text = getDiffResults(patchResult);
                  label = "Patch copied";
                } else if (activeTab === "wire") {
                  try {
                    text = JSON.stringify(JSON.parse(serialize(diffResult)), null, 2);
                    label = "Wire JSON copied";
                  } catch (e) {
                    text = "";
                  }
                } else {
                  text = getDiffResults(diffResult);
                  label = "Diff copied";
                }
                copy(text, label);
              }}>{copied || "Copy"}</button>
            </div>
            <div class="results-content" style="height: 22rem; max-height: 22rem; min-height: 22rem; overflow: auto; padding: 1.25rem; box-sizing: border-box;">
              {activeTab === "visual" && (
                <div class="diff-overview">
                  <div class="overview-heading" style="margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center; gap: 0.5rem;">
                    <div>
                      <h3 style="font-size: 0.95rem; margin: 0; font-weight: 600; color: var(--lab-ink);">{diffResult.length === 0 ? "Objects are in sync" : `${diffResult.length} operations`}</h3>
                    </div>
                    <span class={patchVerification.valid ? "overview-proof is-valid" : "overview-proof"} style="font-size: 0.75rem; padding: 0.15rem 0.4rem;">
                      {patchVerification.valid ? "Verified patch" : "Awaiting valid input"}
                    </span>
                  </div>
                  <div class="summary-grid" style="margin-bottom: 1rem; display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem;">
                    <button class="summary-card added" onclick={() => activeTab = "changes"} style="padding: 0.4rem; min-height: unset;">
                      <strong style="font-size: 1.1rem; display: block;">{changeSummary.added}</strong>
                      <span style="font-size: 0.7rem;">Added</span>
                    </button>
                    <button class="summary-card changed" onclick={() => activeTab = "changes"} style="padding: 0.4rem; min-height: unset;">
                      <strong style="font-size: 1.1rem; display: block;">{changeSummary.changed}</strong>
                      <span style="font-size: 0.7rem;">Changed</span>
                    </button>
                    <button class="summary-card removed" onclick={() => activeTab = "changes"} style="padding: 0.4rem; min-height: unset;">
                      <strong style="font-size: 1.1rem; display: block;">{changeSummary.removed}</strong>
                      <span style="font-size: 0.7rem;">Removed</span>
                    </button>
                  </div>
                  {(parsedA != null && parsedB != null) ? (
                    <div class="diff-tree" aria-label="Visual diff of the two objects" style="font-size: 0.8rem; line-height: 1.4;">
                      {buildDiffRows(parsedA, parsedB).map((d) => (
                        <div class={`dt-row dt-${d.status}`}>
                          <span class="dt-mark">{d.head ? "*" : diffMark(d.status)}</span>
                          <span class="dt-line">
                            <span class="dt-pre">{"  ".repeat(d.depth)}{diffKey(d.key)}</span>
                            <span class="dt-old">{d.kind === "change" ? d.oldText : ""}</span>
                            <span class="dt-arrow">{d.kind === "change" ? " → " : ""}</span>
                            <span class="dt-rest">{d.kind === "change" ? d.newText : d.text}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : <div class="empty-state">Fix both inputs to see the visual diff.</div>}
                  <div class="op-legend" style="margin-top: 1rem; font-size: 0.75rem;">
                    <span><i class="op-swatch kind-added"></i>Added</span>
                    <span><i class="op-swatch kind-changed"></i>Changed</span>
                    <span><i class="op-swatch kind-removed"></i>Removed</span>
                  </div>
                </div>
              )}
              {activeTab === "changes" && (
                <div class="change-list">
                  {diffResult.length === 0 ? (
                    <div class="empty-state">No differences yet. Change either object to inspect its operations.</div>
                  ) : (
                    diffResult.map((item) => (
                      <button class={selectedPath === formatPath(item.path) ? "change-card selected" : `change-card kind-${opMeta(item.type).kind}`} onclick={() => selectedPath = formatPath(item.path)} style="padding: 0.5rem 0.75rem; margin-bottom: 0.4rem; font-size: 0.8rem;">
                        <span class="change-type" style="font-size: 0.7rem; padding: 0.1rem 0.3rem;">{opMeta(item.type).label}</span>
                        <code style="font-size: 0.75rem; margin-left: 0.4rem;">{formatPath(item.path)}</code>
                        {opMeta(item.type).hasValue ? <span class="change-value" style="font-size: 0.75rem;">{formatValue(item.value)}</span> : <span class="change-value" style="font-size: 0.75rem;">removed from target</span>}
                      </button>
                    ))
                  )}
                </div>
              )}
              {activeTab === "diff" && <pre class="json-viewer" style="font-size: 0.8rem; margin: 0;">{getDiffResults(diffResult)}</pre>}
              {activeTab === "wire" && (
                <pre class="json-viewer" style="font-size: 0.8rem; margin: 0; white-space: pre-wrap; word-break: break-all;">
                  {(() => {
                    try {
                      return JSON.stringify(JSON.parse(serialize(diffResult)), null, 2);
                    } catch (e) {
                      return "Serialization failed: " + e.message;
                    }
                  })()}
                </pre>
              )}
              {activeTab === "patch" && <pre class="json-viewer" style="font-size: 0.8rem; margin: 0;">{getDiffResults(patchResult)}</pre>}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
