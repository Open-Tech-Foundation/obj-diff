import { Navbar } from "@opentf/web-docs";
import config from "../otfw.config.js";
import SiteFooter from "./components/SiteFooter.jsx";

export default function Layout(props) {
  return (
    <div class="otfw-shell">
      <Navbar config={config.docs} />
      <div class="otfw-shell-body">{props.children}</div>
      <SiteFooter />
    </div>
  );
}
