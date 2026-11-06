export default function Layout(props) {
  return (
    <div class="afwd-shell">
      <header style="padding: 1rem 1.5rem; border-bottom: 1px solid var(--lab-line); display: flex; align-items: center; justify-content: space-between; width: 100%; box-sizing: border-box;">
        <div style="font-weight: 700; font-size: 1.25rem; color: var(--afw-text); display: flex; align-items: center; gap: 0.5rem;">
          <span>obj-diff</span>
          <span style="font-size: 0.75rem; font-weight: 500; background: var(--afw-bg-elevated); padding: 0.15rem 0.4rem; border-radius: 9999px; color: var(--afw-text-muted);">Playground</span>
        </div>
        <div style="font-size: 0.85rem; color: var(--afw-text-muted);">Local Testing App</div>
      </header>
      <div class="afwd-shell-body" style="padding: 0 1.5rem 2rem; width: 100%; box-sizing: border-box;">
        {props.children}
      </div>
    </div>
  );
}
