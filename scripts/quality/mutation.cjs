const fs = require("node:fs");
const crypto = require("node:crypto");
const metrics = JSON.parse(fs.readFileSync("reports/2ld/metrics.json"));
const report = JSON.parse(fs.readFileSync("reports/2ld/mutation/mutation.json"));
const reviews = require("./equivalent-mutants.json");
const rows = metrics.functions.map((target) => {
  const file = Object.entries(report.files).find(([name]) =>
    name.replaceAll("\\", "/").endsWith(target.file),
  )?.[1];
  if (!file) throw new Error(`Missing mutation result: ${target.file}`);
  const mutants = file.mutants.filter(
    (m) => m.location.start.line >= target.start && m.location.end.line <= target.end,
  );
  const sourceHash = crypto.createHash("sha256").update(file.source).digest("hex");
  const equivalent = mutants.filter((m) =>
    reviews.some(
      (r) =>
        r.file === target.file &&
        r.id === m.id &&
        r.sourceSha256 === sourceHash &&
        r.replacement === m.replacement &&
        JSON.stringify(r.location) === JSON.stringify(m.location) &&
        m.status === "Survived",
    ),
  );
  const counts = {};
  for (const m of mutants) counts[m.status] = (counts[m.status] || 0) + 1;
  const totalValid =
    mutants.length -
    (counts.CompileError || 0) -
    (counts.RuntimeError || 0) -
    (counts.Ignored || 0);
  const killed = counts.Killed || 0;
  const timeout = counts.Timeout || 0;
  const nonEquivalent = totalValid - equivalent.length;
  const percent = (n, d) => (d ? Math.round((n / d) * 10000) / 100 : null);
  return {
    issue: target.issue,
    name: target.name,
    counts,
    totalGenerated: mutants.length,
    totalValid,
    reviewedEquivalent: equivalent.length,
    equivalentIds: equivalent.map((m) => m.id),
    totalNonEquivalent: nonEquivalent,
    killedOnlyScorePct: percent(killed, totalValid),
    laboratoryMutationScorePct: percent(killed, nonEquivalent),
    strykerDetectedScorePct: percent(killed + timeout, totalValid),
    unresolvedSurvivors: mutants
      .filter(
        (m) => ["Survived", "NoCoverage"].includes(m.status) && !equivalent.includes(m),
      )
      .map((m) => ({
        id: m.id,
        line: m.location.start.line,
        mutator: m.mutatorName,
        replacement: m.replacement,
      })),
  };
});
fs.writeFileSync("reports/2ld/selected-mutation.json", JSON.stringify(rows, null, 2));
fs.writeFileSync(
  "reports/2ld/mutation.md",
  "| Užduotis | Killed | Timeout | Survived | Equivalent | Non-equivalent | Killed/Valid | 2LD score | Stryker detected |\n|---|---:|---:|---:|---:|---:|---:|---:|---:|\n" +
    rows
      .map(
        (r) =>
          `| ${r.issue} | ${r.counts.Killed || 0} | ${r.counts.Timeout || 0} | ${r.counts.Survived || 0} | ${r.reviewedEquivalent} | ${r.totalNonEquivalent} | ${r.killedOnlyScorePct}% | ${r.laboratoryMutationScorePct}% | ${r.strykerDetectedScorePct}% |`,
      )
      .join("\n") +
    "\n\n2LD score uses Killed/(Valid−ReviewedEquivalent); timeout remains in the denominator. Equivalent analysis is in scripts/quality/equivalent-mutants.json and is limited to ordinary inputs within the declared TS contract. Unreviewed survivors remain in the denominator. Stryker counts Timeout as detected. Invalid CompileError/RuntimeError mutants are excluded.\n",
);
console.table(
  rows.map(
    ({
      issue,
      counts,
      reviewedEquivalent,
      totalNonEquivalent,
      laboratoryMutationScorePct,
    }) => ({
      issue,
      ...counts,
      reviewedEquivalent,
      totalNonEquivalent,
      laboratoryMutationScorePct,
    }),
  ),
);
const valid = rows.reduce((sum, r) => sum + r.totalValid, 0);
const killed = rows.reduce((sum, r) => sum + (r.counts.Killed || 0), 0);
const equivalents = rows.reduce((sum, r) => sum + r.reviewedEquivalent, 0);
fs.writeFileSync(
  "reports/2ld/mutation-summary.json",
  JSON.stringify(
    {
      totalValid: valid,
      killed,
      reviewedEquivalent: equivalents,
      totalNonEquivalent: valid - equivalents,
      laboratoryMutationScorePct:
        Math.round((killed / (valid - equivalents)) * 10000) / 100,
    },
    null,
    2,
  ),
);
