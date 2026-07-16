import { defineDocsConfig } from "@opentf/web-docs/config";

export default defineDocsConfig({
  // Canonical site origin — required for production builds.
  site: { url: "https://obj-diff.opentechf.org" },

  docs: {
    title: "obj-diff",
    version: "v0.14.0",
    homeUrl: "/",
    dir: "docs",
    nav: [
      { label: "Home", href: "/" },
      { label: "Docs", href: "/docs" },
    ],
    github: "https://github.com/Open-Tech-Foundation/obj-diff",
    search: { provider: "pagefind" },
    footer: { text: "© 2026 Open Tech Foundation" },
    // Per-page "Last updated" (from git) and "Edit this page" (GitHub). Set repoUrl to
    // your repository root; links use <repoUrl>/edit/main/<source-path>.
    repoUrl: "https://github.com/Open-Tech-Foundation/obj-diff",
    lastUpdated: true,
  },
});
