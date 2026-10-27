# 2LD išmatuoti rezultatai

Galutinė 2026-10-21 suvestinė. Produkcinis kodas nepakeistas. Pagrindinis šaltinis su interpretacija ir tikromis ekrano nuotraukomis – [Confluence ataskaita](confluence/ATASKAITA.md), kopijavimui – [HTML](confluence/ATASKAITA.html).

## Matavimo sritis

Tik šio 2LD `*.2ld.test.ts` ir `*.2ld.test.tsx`: **87 vienetiniai atvejai + 1 paslaugų integracinis atvejis = 88 atvejai septyniuose rinkiniuose**, visi praėjo. Testai sugeneruoti naudojant OpenAI Codex ir `gpt-6.1-sol` modelį.

## Dydis

Inventorizacija apima source, config, testus ir įrankius; neapima priklausomybių, lockfile, sugeneruotų native katalogų, ataskaitų ir `docs/2ld/confluence/` paketo.

| Sritis                   | Failai | LOC   | CLOC | NCLOC | Tuščios | CLOC/NCLOC |
| ------------------------ | ------ | ----- | ---- | ----- | ------- | ---------- |
| Visa inventorizuota bazė | 188    | 24932 | 259  | 22027 | 2646    | 1.18 %     |
| Produkcija app/ ir src/  | 116    | 12502 | 44   | 11067 | 1391    | 0.4 %      |

LOC = NCLOC + CLOC + tuščios eilutės.

## Aštuonios funkcijos

| Narys / Jira                                                          | Funkcija                          | CC / Cognitive | Statements | Branches | Decision outcomes | Killed / Non-equivalent | 2LD balas |
| --------------------------------------------------------------------- | --------------------------------- | -------------- | ---------- | -------- | ----------------- | ----------------------- | --------- |
| Nojus / [SIT-42](https://placeholdder.atlassian.net/browse/SIT-42)    | retryTransientNativeCommand       | 7 / 6          | 100 %      | 100 %    | 100 %             | 15 / 16                 | 93.75 %   |
| Nojus / [SIT-48](https://placeholdder.atlassian.net/browse/SIT-48)    | syncLocationPermissionAndPosition | 10 / 11        | 100 %      | 100 %    | 100 %             | 34 / 35                 | 97.14 %   |
| Ugnius / [SIT-40](https://placeholdder.atlassian.net/browse/SIT-40)   | fetchOpenMeteoWeatherSnapshot     | 4 / 4          | 100 %      | 100 %    | 100 %             | 13 / 13                 | 100 %     |
| Ugnius / [SIT-97](https://placeholdder.atlassian.net/browse/SIT-97)   | getWeatherChangeMessage           | 15 / 10        | 100 %      | 100 %    | 100 %             | 47 / 47                 | 100 %     |
| Matas / [SIT-27](https://placeholdder.atlassian.net/browse/SIT-27)    | submitMarkerRating                | 13 / 8         | 100 %      | 100 %    | 100 %             | 42 / 42                 | 100 %     |
| Matas / [SIT-93](https://placeholdder.atlassian.net/browse/SIT-93)    | listMarkerRatingsPage             | 6 / 1          | 100 %      | 100 %    | 100 %             | 25 / 25                 | 100 %     |
| Marius / [SIT-104](https://placeholdder.atlassian.net/browse/SIT-104) | createMarker                      | 11 / 8         | 100 %      | 100 %    | 100 %             | 31 / 31                 | 100 %     |
| Marius / [SIT-110](https://placeholdder.atlassian.net/browse/SIT-110) | updateMarker                      | 8 / 5          | 100 %      | 100 %    | 100 %             | 37 / 38                 | 97.37 %   |

Decision outcomes yra Istanbul if/ternary/switch baigčių poaibis, ne MC/DC ar pilnas CFG sprendimų auditas. Visos aštuonios funkcijos įvykdo vietinį ≥80 % branch gate. Pilnų šešių failų coverage su tais pačiais testais: statements **69,32 %**, branches **60,98 %**, functions **57,77 %**, lines **69,45 %**. Tai nėra visos programėlės coverage.

## Mutacijos

**255 mutantai: 244 Killed, 10 Survived, 1 Timeout.** Iš Survived aštuoni dokumentuoti kaip Equivalent, o du lieka neekvivalentiniai (ID 18 ir 146). CompileError, RuntimeError ir NoCoverage nėra.

- 2LD formulė: **244 / (255 − 8) × 100 = 98,79 %**.
- Oficialus Stryker detected: **(244 + 1) / 255 × 100 = 96,08 %**.
- Timeout lieka laboratorinio balo vardiklyje, bet nepridedamas prie Killed.
- Išimčių argumentai ir šaltinio SHA yra `scripts/quality/equivalent-mutants.json`. Neekvivalentinių mutantų spragos paaiškintos pagrindinėje ataskaitoje.

## Failų metrikos

| Failas                                                             | MI (leksinis TS) | CBO adaptacija | Funkcinis LCOM4 |
| ------------------------------------------------------------------ | ---------------- | -------------- | --------------- |
| src/features/map/providers/google-native/googleMapSurface.utils.ts | 17.18            | 4              | 5               |
| src/features/map/hooks/useUserLocation.ts                          | 34.37            | 3              | 1               |
| src/services/weather/openMeteo.ts                                  | 11.04            | 1              | 1               |
| src/features/weather/utils/weatherChanges.ts                       | 38.46            | 1              | 1               |
| src/services/appwrite/ratings.ts                                   | 13.31            | 5              | 1               |
| src/services/appwrite/markers.ts                                   | 4.43             | 8              | 2               |

MI taiko deklaruotą TypeScript tokenizavimą ir failo CC sumą. CBO/LCOM4 yra modulinės adaptacijos, ne klasikinės CK klasių metrikos. Formulės, ribos ir interpretacija – [metodikoje](README.md) bei [ataskaitoje](confluence/ATASKAITA.md).

## Patikros ir atkūrimas

- `npm run quality:coverage`: 7 rinkiniai, 88 atvejai praėjo, kiekvienos tikslinės funkcijos gate praėjo.
- `npm run quality:mutation`: užbaigta su šia testų atranka, 255 mutantai.
- `npm run type-check`: praėjo.
- Fokusinis ESLint pakeistiems testams ir metrikų skriptui: praėjo.
- SonarQube Cloud 2026-10-21: coverage duomenų dar nėra, Quality Gate „Not computed“. Vietinio gate su Cloud nesutapatiname.

Atkūrimas: `npm run quality:metrics`, `npm run quality:coverage`, `npm run quality:mutation`. `quality:lint` yra atskiras esamo kodo auditas. HTML reportai: `reports/2ld/coverage/index.html` ir `reports/2ld/mutation/index.html`. `reports/` ignoruojamas Git; užfiksuotų įrodymų kopijos pateiktos [Confluence pakete](confluence/EVIDENCE.md).
