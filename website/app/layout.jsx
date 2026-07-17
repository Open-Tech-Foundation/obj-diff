import { Navbar } from "@opentf/web-docs";
import config from "../otfw.config.js";

export default function Layout(props) {
  const footer = config.docs.footer || {};
  const links = footer.links || [];
  return (
    <div class="otfw-shell">
      <Navbar config={config.docs} />
      <div class="otfw-shell-body">{props.children}</div>
      <footer class="otfw-footer">
        <div class="otfw-footer-inner">
          <div class="otfw-footer-text">
            {footer.textUrl ? (
              <a class="otfw-footer-link" href={footer.textUrl} target="_blank" rel="noopener noreferrer">{footer.text}</a>
            ) : footer.text}
          </div>
          {links.length > 0 ? (
            <div class="otfw-footer-links">
              {links.map((l) => (
                <a class="otfw-footer-link" href={l.href} target="_blank" rel="noopener noreferrer">{l.label}</a>
              ))}
            </div>
          ) : null}
        </div>
      </footer>
    </div>
  );
}
