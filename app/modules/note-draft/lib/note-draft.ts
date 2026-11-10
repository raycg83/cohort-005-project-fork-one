import { checkNoteBody, MAX_NOTE_LENGTH } from "~/lib/notes";

export type NoteDraft = {
  length: number;
  max: number;
  tooLong: boolean;
  canSave: boolean;
};

export function describe(body: string): NoteDraft {
  const length = body.trim().length;
  return {
    length,
    max: MAX_NOTE_LENGTH,
    tooLong: length > MAX_NOTE_LENGTH,
    canSave: checkNoteBody(body).ok,
  };
}
