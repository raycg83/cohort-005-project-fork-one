import { describe, type NoteDraft } from "./lib/note-draft";

export type { NoteDraft };

/**
 * What the Lesson note editor shows for a draft: its length against the
 * limit, whether it is over, and whether Save can send it.
 */
export function describeNoteDraft(body: string): NoteDraft {
  return describe(body);
}
