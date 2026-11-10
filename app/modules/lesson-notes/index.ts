import { readNoteDraft, type NoteDraft } from "./lib/draft";

export type { NoteDraft, NoteDraftStatus } from "./lib/draft";

/**
 * What the Note editor shows for the text a Student has typed, given the
 * body last saved (null when there is no Note yet): the character count
 * against the limit, whether it is "empty", "unsaved" or "saved", and
 * whether the Save button should be enabled.
 */
export function describeNoteDraft(
  draft: string,
  savedBody: string | null
): NoteDraft {
  return readNoteDraft(draft, savedBody);
}
