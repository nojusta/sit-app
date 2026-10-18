# 2LD išmatuoti rezultatai

Galutinio šios sesijos vykdymo rezultatai. Šaltiniai: vietiniai `reports/2ld/*.json`. Produkcinis kodas nekeistas. SIT sąsajos yra domeno atranka; Jira autorystė nepatvirtinta.

## Dydis

Visa inventorizuota kodo bazė (source + config + testai + įrankiai; be lockfile ir sugeneruotų katalogų):

| Failai |   LOC | CLOC | NCLOC | Tuščios | CLOC/NCLOC |
| -----: | ----: | ---: | ----: | ------: | ---------: |
|    184 | 24807 |  250 | 21919 |    2638 |      1.14% |

Produkcinė programėlė (app/ ir src/, be testų):

| Failai |   LOC | CLOC | NCLOC | Tuščios | CLOC/NCLOC |
| -----: | ----: | ---: | ----: | ------: | ---------: |
|    116 | 12502 |   44 | 11067 |    1391 |       0.4% |

## Aštuonių funkcijų korpusas

| Narys / užduotis | Funkcija                          | CC / Cognitive | Statements | Branches | Decision outcomes\* | Killed / Non-equivalent | 2LD mutation score\*\* |
| ---------------- | --------------------------------- | -------------: | ---------: | -------: | ------------------: | ----------------------: | ---------------------: |
| Nojus / SIT-42   | retryTransientNativeCommand       |          7 / 6 |       100% |     100% |                100% |                 15 / 16 |                 93.75% |
| Nojus / SIT-48   | syncLocationPermissionAndPosition |        10 / 11 |       100% |     100% |                100% |                 35 / 35 |                   100% |
| Ugnius / SIT-40  | fetchOpenMeteoWeatherSnapshot     |          4 / 4 |       100% |     100% |                100% |                 13 / 13 |                   100% |
| Ugnius / SIT-97  | getWeatherChangeMessage           |        15 / 10 |       100% |     100% |                100% |                 47 / 47 |                   100% |
| Matas / SIT-27   | submitMarkerRating                |         13 / 8 |       100% |     100% |                100% |                 42 / 42 |                   100% |
| Matas / SIT-93   | listMarkerRatingsPage             |          6 / 1 |       100% |     100% |                100% |                 25 / 25 |                   100% |
| Marius / SIT-104 | createMarker                      |         11 / 8 |       100% |     100% |                100% |                 31 / 31 |                   100% |
| Marius / SIT-110 | updateMarker                      |          8 / 5 |       100% |     100% |                100% |                 38 / 38 |                   100% |

- Decision outcomes matuoja Istanbul if/ternary/switch baigtis; tai nėra MC/DC arba pilna ciklų CFG instrumentacija. Metodika ir eilutės pateiktos [README.md](README.md). Visos 8 funkcijos įvykdo vietinį Branch Coverage ≥80 % gate.

\*\* Aštuoni Equivalent mutantai atmesti tik pagal dokumentuotą statinę analizę deklaruotų TS įėjimų srityje. Jos argumentai yra `scripts/quality/equivalent-mutants.json`; jie nėra dėstytojos patvirtinimas. SIT-42 turi 1 Timeout mutantą (attempt didinimas pakeistas mažinimu), kuris lieka vardiklyje ir nepatenka į Killed skaitiklį.

Bendrai: **246 Killed / 247 Non-equivalent = 99.6%**. Sugeneruota 255 galiojančių mutantų; 8 Survived (visi dokumentuoti Equivalent), 1 Timeout, 0 NoCoverage, 0 CompileError/RuntimeError. Neperskaičiuotas Killed/Valid = 96,47 %, oficialus Stryker detected score = 96,86 % (įskaičiuoja Timeout ir neatmeta Equivalent).

Pilnų šešių pasirinktų failų rezultatas su tik šiam darbui atrinktais testais: Statements **79,22 %**, Branches **69,69 %**. Tai apima ir funkcijas, kurios nepriklauso 8 funkcijų korpusui. Visos programėlės coverage čia nematuotas ir Sonar serverio gate nevykdytas.

## Failų metrikos

| Failas                                                             | MI (lexical TS) | CBO (import modules) | Functional LCOM4 |
| ------------------------------------------------------------------ | --------------: | -------------------: | ---------------: |
| src/features/map/providers/google-native/googleMapSurface.utils.ts |           17.18 |                    4 |                5 |
| src/features/map/hooks/useUserLocation.ts                          |           34.37 |                    3 |                1 |
| src/services/weather/openMeteo.ts                                  |           11.04 |                    1 |                1 |
| src/features/weather/utils/weatherChanges.ts                       |           38.46 |                    1 |                1 |
| src/services/appwrite/ratings.ts                                   |           13.31 |                    5 |                1 |
| src/services/appwrite/markers.ts                                   |            4.43 |                    8 |                2 |

MI naudoja deklaruotą AST tokenų Halstead variantą ir failo funkcijų CC sumą; LCOM4/CBO yra modulinės adaptacijos, ne klasikinės CK klasių metrikos. Formulės ir interpretavimo ribos pateiktos [README.md](README.md). Kodas ir eilutės – [functions.md](functions.md).

## Patikros

- Pridėti **86 AAA atvejai** šešiuose `.2ld.test.*` failuose. Kartu su esamais susijusiais testais: **11 rinkinių / 117 testų**, visi praėjo.
- Visas projekto Jest: **42 rinkiniai / 236 testai / 1 snapshot**, visi praėjo.
- `npm run type-check`: praėjo.
- Fokusinis ESLint pakeistiems testams ir analizės scriptams: 0 klaidų, 0 perspėjimų.
- SonarJS/complexity auditas: 0 klaidų, 29 perspėjimai. Auditas skirtas esamam kodui įvertinti; perspėjimai neišjungti ir produkcinis kodas dėl jų nekeistas.
- Stryker galutinis vykdymas: 255 mutantai, baigėsi sėkmingai.

Naudotos versijos: eslint 9.39.5; eslint-plugin-sonarjs 4.2.2; typescript 6.0.3; jest 29.7.0; cloc 2.6.0-cloc; @stryker-mutator/core 10.0.0; @stryker-mutator/jest-runner 10.0.0.

Atkartojimas: `npm run quality:2ld`. DKM užklausa ir Test Smells taisyklės – [prompt-template.md](prompt-template.md). Generuotos HTML ataskaitos yra `reports/2ld/coverage/index.html` ir `reports/2ld/mutation/index.html`; reports katalogas ignoruojamas Git, todėl laboratorinio darbo priedams jį reikia išsaugoti atskirai.
