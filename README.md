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
- Tanky se vyrábějí po pěti za 60 železa, 40 uhlí a 250 ¤; čtyřčlenné osádky zabírají populační limit.
- Výzkum: tři větve po třech úrovních, jeden aktivní výzkum na frakci.
- Operace: sledování výprav a ústup se ztrátou 20 % jednotek. Ústup není možný po ztrátě výchozího regionu.
- 1 / 2 / 4 mění rychlost. Esc zruší cíl. Klávesové zkratky nezasahují do aktivních tlačítek a vstupů.
- Vítězství vyžaduje všech 24 regionů. Frakce bez území je poražena i s armádou na pochodu.
- Ukládání probíhá každých 15 herních sekund, po rozkazu a při opuštění stránky. Obnovení stránky načte hru v pauze. Skrytí záložky hru pozastaví.

Uložení platí jen pro tento prohlížeč a adresu; smazání dat webu ho odstraní. Nová kampaň nahradí aktuální uloženou partii. Neexistuje offline dohánění času.

## Pravidla prototypu

Město přidává na každé úrovni 8 000 obyvatel, tedy 320 míst v armádě, a daňový příjem. Doly těží železo a uhlí pro výrobu tanků. Ropná pole vyrábějí ropu pro průběžnou spotřebu armády. Chybějící ropa se automaticky dováží za peníze; přístavy tento dovoz zlevňují a zároveň vydělávají obchodem. Prázdná pokladna při záporné bilanci způsobuje ztráty armády.

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

- Mapa je fiktivní testovací sektor s 24 regiony, ne Evropa ani pixelová fronta OpenFrontu.
- Vizualizace zobrazuje trasy, pohyb výprav a postup dobytí uvnitř regionů, nikoli fyzicky posouvané hranice.
- Pěchota a tanky jsou abstraktní národní síly. Dělostřelectvo, letectvo, námořní operace a diplomacie jsou další fáze.
- Vyvážení a délka partie 30–60 minut nejsou garantované; vyžadují hraní a ladění.
- Pět plně automatických zkušebních partií skončilo přibližně za 16–25 herních minut. Chování s lidským hráčem se bude lišit.
- Telefon používá vodorovně posuvnou mapu; hlavním cílem první verze je počítač.
- Bez multiplayeru, analytiky, vzdáleného ukládání a přihlášení.
- První předání: engine, sestavení a testy DOM ověřeny; vizuální kontrola skutečným prohlížečem nebyla dostupná kvůli omezení testovacího prostředí.

## Nasazení a soukromí

`npm run build` vytvoří statické `dist/`. Projekt lze nasadit jako Vite aplikaci, např. na Vercel (build `npm run build`, output `dist`). Nasazení není automaticky součástí této verze. Veřejný repozitář ani obtížně uhodnutelný odkaz nejsou privátní přístup; pro soukromou hru používej localhost nebo skutečnou ochranu hostingu. Nevkládej do klientského kódu tajné klíče.
