// Fails when a module entry point is a barrel file: a file whose every
// statement re-exports from another file. app/modules/README.md bans them. A
// barrel makes the module's interface as wide as its implementation; an entry
// point that declares its own functions keeps it small.
// Usage: node scripts/check-barrels.js [modules root]

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

const root = process.argv[2] ?? "app/modules";
const isEntryPoint = (name) =>
  /\.(ts|tsx)$/.test(name) && !name.endsWith(".d.ts");

const isBarrel = (file) => {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest
  );
  const statements = source.statements.filter(
    (statement) => !ts.isImportDeclaration(statement)
  );
  return (
    statements.length > 0 &&
    statements.every(
      (statement) =>
        ts.isExportDeclaration(statement) && statement.moduleSpecifier
    )
  );
};

const barrels = readdirSync(root)
  .map((name) => join(root, name))
  .filter((dir) => statSync(dir).isDirectory())
  .flatMap((dir) =>
    readdirSync(dir)
      .filter(isEntryPoint)
      .map((name) => join(dir, name))
  )
  .filter(isBarrel);

if (barrels.length > 0) {
  console.error("These module entry points only re-export other files:\n");
  for (const file of barrels) console.error(`  ${file}`);
  console.error(`
An entry point declares the functions the module offers, each forwarding to
lib/ (see app/modules/example/index.ts). Expose only what callers use, and give
the functions that belong together one entry point. See app/modules/README.md.`);
  process.exit(1);
}
