import { Navbar } from "@opentf/afw-docs";
import config from "../afw.config.js";
import SiteFooter from "./components/SiteFooter.jsx";

// Site-wide SEO defaults — least-specific in the metadata merge, so every route
// inherits these and overrides only what it needs (docs pages take their title
// and description from frontmatter). The homepage keeps its own title in
// app/page.jsx; canonical and og:url come from each page's path.
export const metadata = {
  description:
    "A structural diff and patch engine for real JavaScript values — Map, Set, Date, BigInt, TypedArray, cycles, and sparse arrays — not just JSON.",
  openGraph: {
    siteName: "obj-diff",
    type: "website",
    image: "/assets/og.png",
  },
  // Share-card extras renderHead doesn't model natively (og:image:width/height/alt).
  meta: [
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:image:alt", content: "obj-diff — Fast, accurate JavaScript object diffing & patching" },
  ],
};

export default function Layout(props) {
  return (
    <div class="afwd-shell">
      <Navbar config={config.docs} />
      <div class="afwd-shell-body">{props.children}</div>
      <SiteFooter />
    </div>
  );
}
