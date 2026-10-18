const fs = require("node:fs");
const path = require("node:path");
const metrics = JSON.parse(fs.readFileSync("reports/2ld/metrics.json"));
const coverage = JSON.parse(fs.readFileSync("reports/2ld/coverage/coverage-final.json"));
const percentage = (covered, total) =>
  total ? Math.round((covered / total) * 10000) / 100 : null;
const rows = metrics.functions.map((target) => {
  const file = coverage[path.resolve(target.file)];
  if (!file) throw new Error(`Missing coverage: ${target.file}`);
  const inside = (loc) => loc.start.line >= target.start && loc.end.line <= target.end;
  const statements = Object.entries(file.statementMap)
    .filter(([, loc]) => inside(loc))
    .map(([id]) => file.s[id]);
  const branches = Object.entries(file.branchMap).filter(([, branch]) =>
    inside(branch.loc),
  );
  const outcomes = branches.flatMap(([id]) => file.b[id]);
  // Decision outcome coverage: if, ternary and switch only. Logical expressions
  // and default arguments stay in Istanbul branch coverage, not decision coverage.
  const decisions = branches.filter(([, b]) =>
    ["if", "cond-expr", "switch"].includes(b.type),
  );
  const decisionOutcomes = decisions.flatMap(([id]) => file.b[id]);
  const details = (values) => ({
    covered: values.filter((n) => n > 0).length,
    total: values.length,
    pct: percentage(values.filter((n) => n > 0).length, values.length),
  });
  return {
    owner: target.owner,
    issue: target.issue,
    name: target.name,
    file: target.file,
    statements: details(statements),
    branches: details(outcomes),
    decisions: details(decisionOutcomes),
    decisionLocations: decisions.map(([id, b]) => ({
      line: b.loc.start.line,
      type: b.type,
      hits: file.b[id],
    })),
    uncoveredBranches: branches.flatMap(([id, b]) =>
      file.b[id].flatMap((hits, i) =>
        hits
          ? []
          : [
              {
                line: b.locations[i]?.start.line ?? b.loc.start.line,
                type: b.type,
                outcome: i,
              },
            ],
      ),
    ),
  };
});
fs.writeFileSync("reports/2ld/selected-coverage.json", JSON.stringify(rows, null, 2));
fs.writeFileSync(
  "reports/2ld/coverage.md",
  "| Užduotis | Funkcija | Statements | Branches | Decision outcomes |\n|---|---|---:|---:|---:|\n" +
    rows
      .map(
        (r) =>
          `| ${r.issue} | ${r.name} | ${r.statements.pct}% | ${r.branches.pct}% | ${r.decisions.pct ?? "N/A"}% |`,
      )
      .join("\n") +
    "\n",
);
console.table(
  rows.map((r) => ({
    issue: r.issue,
    statements: r.statements.pct,
    branches: r.branches.pct,
    decisions: r.decisions.pct,
  })),
);
if (rows.some((r) => r.branches.pct === null || r.branches.pct < 80)) {
  console.error(
    "2LD gate failed: every selected function must have branch coverage >= 80%.",
  );
  process.exitCode = 1;
}
