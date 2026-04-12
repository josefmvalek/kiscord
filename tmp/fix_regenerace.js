const fs = require('fs');
const path = 'c:/Users/Pocitac/Desktop/Projekty/kiscord/js/modules/regenerace.js';
let content = fs.readFileSync(path, 'utf8');
const lines = content.split(/\r?\n/);

const newLines = [
    '                { id: 7, title: "\\"Normální\\" hladina v krvi vs. Funkční optimum", text: "Laboratorní tabulky mají široké rozmezí (např. ferritin 20–300 µg/l). To, že jsi „v normě“, neznamená, že máš dostatek pro špičkový výkon.", result: "Pro optimální energii a stop padání vlasů se ve funkční medicíně doporučuje hladina 50–100 µg/l. Pokud jsi na spodní hranici, tvoje tělo už vnímá deficit.", source: "(Zdroj: Functional Medicine Analysis)" },',
    '                { id: 8, title: "Pozor na „zloděje“ železa: Vápník, káva a čaj", text: "Některé látky vytvářejí se železem nerozpustné komplexy a brání jeho vstřebání. Mezi největší inhibitory patří vápník a taniny.", result: "Káva nebo čaj ihned po jídle mohou snížit absorpci železa až o 60–90 %. Železo doplňuj s odstupem alespoň 2 hodin od mléčných výrobků a kofeinu.", source: "(Zdroj: Hurrell, R., et al., American Journal of Clinical Nutrition)" },',
    '                { id: 9, title: "Chemie synergie: Vitamín C jako katalyzátor", text: "Kyselina askorbová je „klíč“, který mění chemii železa tak, aby ho tvé střevo dokázalo uchopit.", result: "Vitamín C redukuje trojmocné železo ($Fe^{3+}$) na dvojmocné ($Fe^{2+}$), které je pro buňky mnohem snadnější vstřebat. Zvyšuje absorpci až čtyřnásobně.", source: "(Zdroj: AJCN)" },'
];

// Check line 108 (index 107)
console.log('Old line 108:', lines[107]);

lines[107] = newLines.join('\n');
fs.writeFileSync(path, lines.join('\n'), 'utf8');
console.log('Successfully updated regenerace.js');
