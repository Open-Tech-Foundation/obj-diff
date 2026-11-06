import { defineDocsConfig } from "@opentf/afw-docs/config";

export default defineDocsConfig({
  // Canonical site origin — required for production builds.
  site: { url: "https://obj-diff.opentechf.org" },

  docs: {
    title: "obj-diff",
    version: "v0.18.0",
    homeUrl: "/",
    dir: "docs",
    nav: [
      { label: "Home", href: "/" },
      { label: "Docs", href: "/docs" },
    ],
    github: "https://github.com/Open-Tech-Foundation/obj-diff",
    search: { provider: "afw" },
    // Footer chrome is rendered by components/SiteFooter.jsx.
    footer: {},
    // Per-page "Last updated" (from git) and "Edit this page" (GitHub). Set repoUrl to
    // your repository root; links use <repoUrl>/edit/main/<source-path>.
    repoUrl: "https://github.com/Open-Tech-Foundation/obj-diff",
    lastUpdated: true,
  },
});
