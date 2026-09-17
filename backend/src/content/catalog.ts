import raw from "../../../data/catalog.json";
import { CatalogSchema } from "../../../shared/types";
export const catalog = CatalogSchema.parse(raw);
export const models = catalog.models;
export function findModel(id: string) {
  return models.find((m) => m.id === id);
}
export function filterModels(params: Record<string, string | undefined>) {
  const q = (params.q ?? "").toLowerCase();
  return models.filter(
    (m) =>
      (!q ||
        `${m.name} ${m.providerName} ${m.canonicalId}`
          .toLowerCase()
          .includes(q)) &&
      (!params.provider || m.provider === params.provider) &&
      (!params.access || m.access === params.access) &&
      (!params.support ||
        (params.support === "price"
          ? !!m.price
          : params.support === "reasoning"
            ? m.reasoning
            : !m.price)),
  );
}
