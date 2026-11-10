import { describe, expect, it } from "vitest";
import { describeNoteDraft } from "~/modules/note-draft";
import { MAX_NOTE_LENGTH } from "~/lib/notes";

describe("describeNoteDraft", () => {
  it("cannot save an empty draft", () => {
    expect(describeNoteDraft("")).toEqual({
      length: 0,
      max: MAX_NOTE_LENGTH,
      tooLong: false,
      canSave: false,
    });
  });

  it("cannot save a draft that is only whitespace", () => {
    const draft = describeNoteDraft("   \n\t ");
    expect(draft.length).toBe(0);
    expect(draft.canSave).toBe(false);
  });

  it("counts the trimmed body, as the server does", () => {
    expect(describeNoteDraft("  union types  ").length).toBe(11);
  });

  it("can save a draft at exactly the limit", () => {
    const draft = describeNoteDraft("a".repeat(MAX_NOTE_LENGTH));
    expect(draft.tooLong).toBe(false);
    expect(draft.canSave).toBe(true);
  });

  it("cannot save a draft one character over the limit", () => {
    const draft = describeNoteDraft("a".repeat(MAX_NOTE_LENGTH + 1));
    expect(draft.length).toBe(MAX_NOTE_LENGTH + 1);
    expect(draft.tooLong).toBe(true);
    expect(draft.canSave).toBe(false);
  });

  it("does not count surrounding whitespace against the limit", () => {
    const draft = describeNoteDraft(`  ${"a".repeat(MAX_NOTE_LENGTH)}  `);
    expect(draft.tooLong).toBe(false);
    expect(draft.canSave).toBe(true);
  });
});
