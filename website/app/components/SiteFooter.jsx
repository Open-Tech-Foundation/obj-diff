import BuiltWithBadge from "./BuiltWithBadge.jsx";

export default function SiteFooter() {
  return (
    <footer class="afwd-footer border-t border-zinc-800 bg-zinc-950 text-zinc-400">
      <div class="afwd-footer-inner site-footer-inner">
        <div class="site-footer-org">
          <a href="https://opentechf.org" target="_blank" rel="noreferrer" class="site-footer-org-link">
            <img src="/assets/Logo.svg" alt="" width="24" height="24" class="site-footer-org-logo" />
            <span>© Open Tech Foundation</span>
          </a>
          <span class="site-footer-license">· MIT</span>
        </div>
        <div class="site-footer-center">
          <a
            href="https://opentechf.org/policies"
            target="_blank"
            rel="noopener noreferrer"
            class="site-footer-policy-link"
            aria-label="Open organization policies in a new tab"
          >
            Organization policies ↗
          </a>
        </div>
        <BuiltWithBadge />
      </div>
      <div class="site-footer-bottomline">No trackers, no analytics.</div>
    </footer>
  );
}
