const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const ts = require("typescript");
const { ESLint } = require("eslint");
const targets = require("./targets.json");
const output = "reports/2ld";
fs.mkdirSync(output, { recursive: true });
const walk = (node, visit) => {
  visit(node);
  ts.forEachChild(node, (child) => walk(child, visit));
};
const isFunction = (node) =>
  ts.isFunctionDeclaration(node) ||
  ts.isArrowFunction(node) ||
  ts.isFunctionExpression(node) ||
  ts.isMethodDeclaration(node);
const round = (n) => Math.round(n * 100) / 100;
(async () => {
  // Git's source inventory avoids generated native trees, dependencies and local secrets.
  const files = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard"],
    { encoding: "utf8" },
  )
    .trim()
    .split("\n");
  const sourceFiles = [...new Set(files)].filter(
    (f) =>
      /\.(?:[cm]?js|jsx|tsx?|json|css|scss|html|sh|py|ya?ml)$/.test(f) &&
      !/^(?:reports|node_modules|ios|android|\.expo)\//.test(f) &&
      !/(?:package-lock\.json|expo-env\.d\.ts)$/.test(f) &&
      fs.existsSync(f),
  );
  fs.writeFileSync(`${output}/source-inventory.txt`, sourceFiles.join("\n") + "\n");
  execFileSync(path.resolve("node_modules/.bin/cloc"), [
    `--list-file=${output}/source-inventory.txt`,
    "--json",
    `--out=${output}/size.json`,
    "--quiet",
  ]);
  const size = JSON.parse(fs.readFileSync(`${output}/size.json`));
  fs.writeFileSync(
    `${output}/size-summary.json`,
    JSON.stringify(
      {
        scope:
          "Versioned and nonignored source/config/test/tool files; excludes lockfiles, generated native code and reports",
        files: size.SUM.nFiles,
        LOC: size.SUM.code + size.SUM.comment + size.SUM.blank,
        CLOC: size.SUM.comment,
        NCLOC: size.SUM.code,
        blank: size.SUM.blank,
        commentToCodePct: round((100 * size.SUM.comment) / size.SUM.code),
      },
      null,
      2,
    ),
  );
  const appFiles = sourceFiles.filter(
    (f) => /^(app|src)\//.test(f) && !/(__tests__|\.test\.|\.spec\.)/.test(f),
  );
  fs.writeFileSync(`${output}/application-inventory.txt`, appFiles.join("\n") + "\n");
  const appSize = JSON.parse(
    execFileSync(
      path.resolve("node_modules/.bin/cloc"),
      [`--list-file=${output}/application-inventory.txt`, "--json", "--quiet"],
      { encoding: "utf8" },
    ),
  ).SUM;
  fs.writeFileSync(
    `${output}/application-size.json`,
    JSON.stringify(
      {
        scope: "Production app/ and src/ only; excludes tests and generated code",
        files: appSize.nFiles,
        LOC: appSize.code + appSize.comment + appSize.blank,
        CLOC: appSize.comment,
        NCLOC: appSize.code,
        blank: appSize.blank,
        commentToCodePct: round((100 * appSize.comment) / appSize.code),
      },
      null,
      2,
    ),
  );
  const eslint = new ESLint({
    overrideConfigFile: "eslint.quality.config.js",
    overrideConfig: [
      {
        rules: {
          complexity: ["warn", { max: 0, variant: "classic" }],
          "sonarjs/cognitive-complexity": ["warn", 0],
        },
      },
    ],
  });
  const moduleResults = [];
  const selected = [];
  for (const file of [...new Set(targets.map((t) => t.file))]) {
    const source = fs.readFileSync(file, "utf8");
    const sf = ts.createSourceFile(
      file,
      source,
      ts.ScriptTarget.Latest,
      true,
      file.endsWith("tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    const line = (pos) => sf.getLineAndCharacterOfPosition(pos).line + 1;
    const [lint] = await eslint.lintFiles([file]);
    const complexities = lint.messages.filter((m) => m.ruleId === "complexity");
    const cognitive = lint.messages.filter(
      (m) => m.ruleId === "sonarjs/cognitive-complexity",
    );
    for (const target of targets.filter((t) => t.file === file)) {
      let fn;
      walk(sf, (node) => {
        if (ts.isFunctionDeclaration(node) && node.name?.text === target.name) fn = node;
        if (
          ts.isVariableDeclaration(node) &&
          node.name.getText(sf) === target.name &&
          node.initializer
        ) {
          if (isFunction(node.initializer)) fn = node.initializer;
          else if (ts.isCallExpression(node.initializer))
            fn = node.initializer.arguments.find(isFunction);
        }
      });
      if (!fn) throw new Error(`Missing function ${target.name}`);
      const start = line(fn.getStart(sf));
      const end = line(fn.end);
      const near = (messages) =>
        messages.find((m) => m.line >= start && m.line <= line(fn.body.getStart(sf)));
      const cc = near(complexities);
      const cg = near(cognitive);
      if (!cc) throw new Error(`Missing ESLint complexity ${target.name}`);
      const constructs = [];
      walk(fn.body, (node) => {
        if (
          ts.isIfStatement(node) ||
          ts.isConditionalExpression(node) ||
          ts.isForStatement(node) ||
          ts.isWhileStatement(node) ||
          ts.isDoStatement(node) ||
          ts.isCatchClause(node) ||
          ts.isSwitchStatement(node)
        )
          constructs.push({
            line: line(node.getStart(sf)),
            kind: ts.SyntaxKind[node.kind],
            text: node.getText(sf).split("\n")[0],
          });
      });
      selected.push({
        ...target,
        start,
        end,
        cyclomatic: Number(cc.message.match(/complexity of (\d+)/)[1]),
        cognitive: cg ? Number(cg.message.match(/from (\d+) to/)[1]) : 0,
        constructs,
        source: fn.getText(sf),
      });
    }
    // Reproducible lexical Halstead variant on original TS, including types.
    const operators = new Map(),
      operands = new Map();
    const collectTokens = (node) => {
      const children = node.getChildren(sf);
      if (children.length) children.forEach(collectTokens);
      else if (node.kind !== ts.SyntaxKind.EndOfFileToken && node.getWidth(sf) > 0) {
        const bag =
          node.kind === ts.SyntaxKind.Identifier || ts.isLiteralKind(node.kind)
            ? operands
            : operators;
        const text = node.getText(sf);
        bag.set(text, (bag.get(text) || 0) + 1);
      }
    };
    collectTokens(sf);
    const N = [...operators.values(), ...operands.values()].reduce((a, b) => a + b, 0);
    const vocabulary = operators.size + operands.size;
    const volume = N * Math.log2(Math.max(1, vocabulary));
    const moduleCC = complexities.reduce(
      (sum, m) => sum + Number(m.message.match(/complexity of (\d+)/)[1]),
      0,
    );
    const counts = JSON.parse(
      execFileSync(path.resolve("node_modules/.bin/cloc"), [file, "--json", "--quiet"], {
        encoding: "utf8",
      }),
    ).SUM;
    const MI = Math.max(
      0,
      ((171 -
        5.2 * Math.log(Math.max(1, volume)) -
        0.23 * moduleCC -
        16.2 * Math.log(Math.max(1, counts.code))) *
        100) /
        171,
    );
    const imports = sf.statements.filter(ts.isImportDeclaration).map((n) => ({
      module: n.moduleSpecifier.text,
      typeOnly: Boolean(n.importClause?.isTypeOnly),
    }));
    const funcs = [];
    sf.statements.forEach((n) => {
      if (ts.isFunctionDeclaration(n) && n.name && n.body)
        funcs.push({ name: n.name.text, body: n.body });
      if (ts.isVariableStatement(n))
        n.declarationList.declarations.forEach((d) => {
          if (d.initializer && isFunction(d.initializer))
            funcs.push({ name: d.name.getText(sf), body: d.initializer.body });
        });
    });
    const refs = funcs.map((f) => {
      const result = new Set();
      walk(f.body, (n) => {
        if (ts.isIdentifier(n)) result.add(n.text);
      });
      return result;
    });
    const parent = funcs.map((_, i) => i);
    const root = (i) => (parent[i] === i ? i : (parent[i] = root(parent[i])));
    // Functional LCOM4 adaptation: undirected graph of direct local function references.
    for (let i = 0; i < funcs.length; i++)
      for (let j = i + 1; j < funcs.length; j++)
        if (refs[i].has(funcs[j].name) || refs[j].has(funcs[i].name))
          parent[root(i)] = root(j);
    moduleResults.push({
      file,
      NCLOC: counts.code,
      halsteadVolumeLexicalTS: round(volume),
      cyclomaticSumIncludingCallbacks: moduleCC,
      MI_0_100_noCommentTerm: round(MI),
      CBO_importModulesIncludingTypes: new Set(imports.map((i) => i.module)).size,
      imports,
      functionalLCOM4: new Set(parent.map((_, i) => root(i))).size,
      functionCount: funcs.length,
      functionNames: funcs.map((f) => f.name),
    });
  }
  fs.writeFileSync(
    `${output}/metrics.json`,
    JSON.stringify({ functions: selected, modules: moduleResults }, null, 2),
  );
  const mutate = selected.map((t) => `${t.file}:${t.start}:0-${t.end + 1}:0`);
  fs.writeFileSync(
    ".stryker-mutator.conf.json",
    JSON.stringify(
      {
        $schema: "./node_modules/@stryker-mutator/core/schema/stryker-schema.json",
        testRunner: "jest",
        ignorePatterns: [
          "**",
          "!src/**/*.{ts,tsx}",
          "!app/**/*.{ts,tsx}",
          "!*config.js",
          "!package.json",
          "!tsconfig.json",
          "!jest-setup.js",
          "!scripts/quality/targets.json",
          "!assets/**",
        ],
        disableTypeChecks: false,
        jest: {
          projectType: "custom",
          configFile: "jest.2ld.config.js",
          enableFindRelatedTests: false,
        },
        mutate,
        coverageAnalysis: "perTest",
        concurrency: 2,
        timeoutMS: 10000,
        timeoutFactor: 2,
        reporters: ["clear-text", "progress", "html", "json"],
        htmlReporter: { fileName: "reports/2ld/mutation/index.html" },
        jsonReporter: { fileName: "reports/2ld/mutation/mutation.json" },
        tempDirName: ".stryker-tmp",
      },
      null,
      2,
    ) + "\n",
  );
  fs.writeFileSync(
    "docs/2ld/functions.md",
    "# Pasirinktos funkcijos\n\nAutomatiškai generuojama `npm run quality:metrics`. SIT sąsajos yra siūlomos pagal domeną, ne patvirtinta Jira istorija. CC: ESLint classic; Cognitive: SonarJS. Įdėtiniai callback turi atskiras ESLint metrikas; testavimo/mutacijų intervalas apima visą išorinę funkciją.\n\n" +
      selected
        .map(
          (t) =>
            `## ${t.owner}: ${t.issue} — ${t.name}\n\nFailas: \`${t.file}:${t.start}\`; intervalas ${t.start}–${t.end}; CC **${t.cyclomatic}**, Cognitive **${t.cognitive}**.\n\nKonstrukcijų eilutės: ${t.constructs.map((c) => `${c.line} (${c.kind})`).join(", ")}.\n\n\`\`\`typescript\n${t.source}\n\`\`\`\n`,
        )
        .join("\n") +
      "\n## Failų metrikos\n\n| Failas | MI (lexical TS) | CBO (importai) | Funkcinis LCOM4 |\n|---|---:|---:|---:|\n" +
      moduleResults
        .map(
          (m) =>
            `| ${m.file} | ${m.MI_0_100_noCommentTerm} | ${m.CBO_importModulesIncludingTypes} | ${m.functionalLCOM4} |`,
        )
        .join("\n") +
      "\n",
  );
  console.table(
    selected.map(({ owner, issue, name, cyclomatic, cognitive }) => ({
      owner,
      issue,
      name,
      cyclomatic,
      cognitive,
    })),
  );
})();
