import { triggerHaptic } from '../../core/utils.js';
import { showNotification, showConfirmDialog } from '../../core/theme.js';
import { signOut } from '../../core/auth.js';

export async function confirmClearCache() {
    if (await showConfirmDialog("Smazat uživatelská data a mezipaměť? Restartuje se celá aplikace.", "Ano, smazat", "Zrušit")) {
        triggerHaptic('heavy');
        localStorage.clear();
        window.location.reload();
    }
}

export async function handleSettingsSignOut() {
    if (await showConfirmDialog("Opravdu se chceš odhlásit?")) {
        signOut();
    }
}

export async function migrateManualMoviesToTMDB() {
    triggerHaptic('medium');
    
    const confirm = await showConfirmDialog(
        "Chceš spustit hromadnou synchronizaci ručních filmů s TMDB? " +
        "Vyhledáme všechny filmy a seriály v knihovně bez TMDB ID, stáhneme pro ně obaly a hodnocení a automaticky je roztřídíme. Odkazy na Disk a torrenty zůstanou zachovány!"
    );
    if (!confirm) return;

    showNotification("Spouštím migraci... 🚀", "info");

    try {
        const { supabase } = await import('../../core/supabase.js');
        
        const { data: items, error } = await supabase
            .from('library_content')
            .select('*')
            .is('tmdb_id', null)
            .neq('type', 'game');

        if (error) throw error;

        if (!items || items.length === 0) {
            showNotification("Žádné ruční filmy k migraci nebyly nalezeny! 🎉", "success");
            return;
        }

        showNotification(`Nalezeno ${items.length} ručních titulů k migraci. Začínám... ⏳`, "info");

        let migratedCount = 0;
        let failedCount = 0;

        const TMDB = await import('../../core/tmdb.js');

        function mapGenresToCategory(genresString) {
            if (!genresString) return "Ostatní";
            const categories = ["Akční", "Sci-Fi", "Komedie", "Animovaný", "Fantasy", "Drama", "Horor", "Romantický", "Dobrodružný", "Ostatní"];
            const genreList = genresString.split(',').map(g => g.trim().toLowerCase());

            for (const genre of genreList) {
                const direct = categories.find(c => c.toLowerCase() === genre);
                if (direct) return direct;

                if (genre.includes("sci-fi") || genre.includes("science fiction") || genre === "vědecko-fantastický" || genre === "sci-fi & fantasy") {
                    return "Sci-Fi";
                }
                if (genre === "akční a dobrodružný" || genre.includes("akční")) {
                    return "Akční";
                }
                if (genre === "krimi" || genre === "thriller" || genre === "mysteriózní" || genre.includes("krimi") || genre.includes("thriller")) {
                    return "Drama";
                }
                if (genre === "mýdlová opera") {
                    return "Romantický";
                }
            }
            for (const genre of genreList) {
                for (const cat of categories) {
                    if (genre.includes(cat.toLowerCase()) || cat.toLowerCase().includes(genre)) {
                        if (cat !== "Ostatní") return cat;
                    }
                }
            }
            return "Ostatní";
        }

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const searchType = item.type === 'series' ? 'series' : 'movies';

            showNotification(`Hledám (${i + 1}/${items.length}): ${item.title}... 🔍`, "info");

            const results = await TMDB.searchTMDB(item.title, searchType);
            if (results && results.length > 0) {
                const bestMatch = results[0];
                const details = await TMDB.getTMDBDetails(bestMatch.id, searchType);
                
                if (details) {
                    const mappedCat = mapGenresToCategory(details.genres);

                    const { error: updateError } = await supabase
                        .from('library_content')
                        .update({
                            tmdb_id: details.tmdb_id,
                            poster_path: details.poster_path,
                            rating: details.rating,
                            runtime: details.runtime,
                            genres: details.genres,
                            release_year: details.release_year,
                            category: mappedCat
                        })
                        .eq('id', item.id);

                    if (updateError) {
                        console.error(`Failed to update ${item.title}:`, updateError);
                        failedCount++;
                    } else {
                        migratedCount++;
                    }
                } else {
                    failedCount++;
                }
            } else {
                console.warn(`No TMDB match for: ${item.title}`);
                failedCount++;
            }

            await new Promise(r => setTimeout(r, 200));
        }

        const stateModule = await import('../../core/state.js');
        await stateModule.initializeState();

        const { triggerConfetti } = await import('../../core/utils.js');
        triggerConfetti();

        if (failedCount === 0) {
            showNotification(`Všech ${migratedCount} titulů úspěšně migrováno! 🎉🍿`, "success");
        } else {
            showNotification(`Migrace dokončena: ${migratedCount} úspěšně, ${failedCount} nenalezeno/chyba.`, "success");
        }

    } catch (err) {
        console.error("Migration Error:", err);
        showNotification("Chyba při migraci: " + err.message, "error");
    }
}
