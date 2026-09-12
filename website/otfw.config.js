import { defineDocsConfig } from "@opentf/web-docs/config";

export default defineDocsConfig({
  // Canonical site origin — required for production builds.
  site: { url: "https://obj-diff.opentechf.org" },

  docs: {
    title: "obj-diff",
    version: "v0.18.0",
    logo: "/assets/Logo.svg",
    homeUrl: "/",
    dir: "docs",
    nav: [
      { label: "Home", href: "/" },
      { label: "Docs", href: "/docs" },
    ],
    github: "https://github.com/Open-Tech-Foundation/obj-diff",
    search: { provider: "pagefind" },
    footer: {
      text: "MIT 2026 © Open Tech Foundation",
      links: [{ label: "Open Tech Foundation", href: "https://opentechf.org", external: true }],
    },
    // Per-page "Last updated" (from git) and "Edit this page" (GitHub). Set repoUrl to
    // your repository root; links use <repoUrl>/edit/main/<source-path>.
    repoUrl: "https://github.com/Open-Tech-Foundation/obj-diff",
    lastUpdated: true,
  },
});
