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
  catalog: typeof catalog;
  knowledge: typeof knowledge;
  resources: typeof resources;
  scenarios: typeof scenarios;
  tutorialSlugs: typeof tutorialSlugs;
  site: typeof site;
  coverage: typeof coverage;
};
