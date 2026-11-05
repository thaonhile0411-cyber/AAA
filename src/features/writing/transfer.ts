import { MAX_ESSAY_LENGTH } from "./assessment.ts";

const transferKey = "aaa:writing-transfer:v1";

export function saveWritingTransfer(storage: Storage, slug: string, essay: string) {
  storage.setItem(transferKey, JSON.stringify({ slug, essay }));
}

export function takeWritingTransfer(storage: Storage, slug: string): string | null {
  const stored = storage.getItem(transferKey);
  if (!stored) return null;
  const transfer: unknown = JSON.parse(stored);
  if (
    typeof transfer !== "object" || transfer === null ||
    !("slug" in transfer) || transfer.slug !== slug ||
    !("essay" in transfer) || typeof transfer.essay !== "string" ||
    transfer.essay.length > MAX_ESSAY_LENGTH
  ) return null;
  storage.removeItem(transferKey);
  return transfer.essay;
}
