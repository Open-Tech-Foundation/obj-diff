import BuiltWithBadge from "./BuiltWithBadge.jsx";

export default function SiteFooter() {
  return (
    <footer class="otfw-footer">
      <div class="otfw-footer-inner">
        <div class="otfw-footer-org">
          <a href="https://opentechf.org" target="_blank" rel="noreferrer" class="otfw-footer-org-link">
            <img src="/assets/Logo.svg" alt="" width="24" height="24" class="otfw-footer-org-logo" />
            <span>© Open Tech Foundation</span>
          </a>
          <span class="otfw-footer-license">— MIT</span>
        </div>
        <BuiltWithBadge />
      </div>
    </footer>
  );
}
