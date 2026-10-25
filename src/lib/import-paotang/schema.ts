import { z } from "zod";

// The old app's backup (SPEC §9.1). Lenient: only the fields the importer uses are required,
// and unknown fields pass through, so a newer export with extra fields still imports.

const oldType = z.union([z.literal(0), z.literal(1)]); // 0 = income, 1 = expense

const transaction = z.looseObject({
  id: z.string().min(1),
  /** ISO with offset, e.g. 2026-10-26T09:05:00.123456+07:00. Only the wall-clock part is used. */
  saveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/),
  type: oldType,
  /** Baht as a float, ≥ 0. */
  mainValue: z.number().nonnegative(),
  categoryInfoid: z.string().min(1),
  remark: z.string().nullish(),
  isDel: z.boolean(),
  title: z.string().nullish(),
});

const category = z.looseObject({
  id: z.string().min(1),
  title: z.string(),
  type: oldType,
  /** Missing on top-level categories. */
  parentCategoryInfoId: z.string().nullish(),
  isDel: z.boolean(),
});

const wallet = z.looseObject({
  mainBalance: z.number(),
});

export const paotangSchema = z.looseObject({
  transactionInfos: z.array(transaction),
  categoryInfos: z.array(category),
  walletInfos: z.array(wallet).min(1),
});

export type PaotangFile = z.infer<typeof paotangSchema>;
export type PaotangTransaction = z.infer<typeof transaction>;
export type PaotangCategory = z.infer<typeof category>;

export class PaotangError extends Error {
  constructor(
    readonly reason: "not-json" | "invalid",
    message: string,
  ) {
    super(message);
    this.name = "PaotangError";
  }
}

/** Parse and validate file text. Errors name the first bad field, e.g. `transactionInfos[12].saveDate`. */
export function parsePaotang(text: string): PaotangFile {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new PaotangError("not-json", "The file isn't JSON");
  }
  const result = paotangSchema.safeParse(json);
  if (!result.success) {
    const issue = result.error.issues[0];
    const field = (issue?.path ?? [])
      .map((p) => (typeof p === "number" ? `[${p}]` : `.${String(p)}`))
      .join("")
      .replace(/^\./, "");
    throw new PaotangError(
      "invalid",
      field ? `${field}: ${issue?.message}` : "Not an old-app backup",
    );
  }
  return result.data;
}
