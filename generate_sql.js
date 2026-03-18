const fs = require('fs');

const inputPath = 'kiscord-export-2026-03-18.json';
const outputPath = 'import_klarka.sql';
const email = 'vyslouzilova.klara07@gmail.com';

try {
  const fileContent = fs.readFileSync(inputPath, 'utf8');
  const json = JSON.parse(fileContent);
  const data = json.data;

  let sql = `-- Import script for Klárka (${email})\n`;
  sql += `-- Generated on ${new Date().toISOString()}\n\n`;

  sql += `DO $$\n`;
  sql += `DECLARE\n`;
  sql += `  klarka_id UUID;\n`;
  sql += `BEGIN\n\n`;

  sql += `  -- Find user ID\n`;
  sql += `  SELECT id INTO klarka_id FROM auth.users WHERE email = '${email}';\n\n`;
  
  sql += `  IF klarka_id IS NULL THEN\n`;
  sql += `    RAISE EXCEPTION 'User not found. Ensure the user has registered with email: ${email}';\n`;
  sql += `  END IF;\n\n`;

  // 1. Health Data
  if (data.klarka_health) {
    sql += `  -- Health Data\n`;
    for (const [date_key, entry] of Object.entries(data.klarka_health)) {
      const water = Number(entry.water) || 0;
      
      // Parse sleep
      let sleep = 0;
      if (typeof entry.sleep === 'number') {
        sleep = entry.sleep;
      } else if (typeof entry.sleep === 'string') {
        // Old text mapping from very early versions (if any exists in export)
        if (entry.sleep === 'good') sleep = 8;
        else if (entry.sleep === 'ok') sleep = 6;
        else if (entry.sleep === 'zombie') sleep = 4;
      }

      // Parse mood
      let moodStr = '50';
      if (typeof entry.mood === 'number') {
         // Mood 1-10 -> 10-100 logic (based on migration.js)
         // Wait, the export shows `mood: "sad"` or `mood: 10`.
         // Let's handle it gracefully.
         if (entry.mood <= 10) moodStr = (entry.mood * 10).toString();
         else moodStr = entry.mood.toString();
      } else if (typeof entry.mood === 'string') {
          if (entry.mood === 'happy') moodStr = '80';
          else if (entry.mood === 'ok') moodStr = '60';
          else if (entry.mood === 'sad') moodStr = '30';
          else if (entry.mood === 'tired') moodStr = '40';
          else if (entry.mood === 'angry') moodStr = '20';
      }

      let movesSql = `ARRAY[]::text[]`;
      if (entry.movement && Array.isArray(entry.movement) && entry.movement.length > 0) {
        const quotedMoves = entry.movement.map(m => `'${m.replace(/'/g, "''")}'`);
        movesSql = `ARRAY[${quotedMoves.join(', ')}]::text[]`;
      }

      sql += `  INSERT INTO public.health_data (date_key, user_id, water, sleep, mood, movement)\n`;
      sql += `  VALUES ('${date_key}', klarka_id, ${water}, ${sleep}, ${moodStr}, ${movesSql})\n`;
      sql += `  ON CONFLICT (date_key, user_id) DO UPDATE SET\n`;
      sql += `    water = EXCLUDED.water, sleep = EXCLUDED.sleep, mood = EXCLUDED.mood, movement = EXCLUDED.movement;\n\n`;
    }
  }

  // 2. Date Ratings
  if (data.klarka_date_ratings) {
    sql += `  -- Date Ratings\n`;
    for (const [locId, rating] of Object.entries(data.klarka_date_ratings)) {
      sql += `  INSERT INTO public.date_ratings (location_id, user_id, rating)\n`;
      sql += `  VALUES (${locId}, klarka_id, ${rating})\n`;
      sql += `  ON CONFLICT (location_id) DO UPDATE SET rating = EXCLUDED.rating, user_id = EXCLUDED.user_id;\n\n`;
    }
  }

  // 3. Topic Progress
  const progress = data.klarka_topic_progress || {};
  const bookmarks = data.klarka_topic_bookmarks || {};
  
  const allTopics = new Set([...Object.keys(progress), ...Object.keys(bookmarks)]);
  if (allTopics.size > 0) {
    sql += `  -- Topic Progress\n`;
    for (const tid of allTopics) {
      const bmarks = bookmarks[tid] || [];
      const currentIdx = Array.isArray(progress[tid]) ? (progress[tid][progress[tid].length - 1] || 0) : 0;
      let bookmarksSql = `ARRAY[]::text[]`;
      if (bmarks && Array.isArray(bmarks) && bmarks.length > 0) {
          const quotedBmarks = bmarks.map(b => `'${b}'`);
          bookmarksSql = `ARRAY[${quotedBmarks.join(', ')}]::text[]`;
      }

      sql += `  INSERT INTO public.topic_progress (topic_id, user_id, bookmarks, current_index)\n`;
      sql += `  VALUES ('${tid}', klarka_id, ${bookmarksSql}, ${currentIdx})\n`;
      sql += `  ON CONFLICT (topic_id, user_id) DO UPDATE SET bookmarks = EXCLUDED.bookmarks, current_index = EXCLUDED.current_index;\n\n`;
    }
  }

  // 4. Tetris Score
  if (data.klarka_tetris_score && data.klarka_tetris_score.klarka > 0) {
    sql += `  -- Tetris Score\n`;
    sql += `  INSERT INTO public.tetris_scores (user_id, score)\n`;
    sql += `  VALUES (klarka_id, ${data.klarka_tetris_score.klarka})\n`;
    sql += `  ON CONFLICT (user_id) DO UPDATE SET score = EXCLUDED.score;\n\n`;
  }

  sql += `END $$;\n`;

  fs.writeFileSync(outputPath, sql);
  console.log('SQL script generated successfully at: ' + outputPath);

} catch (err) {
  console.error('Error generating SQL:', err);
}
