# DevOps, Infrastruktura a Údržba

Tento dokument popisuje technické pozadí aplikace, proces nasazení a mechanismy zajišťující stabilitu a offline fungování.

## 1. Frontend & PWA (Progressive Web App)
Aplikace je postavena na moderním webovém stacku (Vite + JavaScript ES Modules) a splňuje standardy PWA.

### Service Worker (`public/sw.js`)
Service Worker zajišťuje, že aplikace je dostupná i při kolísavém připojení a zrychluje načítání statických prostředků.
- **Caching strategie**:
    - **Network-Only**: Pro `index.html` a hašované assety z buildu. Tím je zajištěno, že uživatel po aktualizaci nikdy neuvidí starou verzi aplikace.
    - **Cache-First**: Pro statické obrázky (např. profilovky, ikony appky) a fonty.
    - **Network-First**: Pro ostatní požadavky jako fallback.
- **Aktualizace**: Každý build zvyšuje verzi `CACHE_NAME`, což vynutí promazání staré mezipaměti u klienta.

### Manifest (`public/manifest.json`)
Definuje identitu aplikace v mobilním zařízení:
- Režim `standalone` (aplikace se otevírá bez adresního řádku prohlížeče).
- Podpora maskovatelných ikon pro různé platformy (Android, iOS).
- Fixní orientace na výšku (portrait).

---

## 2. Backend & Databáze (Supabase)
Kiscord využívá Supabase jako "Backend-as-a-Service".

### Architektura:
- **PostgreSQL**: Relační databáze se schématem optimalizovaným pro rychlé dotazy i komplexní JSONB data (např. bucket list v rámci health_data).
- **RLS (Row Level Security)**: Zajišťuje bezpečnost dat. Pravidla jsou nastavena tak, aby partneři mohli vzájemně číst a upravovat společná data, ale citlivé informace (např. vnitřní metadata) zůstaly chráněny.
- **RPC (Remote Procedure Calls)**: Serverové funkce napsané v PL/pgSQL pro náročné výpočty (agregace XP, statistiky pro questy, synchronizace spánku). To snižuje objem přenášených dat do mobilu.
- **Realtime**: Využívá PostgreSQL replikaci pro okamžité promítnutí změn do UI bez nutnosti obnovovat stránku.

---

## 3. Offline Režim a Synchronizace
Jedním z klíčových požadavků je, aby aplikace "nezamrzla" bez internetu.

### Lokální mezipaměť (`js/core/state.js`):
Celý stav aplikace je zrcadlen v `localStorage`. Při startu se aplikace nejdříve načte z cache, a až následně synchronizuje nová data ze Supabase.

### Sync Queue (`js/core/offline.js`):
Pokud uživatel provede změnu (např. zapíše sklenici vody) a je offline:
1. Operace se nezhroutí, ale zapíše se do `kiscord_sync_queue` v `localStorage`.
2. Aplikace zobrazí varování "Offline režim".
3. Jakmile se obnoví spojení (událost `online`), systém frontu projde a postupně všechny změny odešle do databáze.
4. Po úspěšné synchronizaci se UI automaticky aktualizuje.

---

## 4. Deployment
- **Hosting**: Vercel.
- **CI/CD**: Automatické nasazení při každém pushi do hlavní větve na GitHubu.
- **Asset Hashing**: Vite generuje unikátní názvy souborů pro každý build, což v kombinaci s nastavením Service Workeru zaručuje bezproblémové updaty.
