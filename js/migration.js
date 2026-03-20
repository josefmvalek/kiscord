import { state } from './core/state.js';
import { supabase } from './core/supabase.js';

export async function migrateLocalDataToSupabase() {
    console.log("🚀 Starting data migration from localStorage to Supabase...");
    let totalMigrated = 0;

    // 1. Health Data
    const rawHealth = localStorage.getItem('klarka_health');
    if (rawHealth) {
        try {
            const healthData = JSON.parse(rawHealth);
            const healthInserts = [];
            for (const [date_key, data] of Object.entries(healthData)) {
                healthInserts.push({
                    date_key: date_key,
                    water: data.water || 0,
                    sleep: data.sleep || 0,
                    mood: data.mood || 50,
                    movement: data.movement || []
                });
            }
            if (healthInserts.length > 0) {
                const { error } = await supabase.from('health_data').upsert(healthInserts);
                if (error) throw error;
                console.log(`✅ Migrated \${healthInserts.length} health records.`);
                totalMigrated += healthInserts.length;
            }
        } catch (e) {
            console.error("❌ Error migrating health data:", e);
        }
    }

    // 2. Planned Dates
    const rawPlans = localStorage.getItem('klarka_planned_dates');
    if (rawPlans) {
        try {
            const plannedDates = JSON.parse(rawPlans);
            const planInserts = [];
            for (const [date_key, data] of Object.entries(plannedDates)) {
                planInserts.push({
                    date_key: date_key,
                    id: data.id || `migrated-\${Date.now()}-\${Math.random()}`,
                    name: data.name || 'Neznámý plán',
                    cat: data.cat || 'date',
                    time: data.time || null,
                    note: data.note || null
                });
            }
            if (planInserts.length > 0) {
                const { error } = await supabase.from('planned_dates').upsert(planInserts);
                if (error) throw error;
                console.log(`✅ Migrated \${planInserts.length} planned dates.`);
                totalMigrated += planInserts.length;
            }
        } catch (e) {
            console.error("❌ Error migrating planned dates:", e);
        }
    }

    // 3. School Events
    const rawSchool = localStorage.getItem('klarka_school');
    if (rawSchool) {
        try {
            const schoolEvents = JSON.parse(rawSchool);
            const schoolInserts = [];
             for (const [date_key, data] of Object.entries(schoolEvents)) {
                schoolInserts.push({
                    date_key: date_key,
                    title: data.title || 'Škola',
                    type: data.type || 'exam'
                });
            }
            if (schoolInserts.length > 0) {
                const { error } = await supabase.from('school_events').upsert(schoolInserts);
                if (error) throw error;
                console.log(`✅ Migrated \${schoolInserts.length} school events.`);
                totalMigrated += schoolInserts.length;
            }
        } catch (e) {
            console.error("❌ Error migrating school events:", e);
        }
    }

    // 4. Tetris Score
    const rawTetris = localStorage.getItem('klarka_tetris_score');
    if (rawTetris) {
        try {
            const tetris = JSON.parse(rawTetris);
            const score = state.currentUser.name === 'Jožka' ? tetris.jose : tetris.klarka;
            if (score > 0) {
                await supabase.from('tetris_scores').upsert({
                    user_id: state.currentUser.id,
                    score: score
                });
                console.log("✅ Migrated Tetris score.");
                totalMigrated++;
            }
        } catch (e) {
            console.error("❌ Error migrating Tetris score:", e);
        }
    }

    // 5. Library Watchlist
    const rawWatchlist = localStorage.getItem('klarka_watchlist');
    if (rawWatchlist) {
        try {
            const watchlist = JSON.parse(rawWatchlist);
            const watchInserts = watchlist.map(item => ({
                media_id: (typeof item === 'object' ? item.id : item).toString(),
                type: (typeof item === 'object' ? item.type : 'movie'),
                added_by: state.currentUser.id
            }));
            if (watchInserts.length > 0) {
                await supabase.from('library_watchlist').upsert(watchInserts, { onConflict: 'media_id' });
                console.log(`✅ Migrated ${watchInserts.length} watchlist items.`);
                totalMigrated += watchInserts.length;
            }
        } catch (e) {
            console.error("❌ Error migrating watchlist:", e);
        }
    }

    // 6. Library Ratings
    const rawRatings = localStorage.getItem('klarka_ratings');
    const rawHistory = localStorage.getItem('klarka_watch_history');
    if (rawRatings || rawHistory) {
        try {
            const ratings = rawRatings ? JSON.parse(rawRatings) : {};
            const history = rawHistory ? JSON.parse(rawHistory) : {};
            const ratingInserts = [];
            
            // Merge labels/status into ratings table
            const allIds = new Set([...Object.keys(ratings), ...Object.keys(history)]);
            for (const id of allIds) {
                ratingInserts.push({
                    media_id: id.toString(),
                    rating: ratings[id] || 0,
                    status: typeof history[id] === 'object' ? history[id].status : (history[id] || null)
                });
            }

            if (ratingInserts.length > 0) {
                await supabase.from('library_ratings').upsert(ratingInserts);
                console.log(`✅ Migrated ${ratingInserts.length} ratings.`);
                totalMigrated += ratingInserts.length;
            }
        } catch (e) {
            console.error("❌ Error migrating ratings:", e);
        }
    }

    // 7. Topic Progress
    const rawTopicProg = localStorage.getItem('klarka_topic_progress');
    const rawTopicBook = localStorage.getItem('klarka_topic_bookmarks');
    if (rawTopicProg || rawTopicBook) {
        try {
            const progress = rawTopicProg ? JSON.parse(rawTopicProg) : {};
            const bookmarks = rawTopicBook ? JSON.parse(rawTopicBook) : {};
            const topicInserts = [];
            
            const allTopics = new Set([...Object.keys(progress), ...Object.keys(bookmarks)]);
            for (const tid of allTopics) {
                topicInserts.push({
                    topic_id: tid,
                    user_id: state.currentUser.id,
                    bookmarks: bookmarks[tid] || [],
                    // In old progress we stored array of indices. Sum or last one?
                    // Let's just store bookmarks for now or last index.
                    current_index: Array.isArray(progress[tid]) ? (progress[tid][progress[tid].length - 1] || 0) : 0
                });
            }

            if (topicInserts.length > 0) {
                await supabase.from('topic_progress').upsert(topicInserts);
                console.log(`✅ Migrated ${topicInserts.length} topic records.`);
                totalMigrated += topicInserts.length;
            }
        } catch (e) {
            console.error("❌ Error migrating topic progress:", e);
        }
    }

    // 8. Date Ratings (Map)
    const rawDateRatings = localStorage.getItem('klarka_date_ratings');
    if (rawDateRatings) {
        try {
            const dateRatings = JSON.parse(rawDateRatings);
            const drInserts = Object.entries(dateRatings).map(([id, rating]) => ({
                location_id: parseInt(id),
                rating: rating,
                user_id: state.currentUser.id
            }));
            if (drInserts.length > 0) {
                await supabase.from('date_ratings').upsert(drInserts);
                console.log(`✅ Migrated ${drInserts.length} date ratings.`);
                totalMigrated += drInserts.length;
            }
        } catch (e) {
            console.error("❌ Error migrating date ratings:", e);
        }
    }

    localStorage.setItem('klarka_migration_done', 'true');
    
    if (totalMigrated > 0) {
        console.log(`🎉 User data migration complete! Total records moved: ${totalMigrated}.`);
    } else {
        console.log("ℹ️ No local user data found.");
    }
    
    return totalMigrated;
}

