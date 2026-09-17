import Decimal from "decimal.js";
import { z } from "zod";
const amount = z
  .string()
  .regex(/^\d+(\.\d{1,6})?$/)
  .refine((v) => {
    try {
      return new Decimal(v).lte(1e12);
    } catch {
      return false;
    }
  });
const optionalAmount = z.union([amount, z.literal("")]);
export const mediaSchema = z.object({
  unit: z.enum(["秒", "张", "个"]),
  currency: z.enum(["CNY", "USD"]),
  mode: z.enum(["usage", "package"]),
  rate: optionalAmount,
  packSize: optionalAmount,
  packPrice: optionalAmount,
  balance: optionalAmount,
  extra: optionalAmount,
  rows: z
    .array(
      z.object({
        name: z.string().max(120),
        count: z.number().int().min(1).max(100000),
        units: amount.refine((v) => Number(v) > 0),
        attempts: z.number().int().min(1).max(1000),
      }),
    )
    .min(1)
    .max(30),
});
export type MediaInput = z.infer<typeof mediaSchema>;
export function mediaBudget(input: MediaInput) {
  const data = mediaSchema.parse(input);
  const total = data.rows.reduce(
    (n, r) => n.plus(new Decimal(r.units).mul(r.count).mul(r.attempts)),
    new Decimal(0),
  );
  const balance = new Decimal(data.balance || 0);
  const shortfall = Decimal.max(0, total.minus(balance));
  let cost: Decimal | null = null;
  let packages: Decimal | null = null;
  if (data.mode === "usage") {
    if (data.rate !== "") cost = total.mul(data.rate);
  } else if (shortfall.isZero()) {
    cost = new Decimal(0);
    packages = new Decimal(0);
  } else if (data.packSize !== "" && data.packPrice !== "") {
    if (new Decimal(data.packSize).lte(0)) throw Error("额度包容量必须大于0");
    packages = shortfall.div(data.packSize).ceil();
    cost = packages.mul(data.packPrice);
  }
  const extra = new Decimal(data.extra || 0);
  return {
    units: total.toString(),
    shortfall: shortfall.toString(),
    packages: packages?.toString() ?? null,
    amount: cost?.plus(extra).toFixed(2) ?? null,
    extra: extra.toFixed(2),
    remaining:
      data.mode === "package" && packages !== null
        ? balance
            .plus(packages.mul(data.packSize || 0))
            .minus(total)
            .toString()
        : null,
  };
}
