# SIT: VU PS Kokybės 2LD

Parengtas 8 funkcijų korpusas ir atskiras 2LD rinkinys: 87 vienetiniai atvejai bei 1 paslaugų integracinis atvejis septyniuose testų failuose. Produkcinės funkcijos nepakeistos. Vientisa dokumentacija su tikromis ekrano nuotraukomis – [Confluence ataskaita](confluence/ATASKAITA.md), kopijavimui – [HTML](confluence/ATASKAITA.html), perkėlimo eiga – [instrukcija](confluence/IKELIMAS.md). Funkcijų kodas ir tikslūs intervalai pateikti [functions.md](functions.md); DKM užklausa – [prompt-template.md](prompt-template.md), galutinio vykdymo skaičiai – [results.md](results.md). SIT numeriai priskirti pagal vartotojo nurodytas temas; Jira aprašymai ir autorystė nepatikrinti. Faktinė orų paslauga yra Open-Meteo, nors produkto gairėse minima Meteo.lt.

## Įdiegimas ir vykdymas

Priklausomybės jau įtrauktos į `package.json` ir `package-lock.json`:

```bash
npm ci
# Tik pakartojant įrankių pridėjimą naujame setup:
npm install --save-dev eslint-plugin-sonarjs @stryker-mutator/core @stryker-mutator/jest-runner cloc

npm run quality:metrics
npm run quality:lint
npm run quality:coverage
npm run quality:mutation
# Metrikos + coverage gate + mutacijos:
npm run quality:2ld
```

`quality:lint` yra papildomas auditas, kuris nekeičia įprasto projekto lint slenksčio. Jis aptinka sudėtingumą bei vienodas sąlygas/šakas; JSON saugomas `reports/2ld/code-smells.json`. Tai ESLint/SonarJS auditas, ne įvykdytas SonarCloud serverio Quality Gate. Šiam darbui sukurtas vietinis ≥80 % šakų gate kiekvienai pasirinktai funkcijai. Komanda prijungė SonarQube Cloud projektą ir IDE; 2026-10-21 Cloud peržiūroje coverage duomenų dar nebuvo, Quality Gate buvo „Not computed“. Ekrano vaizdas pateiktas Confluence ataskaitoje. Vietinis `lcov.info` savaime į Cloud neįkeliamas.

Konfigūraciniai failai:

- `eslint.quality.config.js`: ESLint `complexity` classic >10 ir SonarJS cognitive >15 perspėjimai; papildomi Code Smells.
- `jest.2ld.config.js`: paveldi esamą `jest-expo`, alias ir native mock setup. Paleidžia tik `*.2ld.test.ts` ir `*.2ld.test.tsx` failus; Babel/Istanbul coverage.
- `.stryker-mutator.conf.json`: Jest custom runner, `perTest`, 2 procesai, tik 8 funkcijų intervalai. Atranka apima šaltinius, konfigūracijas ir testams reikalingus assets, ne Pods/Gradle/build katalogus. `disableTypeChecks: false`: Jest/Babel vykdymui TS checker nereikalingas; tikrą TypeScript patikrą atskirai vykdo `npm run type-check`.
- `scripts/quality/targets.json`: vienintelis funkcijų korpuso aprašas. `quality:metrics` iš AST iš naujo nustato intervalus ir generuoja Stryker JSON; pakeitus produkcinį kodą reikia pakartoti šią komandą prieš coverage/mutacijas.

