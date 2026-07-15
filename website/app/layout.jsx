import { Footer, Navbar } from "@opentf/web-docs";
import config from "../otfw.config.js";

export default function Layout(props) {
  return (
    <div class="otfw-shell">
      <Navbar config={config.docs} />
      <div class="otfw-shell-body">{props.children}</div>
      <Footer config={config.docs} />
    </div>
  );
}
