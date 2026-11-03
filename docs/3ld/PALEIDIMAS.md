# 3LD matavimų paleidimas

## Pirmą kartą

Reikia įdiegtų projekto priklausomybių, esamo SIT native kliento, Android SDK, Xcode ir Maestro. Naujo native build šiems JS/TS pakeitimams nereikia.

`.env` naudojami esami `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `APPWRITE_DATABASE_ID`, kolekcijų ID, `APPWRITE_STORAGE_ID` ir serverio `APPWRITE_API_KEY`. Rakto nekelkite į Confluence ar Git. Jis nepatenka į Expo konfigūraciją.

```bash
npm run quality:3ld:setup
npm run quality:3ld:start -- --ios
```

Pirmoji komanda sukuria tik atskiras 3LD kolekcijas ir dvi testines paskyras. Jei negalima sukurti papildomo bucket, nauji testiniai failai trumpam įkeliami į esamą ir iškart pašalinami. Esami failai nekeičiami. Antroji komanda paleidžia vietinį serverį, Metro ir esamus simuliatorius. Palikite šį terminalą veikiantį.

Jei 8081 prievade jau veikia įprastas Metro, pirmiausia jį sustabdykite. 3LD režimas įjungiamas tik su `SIT_3LD=1`; įprastas `npm start` jo neįjungia.

## Matavimai

Kitame terminale:

```bash
npm run quality:3ld:backend
npm run quality:3ld:measure
npm run quality:3ld:ui
npm run quality:3ld:ios
npm run quality:3ld:report
```

Android matavimų ir UI komandų vienu metu neleiskite: jos naudoja tą patį ekraną. Saugumo bandymų raudonos reikšmės yra produkto rezultatai, ne priežastis keisti teises prieš matavimą.

Ataskaita sukuriama tik turint visų 32 atvejų duomenis ir numatytus tikrus ekrano vaizdus. Galutiniai failai – `docs/3ld/ATASKAITA.md`, `ATASKAITA.html`, `results.csv`, `results.json`; archyvas – `reports/3ld/SIT-3LD.zip`. Pirminiai duomenys – `reports/3ld/`.

Confluence kopijuokite atvertos HTML ataskaitos turinį. Jei paveikslai nepersikelia, įkelkite juos iš `screenshots/` prie atitinkamų antraščių.

## Greitas pakartojimas per gynimą

Vietos API atsakymui pridėti 3000 ms vėlinimą ir pakartoti 5 kartus:

```bash
npm run quality:3ld:measure -- --kind location --options '{"metric":"demo","scenario":"delayed","delayMs":3000,"repeats":5}'
```

Išbandyti 50 lygiagrečių orų užklausų:

```bash
npm run quality:3ld:measure -- --kind weather --options '{"metric":"demo","count":50}'
```

Talpos bandymas su 500 cache įrašų:

```bash
npm run quality:3ld:measure -- --kind cache-capacity --options '{"metric":"demo","count":500}'
```

Šios komandos papildo pirminius įrašus ir ekrane parodo rezultatą. Jos nekeičia anksčiau parengtos ataskaitos. `demo` rezultatai nepatenka į pagrindines 16 metrikų.

Prireikus nustatykite `ANDROID_SERIAL`, `ANDROID_AVD`, `IOS_DEVICE_ID` arba `MAESTRO_BIN`. Pagal nutylėjimą naudojamas `emulator-5554` ir projekto SIT iOS simuliatorius. Orų apkrova siunčiama vietiniam serveriui, ne viešam Open-Meteo.

## Po atsiskaitymo

Pirmiausia sustabdykite matavimo procesus. Peržiūrėti šalinamus išteklius:

```bash
npm run quality:3ld:clean
```

Pašalinti tik registre esančias 3LD kolekcijas, paskyras ir likusius testinius failus:

```bash
npm run quality:3ld:clean -- --execute
```

Produkcinių kolekcijų ir esamo bucket ši komanda nešalina. Privatūs testinės aplinkos duomenys lieka ignoruojamame `reports/3ld/private/`; jų neplatinkite. Po valymo išjunkite 3LD Metro ir grįžkite prie įprasto `npm start`.
