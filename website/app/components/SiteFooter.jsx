import BuiltWithBadge from "./BuiltWithBadge.jsx";

export default function SiteFooter() {
  return (
    <footer class="afwd-footer">
      <div class="afwd-footer-inner">
        <div class="afwd-footer-org">
          <a href="https://opentechf.org" target="_blank" rel="noreferrer" class="afwd-footer-org-link">
            <img src="/assets/Logo.svg" alt="" width="24" height="24" class="afwd-footer-org-logo" />
            <span>© Open Tech Foundation</span>
          </a>
          <span class="afwd-footer-license">— MIT</span>
        </div>
        <BuiltWithBadge />
      </div>
    </footer>
  );
}
