# Frontline

První hratelný prototyp osobní singleplayerové strategie. Originální kód, bez převzatých assetů OpenFrontu. Simulace i pět pravidlových botů běží pouze v prohlížeči, bez API, účtu a databáze.

## Spuštění

Node.js 22.18+ (doporučeno 24) a npm:

```sh
npm ci
npm run dev
```

Otevři adresu vypsanou Vite, obvykle http://localhost:5173. Pro kontrolu a produkční sestavení:

```sh
npm test
npm run test:ui
npm run build
npm run preview
```

## Ovládání

- Partie začíná pozastavená. Spusť čas tlačítkem nebo mezerníkem.
- Stát má jednu společnou armádu. Posuvníkem nastavíš její cílovou velikost jako podíl populačního limitu; pěchota se postupně nabírá nebo demobilizuje.
- Vyber vlastní region a klikni na přímého cizího souseda. Do operace vyčleníš 30, 60 nebo 90 % aktuálně volné armády. Zbytek brání celý stát.
- Každý region má město, železný či uhelný důl, ropné pole nebo přístav. Budovu lze vylepšit na úroveň 5.
- Obilná pole zásobují obyvatelstvo; spotřeba roste s populací a nedostatek snižuje příjem.
- V národním trhu lze po 25 jednotkách nakupovat i prodávat železo, uhlí, ropu a obilí. Přístavy zlevňují nákup.
- Automatický nákup a prodej se zapíná zvlášť pro každou komoditu. Bez obilí umírá populace, bez ropy ubývají tanky.
- Tanky se vyrábějí po pěti za 60 železa, 40 uhlí a 250 ¤; čtyřčlenné osádky zabírají populační limit.
- Budovy i samostatná provinční opevnění mají maximální úroveň 20. Opevnění přidává 8 % obrany za úroveň.
- Neutrální posádky jsou vidět přímo na mapě. Velikost útoku se nastavuje posuvníkem od 10 do 100 % volné armády.
- Výzkum: tři větve po třech úrovních, jeden aktivní výzkum na frakci.
- Operace: sledování výprav a ústup se ztrátou 20 % jednotek. Ústup není možný po ztrátě výchozího regionu.
- Probíhající operace lze posilovat další částí volné armády. Frontu na mapě znázorňují tečky vojáků, bojový efekt a barevné přelévání provincie.
- Miniaturní pěšáci a dostupné tanky stojí trvale na státních hranicích. Při boji se linie dotyku i ukazatel postupu posouvají dovnitř napadené provincie.
- Kolečko myši přibližuje mapu a kurzorové šipky ji posouvají bez pohybu celé stránky.
- Mapa používá plátno 1350 × 900 a zvětšenou geometrii provincií, zatímco text a ikony zůstávají kompaktní; pravý panel operací ukazuje samostatný průběh přípravy nebo bitvy.
- Nástroje nad mapou umožňují klikáním rychle vylepšovat nebo opevňovat vlastní provincie. Pravý panel při běhu simulace zachovává pozici posuvníku.
- 1 / 2 / 4 mění rychlost. Esc zruší cíl. Klávesové zkratky nezasahují do aktivních tlačítek a vstupů.
- Vítězství vyžaduje všech 34 obyvatelných provincií. Šest samostatných horských a jezerních oblastí je nepřekonatelných; mapa se přibližuje kolečkem myši.
- Ukládání probíhá každých 15 herních sekund, po rozkazu a při opuštění stránky. Obnovení stránky načte hru v pauze. Skrytí záložky hru pozastaví.

Uložení platí jen pro tento prohlížeč a adresu; smazání dat webu ho odstraní. Nová kampaň nahradí aktuální uloženou partii. Neexistuje offline dohánění času.

## Pravidla prototypu

Město přidává na každé úrovni 8 000 obyvatel, tedy 320 míst v armádě, a daňový příjem. Doly těží železo a uhlí pro výrobu tanků. Ropná pole vyrábějí ropu pro průběžnou spotřebu armády. Obilná pole živí populaci; bez dostatku obilí klesá příjem o 35 %. Komodity lze obchodovat, přičemž přístavy zlevňují nákup. Prázdná pokladna při záporné bilanci způsobuje ztráty armády.

