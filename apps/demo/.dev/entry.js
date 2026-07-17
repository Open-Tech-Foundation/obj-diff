import { mountApp } from "@opentf/web";
mountApp({
  pages: {
    ["/home/G/projects/opentf/obj-diff/apps/demo/app/page.jsx"]: () => import("/__route/L2hvbWUvRy9wcm9qZWN0cy9vcGVudGYvb2JqLWRpZmYvYXBwcy9kZW1vL2FwcC9wYWdlLmpzeA.js"),
    ["/home/G/projects/opentf/obj-diff/apps/demo/app/layout.jsx"]: () => import("/__route/L2hvbWUvRy9wcm9qZWN0cy9vcGVudGYvb2JqLWRpZmYvYXBwcy9kZW1vL2FwcC9sYXlvdXQuanN4.js"),
  },
  target: document.getElementById("app"),
});
