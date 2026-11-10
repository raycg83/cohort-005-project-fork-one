import { describe, expect, it } from "vitest";
import { insertLeftFindings, leftFindings } from "./left-findings";

const barrel = {
  path: "app/modules/x/course.server.ts",
  line: 1,
  rule: "Don't write barrel files",
  body: "This file only re-exports `lib/course.ts`.",
};
const elsewhere = {
  path: "app/routes/x.tsx",
  line: 400,
  rule: "A route does not query data a module owns",
  body: "Ask the module.",
};

describe("leftFindings", () => {
  it("is empty when nothing was left", () => {
    expect(leftFindings([], [])).toBe("");
  });

  it("gives an inline finding one line, without its body", () => {
    const section = leftFindings([barrel], []);
    expect(section).toContain(
      "- `app/modules/x/course.server.ts:1`: Don't write barrel files"
    );
    expect(section).not.toContain("only re-exports");
  });

  it("lists a finding outside the diff in full", () => {
    expect(leftFindings([], [elsewhere])).toContain(
      "- `app/routes/x.tsx:400`: **A route does not query data a module owns.** Ask the module."
    );
  });
});

describe("insertLeftFindings", () => {
  const section = "## Left for you\n\n- one\n";

  it("goes before the rules the review wanted", () => {
    const verdict = "## Spec: PASS\n\n## Rules this review wanted\n\n- none\n";
    expect(insertLeftFindings(verdict, section)).toBe(
      "## Spec: PASS\n\n## Left for you\n\n- one\n\n## Rules this review wanted\n\n- none\n"
    );
  });

  it("goes at the end when there is no rules section", () => {
    expect(insertLeftFindings("## Spec: PASS\n", section)).toBe(
      "## Spec: PASS\n\n## Left for you\n\n- one\n"
    );
  });

  it("leaves the verdict alone when nothing was left", () => {
    expect(insertLeftFindings("## Spec: PASS\n", "")).toBe("## Spec: PASS\n");
  });
});
