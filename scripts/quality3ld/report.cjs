const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { output, root, loadState } = require("./common.cjs");
const { percentile, median, rate } = require("./statistics.cjs");
const target = path.join(root, "docs/3ld");
const readLines = (file, phaseName) => {
  const records = fs
    .readFileSync(path.join(output, file), "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map(JSON.parse);
  const phasePath = path.join(output, `phase-${phaseName}.json`);
  if (!fs.existsSync(phasePath)) return records;
  const phase = JSON.parse(fs.readFileSync(phasePath, "utf8"));
  if (!phase.complete) throw new Error(`Measurement phase ${phaseName} is incomplete`);
  return records.filter(
    (r) => r.measuredAt >= phase.startedAt && r.measuredAt <= phase.completedAt,
  );
};
const mobile = readLines("mobile.android.jsonl", "core-android");
const backend = readLines("backend.jsonl", "backend");
const memory = readLines("memory.jsonl", "core-android");
const ui = JSON.parse(fs.readFileSync(path.join(output, "ui.android.json"), "utf8"));
const fmt = (n, digits = 2) => n.toFixed(digits).replace(".", ",");
const rows = [];
function add(
  metric,
  scenario,
  circumstance,
  value,
  threshold,
  passed,
  sampleSize,
  detail = {},
) {
  if (!sampleSize) throw new Error(`No real observations for ${metric}/${scenario}`);
  rows.push({
    metric,
    scenario,
    circumstance,
    value,
    threshold,
    passed,
    sampleSize,
    ...detail,
  });
}
function jobs(metric, scenario) {
  return mobile.filter(
    (r) =>
      r.metric === metric &&
      (scenario === undefined || (r.scenario ?? String(r.count)) === scenario),
  );
}
function samples(metric, scenario) {
  return jobs(metric, scenario).flatMap((r) => r.result.samples || []);
}
function proportion(metric, scenario, label, observed) {
  const r = rate(observed);
  add(
    metric,
    scenario,
    label,
    `${r.correct}/${r.total} (${fmt((r.correct / r.total) * 100, 1)} %)`,
    "100 %",
    r.correct === r.total,
    r.total,
  );
}
for (const [scenario, label] of [
  ["immediate", "Vietos atsakymas iškart"],
  ["delayed", "Pridėtas 2000 ms vietos atsako vėlinimas"],
]) {
  const s = samples("N1", scenario);
  const p50 = median(s.map((x) => x.durationMs));
  const p95 = percentile(
    s.map((x) => x.durationMs),
    0.95,
  );
  add(
    "N1",
    scenario,
    label,
    `p50 ${fmt(p50)} ms; p95 ${fmt(p95)} ms`,
    "p95 ≤ 1500 ms",
    p95 <= 1500,
    s.length,
    { p50, p95 },
  );
}
for (const [scenario, label, limit] of [
  ["transient", "Viena laikina klaida; sėkmingas 2-as bandymas", 500],
  ["permanent", "Nuolatinė klaida; sustojimas po 4 bandymų", 1500],
]) {
  const s = samples("N2", scenario);
  const p95 = percentile(
    s.map((x) => x.durationMs),
    0.95,
  );
  add(
    "N2",
    scenario,
    label,
    `p95 ${fmt(p95)} ms`,
    `p95 ≤ ${limit} ms`,
    p95 <= limit && s.every((x) => x.passed),
    s.length,
    { p95 },
  );
}
for (const [scenario, label] of [
  ["denied", "Vietos leidimas atmestas"],
  ["gps-error", "Vietos gavimo API grąžina klaidą"],
])
  proportion("N3", scenario, label, samples("N3", scenario));
for (const [scenario, label] of [
  ["transient", "Laikina klaida: sėkmė po pakartojimo"],
  ["permanent", "Nuolatinė klaida: aiški klaida ir 4 bandymų riba"],
])
  proportion("N4", scenario, label, samples("N4", scenario));
for (const [count, limit] of [
  [1, 20],
  [20, 50],
]) {
  const observed = memory.filter((r) => Number(r.scenario) === count);
  const delta = Math.max(...observed.map((r) => r.deltaMiB));
  add(
    "U1",
    String(count),
    count === 1
      ? "Vieno markerio orų užkrovimas"
      : "20 skirtingų markerių orų užkrovimas",
    `${fmt(delta)} MiB`,
    `≤ ${limit} MiB`,
    delta <= limit,
    observed.length,
    { deltaMiB: delta },
  );
}
for (const [scenario, label, expected] of [
  ["fresh", "Cache amžius 29 min; 10 atidarymų", 0],
  ["expired", "Cache amžius 31 min; 10 atidarymų", 1],
]) {
  const observed = jobs("U2", scenario);
  const counts = observed.map((r) => r.result.requests);
  add(
    "U2",
    scenario,
    label,
    `${new Set(counts).size === 1 ? counts[0] : `${Math.min(...counts)}–${Math.max(...counts)}`} API užkl.`,
    `${expected} API užkl.`,
    counts.every((x) => x === expected),
    observed.length,
  );
}
for (const count of [5, 20]) {
  const observed = jobs("U3", String(count));
  const total = observed.reduce((n, r) => n + r.result.requested, 0);
  const correct = observed
    .flatMap((r) => r.result.completions)
    .filter((c) => c.success && c.elapsedMs <= 5000).length;
  add(
    "U3",
    String(count),
    `Lygiagrečių užklausų skaičius: ${count}; testinis serveris`,
    `${correct}/${total} per 5 s (${fmt((correct / total) * 100, 1)} %)`,
    "≥ 95 % per 5 s",
    correct / total >= 0.95,
    observed.length,
  );
}
for (const count of [1, 200]) {
  const observed = jobs("U4", String(count));
  add(
    "U4",
    String(count),
    `Cache įrašų skaičius: ${count}`,
    `${count} iš ${count}, ${observed.filter((r) => r.result.retained === count).length}/${observed.length} band.`,
    "Išlaikyti visi galiojantys įrašai",
    observed.every((r) => r.result.retained === count),
    observed.length,
  );
}
for (const [metric, scenarios] of [
  [
    "M1",
    [
      ["valid", "Galiojanti testinė sesija"],
      ["invalid", "Netinkamas JWT"],
    ],
  ],
  [
    "M2",
    [
      ["own", "A pateikia savo įvertinimą"],
      ["spoofed", "A pateikia įvertinimą B vardu"],
    ],
  ],
  [
    "R2",
    [
      ["jpeg", "Tikras PNG paveikslėlis"],
      ["disguised", "Tekstas su JPG pavadinimu ir MIME tipu"],
    ],
  ],
]) {
  for (const [scenario, label] of scenarios)
    proportion(
      metric,
      scenario,
      label,
      backend.filter((r) => r.metric === metric && r.scenario === scenario),
    );
}
for (const count of [0, 6])
  proportion(
    "M3",
    String(count),
    `Reitingo balas ${count}`,
    samples("M3", String(count)),
  );
for (const count of [1, 5])
  proportion(
    "M4",
    String(count),
    count === 1 ? "Vienas pateikimo paspaudimas" : "Penki greiti pateikimo paspaudimai",
    ui.filter((r) => r.metric === "M4" && r.scenario === String(count)),
  );
proportion(
  "R1",
  "pending",
  "Naują markerį sukuria produkcinė createMarker funkcija",
  samples("R1", "pending"),
);
proportion(
  "R1",
  "self-approve",
  "Autorius tiesiogiai per API keičia būseną į approved",
  backend.filter((r) => r.metric === "R1" && r.scenario === "self-approve"),
);
for (const form of ["create", "edit"]) {
  const observed = ui.find((r) => r.metric === "R3" && r.scenario === form);
  if (!observed) throw new Error(`Missing native hierarchy audit: ${form}`);
  add(
    "R3",
    form,
    form === "create" ? "Markerio kūrimo forma" : "Markerio redagavimo forma",
    `${observed.present.length}/${observed.expected.length} (${fmt(observed.percent, 1)} %)`,
    "100 % įvardytų pasirinktų valdiklių",
    observed.percent === 100,
    1,
    { missing: observed.missing },
  );
  const workflows = ui.filter((r) => r.metric === "R4" && r.scenario === form);
  proportion(
    "R4",
    form,
    `${form === "create" ? "Kūrimo" : "Redagavimo"} formos 3 veiksmai pagal pavadinimą`,
    workflows.flatMap((r) => r.attempts),
  );
}
if (rows.length !== 32 || new Set(rows.map((r) => r.metric)).size !== 16)
  throw new Error("1–2–2 completeness check failed");
for (const row of rows) {
  const minimum = ["N1", "N2"].includes(row.metric)
    ? 20
    : row.metric === "U1"
      ? 3
      : row.metric === "R3"
        ? 1
        : row.metric === "R4"
          ? 30
          : 10;
  if (row.sampleSize < minimum)
    throw new Error(
      `Not enough actual repetitions for ${row.metric}/${row.scenario}: ${row.sampleSize}/${minimum}`,
    );
}
const green = rows.filter((r) => r.passed).length;
const environment = JSON.parse(
  fs.readFileSync(`${output}/raw/android-environment.json`, "utf8"),
);
const groups = [
  {
    name: "Nojus Stankevičius",
    issues: ["42", "48"],
    metrics: ["N1", "N2", "N3", "N4"],
    chars: "Time behavior ir Fault tolerance",
    names: {
      N1: "Leidimo ir vietos sinchronizavimo trukmė",
      N2: "Native komandų kartojimo trukmė",
      N3: "Vietos klaidų suvaldymas",
      N4: "Native klaidų suvaldymas",
    },
    text: "Sinchronizavimą matavome su valdomu vietos API atsakymu: iškart ir po 2000 ms. Tai nėra tikro GPS signalo greitis. Atmetus leidimą tikrinama denied būsena ir tuščia vieta; įvykus GPS klaidai – granted būsena ir tuščia vieta. Native komanda pateikta kaip klaidų scenarijus, o kartojimo logika liko produkcinė: iki 4 bandymų, tarp jų 250 ms. 1500 ms ribai numatėme 750 ms pauzių ir 750 ms rezervą; vietos atsakui tai komandos pasirinktas greičio tikslas.",
    images: [
      [
        "android-N1-delayed.png",
        "Vietos sinchronizavimas su 2000 ms vėlinimu Android emuliatoriuje.",
      ],
      [
        "android-N2-permanent.png",
        "Produkcinių native komandų kartojimo rezultatai po nuolatinės klaidos.",
      ],
    ],
  },
  {
    name: "Ugnius Mikalauskis",
    issues: ["40", "97"],
    metrics: ["U1", "U2", "U3", "U4"],
    chars: "Resource utilization ir Capacity",
    names: {
      U1: "Didžiausias stebėtas RAM prieaugis",
      U2: "API užklausos naudojant cache",
      U3: "Lygiagrečių užklausų aptarnavimas",
      U4: "Išlaikytų cache įrašų skaičius",
    },
    text: "Orų gavimui vykdėme esamą useMarkerWeather ir Open-Meteo atsakymo apdorojimą. Apkrovos duomenis tiekė vietinis serveris su 100 ms vėlinimu; tai nėra viešo Open-Meteo serverio pralaidumo matavimas. Tikra integracija papildomai patikrinta viena užklausa. Cache galioja 30 minučių; 29 ir 31 min amžių sukūrėme nustatydami įrašo saugojimo laiką. RAM matavome kaip didžiausią Android proceso PSS prieaugį po užkrovimo, lyginant su pradine verte. 0 MiB reiškia, kad stebėta atmintis neviršijo pradinės vertės; tai nereiškia, kad atmintis apskritai nebuvo naudojama. Talpos bandymas patvirtina tik išbandytus kiekius, ne maksimalią ribą.",
    images: [
      [
        "android-backend-RAM20.png",
        "Android proceso PSS matavimų suvestinė; duomenys gauti su adb dumpsys.",
      ],
      [
        "android-U2-expired.png",
        "Pasibaigus cache galiojimui per 10 atidarymų siunčiama viena užklausa.",
      ],
      ["android-U3-20.png", "20 lygiagrečių orų užklausų bandymas programėlėje."],
    ],
  },
  {
    name: "Matas Siaurodinas",
    issues: ["27", "93"],
    metrics: ["M1", "M2", "M3", "M4"],
    chars: "Authenticity ir User error protection",
    names: {
      M1: "Sesijos patikros tikslumas",
      M2: "Įvertinimo autoriaus tapatybės kontrolė",
      M3: "Netinkamo reitingo atmetimas",
      M4: "Pakartotinio pateikimo prevencija",
    },
    text: "Saugumą tikrinome tikrais Appwrite atsakymais: su testinio naudotojo JWT, be administratoriaus rakto. Galiojanti sesija priimta, netinkama atmesta. Tačiau A galėjo išsaugoti įvertinimą su B naudotojo ID: sesija patikrinama, bet įrašo autoriaus laukas su ja nesusiejamas. Reitingų ribos tikrintos produkcine funkcija, o paspaudimai – originaliu Rating UI ir hook. Vien įrašų skaičiaus nepakanka: taip pat skaičiuotos tikros rašymo užklausos. Bandymuose pridėtas 700 ms užklausos vėlinimas, kad būtų galima spausti pateikimą jam dar vykstant.",
    images: [
      [
        "ios-backend-M1.png",
        "Appwrite galiojančios ir netinkamos sesijos rezultatų peržiūra.",
      ],
      ["ios-backend-M2.png", "Appwrite autoriaus tapatybės bandymų rezultatų peržiūra."],
      [
        "android-M4-5-9.png",
        "Penkių pateikimo paspaudimų bandymas Android emuliatoriuje.",
      ],
    ],
  },
  {
    name: "Marius Seniucas",
    issues: ["104", "110"],
    metrics: ["R1", "R2", "R3", "R4"],
    chars: "Integrity ir User assistance",
    names: {
      R1: "Markerio būsenų kontrolė",
      R2: "Įkeliamo failo turinio kontrolė",
      R3: "Aiškiai įvardyti formų valdikliai",
      R4: "Formų veiksmų pasiekiamumas pagal pavadinimą",
    },
    text: "Įprastą markerį kūrė esama createMarker funkcija, o savavališką patvirtinimą bandė jo autorius tiesiogine API užklausa. Autoriui pavyko pakeisti būseną į approved. Saugykla priėmė ir tikrą PNG, ir paprastą tekstą, pateiktą kaip JPG. Failo plėtinys bei MIME tipas vieni turinio nepatvirtina. Prieinamumui išsaugojome tikrą sistemos elementų medį: vertinome 16 kūrimo ir 13 redagavimo formos valdiklių. Įvestas tekstas bei placeholder nelaikyti aiškia lauko žyme. Veiksmų bandymuose ieškota pagal pavadinimą, nenaudojant ekrano koordinačių. Paspaudimas patvirtintas formos callback; nuotraukų parinkiklio ar VoiceOver patirtis šiuo bandymu nevertinta.",
    images: [
      ["ios-backend-R1.png", "Appwrite būsenos kontrolės rezultatų peržiūra."],
      [
        "ios-backend-R2.png",
        "Appwrite tikro PNG ir netinkamo failo bandymų rezultatų peržiūra.",
      ],
      ["android-create-0.png", "Originali markerio kūrimo forma prieinamumo patikroje."],
      [
        "android-edit-0.png",
        "Originali markerio redagavimo forma prieinamumo patikroje.",
      ],
    ],
  },
];
const issue = (n) => `[SIT-${n}](https://placeholdder.atlassian.net/browse/SIT-${n})`;
const displayResolution = environment.resolution
  .split(":")
  .at(-1)
  .trim()
  .replace("x", " × ");
const displayDensity = environment.density.split(":").at(-1).trim();
const dates = [
  ...new Set(
    [
      ...mobile.map((r) => r.measuredAt?.slice(0, 10)),
      ...backend.map((r) => r.measuredAt?.slice(0, 10)),
      ...ui.flatMap((r) =>
        (r.writes || []).map((w) => new Date(w.atMs).toISOString().slice(0, 10)),
      ),
    ].filter(Boolean),
  ),
].sort();
const dateLabel = dates.length === 1 ? dates[0] : dates[0] + "–" + dates.at(-1);
let md = `# 3 Laboratorinis darbas\n\n## PS produkto kokybės matavimas ir vertinimas\n\nTyrėme **SIT** mobiliąją programėlę pagal ISO/IEC 25010:2023: **8 subcharakteristikas, 16 metrikų ir 32 matavimo atvejus**. Iš jų ${green} atitiko komandos ribas, ${32 - green} – neatitiko.\n\n**Aplinka:** ${dateLabel}, Android ${environment.androidVersion} (API ${environment.api}, ${displayResolution}, ${displayDensity} dpi) emuliatorius ir papildomai iOS 26.4 simuliatorius. Naudota development versija; rezultatai taikomi šiai aplinkai.\n\n**Įrankiai:** [Maestro](https://docs.maestro.dev/) veiksmams ir UI medžiui, [ADB / dumpsys](https://developer.android.com/tools/dumpsys#meminfo) RAM ir ekrano vaizdams, performance.now() trukmėms, [Appwrite REST API](https://appwrite.io/docs/references/cloud/client-rest) saugumui.\n\nLaiko scenarijus kartojome po **20**, RAM – po **3**, elgsenos ir saugumo – po **10 kartų**. p95 yra 19-a surikiuota reikšmė iš 20. Slenksčius pasirinkome prieš matavimą; tai komandos kriterijai, ne ISO nustatytos ribos. Žalia zona – atitinka, raudona – neatitinka. Procentai rodo teisingai suvaldytų atvejų dalį.\n\nMatavome atskirose 3LD kolekcijose su nukopijuota schema, indeksais, teisėmis ir dviem testinėmis paskyromis. Esamų įrašų nekeitėme. Dėl bucket kvotos tik naujus registruotus testinius failus įkėlėme į esamą saugyklą ir iškart pašalinome.\n\n`;
let figure = 0;
for (const [i, group] of groups.entries()) {
  md += `## ${i + 1} ${group.name}\n\n**${group.chars}.** Reikalavimai: ${group.issues.map(issue).join(" ir ")}.\n\n`;
  md +=
    "| Metrika | Aplinkybė | Rezultatas | Žalia zona | Įvertinimas |\n| --- | --- | --- | --- | --- |\n";
  for (const metric of group.metrics)
    for (const row of rows.filter((r) => r.metric === metric))
      md += `| ${metric} ${group.names[metric]} | ${row.circumstance} | ${row.value} | ${row.threshold} | ${row.passed ? "🟢 Atitinka" : "🔴 Neatitinka"} |\n`;
  md += `\n${group.text}\n\n`;
  for (const [file, caption] of group.images) {
    const source = path.join(output, "screenshots", file);
    if (!fs.existsSync(source)) throw new Error(`Missing real screenshot: ${file}`);
    fs.mkdirSync(path.join(target, "screenshots"), { recursive: true });
    fs.copyFileSync(source, path.join(target, "screenshots", file));
    md += `![${++figure} pav. ${caption}](screenshots/${file})\n\n**${figure} pav.** ${caption}\n\n`;
  }
}
md += `## 5 Papildomas iOS patikrinimas\n\niOS Simulator pakartojome OS vietos leidimo suteikimą ir atšaukimą, valdomas vietos klaidas, reitingų 0 ir 6 atmetimą bei vieno ir penkių markerių orų gavimą. Abi formos atvertos ir užfiksuotos. Tai papildoma integracijos patikra; ji nepakeičia Android metrikų ir neįrodo tikro GPS ar ekrano skaitytuvo veikimo fiziniame telefone.\n\n## 6 Išvados ir rekomendacijos\n\nBandymuose klaidų apdorojimas ir cache veikė pagal nustatytus scenarijus. Didžiausią riziką parodė Appwrite įrašų autoriaus ir būsenos kontrolė bei failų turinio patikra. Produkto šiame tyrime netaisėme.\n\n1. **Įvertinimo autorių nustatyti serveryje pagal sesiją.** Kito autoriaus ID priimtas 10/10 bandymų. Vien kliento perduodamu user_id pasitikėti negalima: tiesioginė API užklausa apeina formą. Tai atitinka [OWASP rekomendaciją teises tikrinti kiekvienoje užklausoje](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html#validate-the-permissions-on-every-request). Tikslas po pataisos – 0/10 priimtų apsimetimo bandymų.\n2. **Markerio būseną keisti per serverio moderavimo operaciją.** Autoriui palikti tik leistinų laukų redagavimą; approved turi būti pasiekiama tik moderatoriui. Dabartinė dokumento update teisė leido patvirtinti savo markerį 10/10 bandymų.\n3. **Tikrinti tikrą įkeliamo paveikslėlio turinį.** Tekstas priimtas 10/10 bandymų. Tikrinti formato parašą ir galimybę dekoduoti paveikslėlį, o ne vien jo pavadinimą ar deklaruojamą MIME tipą. Tai pagrindžia [OWASP failų įkėlimo gairės](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html#file-signature-validation).\n4. **Įvesties laukams pridėti aiškias accessibilityLabel žymes.** Kūrimo formoje patikrinti Title ir Description, redagavimo – Description. Matomas lauko tekstas neturėtų pakeisti jo paskirtį nusakančio pavadinimo. Po pakeitimo pakartoti to paties UI medžio auditą.\n5. **Apriboti vietos laukimą ir rodyti aiškią laukimo būseną.** Pridėjus 2000 ms vėlinimą viršyta 1500 ms riba. Galima pirmiausia pateikti ankstesnę žinomą vietą su jos amžiumi, o dabartinę atnaujinti vėliau; nesėkmės atveju leisti pakartoti veiksmą.\n6. **Cache apriboti pagal įrašų skaičių ir pašalinti pasenusius įrašus.** 200 įrašų bandymas praėjo, tačiau dabartinis Map neturi bendro dydžio ribos. Tai nėra įrodymas, kad neribotas markerių skaičius nekels atminties problemų.\n\n### Pakartojimas per gynimą\n\nMatavimo skriptai ir [trumpa paleidimo instrukcija](PALEIDIMAS.md) pateikti kartu. Pavyzdžiui, parametrą galima pakeisti ir iškart pakartoti vietos scenarijų:\n\n\`\`\`bash\nnpm run quality:3ld:measure -- --kind location --options '{"metric":"demo","scenario":"delayed","delayMs":3000,"repeats":5}'\n\`\`\`\n\nPirminiai duomenys: [rezultatų suvestinė](results.json), [CSV lentelė](results.csv). Pilni bandymų įrašai, UI medžiai ir papildomi ekrano vaizdai lieka projekto reports/3ld kataloge.\n\n### Šaltiniai\n\n- [ISO/IEC 25010:2023 produkto kokybės modelis](https://www.iso.org/standard/78176.html).\n- [OWASP autorizacijos gairės](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html).\n- [OWASP failų įkėlimo gairės](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html).\n- [Maestro dokumentacija](https://docs.maestro.dev/), [Android atminties matavimas](https://developer.android.com/tools/dumpsys#meminfo), [Open-Meteo naudojimo ribos](https://open-meteo.com/en/terms).\n`;
function esc(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function inline(text) {
  return esc(text)
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2" loading="lazy">')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}
function html(markdown) {
  const lines = markdown.split("\n");
  let content = "";
  let table = false;
  let code = false;
  let list = null;
  for (const line of lines) {
    const item = !code && line.match(/^(\d+\.|-)\s+(.*)$/);
    if (item) {
      const kind = item[1] === "-" ? "ul" : "ol";
      if (list !== kind) {
        if (list) content += "</" + list + ">";
        content += "<" + kind + ">";
        list = kind;
      }
      content += "<li>" + inline(item[2]) + "</li>";
      continue;
    }
    if (list) {
      content += "</" + list + ">";
      list = null;
    }

    if (line.startsWith("```")) {
      code = !code;
      content += code ? "<pre><code>" : "</code></pre>";
      continue;
    }
    if (code) {
      content += esc(line) + "\n";
      continue;
    }
    if (line.startsWith("|")) {
      if (/^\|[\s|:-]+$/.test(line)) continue;
      const cells = line
        .slice(1, -1)
        .split("|")
        .map((x) => x.trim());
      if (!table) {
        content +=
          "<table><thead><tr>" +
          cells.map((x) => "<th>" + inline(x) + "</th>").join("") +
          "</tr></thead><tbody>";
        table = true;
      } else
        content +=
          "<tr>" + cells.map((x) => "<td>" + inline(x) + "</td>").join("") + "</tr>";
      continue;
    }
    if (table) {
      content += "</tbody></table>";
      table = false;
    }
    const heading = line.match(/^(#{1,3}) (.*)/);
    if (heading)
      content += `<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`;
    else if (line.trim()) content += "<p>" + inline(line) + "</p>";
  }
  if (table) content += "</tbody></table>";
  return `<!doctype html><html lang="lt"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>SIT 3LD ataskaita</title><style>body{font:16px/1.55 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;color:#172b4d;max-width:1120px;margin:40px auto;padding:0 24px}h1,h2,h3{color:#172b4d}h2{margin-top:36px}table{border-collapse:collapse;width:100%;font-size:14px}th,td{border:1px solid #dfe1e6;padding:10px;text-align:left;vertical-align:top}th{background:#f4f5f7}a{color:#0052cc}img{max-width:340px;max-height:730px;object-fit:contain;border:1px solid #dfe1e6}pre{background:#f4f5f7;padding:16px;overflow:auto}code{font-family:ui-monospace,monospace}</style><body>${content}</body></html>`;
}
fs.mkdirSync(target, { recursive: true });
fs.mkdirSync(path.join(target, "data"), { recursive: true });
for (const [name, data] of Object.entries({
  "mobile.android.json": mobile.filter((r) =>
    /^(N[1-4]|U[1-4]|M3|R1)$/.test(r.metric || ""),
  ),
  "backend.json": backend.filter(
    (r) => r.metric !== "R1" || r.scenario === "self-approve",
  ),
  "memory.json": memory,
  "ui.android.json": ui,
  "environment.json": {
    ...environment,
    appVersion: require("../../package.json").version,
    development: true,
  },
}))
  fs.writeFileSync(path.join(target, "data", name), JSON.stringify(data, null, 2));
const evidenceFiles = fs
  .readdirSync(path.join(output, "screenshots"))
  .filter((name) =>
    /^(android-(N[1-4]-|U[1-4]-|M[34]-|R[134]-|create-[0-4]|edit-[0-4]|open-meteo|backend-RAM)|ios-(permission-|fault-|validation-|weather-|form-|backend-)).*\.png$/.test(
      name,
    ),
  );
for (const name of evidenceFiles)
  fs.copyFileSync(
    path.join(output, "screenshots", name),
    path.join(target, "screenshots", name),
  );
fs.writeFileSync(
  path.join(target, "IRODYMAI.md"),
  "# 3LD ekrano vaizdai\n\nTikros Android ADB ir iOS simctl ekrano nuotraukos. Metrikų ID paaiškinti pagrindinėje ataskaitoje.\n\n" +
    evidenceFiles
      .sort()
      .map((name) => `- [${name}](screenshots/${name})`)
      .join("\n") +
    "\n",
);
md = md.replace(
  "Pilni bandymų įrašai,",
  "[Visi ekrano vaizdai](IRODYMAI.md). Pilni bandymų įrašai,",
);
fs.writeFileSync(path.join(target, "ATASKAITA.md"), md);
fs.writeFileSync(path.join(target, "ATASKAITA.html"), html(md));
fs.writeFileSync(
  path.join(target, "results.json"),
  JSON.stringify(
    {
      measuredAt: new Date().toISOString(),
      environmentRun: loadState().runId,
      cases: rows.length,
      green,
      red: 32 - green,
      results: rows,
    },
    null,
    2,
  ),
);
const columns = [
  "metric",
  "scenario",
  "circumstance",
  "value",
  "threshold",
  "passed",
  "sampleSize",
];
fs.writeFileSync(
  path.join(target, "results.csv"),
  "\ufeff" +
    [
      columns.join(","),
      ...rows.map((row) =>
        columns.map((k) => '"' + String(row[k]).replace(/"/g, '""') + '"').join(","),
      ),
    ].join("\n"),
);
fs.writeFileSync(`${output}/summary.json`, JSON.stringify(rows, null, 2));
execFileSync(
  "zip",
  [
    "-q",
    "-r",
    "-X",
    path.join(output, "SIT-3LD.zip"),
    "ATASKAITA.md",
    "ATASKAITA.html",
    "PALEIDIMAS.md",
    "IRODYMAI.md",
    "results.json",
    "results.csv",
    "screenshots",
    "data",
  ],
  { cwd: target },
);
console.log(
  `Generated 3LD: ${rows.length} cases; ${green} green, ${32 - green} red. Markdown, HTML and ZIP ready.`,
);
