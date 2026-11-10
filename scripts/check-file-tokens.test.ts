import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Runs the pre-commit token check from a scratch directory, so the files and
// the baseline are the test's own.
function check(
  files: Record<string, number>,
  baseline: Record<string, number>
) {
  const dir = mkdtempSync(join(tmpdir(), "file-tokens-"));
  for (const [name, bytes] of Object.entries(files)) {
    writeFileSync(join(dir, name), "x".repeat(bytes));
  }
  const baselinePath = join(dir, "baseline.json");
  writeFileSync(baselinePath, JSON.stringify(baseline));
  const result = spawnSync(
    process.execPath,
    [join(import.meta.dirname, "check-file-tokens.js"), ...Object.keys(files)],
    {
      cwd: dir,
      encoding: "utf8",
      env: { ...process.env, FILE_TOKENS_BASELINE: baselinePath },
    }
  );
  return { status: result.status, stderr: result.stderr };
}

describe("check-file-tokens", () => {
  it("passes a file at the limit", () => {
    expect(check({ "a.ts": 20_000 }, {}).status).toBe(0);
  });

  it("fails a new file over the limit", () => {
    const { status, stderr } = check({ "a.ts": 20_004 }, {});
    expect(status).toBe(1);
    expect(stderr).toContain("a.ts: ~5001 tokens");
  });

  it("passes a baselined file that has not grown", () => {
    expect(check({ "a.ts": 32_000 }, { "a.ts": 8000 }).status).toBe(0);
  });

  it("fails a baselined file that grew", () => {
    const { status, stderr } = check({ "a.ts": 32_004 }, { "a.ts": 8000 });
    expect(status).toBe(1);
    expect(stderr).toContain(
      "a.ts: ~8001 tokens, up from ~8000 in the baseline"
    );
  });
});
