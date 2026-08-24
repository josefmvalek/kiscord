/**
 * Austria Work & Travel Information Guide
 */

export function getCountdownHtml() {
    const departure = new Date('2026-05-31T08:37:00');
    const end = new Date('2026-08-31T23:59:59');
    const now = new Date();

    if (now < departure) {
        const diffMs = departure - now;
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        let timeStr = "";
        if (days > 0) timeStr += `${days} ${days === 1 ? 'den' : (days >= 2 && days <= 4 ? 'dny' : 'dní')}, `;
        timeStr += `${hours} ${hours === 1 ? 'hodinu' : (hours >= 2 && hours <= 4 ? 'hodiny' : 'hodin')} a `;
        timeStr += `${minutes} ${minutes === 1 ? 'minutu' : (minutes >= 2 && minutes <= 4 ? 'minuty' : 'minut')}`;

        return `
            <div class="flex items-start gap-4 p-4 rounded-3xl bg-gradient-to-r from-red-500/10 to-indigo-500/10 border border-red-500/20 text-white shadow-xl relative overflow-hidden group">
                <div class="absolute -right-6 -bottom-6 w-24 h-24 bg-red-500/5 rounded-full blur-2xl pointer-events-none"></div>
                <div class="w-10 h-10 rounded-2xl bg-red-500/20 flex items-center justify-center flex-shrink-0 text-[#ff5252] text-lg animate-pulse">
                    <i class="fas fa-hourglass-half"></i>
                </div>
                <div class="space-y-1">
                    <h4 class="text-xs font-black uppercase tracking-wider text-red-400">Odjezd do Rakouska se blíží! 🏔️✈️</h4>
                    <p class="text-xs text-gray-200/90 leading-relaxed font-semibold">
                        Vyjíždíme za <span class="text-white font-black italic bg-red-500/20 px-2 py-0.5 rounded-md border border-red-500/30">${timeStr}</span>.
                    </p>
                </div>
            </div>
        `;
    } else if (now >= departure && now <= end) {
        const totalDuration = end - departure;
        const elapsed = now - departure;
        const progressPercent = Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)));
        const dayIndex = Math.floor(elapsed / (1000 * 60 * 60 * 24)) + 1;

        return `
            <div class="flex flex-col gap-3 p-4 rounded-3xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 text-white shadow-xl relative overflow-hidden group">
                <div class="absolute -right-6 -bottom-6 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>
                <div class="flex items-start gap-4">
                    <div class="w-10 h-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0 text-emerald-400 text-lg">
                        <i class="fas fa-mountain"></i>
                    </div>
                    <div class="space-y-0.5">
                        <h4 class="text-xs font-black uppercase tracking-wider text-emerald-400">Jsme v Rakousku! 🇦🇹🏔️</h4>
                        <p class="text-xs text-gray-200/90 leading-relaxed font-semibold">
                            Dnes je <span class="text-white font-black bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-500/30">${dayIndex}. den</span> z 92 dní naší brigády.
                        </p>
                    </div>
                </div>
                <!-- Mini Progress Line -->
                <div class="w-full bg-black/40 h-2.5 rounded-full overflow-hidden border border-white/5 mt-1 relative flex items-center">
                    <div class="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full" style="width: ${progressPercent}%"></div>
                    <span class="absolute right-2 text-[8px] font-black text-emerald-300 drop-shadow">${progressPercent}%</span>
                </div>
            </div>
        `;
    } else {
        return `
            <div class="flex items-start gap-4 p-4 rounded-3xl bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20 text-white shadow-xl relative overflow-hidden group">
                <div class="absolute -right-6 -bottom-6 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl pointer-events-none"></div>
                <div class="w-10 h-10 rounded-2xl bg-purple-500/20 flex items-center justify-center flex-shrink-0 text-purple-400 text-lg">
                    <i class="fas fa-trophy"></i>
                </div>
                <div class="space-y-1">
                    <h4 class="text-xs font-black uppercase tracking-wider text-purple-400">Brigáda dokončena! 🎉🏆</h4>
                    <p class="text-xs text-gray-200/90 leading-relaxed font-semibold">
                        Všechny 3 měsíce v Sportcamp Woferlgut jsme úspěšně zvládli! Vítejte doma, hrdinové. ❤️
                    </p>
                </div>
            </div>
        `;
    }
}