Základní síla je pěchota + tanky × 6. Les a hory zvyšují obranu. Technologie armády přidává 12 % bojové síly, technologie ekonomiky zvyšuje příjmy a těžbu a logistika snižuje spotřebu ropy. Jednotky v operacích zůstávají součástí národní armády, ale nejsou volné pro další útok ani obranu. Při více napadených územích se volná obranná síla rozdělí mezi fronty.

Po příchodu armády bitva způsobuje průběžné ztráty a zvyšuje postup obsazení. Region padne po prolomení obrany nebo dokončení obsazování; zbytek obrany je při pádu odstraněn. Dobytí zruší místní výrobní frontu a sníží opevnění o jednu úroveň. V jednu chvíli může do cíle směřovat jedna operace; posily do rozběhnuté operace zatím nejsou podporované.

## Architektura

- `src/engine.ts`: typy, pevná mapa, příkazy, ekonomika, tick, bitvy, pravidlové boty, serializace.
- `src/main.ts`: SVG mapa, události rozhraní, časovač, lokální persistence. Bez frameworkové závislosti; TypeScript + Vite.
- `src/style.css`: responzivní velitelský stůl, přístupné focus stavy, omezení animací.
- `tests/engine.test.ts`: pravidla a vícenásobné dlouhé simulace.
- `tests/ui.test.mjs`: klikání, rozkazy, čas, ukládání a obnovení v JSDOM nad produkčním balíčkem; nejde o vizuální test skutečného prohlížeče.

Hráč a boty používají totožnou funkci `issue`. Seedovaný generátor zajišťuje opakovatelné rozhodování. Obtížnost nemá skryté bonusy. Boty znají celou mapu stejně jako hráč; mlha války není implementovaná. Ekonomické preference a práh útoku se liší podle osobnosti. Engine běží jednou za herní sekundu, nezávisle na snímkové frekvenci. UI je schválně jednoduché vanilla TypeScript; engine lze později napojit na React bez změny pravidel.

## Co zatím není hotové

- Mapa je fiktivní, členitostí inspirovaná Evropou: má 34 obyvatelných provincií, šest přírodních překážek a osm mořských výřezů tvořících pobřeží a poloostrovy.
- Vizualizace zobrazuje trasy, pohyb výprav a postup dobytí uvnitř regionů, nikoli fyzicky posouvané hranice.
- Pěchota a tanky jsou abstraktní národní síly. Dělostřelectvo, letectvo, námořní operace a diplomacie jsou další fáze.
- Vyvážení a délka partie 30–60 minut nejsou garantované; vyžadují hraní a ladění.
- Pět plně automatických zkušebních partií skončilo přibližně za 16–25 herních minut. Chování s lidským hráčem se bude lišit.
- Telefon používá vodorovně posuvnou mapu; hlavním cílem první verze je počítač.
- Bez multiplayeru, analytiky, vzdáleného ukládání a přihlášení.
- První předání: engine, sestavení a testy DOM ověřeny; vizuální kontrola skutečným prohlížečem nebyla dostupná kvůli omezení testovacího prostředí.

## Nasazení a soukromí

`npm run build` vytvoří statické `dist/`. Projekt lze nasadit jako Vite aplikaci, např. na Vercel (build `npm run build`, output `dist`). Nasazení není automaticky součástí této verze. Veřejný repozitář ani obtížně uhodnutelný odkaz nejsou privátní přístup; pro soukromou hru používej localhost nebo skutečnou ochranu hostingu. Nevkládej do klientského kódu tajné klíče.
## Novinky ve verzi 0.8

- náhled poměru sil a odhad rizika před zahájením útoku,
- tři bojové postoje: opatrný, vyvážený a průlomový,
- přehled podílu armády přiděleného jednotlivým frontám,
- zásobovací síť vedená od hlavního města; odříznuté provincie vyrábějí jen 45 %,
- civilní, průmyslová a vojenská specializace provincií,
- dohody o neútočení a lehké hospodářské události,
- nižší frekvence kompletního překreslování UI pro plynulejší mapu.
