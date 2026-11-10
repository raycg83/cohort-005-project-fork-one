import { MAX_NOTE_LENGTH } from "~/lib/notes";

export type NoteDraftStatus = "empty" | "unsaved" | "saved";

export type NoteDraft = {
  length: number;
  limit: number;
  tooLong: boolean;
  status: NoteDraftStatus;
  canSave: boolean;
};

export function readNoteDraft(
  draft: string,
  savedBody: string | null
): NoteDraft {
  // The action trims before it stores, so whitespace alone is not an edit.
  const trimmed = draft.trim();
  const tooLong = trimmed.length > MAX_NOTE_LENGTH;
  const status: NoteDraftStatus =
    trimmed.length === 0
      ? "empty"
      : trimmed === savedBody
        ? "saved"
        : "unsaved";

  return {
    length: trimmed.length,
    limit: MAX_NOTE_LENGTH,
    tooLong,
    status,
    canSave: status === "unsaved" && !tooLong,
  };
}
