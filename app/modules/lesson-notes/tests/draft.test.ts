import { describe, it, expect } from "vitest";
import { describeNoteDraft } from "../index";
import { MAX_NOTE_LENGTH } from "~/lib/notes";

describe("describeNoteDraft", () => {
  it("is empty and unsaveable when nothing is typed and there is no Note", () => {
    expect(describeNoteDraft("", null)).toEqual({
      length: 0,
      limit: MAX_NOTE_LENGTH,
      tooLong: false,
      status: "empty",
      canSave: false,
    });
  });

  it("treats whitespace alone as empty", () => {
    const draft = describeNoteDraft("   \n ", null);
    expect(draft.status).toBe("empty");
    expect(draft.canSave).toBe(false);
  });

  it("is unsaved and saveable when a new Note is typed", () => {
    const draft = describeNoteDraft("Generics need a constraint", null);
    expect(draft.status).toBe("unsaved");
    expect(draft.canSave).toBe(true);
    expect(draft.length).toBe(26);
  });

  it("is saved when the draft matches the stored body", () => {
    const draft = describeNoteDraft("Remember infer", "Remember infer");
    expect(draft.status).toBe("saved");
    expect(draft.canSave).toBe(false);
  });

  it("ignores surrounding whitespace the action would trim", () => {
    expect(
      describeNoteDraft("  Remember infer\n", "Remember infer").status
    ).toBe("saved");
  });

  it("is unsaved when the draft differs from the stored body", () => {
    const draft = describeNoteDraft("Remember infer!", "Remember infer");
    expect(draft.status).toBe("unsaved");
    expect(draft.canSave).toBe(true);
  });

  it("allows a Note of exactly the limit", () => {
    const draft = describeNoteDraft("a".repeat(MAX_NOTE_LENGTH), null);
    expect(draft.tooLong).toBe(false);
    expect(draft.canSave).toBe(true);
  });

  it("is too long and unsaveable one character over the limit", () => {
    const draft = describeNoteDraft("a".repeat(MAX_NOTE_LENGTH + 1), null);
    expect(draft.tooLong).toBe(true);
    expect(draft.status).toBe("unsaved");
    expect(draft.canSave).toBe(false);
  });

  it("measures the limit after trimming", () => {
    const draft = describeNoteDraft(` ${"a".repeat(MAX_NOTE_LENGTH)} `, null);
    expect(draft.tooLong).toBe(false);
    expect(draft.length).toBe(MAX_NOTE_LENGTH);
  });
});