Stryker nereikia senos atskiros TypeScript mutator pakuotės. Įrankis mutuoja TypeScript, o esamas Jest/Babel pipeline jį vykdo. Pasirinktas [oficialus Jest runner](https://stryker-mutator.io/docs/stryker-js/jest-runner/) palaiko `perTest` analizę. HTML ir JSON reportai rašomi lokaliai, be dashboard publikavimo.

## Dydžio metrikos ir jų sritis

`cloc` vykdomas su tikslia failų inventorizacija (`reports/2ld/source-inventory.txt`). Įtraukiami versijuojami ir nauji neignoruojami source/config/test/tool failai. Neįtraukiami `node_modules`, sugeneruoti `ios`/`android`, reportai, lockfile, automatinis `expo-env.d.ts`, bitmap/media, dokumentacijos Markdown ir sugeneruotas `docs/2ld/confluence/` paketas. Todėl pradiniai failai ir galutinis pakeitimas gali turėti skirtingą LOC. Ataskaitoje nurodykite, kurį vykdymą naudojate.

- `LOC = code + comment + blank`: fizinės visų įtrauktų failų eilutės.
- `CLOC = comment`: cloc klasifikuotos komentarų eilutės.
- `NCLOC = code`: netuščios kodo eilutės.
- `blank = LOC − CLOC − NCLOC`.
- Komentarų ir kodo santykis `CLOC / NCLOC × 100 %`.

Mišriose eilutėse su kodu ir komentaru galioja cloc klasifikacija. `size.json` pateikia kalbų sumas; `size-summary.json` – šias formules. Programėlės produkcinio `app/` ir `src/` kodo atskira inventorizacija bei suma pateikiama `application-size.json`, kad testai ir įrankiai nepadidintų programėlės dydžio interpretacijos.

## Sudėtingumo skirtumai konkrečiose eilutėse

Naudojamas [ESLint classic CC](https://eslint.org/docs/latest/rules/complexity), kuris, be bazinio 1 ir kontrolės šakų, įskaičiuoja default argumentus, `??`, loginius operatorius ir optional chaining. Tai deklaruotas JavaScript McCabe įgyvendinimo variantas; jis nėra vien rankinis `if` skaičiavimas. SonarJS cognitive vertina įgniežimą, neprideda bazinio 1 ir ignoruoja dalį JavaScript sutrumpintų konstrukcijų. Metodika aprašyta [Sonar Cognitive Complexity](https://www.sonarsource.com/resources/cognitive-complexity/).

| Funkcija                            | CC / Cognitive | Eilutės ir paaiškinimas                                                                                                                                                                                                                                                                                    |
| ----------------------------------- | -------------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `retryTransientNativeCommand`       |          7 / 6 | utils.ts:86–87 numatytieji argumentai didina CC; 91 `for`, 94 `catch`, 96 `if` įgniežimas didina Cognitive. SonarJS loginio OR neįvertina taip pat kaip CC.                                                                                                                                                |
| `syncLocationPermissionAndPosition` |        10 / 11 | useUserLocation.ts:12 default argumentas prisideda prie CC; 34–35 ir 41–46 `catch` viduje esantys `if` didina Cognitive dėl gylio. `try` savaime sudėtingumo nedidina.                                                                                                                                     |
| `fetchOpenMeteoWeatherSnapshot`     |          4 / 4 | openMeteo.ts:252 `if`, 264 `catch`, 265 įgniežtas `if`. Cognitive gylio priedas kompensuoja tai, kad nėra bazinio CC +1; vienodi galutiniai skaičiai nereiškia vienodų taisyklių.                                                                                                                          |
| `getWeatherChangeMessage`           |        15 / 10 | weatherChanges.ts:16–17 `?.`, 19 loginis OR, 25–35 loginės ir ternarinės išraiškos bei 37 `&&` didina CC. SonarJS OR ir nullish fallback nevertina kaip CC; 45 ir 51 plokšti `if` gauna po vieną Cognitive tašką.                                                                                          |
| `submitMarkerRating`                |         13 / 8 | ratings.ts:207 ir 209 numatytosios reikšmės, 233 ternarinė išraiška ir 240–255 OR fallback didina CC. 265–270 `catch` ir įgniežtas `if` didina Cognitive dėl gylio.                                                                                                                                        |
| `listMarkerRatingsPage`             |          6 / 1 | ratings.ts:173 vienas `if` → Cognitive 1; 177–178 `options?.… ?? …` duoda papildomas CC šakas. 188 `map` callback matuojamas atskirai, async ar array metodas savaime nėra CC šaka. Funkcija atlieka validaciją, riboja puslapio dydį/offset, vykdo IO, transformuoja rezultatą ir apskaičiuoja `hasMore`. |
| `createMarker`                      |         11 / 8 | markers.ts:245–246 default reikšmės ir 266 fallback/default destructuring didina CC; 296–297 `catch` viduje esantis `if` didina Cognitive. 254, 258, 282 yra plokštūs guard/atributų sprendimai.                                                                                                           |
| `updateMarker`                      |          8 / 5 | markers.ts:371–372 numatytieji masyvai ir 389 `??` prisideda prie CC; 411–412 įgniežtas schemos klaidos sprendimas prie Cognitive. 386–387 `filter` callback turi atskirą funkcijos metriką.                                                                                                               |

Tikslūs pirminiai kodų fragmentai yra [functions.md](functions.md). AST konstrukcijų eilutės taip pat įrašomos `metrics.json`; pastarosios apima vidinius callback, bet pasirinktos išorinės funkcijos ESLint skaičius jų sudėtingumo automatiškai nesumuoja.

## Maintainability Index, sanglauda ir sujungimas

MI yra **deklaruotas leksinis TypeScript įvertis**, ne Sonar serverio ar Visual Studio rezultatas. Taikoma [Microsoft 0–100 formulė](https://learn.microsoft.com/en-us/visualstudio/code-quality/code-metrics-maintainability-index-range-and-meaning):

```text
V = N × log2(n)
MI = max(0, (171 − 5.2 ln(V) − 0.23 CC − 16.2 ln(NCLOC)) × 100 / 171)
```

`N` – visų AST lapuose esančių tokenų skaičius, `n` – skirtingų tokenų skaičius; identifier ir literal priskiriami operandams, likę tokenai operatoriams. Įtraukiamos TS tipų sintaksės ir skyrybos tokenai; komentarai ir EOF neįtraukiami. `CC` – visų failo ESLint funkcijų CC suma, įskaitant callback; `NCLOC` – cloc code eilutės. Tipų įtraukimas ir failo agregavimas riboja palyginamumą su kitais MI analizatoriais. Mažas indeksas yra signalo įvertis, o ne automatinis teiginys, kad funkcija neteisinga.

Klasikiniai CK `LCOM` ir `CBO` skirti klasėms su metodais ir laukais. Atrinkti moduliai daugiausia funkciniai, todėl būtų klaidinga pateikti jų importų skaičių kaip tikslų klasės CBO. Šiame darbe pateikiamos aiškiai įvardytos **modulinės adaptacijos**:

- `CBO_importModulesIncludingTypes`: unikalių tiesioginių importuojamų modulių skaičius, įskaitant type-only importus. Ne transityvios priklausomybės ar barrel eksportų skaičius. `metrics.json` turi visas importų ribas ir type-only žymas.
- `functionalLCOM4`: failo top-level funkcijų nuorodų grafo jungumo komponentų skaičius. Dvi funkcijos susiejamos, jei viena tiesiogiai nurodo kitą. Įdėtiniai callback priskiriami jų savininko kūnui, klasės metodai šiame variante neįtraukiami. Bendri klasės laukai nemodeliuojami. 1 reiškia vieną susietą funkcijų grupę, o ne įrodymą, kad modulis atlieka tik vieną atsakomybę; `useUserLocation` su viena top-level funkcija turi trivialų LCOM4=1.

Jei dėstytoja reikalauja būtent klasikinių CK klasių metrikų, šių adaptacijų negalima taip pervadinti: funkcinio korpuso klasikinis LCOM/CBO yra N/A, ir metodiką reikia derinti arba papildomai pasirinkti tikras klases. Visų šešių failų MI/CBO/LCOM adaptacijų rezultatai pateikti [functions.md](functions.md).

## Coverage ir mutacijų interpretavimas

`quality:coverage` renka pilnų failų coverage, o `scripts/quality/coverage.cjs` papildomai ištraukia kiekvieną pasirinktos funkcijos intervalą ir failo testų baigtis. Gate vykdomas kiekvienai pasirinktai funkcijai, ne visai programėlei. Pasirinktos funkcijos intervalas įtraukia jos vidinius callback. Pilnų failų coverage konsolės lentelė išlieka prieinama ir nėra vadinama visos programėlės coverage.

Decision coverage operacionalizuotas kaip Istanbul `if`, `cond-expr` ir `switch` **sprendimų baigčių** padengimas. `binary-expr` ir `default-arg` paliekami tik branch skaičiavime. Išsaugomos kiekvieno sprendimo eilutės ir baigčių hit skaičiai (`selected-coverage.json`). Tai nėra MC/DC ar kiekvienos atominės sąlygos nepriklausomo poveikio matavimas. Šiame korpuse nėra `switch` sprendimų; for tęstinumo baigtis Istanbul tiesiogiai neinstrumentuoja, todėl šis rodiklis nėra pilnas CFG visų kontrolinių sprendimų auditas. Retry ribos tikrinamos atskirais elgsenos testais.

Mutacijos vykdomos kiekviename pasirinktame intervale, įskaitant jo callback. Ataskaitos:

- `reports/2ld/mutation/index.html` – kiekvieno mutanto pakeitimas ir testai.
- `reports/2ld/mutation/mutation.json` – pilnas Stryker rezultatas.
- `reports/2ld/selected-mutation.json` ir `mutation.md` – rezultatai kiekvienai iš 8 funkcijų.
- `reports/2ld/selected-coverage.json`, `coverage.md` – pasirinktas korpusas.
- `reports/2ld/coverage/index.html`, `lcov.info` – pilni šešių failų rezultatai.

Laboratorinio darbo formulė: `Killed / (Valid − ReviewedEquivalent) × 100 %`. Stryker į detected skaitiklį įtraukia ir Timeout; todėl išvedami abu skaičiai atskirai pagal [oficialius mutantų būsenų apibrėžimus](https://stryker-mutator.io/docs/mutation-testing-elements/mutant-states-and-metrics/). CompileError/RuntimeError neįtraukiami į valid vardiklį. Automatiškai išgyvenę mutantai nevadinami equivalent. Aštuoniems mutantams atlikta dokumentuota statinė analizė: `scripts/quality/equivalent-mutants.json` saugo source SHA-256, mutantų intervalus, pakeitimus, įėjimų sritį ir argumentus. Vienas keičia numatytųjų options objekto falsy lauką; septyni keičia perteklinius null guard arba temperatūros žinutėje nenaudojamą label. Tai agento analizė pagal deklaruotą TypeScript kontraktą ir paprastus duomenų objektus, ne dėstytojos patvirtinimas ar visų JavaScript proxy/getter įėjimų įrodymas. Pasikeitus šaltiniui ar mutantui, scriptas neatitinkančios išimties netaiko.

`Killed/Valid` paliktas kaip konservatyvus nefiltruotas rezultatas; `laboratoryMutationScorePct` skaičiuoja vartotojo formulę su dokumentuotais Equivalent atėmimais. Neperžiūrėti survivor/no-coverage mutantai lieka vardiklyje ir rodomi kaip `unresolvedSurvivors`. Timeout lieka non-equivalent vardiklyje, bet ne Killed skaitiklyje.

`reports/` ir `.stryker-tmp/` yra ignoruojami Git; generuotus reportus galima prisegti prie laboratorinio darbo. Repo saugo konfigūraciją, testus ir metodiką. `quality:metrics` nekelia duomenų į išorinį servisą, o unit testai mockina realias paslaugas.