// Render overall channel entry

export function renderInfoTabHtml() {
    return `
        <div class="space-y-6 animate-scale-up">
            
            <!-- Live Countdown Timer Widget -->
            <div id="austria-countdown-widget">
                ${getCountdownHtml()}
            </div>

            <!-- Alert banner for important arrival notice -->
            <div class="flex items-start gap-4 p-4 rounded-3xl bg-amber-500/10 border border-amber-500/25 text-amber-200 shadow-lg relative overflow-hidden group">
                <div class="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none"></div>
                <div class="w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center flex-shrink-0 text-amber-400 text-lg">
                    <i class="fas fa-bell"></i>
                </div>
                <div class="space-y-1 min-w-0">
                    <h4 class="text-xs font-black uppercase tracking-wider text-amber-300">Nezapomeň dát Wolfgangovi vědět! 📞</h4>
                    <p class="text-xs text-amber-200/80 leading-relaxed font-medium">
                        <strong>Den předem (v sobotu 30. 5.)</strong> napiš Wolfgangovi, v kolik zhruba dorazíme. Jakmile se budeme v neděli 31. 5. blížit vlakem k Brucku, <strong>zavolej mu znovu</strong>. Přijedou pro nás autem přímo na nádraží (které je sice jen 10 minut chůze, ale odvezou nás a ubytují).
                    </p>
                </div>
            </div>

            <!-- Grid Layout of Info Cards -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <!-- Card 1: Contract -->
                <div class="glass-card bg-white/[0.02] border border-white/5 rounded-3xl p-5 hover:border-white/10 transition-all flex flex-col justify-between group relative overflow-hidden">
                    <div class="absolute -right-8 -top-8 w-20 h-20 bg-blue-500/5 rounded-full blur-2xl pointer-events-none"></div>
                    <div>
                        <div class="flex items-center gap-3 border-b border-white/5 pb-3.5 mb-4 font-sans">
                            <div class="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 text-base">
                                <i class="fas fa-file-signature"></i>
                            </div>
                            <div>
                                <h3 class="text-sm font-black text-white uppercase tracking-wider">📄 Smlouva a podmínky</h3>
                                <span class="text-[9px] text-gray-400 font-bold block">Právní rámec & pravidla hry</span>
                            </div>
                        </div>
                        <ul class="space-y-2.5 text-xs text-gray-300 leading-relaxed font-medium">
                            <li>🏢 <strong class="text-white">Zaměstnavatel:</strong> Sportcamp Woferlgut v Bruck an der Glocknerstraße.</li>
                            <li>📅 <strong class="text-white">Trvání smlouvy:</strong> Určitá od 1. 6. 2026 do 31. 8. 2026.</li>
                            <li>⏳ <strong class="text-white">Zkušební doba:</strong> První měsíc (červen) – výpověď z obou stran kdykoliv, okamžitě a bez udání důvodu.</li>
                            <li>🚪 <strong class="text-white">Ukončení:</strong> Možno dát výpověď k 15. nebo poslednímu dni v měsíci.</li>
                            <li>🤒 <strong class="text-white">Nemoc & Absence:</strong> Hlásit ihned telefonicky nebo e-mailem (nestačí vzkaz po kolegovi!). Na vyžádání doložit neschopenku od doktora, jinak přijdeš o mzdu.</li>
                            <li>📷 <strong class="text-white">Pravidla:</strong> Mlčenlivost o hostech. Zákaz drog/alkoholu. Možnost kamer. Podepsán souhlas s focením pro web (lze odvolat).</li>
                        </ul>
                    </div>
                    <div class="mt-4 pt-3.5 border-t border-white/5 space-y-3">
                        <div class="bg-red-500/15 border border-red-500/25 p-3 rounded-2xl text-[10px] text-red-300 font-bold leading-normal flex items-start gap-2">
                            <i class="fas fa-exclamation-triangle mt-0.5 text-xs flex-shrink-0 animate-pulse"></i>
                            <div>
                                <strong>POZOR NA POKUTU:</strong> Předčasný svévolný odjezd bez důvodu nebo vyhazov vlastní vinou = smluvní pokuta ve výši <strong>1 hrubého platu</strong> + úhrada nákladů na povolení, výbavu a ubytování!
                            </div>
                        </div>
                        <!-- Quick Module Link -->
                        <button onclick="window.switchChannel('shifts')" 
                                class="w-full py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-wider transition duration-200 flex items-center justify-center gap-1.5">
                            <i class="fas fa-calendar-alt text-[#ff5252]"></i> Plánovač Směn 📅
                        </button>
                    </div>
                </div>

                <!-- Card 2: Finances -->
                <div class="glass-card bg-white/[0.02] border border-white/5 rounded-3xl p-5 hover:border-white/10 transition-all flex flex-col justify-between group relative overflow-hidden">
                    <div class="absolute -right-8 -top-8 w-20 h-20 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>
                    <div>
                        <div class="flex items-center gap-3 border-b border-white/5 pb-3.5 mb-4">
                            <div class="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-base">
                                <i class="fas fa-wallet"></i>
                            </div>
                            <div>
                                <h3 class="text-sm font-black text-white uppercase tracking-wider">💰 Plat a finance</h3>
                                <span class="text-[9px] text-gray-400 font-bold block">Mzda, přesčasy a srážky</span>
                            </div>
                        </div>
                        
                        <!-- Mini Styled Financial Table -->
                        <div class="bg-black/20 border border-white/5 rounded-2xl p-3.5 mb-4 space-y-2">
                            <div class="flex justify-between items-center text-xs">
                                <span class="text-gray-400 font-semibold">Čistá mzda / osoba:</span>
                                <span class="text-emerald-400 font-black text-sm">1.750 EUR / měsíc</span>
                            </div>
                            <div class="flex justify-between items-center text-[10px] border-t border-white/5 pt-2">
                                <span class="text-gray-500">Hrubá mzda (Třída 5):</span>
                                <span class="text-gray-300 font-bold">2.026 EUR / měsíc</span>
                            </div>
                            <div class="flex justify-between items-center text-[10px]">
                                <span class="text-gray-500">Paušál na přesčasy:</span>
                                <span class="text-gray-300 font-semibold">11 hodin / měsíc (v ceně)</span>
                            </div>
                            <div class="flex justify-between items-center text-[10px] border-t border-white/5 pt-2">
                                <span class="text-gray-500">Kapesné na start (doporučeno):</span>
                                <span class="text-amber-400 font-bold">cca 5.000 Kč</span>
                            </div>
                        </div>

                        <ul class="space-y-2.5 text-xs text-gray-300 leading-relaxed font-medium">
                            <li>📈 <strong class="text-white">Přesčasy navíc:</strong> Musí předem schválit šéf, pak proplaceny dle zákona.</li>
                            <li>🎁 <strong class="text-white">Bonusy:</strong> Nárok na 13. (dovolená) a 14. (vánoční) plat se vyplatí <strong>poměrně</strong> na konci brigády.</li>
                            <li>💳 <strong class="text-white">Výplata:</strong> Vždy poslední den v měsíci na účet (český IBAN už mají ve smlouvě). Každý měsíc výplatní páska.</li>
                            <li>🧺 <strong class="text-white">Výdaje na místě:</strong> Praní: 1 EUR / sušička: 1 EUR. Výlety a nákupy. Vratná záloha <strong>20 EUR</strong> na čip do hotelového gymu.</li>
                        </ul>
                    </div>
                    <div class="mt-4 pt-3.5 border-t border-white/5 flex gap-2">
                        <!-- Quick Kasička Link -->
                        <button onclick="window.switchChannel('kasicka')" 
                                class="flex-1 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl text-[10px] font-black uppercase tracking-wider transition duration-200 flex items-center justify-center gap-1">
                            <i class="fas fa-wallet"></i> Kasička 💶
                        </button>
                        <!-- Quick Směny Link -->
                        <button onclick="window.switchChannel('shifts')" 
                                class="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-wider transition duration-200 flex items-center justify-center gap-1">
                            <i class="fas fa-business-time text-amber-500"></i> Směny 📅
                        </button>
                    </div>
                </div>

                <!-- Card 3: Working Hours -->
                <div class="glass-card bg-white/[0.02] border border-white/5 rounded-3xl p-5 hover:border-white/10 transition-all flex flex-col justify-between group relative overflow-hidden">
                    <div class="absolute -right-8 -top-8 w-20 h-20 bg-orange-500/5 rounded-full blur-2xl pointer-events-none"></div>
                    <div>
                        <div class="flex items-center gap-3 border-b border-white/5 pb-3.5 mb-4">
                            <div class="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400 text-base">
                                <i class="fas fa-business-time"></i>
                            </div>
                            <div>
                                <h3 class="text-sm font-black text-white uppercase tracking-wider">⏰ Pracovní doba a směny</h3>
                                <span class="text-[9px] text-gray-400 font-bold block">Směnový řád, pozice a kolektiv</span>
                            </div>
                        </div>
                        <ul class="space-y-2.5 text-xs text-gray-300 leading-relaxed font-medium">
                            <li>⏱️ <strong class="text-white">Počet hodin:</strong> 42,5 hodiny týdně (čistá doba bez přestávek). Často stihneme dřív = no stress.</li>
                            <li>📅 <strong class="text-white">Rozložení:</strong> 5 dní v týdnu, týden oficiálně začíná v pondělí. Počítej s prací v neděli i svátky.</li>
                            <li>🕒 <strong class="text-white">Běžná směna:</strong> 7:00 až 16:00. V hlavní sezóně může mít někdy jeden z nás večerní.</li>
                            <li>🌿 <strong class="text-white">Dny volna:</strong> Namátkově, flexibilně. Šéf se snaží dávat volno společně, ale na 100 % to neslíbí.</li>
                            <li>🧼 <strong class="text-white">Náplň práce:</strong> Úklid (Reinigungskraft) – bazény, toalety, sprchy, hotel, apartmány, prádelna. Fyzicky v pohodě, nebudeme se tahat s těžkými věcmi, máme na to vozíky.</li>
                            <li>👥 <strong class="text-white">Kolektiv & Tykání:</strong> Přátelské, všichni si tykají. Skoro žádní Češi/Slováci, hlavně Němci, Švýcaři, Rakušané.</li>
                            <li>👕 <strong class="text-white">Oblečení:</strong> Pracovní triko/košili dostaneme. Nutné delší kalhoty / legíny pod kolena (legíny Valča). Rukavice dodají.</li>
                        </ul>
                    </div>
                    <div class="mt-4 pt-3.5 border-t border-white/5 space-y-3">
                        <div class="bg-indigo-500/10 border border-indigo-500/20 p-3 rounded-2xl text-[10px] text-indigo-300 font-bold leading-normal">
                            🗃️ <strong class="text-white uppercase tracking-wider">DŮLEŽITÉ:</strong> Odpracovanou pracovní dobu si musíme **bez mezer a korektně zapisovat** přes firemní formuláře nebo interní software.
                        </div>
                        <!-- Quick Němčina Link -->
                        <button onclick="window.switchChannel('austrian-german')" 
                                class="w-full py-2 bg-pink-500/10 hover:bg-pink-500/20 text-[#eb459e] border border-[#eb459e]/20 rounded-xl text-[10px] font-black uppercase tracking-wider transition duration-200 flex items-center justify-center gap-1.5">
                            <i class="fas fa-utensils text-[#eb459e]"></i> Rakouská Němčina 🇩🇪📖
                        </button>
                    </div>
                </div>

                <!-- Card 4: Accommodation -->
                <div class="glass-card bg-white/[0.02] border border-white/5 rounded-3xl p-5 hover:border-white/10 transition-all flex flex-col justify-between group relative overflow-hidden">
                    <div class="absolute -right-8 -top-8 w-20 h-20 bg-pink-500/5 rounded-full blur-2xl pointer-events-none"></div>
                    <div>
                        <div class="flex items-center gap-3 border-b border-white/5 pb-3.5 mb-4">
                            <div class="w-9 h-9 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-400 text-base">
                                <i class="fas fa-home"></i>
                            </div>
                            <div>
                                <h3 class="text-sm font-black text-white uppercase tracking-wider">🛏️ Penzion Alpenblick</h3>
                                <span class="text-[9px] text-gray-400 font-bold block">Naše zázemí a ubytování</span>
                            </div>
                        </div>
                        <ul class="space-y-2.5 text-xs text-gray-300 leading-relaxed font-medium">
                            <li>📍 <strong class="text-white">Lokalita:</strong> 10 minut pěšky od hotelu. Hezké, jednoduché, uklizené.</li>
                            <li>🗝️ <strong class="text-white">Pokoj:</strong> Zamykatelný. Umyvadlo s pitnou vodou, lednička poblíž. Na 99 % budeme na pokoji sami dva. Povlečení, ručníky, župany s přezůvkami nám dají (i tak se vlastní hodí). Skříň s ramínky.</li>
                            <li>🚿 <strong class="text-white">Sociální zařízení:</strong> Sprchy a toalety na chodbě vedle pokoje. Wolfgang dbá na top čistotu!</li>
                            <li>🛋️ <strong class="text-white">Vybavení:</strong> Společenská místnost s TV, menší grilovací terasa a bezplatná funkční Wi-Fi. Pračka a sušička.</li>
                            <li>🍳 <strong class="text-white">KUCHYŇ:</strong> 🚫 **Chybí plotýnka i mikrovlnka!** Valča doporučuje vzít na pokoj naši varnou konvici, paninovač, krabičky a startovací nádobí na dělání jídla.</li>
                        </ul>
                    </div>
                    <div class="mt-4 pt-3.5 border-t border-white/5">
                        <div class="bg-amber-500/15 border border-amber-500/25 p-3 rounded-2xl text-[10px] text-amber-300 font-bold leading-normal flex items-start gap-2">
                            <i class="fas fa-broom mt-0.5 text-xs flex-shrink-0 animate-pulse"></i>
                            <div>
                                <strong>⚠️ MOZARTOVA REVIZE:</strong> Wolfgang (Mozart) absolutně nenávidí bordel na pokoji. **Každé 2 týdny** osobně chodí na pokoj kontrolovat pořádek, přitom se mění povlečení. Udržujte pokoj v naprosté čistotě!
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Card 5: Food -->
                <div class="glass-card bg-white/[0.02] border border-white/5 rounded-3xl p-5 hover:border-white/10 transition-all flex flex-col justify-between group relative overflow-hidden">
                    <div class="absolute -right-8 -top-8 w-20 h-20 bg-yellow-500/5 rounded-full blur-2xl pointer-events-none"></div>
                    <div>
                        <div class="flex items-center gap-3 border-b border-white/5 pb-3.5 mb-4">
                            <div class="w-9 h-9 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-400 text-base">
                                <i class="fas fa-utensils"></i>
                            </div>
                            <div>
                                <h3 class="text-sm font-black text-white uppercase tracking-wider">🍽️ Naše stravování</h3>
                                <span class="text-[9px] text-gray-400 font-bold block">Jídlo 3x denně po celou dobu</span>
                            </div>
                        </div>
                        <ul class="space-y-2.5 text-xs text-gray-300 leading-relaxed font-medium">
                            <li>💼 <strong class="text-white">Podmínky smlouvy:</strong> Formálně na jídlo (věcné plnění) právní nárok nemáme. Reálně z mailů a od Valči víme, že máme jídlo v hotelu kompletně zajištěné **3x denně, 7 dní v týdnu** – i během volných dnů!</li>
                            <li>🥐 <strong class="text-white">Snídaně (od 7:00):</strong> Houska, sýr, máslo, müsli. Vyplatí se chodit **kolem 9:00**, kdy doplňují čerstvější výběr pečiva.</li>
                            <li>🥩 <strong class="text-white">Oběd (11:30 – 12:30):</strong> Klasická teplá strava, dělají se super jídla jako řízky nebo smažené ryby.</li>
                            <li>🌭 <strong class="text-white">Večeře (od 17:30 nebo 19:00):</strong> Párky, lehčí večeře atd. Vyplatí se chodit hned na začátek.</li>
                            <li>⚠️ <strong class="text-white">Pravidla:</strong> Brali by hodně špatně, kdybychom si obědy skládali do vlastních krabiček na pokoje. Rohlík do ruky se toleruje, ale oficiálně se jídlo neodnáší. Na výlety si zajistíme vlastní.</li>
                        </ul>
                    </div>
                </div>

                <!-- Card 6: Benefits & Activities -->
                <div class="glass-card bg-white/[0.02] border border-white/5 rounded-3xl p-5 hover:border-white/10 transition-all flex flex-col justify-between group relative overflow-hidden">
                    <div class="absolute -right-8 -top-8 w-20 h-20 bg-purple-500/5 rounded-full blur-2xl pointer-events-none"></div>
                    <div>
                        <div class="flex items-center gap-3 border-b border-white/5 pb-3.5 mb-4">
                            <div class="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 text-base">
                                <i class="fas fa-bicycle"></i>
                            </div>
                            <div>
                                <h3 class="text-sm font-black text-white uppercase tracking-wider">🚴 Volný čas a benefity</h3>
                                <span class="text-[9px] text-gray-400 font-bold block">Wellness, fitness a okolí</span>
                            </div>
                        </div>
                        <ul class="space-y-2.5 text-xs text-gray-300 leading-relaxed font-medium">
                            <li>⭐ <strong class="text-white">Host status:</strong> Jak nám skončí směna a převlékneme se do civilu, jsme bráni jako normální hosté!</li>
                            <li>🧘 <strong class="text-white">Aktivity zdarma:</strong> Můžeme zdarma využívat hotelové bazény, sauny (otevřené od 12:00), volejbalové hřiště a fitko (záloha 20 EUR na čip). Můžeme se přidat i na jógu a programy pro hosty (rozpis visí u obchůdku).</li>
                            <li>🚲 <strong class="text-white">Půjčování kol:</strong> Zaměstnanecká kola jsou zdarma na recepci. Zájem o ně je veliký, takže recepci **odchyťte hned první den**, ať nám je nevyfouknou. Helmy nikdo neřeší.</li>
                            <li>🛒 <strong class="text-white">Okolí & Bezpečnost:</strong> Billa hned u kempu (super na zmrzlinu). Bruck je v dochozí vzdálenosti pěšky. Lokalita je mega bezpečná – nic se nekrade, z terasy se věci neztrácí. Roaming funguje klasicky jako v ČR.</li>
                        </ul>
                    </div>
                </div>

                <!-- Card 7: Journey & Transport -->
                <div class="glass-card bg-white/[0.02] border border-white/5 rounded-3xl p-5 hover:border-white/10 transition-all flex flex-col justify-between group relative overflow-hidden">
                    <div class="absolute -right-8 -top-8 w-20 h-20 bg-teal-500/5 rounded-full blur-2xl pointer-events-none"></div>
                    <div>
                        <div class="flex items-center gap-3 border-b border-white/5 pb-3.5 mb-4">
                            <div class="w-9 h-9 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-400 text-base">
                                <i class="fas fa-train"></i>
                            </div>
                            <div>
                                <h3 class="text-sm font-black text-white uppercase tracking-wider">🚆 Cesta a nástup</h3>
                                <span class="text-[9px] text-gray-400 font-bold block">Spoj, vyzvednutí a první dny</span>
                            </div>
                        </div>
                        <ul class="space-y-2.5 text-xs text-gray-300 leading-relaxed font-medium">
                            <li>🚉 <strong class="text-white">Odjezd:</strong> Neděle 31. května 2026. Staré Město u Uh. Hradiště odjezd **8:37** ➔ Bruck příjezd **16:22**.</li>
                            <li>🚗 <strong class="text-white">Vyzvednutí:</strong> Jakmile budeme v Brucku na nádraží, jen jim zavoláme a oni pro nás během pár minut přijedou autem.</li>
                            <li>🧳 <strong class="text-white">První dny:</strong> V neděli proběhne ubytování a aklimatizace. V pondělí ráno si ukážeme, co se bude přesně dělat, a všechno nám vysvětlí.</li>
                            <li>🎫 <strong class="text-white">Cestování v okolí:</strong> Jízdenky na výlety stojí cca 3 EUR za 5 minut cesty – na místě koukneme po měsíčních slevách.</li>
                        </ul>
                    </div>
                </div>

                <!-- Card 8: Weather -->
                <div class="glass-card bg-white/[0.02] border border-white/5 rounded-3xl p-5 hover:border-white/10 transition-all flex flex-col justify-between group relative overflow-hidden">
                    <div class="absolute -right-8 -top-8 w-20 h-20 bg-sky-500/5 rounded-full blur-2xl pointer-events-none"></div>
                    <div>
                        <div class="flex items-center gap-3 border-b border-white/5 pb-3.5 mb-4">
                            <div class="w-9 h-9 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400 text-base">
                                <i class="fas fa-cloud-sun-rain"></i>
                            </div>
                            <div>
                                <h3 class="text-sm font-black text-white uppercase tracking-wider">🌞 Počasí v Alpách</h3>
                                <span class="text-[9px] text-gray-400 font-bold block">Rychle se měnící podnebí</span>
                            </div>
                        </div>
                        <p class="text-xs text-gray-300 leading-relaxed font-medium">
                            Jsme na mapě blíž k rovníku, takže bývá o něco tepleji než v ČR. Nicméně jsme v Alpách – počasí se může změnit extrémně rychle. Stalo se, že třikrát za den pršelo a hned nato začalo šíleně pařit slunko. Teploty mohou po dešti spadnout i k 10 °C.
                        </p>
                        <div class="mt-4 bg-sky-500/15 border border-sky-500/25 p-3 rounded-2xl text-[10px] text-sky-300 font-bold flex items-center gap-2">
                            <i class="fas fa-umbrella text-base animate-pulse"></i>
                            <span><strong>Nepromokavá bunda je absolutní nutností</strong> v batohu na každý výlet!</span>
                        </div>
                    </div>
                </div>

                <!-- NEW Card 9: Emergency Contacts -->
                <div class="glass-card bg-white/[0.02] border border-red-500/10 rounded-3xl p-5 hover:border-red-500/20 transition-all flex flex-col justify-between group relative overflow-hidden">
                    <div class="absolute -right-8 -top-8 w-20 h-20 bg-red-500/5 rounded-full blur-2xl pointer-events-none"></div>
                    <div>
                        <div class="flex items-center gap-3 border-b border-white/5 pb-3.5 mb-4">
                            <div class="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400 text-base">
                                <i class="fas fa-ambulance animate-pulse"></i>
                            </div>
                            <div>
                                <h3 class="text-sm font-black text-white uppercase tracking-wider">🚨 Nouzové Kontakty v Rakousku</h3>
                                <span class="text-[9px] text-red-400 font-black block">Zdravotní a záchranná pomoc</span>
                            </div>
                        </div>
                        
                        <div class="space-y-3 text-xs text-gray-300 font-medium">
                            <div class="flex justify-between items-center py-1 border-b border-white/5">
                                <span class="font-bold text-white">🇪🇺 Evropské tísňové číslo:</span>
                                <span class="font-black text-red-400 text-sm">112</span>
                            </div>
                            <div class="flex justify-between items-center py-1 border-b border-white/5">
                                <span class="font-bold text-white">🚑 Záchranka (Rettung):</span>
                                <span class="font-black text-red-400 text-sm">144</span>
                            </div>
                            <div class="flex justify-between items-center py-1 border-b border-white/5">
                                <span class="font-bold text-white">🚓 Policie (Polizei):</span>
                                <span class="font-black text-white text-sm">133</span>
                            </div>
                            <div class="flex justify-between items-center py-1 border-b border-white/5 bg-red-500/5 p-2 rounded-xl border border-red-500/10">
                                <span class="font-black text-red-300">🏔️ Horská služba (Bergrettung):</span>
                                <span class="font-black text-red-400 text-sm">140</span>
                            </div>
                            <div class="flex justify-between items-center py-1">
                                <span class="font-bold text-white">ℹ️ Lékařská infolinka:</span>
                                <span class="font-bold text-gray-300">1450</span>
                            </div>
                            
                            <div class="mt-4 pt-3.5 border-t border-white/5 space-y-2">
                                <div>
                                    <span class="text-[8px] font-black uppercase tracking-widest text-white/30 block">Nejbližší nemocnice (Zell am See)</span>
                                    <span class="text-xs font-bold text-white/80">🏥 Tauernklinikum Zell am See</span>
                                    <span class="text-[10px] text-gray-400 block mt-0.5"><i class="fas fa-phone mr-1"></i> +43 6542 777 (cca 10 min cesty)</span>
                                </div>
                                <div class="pt-1.5">
                                    <span class="text-[8px] font-black uppercase tracking-widest text-white/30 block">Lékárna v Brucku</span>
                                    <span class="text-xs font-bold text-white/80">💊 Glockner-Apotheke Bruck</span>
                                    <span class="text-[10px] text-gray-400 block mt-0.5"><i class="fas fa-phone mr-1"></i> +43 6545 20180</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- NEW Card 10: Travel & Webcams -->
                <div class="glass-card bg-white/[0.02] border border-white/5 rounded-3xl p-5 hover:border-white/10 transition-all flex flex-col justify-between group relative overflow-hidden">
                    <div class="absolute -right-8 -top-8 w-20 h-20 bg-sky-500/5 rounded-full blur-2xl pointer-events-none"></div>
                    <div>
                        <div class="flex items-center gap-3 border-b border-white/5 pb-3.5 mb-4">
                            <div class="w-9 h-9 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400 text-base">
                                <i class="fas fa-globe-europe"></i>
                            </div>
                            <div>
                                <h3 class="text-sm font-black text-white uppercase tracking-wider">🌐 Cestovní tipy & Odkazy</h3>
                                <span class="text-[9px] text-gray-400 font-bold block">Lokální doprava a živé kamery</span>
                            </div>
                        </div>
                        
                        <div class="space-y-3.5 mt-2">
                            <div>
                                <h4 class="text-xs font-black text-white uppercase tracking-wider mb-1.5"><i class="fas fa-camera text-sky-400 mr-1.5"></i> Živé horské webkamery</h4>
                                <div class="grid grid-cols-2 gap-2">
                                    <a href="https://www.foto-webcam.eu/webcam/grossglockner/" target="_blank"
                                       class="px-3 py-2 bg-black/30 border border-white/5 hover:border-sky-500/30 text-[10px] font-bold text-gray-300 hover:text-white rounded-xl text-center transition-all flex flex-col justify-center items-center gap-0.5">
                                        <span>Grossglockner 🏔️</span>
                                        <span class="text-[8px] text-sky-400 font-black">Zobrazit webkameru</span>
                                    </a>
                                    <a href="https://www.schmitten.at/de/Unterkunft-Service/Webcams" target="_blank"
                                       class="px-3 py-2 bg-black/30 border border-white/5 hover:border-sky-500/30 text-[10px] font-bold text-gray-300 hover:text-white rounded-xl text-center transition-all flex flex-col justify-center items-center gap-0.5">
                                        <span>Schmittenhöhe 🚠</span>
                                        <span class="text-[8px] text-sky-400 font-black">Zobrazit kamery</span>
                                    </a>
                                </div>
                            </div>
                            
                            <div class="border-t border-white/5 pt-3.5">
                                <h4 class="text-xs font-black text-white uppercase tracking-wider mb-1.5"><i class="fas fa-bus text-teal-400 mr-1.5"></i> Jízdní řády a doprava</h4>
                                <div class="space-y-2">
                                    <a href="https://salzburg-verkehr.at/" target="_blank"
                                       class="w-full py-2.5 bg-black/20 hover:bg-black/30 border border-white/5 hover:border-teal-500/30 text-[10px] font-bold text-gray-300 hover:text-white rounded-xl transition duration-200 flex items-center justify-center gap-2">
                                        <i class="fas fa-route text-teal-400"></i> Salzburg Verkehr (Místní Busy)
                                    </a>
                                    <a href="https://www.oebb.at/" target="_blank"
                                       class="w-full py-2.5 bg-black/20 hover:bg-black/30 border border-white/5 hover:border-red-500/30 text-[10px] font-bold text-gray-300 hover:text-white rounded-xl transition duration-200 flex items-center justify-center gap-2">
                                        <i class="fas fa-train text-red-500"></i> ÖBB Planner (Rakouské Dráhy)
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    `;
}

// ----------------------------------------------------
// TAB 2: PACKING CHECKLIST
// ----------------------------------------------------
