# Skupina A: Core Features

Tato skupina modulů tvoří jádro každodenního používání aplikace. Zaměřuje se na osobní pohodu, sledování zdraví a společné plánování času.

## 1. Dashboard (Můj Den)
**Soubor**: `js/modules/dashboard.js` (a submoduly v `js/modules/dashboard/*`)

Dashboard slouží jako hlavní rozcestník a vizuální přehled aktuálního dne.

### Klíčové funkce:
- **Sunflower Sync**: Dvě animované slunečnice (SVG), které v reálném čase mění svůj vzhled podle nálady a stavu spánku obou uživatelů.
- **Fact of the Day**: Náhodný zajímavý fakt z encyklopedie, vybraný pro daný den.
- **Quick Planning**: Rychlý panel pro potvrzení nebo odmítnutí pozvánek na rande od partnera.
- **Daily Question Card**: Kompaktní verze denní otázky s možností přímé odpovědi.

### Real-time interakce:
- **Sunlight Pulse**: Tlačítko pro odeslání „slunečního paprsku“, který na partnerově zařízení spustí konfety a zvukové upozornění.

---

## 2. Zdraví (Health)
**Soubor**: `js/modules/health.js`, UI komponenty v `js/modules/dashboard/health_ui.js`

Modul spravující veškerou logiku spojenou s biometrickými a zdravotními daty (tabulka `health_data`).

### Sledované metriky:
- **Nálada (Mood)**: Slider 1–10 s emoji indikací a vizuálním glow efektem.
- **Voda (Water)**: Systém 8 kapek s toggle logikou. Po splnění cíle se spustí konfety a odemkne achievement.
- **Spánek (Sleep)**: 
    - **Session Tracking**: Systém „Jít spát / Vstát“. 
    - **Progressive Timer**: Pokud uživatel „spí“, Dashboard zobrazuje tikající časomíru a dynamický progress bar.
    - **Validace**: Systém předchází chybám (jako je Jan 1, 1970 bug) kontrolou délky trvání session.
- **Pohyb & Suplementy**: Čipy pro rychlé označení aktivit (Gym, Chůze...) a užívaných doplňků stravy (Železo, Zinek...).

### Kódová ukázka (Sleep Logic):
```javascript
export function startSleep() {
    state.currentSleepSession = {
        isSleeping: true,
        startTime: new Date().toISOString()
    };
    localStorage.setItem('klarka_sleep_session', JSON.stringify(state.currentSleepSession));
    broadcastSleepStatus(true);
    startSleepTimer();
}
```

---

## 3. Kalendář (Calendar)
**Soubor**: `js/modules/calendar.js` (a submoduly v `js/modules/calendar/*`)

Měsíční grid pro plánování a přehled historie.

### Funkce:
- **Heatmapa nálad**: Buňky kalendáře jsou podbarveny podle průměrné nálady daného dne.
- **Filtrování**: Možnost přepínat zobrazení mezi Zdravím, Filmy, Rande nebo Školou.
- **Day Detail Modal**: Po kliknutí na den se otevře detailní okno (`modals.js`), které umožňuje:
    - Editovat zpětně zdraví.
    - Přidávat školní události.
    - Spravovat checklisty pro plánovaná rande.

### Integrace:
- Kalendář automaticky stahuje data z modulů **Timeline** (ikony fotek) a **Library** (ikony zhlédnutých filmů), aby vytvořil kompletní vizuální deník.
