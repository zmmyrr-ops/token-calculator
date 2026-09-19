import type { catalog } from "../backend/src/content/catalog";
import type { knowledge } from "../backend/src/content/knowledge";
import type {
  resources,
  scenarios,
  tutorialSlugs,
} from "../backend/src/content/resources";
import type { site } from "../backend/src/content/site";
import type coverage from "../data/coverage.json";
export type Content = {
  seoOverrides?: Record<string, import("./seo-settings").SeoOverride>;
  catalog: typeof catalog;
  knowledge: Array<(typeof knowledge)[number] & {curation?: import("./cms").Curation}>;
  resources: typeof resources;
  scenarios: typeof scenarios;
  tutorialSlugs: typeof tutorialSlugs;
  site: typeof site;
  coverage: typeof coverage;
};
