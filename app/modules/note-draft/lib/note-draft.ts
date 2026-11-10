import { MAX_NOTE_LENGTH } from "~/lib/notes";

export type NoteDraft = {
  length: number;
  max: number;
  tooLong: boolean;
  canSave: boolean;
};

// Measured on the trimmed body, as the save-note action measures it, so the
// counter and the Save button never disagree with the server.
export function describe(body: string): NoteDraft {
  const length = body.trim().length;
  const tooLong = length > MAX_NOTE_LENGTH;
  return {
    length,
    max: MAX_NOTE_LENGTH,
    tooLong,
    canSave: length > 0 && !tooLong,
  };
}