export async function migrateStaticContentToSupabase() {
    console.log("🚀 Starting STATIC CONTENT seeding from data.js to Supabase...");
    
    try {
        // Helper function to seed a specific table if it's empty
        const seedTable = async (tableId, sourceData, insertFn) => {
            if (!sourceData) return;
            const { count, error } = await supabase.from(tableId).select('*', { count: 'exact', head: true });
            
            if (error) {
                console.warn(`⚠️ Could not check table ${tableId}:`, error);
                return;
            }
            if (count > 0) {
                console.log(`ℹ️ Table ${tableId} already has data, skipping seeding.`);
                return;
            }
            console.log(`🌱 Seeding table ${tableId}...`);
            await insertFn();
        };

        // 1. Facts
        await seedTable('app_facts', typeof factsLibrary !== 'undefined' ? factsLibrary : null, async () => {
            const factsBatch = [];
            for (const [cat, items] of Object.entries(factsLibrary)) {
                items.forEach(item => {
                    factsBatch.push({ category: cat, icon: item.icon, text: item.text });
                });
            }
            if (factsBatch.length > 0) {
                const { error } = await supabase.from('app_facts').insert(factsBatch);
                if (error) console.error("❌ Facts insert error:", error);
                else console.log(`✅ Seeded ${factsBatch.length} facts.`);
            }
        });

        // 2. Library
        await seedTable('library_content', typeof library !== 'undefined' ? library : null, async () => {
            const libraryBatch = [];
            for (const [type, items] of Object.entries(library)) {
                let mappedType = 'movie';
                if (type === 'series') mappedType = 'series';
                if (type === 'games') mappedType = 'game';

                items.forEach(item => {
                    libraryBatch.push({
                        type: mappedType,
                        title: item.title,
                        icon: item.icon,
                        category: item.cat,
                        magnet: item.magnet,
                        gdrive: item.gdrive
                    });
                });
            }
            if (libraryBatch.length > 0) {
                const { error } = await supabase.from('library_content').insert(libraryBatch);
                if (error) console.error("❌ Library insert error:", error);
                else console.log(`✅ Seeded ${libraryBatch.length} library items.`);
            }
        });

        // 3. Date Locations
        await seedTable('date_locations', typeof dateLocations !== 'undefined' ? dateLocations : null, async () => {
            const locBatch = dateLocations.map(loc => ({
                id: loc.id,
                name: loc.name,
                category: loc.cat,
                lat: loc.lat,
                lng: loc.lng,
                description: loc.desc
            }));
            if (locBatch.length > 0) {
                const { error } = await supabase.from('date_locations').insert(locBatch);
                if (error) console.error("❌ Locations insert error:", error);
                else console.log(`✅ Seeded ${locBatch.length} locations.`);
            }
        });

        // 4. Conversation Topics
        await seedTable('conversation_topics', typeof conversationTopics !== 'undefined' ? conversationTopics : null, async () => {
            const topicBatch = conversationTopics.map(t => ({
                id: t.id,
                title: t.title,
                icon: t.icon,
                color: t.color,
                description: t.desc,
                questions: t.questions
            }));
            if (topicBatch.length > 0) {
                const { error } = await supabase.from('conversation_topics').insert(topicBatch);
                if (error) console.error("❌ Topics insert error:", error);
                else console.log(`✅ Seeded ${topicBatch.length} topics.`);
            }
        });

        // 5. Timeline Events
        await seedTable('timeline_events', typeof timelineEvents !== 'undefined' ? timelineEvents : null, async () => {
            const timelineBatch = timelineEvents.map(ev => ({
                title: ev.title,
                event_date: ev.date || null,
                icon: ev.icon,
                color: ev.color,
                description: ev.desc || "",
                images: ev.images || [],
                location_id: ev.locationId || null
            }));
            if (timelineBatch.length > 0) {
                const { error } = await supabase.from('timeline_events').insert(timelineBatch);
                if (error) console.error("❌ Timeline insert error:", error);
                else console.log(`✅ Seeded ${timelineBatch.length} timeline events.`);
            }
        });

        console.log("🎉 Static content seeding finished.");
    } catch (e) {
        console.error("❌ Fatal error during static seeding:", e);
    }
}

