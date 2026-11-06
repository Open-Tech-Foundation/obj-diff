import { DocsLayout } from "@opentf/afw-docs";
import config from "../../afw.config.js";

export default function Layout(props) {
  return (
    <DocsLayout config={config.docs} frame={false}>
      {props.children}
    </DocsLayout>
  );
}
