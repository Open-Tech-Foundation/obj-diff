// Client entry for `esdev start` / `esdev build`. The route map comes from the
// `@afw/routes` virtual module.
import { mountApp } from "@opentf/afw";
import { guard, pages, loaderRoutes } from "@afw/routes";

mountApp({ pages, guard, loaders: loaderRoutes, target: document.getElementById("app") });
