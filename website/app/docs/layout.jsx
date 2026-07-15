import { DocsLayout } from "@opentf/web-docs";
import config from "../../otfw.config.js";

export default function Layout(props) {
  return (
    <DocsLayout config={config.docs} frame={false}>
      {props.children}
    </DocsLayout>
  );
}
