export const MAX_NOTE_LENGTH = 2000;

export type NoteBodyCheck =
  | { ok: true; body: string }
  | { ok: false; error: string };

/**
 * The one rule for a Note body, shared by the editor and `saveNote` so the
 * Save button and the server never disagree: trimmed, not empty, at most
 * `MAX_NOTE_LENGTH` characters.
 */
export function checkNoteBody(raw: string): NoteBodyCheck {
  const body = raw.trim();
  if (body.length === 0) {
    return { ok: false, error: "Write something before saving your note." };
  }
  if (body.length > MAX_NOTE_LENGTH) {
    return {
      ok: false,
      error: `Your note is over ${MAX_NOTE_LENGTH.toLocaleString("en")} characters, so it was not saved.`,
    };
  }
  return { ok: true, body };
}