/**
 * Fixes the timeline duplication by identifying "Default" records
 * and removing them if a "User-Modified" version exists.
 */
export async function cleanupTimelineDuplicates() {
    console.log("🧹 Starting timeline deduplication...");
    try {
        const { data: events, error } = await supabase.from('timeline_events').select('*');
        if (error) throw error;

        // Group by title to find potential duplicates
        const groups = {};
        events.forEach(ev => {
            const key = ev.title;
            if (!groups[key]) groups[key] = [];
            groups[key].push(ev);
        });

        const toDeleteIDs = [];
        const defaultEvents = typeof timelineEvents !== 'undefined' ? timelineEvents : [];

        for (const [title, evs] of Object.entries(groups)) {
            if (evs.length > 1) {
                // We have duplicates.
                // 1. Identify the "Default" version from data.js
                const defaultVer = defaultEvents.find(d => d.title === title);
                
                if (defaultVer) {
                    // Look for the record that matches the default description exactly
                    const originalRecord = evs.find(e => e.description === (defaultVer.desc || ""));
                    // A modified record is any that DOESN'T match default description, OR has images, OR has highlights
                    const modifiedRecord = evs.find(e => 
                        e.description !== (defaultVer.desc || "") || 
                        (e.images && e.images.length > (defaultVer.images?.length || 0)) || 
                        e.user_highlights
                    );

                    if (originalRecord && modifiedRecord) {
                        console.log(`🗑️ Found duplicate for "${title}". Keeping edited version, adding original to delete list.`);
                        toDeleteIDs.push(originalRecord.id);
                    } else if (evs.length > 1) {
                        // If they are identical duplicates, keep only the oldest one
                        evs.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
                        for (let i = 1; i < evs.length; i++) {
                            toDeleteIDs.push(evs[i].id);
                        }
                    }
                } else {
                    // Not a default event, but has duplicates? Keep the one with most content.
                    evs.sort((a, b) => {
                        const scoreA = (a.description?.length || 0) + (a.images?.length || 0) * 100 + (a.user_highlights ? 50 : 0);
                        const scoreB = (b.description?.length || 0) + (b.images?.length || 0) * 100 + (b.user_highlights ? 50 : 0);
                        return scoreB - scoreA;
                    });
                    for (let i = 1; i < evs.length; i++) {
                        toDeleteIDs.push(evs[i].id);
                    }
                }
            }
        }

        if (toDeleteIDs.length > 0) {
            console.log(`🚀 Deleting ${toDeleteIDs.length} redundant timeline records...`);
            const { error: delErr } = await supabase.from('timeline_events').delete().in('id', toDeleteIDs);
            if (delErr) throw delErr;
            console.log("✅ Deduplication complete!");
            return toDeleteIDs.length;
        }

        console.log("✅ No duplicates found.");
        return 0;
    } catch (err) {
        console.error("❌ Error during deduplication:", err);
        throw err;
    }
}
