-- =========================================================================
-- MIGRACE: Optimalizace výkonu databáze a nástěnky (Kiscord)
-- Datum: 22. 5. 2026
-- =========================================================================

-- 1. Indexy pro cizí klíče, často dotazované a řazené sloupce (odstranění sekvenčních skenů)
CREATE INDEX IF NOT EXISTS idx_timeline_events_date_loc 
    ON public.timeline_events(event_date DESC NULLS LAST, location_id);

CREATE INDEX IF NOT EXISTS idx_game_votes_quest_user 
    ON public.game_votes(question_id, user_id);

CREATE INDEX IF NOT EXISTS idx_draw_strokes_drawing 
    ON public.draw_strokes(drawing_id);

CREATE INDEX IF NOT EXISTS idx_library_watchlist_added_by 
    ON public.library_watchlist(added_by);

CREATE INDEX IF NOT EXISTS idx_quiz_answers_user 
    ON public.quiz_answers(user_id);

CREATE INDEX IF NOT EXISTS idx_couple_quiz_answers_quiz 
    ON public.couple_quiz_answers(quiz_id);

CREATE INDEX IF NOT EXISTS idx_love_letters_sender 
    ON public.love_letters(sender_id);

CREATE INDEX IF NOT EXISTS idx_tier_lists_creator 
    ON public.tier_lists(creator_id);


-- 2. Aktualizovaná funkce get_dashboard_data s přímým načítáním zdraví partnera
CREATE OR REPLACE FUNCTION public.get_dashboard_data(p_user_id UUID, p_date DATE)
RETURNS JSON AS $$
DECLARE
    v_health JSON;
    v_partner_health JSON;
    v_drawing JSON;
    v_tetris JSON;
    v_next_event JSON;
    v_result JSON;
BEGIN
    -- A. Získání zdravotních dat pro přihlášeného uživatele pro dnešek
    SELECT json_build_object(
        'water', water,
        'sleep', sleep,
        'mood', mood,
        'movement', movement,
        'bedtime', bedtime,
        'pills', pills,
        'supplements', supplements
    ) INTO v_health
    FROM health_data
    WHERE user_id = p_user_id AND date_key = to_char(p_date, 'YYYY-MM-DD')
    LIMIT 1;

    -- B. Získání zdravotních dat pro partnera (user_id != p_user_id) pro dnešek
    SELECT json_build_object(
        'water', water,
        'sleep', sleep,
        'mood', mood,
        'movement', movement,
        'bedtime', bedtime,
        'pills', pills,
        'supplements', supplements
    ) INTO v_partner_health
    FROM health_data
    WHERE user_id != p_user_id AND date_key = to_char(p_date, 'YYYY-MM-DD')
    LIMIT 1;

    -- C. Získání připnuté kresby
    SELECT json_build_object(
        'id', d.id,
        'title', d.title,
        'thumbnail', d.thumbnail,
        'created_at', d.created_at
    ) INTO v_drawing
    FROM drawings d
    JOIN pinned_drawings pd ON d.id = pd.drawing_id
    ORDER BY pd.updated_at DESC
    LIMIT 1;

    -- D. Získání skóre Tetrisu (vyloučení problémů se spojováním auth.users přes SECURITY DEFINER)
    SELECT json_build_object(
        'jose', COALESCE((SELECT score FROM tetris_scores WHERE user_id = p_user_id), 0),
        'klarka', COALESCE((SELECT score FROM tetris_scores WHERE user_id != p_user_id LIMIT 1), 0)
    ) INTO v_tetris;

    -- E. Získání nejbližší budoucí plánované události (rande)
    SELECT json_build_object(
        'name', name,
        'cat', cat,
        'time', time,
        'note', note,
        'date_key', date_key
    ) INTO v_next_event
    FROM planned_dates
    WHERE date_key >= to_char(p_date, 'YYYY-MM-DD')
    ORDER BY date_key ASC
    LIMIT 1;

    -- F. Sestavení výsledného JSON
    v_result := json_build_object(
        'health', COALESCE(v_health, '{"water":0,"mood":5,"sleep":0,"movement":[],"bedtime":null,"pills":false,"supplements":{"iron":false,"zinc":false,"magnesium":false}}'::json),
        'partner_health', v_partner_health,
        'pinned_drawing', v_drawing,
        'tetris', COALESCE(v_tetris, '{"jose":0,"klarka":0}'::json),
        'next_event', v_next_event
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
