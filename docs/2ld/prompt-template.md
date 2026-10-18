# DKM užklausos šablonas: AAA vienetų testai

Kopijuokite šabloną ir pridėkite tik tikslinės funkcijos kodą, jos tipus, tiesiogines priklausomybes ir aktualius testavimo konfigūracijos failus. Nepateikite `.env`, raktų arba vartotojų duomenų. Fiksuokite tikrą modelį, datą, užklausą, nepakoreguotą atsakymą ir vėlesnius žmogaus pakeitimus, jei to reikalauja laboratorinio darbo ataskaita.

```text
Kontekstas: SIT, React Native + TypeScript, Jest 29, jest-expo,
@testing-library/react-native. Laikykis pateikto AGENTS.md.

Autorius: <Nojus / Ugnius / Matas / Marius>
Užduotis: <SIT numeris>
Tikslinė funkcija: <vardas>
Failas ir intervalas: <kelias:pradžia–pabaiga>
Funkcijos kodas: <įklijuoti>
Tipai ir tiesioginės priklausomybės: <įklijuoti>
Esama Jest konfigūracija ir artimi testai: <įklijuoti>
Elgsenos kontraktas: <normalus rezultatas, ribos, klaidos, šalutiniai efektai>

Sugeneruok vykdomus vienetų testus, nekeisdamas produkcinės elgsenos.
1. Kiekviename teste aiškiai pažymėk // Arrange, // Act, // Assert.
   Vienas testas tikrina vieną aiškiai įvardytą elgseną. Paprastai vienas
   tikslinės funkcijos kvietimas; keli nuoseklūs veiksmai leidžiami tik
   vienam būsenos ar laiko kontraktui patikrinti.
2. Testuok normalų kelią, kiekvieną sprendimo baigtį, trūkstamus duomenis,
   ribas ties slenksčiu ir iš abiejų jo pusių, async atmetimus bei klaidų
   propagavimą. Testų orakulą grįsk kontraktu, ne funkcijos kopija.
3. Mockink išorinę IO ties paslaugos riba: Appwrite, fetch, Expo Location,
   native SDK. Nemockink tikslinės funkcijos ar logikos, kurią tikrini.
   Hook testams naudok renderHook ir act/waitFor.
4. Venk Eager Test: viename teste netikrink nesusijusių funkcijų.
   Venk Lazy Test: nekartok identiškų įėjimų ir identiško orakulo.
   Tą patį įėjimą skirtingiems nepriklausomiems kontraktams tikrinti galima,
   bet pagrįsk, kodėl jų nesujungei.
5. Venk Assertion Roulette: assertion turi būti susietas su testo pavadinimu;
   naudok vieną toEqual/toMatchObject vienam rezultatui, o papildomus
   assertion tik jei jie būtini tai pačiai elgsenai (pvz., retry riba).
   Nenaudok vien snapshot, toBeDefined ar pernelyg plataus any kaip orakulo.
6. Venk Silent Catch: klaidas tikrink await expect(...).rejects;
   negaudyk ir nenutylėk klaidų. Visus promise awaitink.
7. Izoliuok mockus; atkurk spy, globalius objektus ir laikmačius.
   Laiko elgsenai naudok Jest fake timers, ne realius laukimus.
   Sutvarkyk hook išmontavimą ir mock subscription.remove.
8. Naudok it.each ribinėms reikšmėms, su skaitomais testų pavadinimais.
   Nenaudok `any`, `.skip`, `.only`, `@ts-ignore` ar Stryker išimčių
   nepasiektam rezultatui paslėpti.
9. Siekis: kiekvienos pasirinktos funkcijos Branch Coverage >= 80 %.
   Atskirai pateik statement, branch ir decision outcomes; nevadink
   Istanbul binary-expr šakų MC/DC arba nepriklausomų sąlygų padengimu.
10. Nenumanyk coverage ar mutation score. Pateik testų kodą, atvejų lentelę
    (įėjimas → sprendimas → orakulas), vykdymo komandas ir tikėtinus mutantus,
    kuriuos testai turėtų aptikti. Tikrus skaičius pateik tik po vykdymo.
11. Išgyvenusiam mutantui pasiūlyk kontraktu paremtą testą. Equivalent
    statusą pagrįsk įėjimų srities ir elgsenos analize, ne procentų siekiu.

Išvestis: testų failas; atvejų lentelė; AAA/Test Smells savikontrolė;
nepatvirtintos prielaidos; vykdymo komandos. Neteik išgalvotų rezultatų.
```

Naudojamos komandos:

```bash
npm run type-check
npx eslint <testo-failas> --max-warnings=0
npm run quality:coverage
npm run quality:mutation
```

Šiame pakeitime `.2ld.test.*` testai parengti šio agento sesijoje ir pataisyti po tikro vykdymo. Šablonas skirtas pakartotiniams komandos eksperimentams; jis nėra teiginys, kad anksčiau esantys testai buvo generuoti tuo pačiu šablonu.
