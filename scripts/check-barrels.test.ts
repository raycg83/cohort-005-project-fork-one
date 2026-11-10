import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Runs the barrel check against a scratch modules root holding one module.
function check(entryPoints: Record<string, string>) {
  const root = mkdtempSync(join(tmpdir(), "barrels-"));
  mkdirSync(join(root, "thing"));
  for (const [name, source] of Object.entries(entryPoints)) {
    writeFileSync(join(root, "thing", name), source);
  }
  const result = spawnSync(
    process.execPath,
    [join(import.meta.dirname, "check-barrels.js"), root],
    { encoding: "utf8" }
  );
  return { status: result.status, stderr: result.stderr };
}

describe("check-barrels", () => {
  it("passes an entry point that declares its functions", () => {
    const source = `import { slugify } from "./lib/impl";
export type { Slug } from "./lib/impl";
export function toSlug(title: string) { return slugify(title); }
`;
    expect(check({ "index.ts": source }).status).toBe(0);
  });

  it("fails an entry point that only re-exports", () => {
    const source = `export { getCourse, getLesson } from "./lib/course";
export type { Course } from "./lib/course";
`;
    const { status, stderr } = check({ "course.server.ts": source });
    expect(status).toBe(1);
    expect(stderr).toContain(join("thing", "course.server.ts"));
  });

  it("fails an entry point that re-exports a whole file", () => {
    expect(check({ "index.ts": `export * from "./lib/impl";\n` }).status).toBe(
      1
    );
  });
});
