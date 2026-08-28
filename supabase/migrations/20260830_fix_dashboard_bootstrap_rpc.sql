-- =========================================================================
-- FIX: get_full_dashboard_bootstrap RPC with correct schema mappings
-- Replaces erroneous 'target_value' column reference with 'goal' from coop_quests
-- Corrects text[] array COALESCE type compatibility for movement and supplements
-- =========================================================================

-- Drop existing function to prevent 'cannot change return type of existing function' error
DROP FUNCTION IF EXISTS public.get_full_dashboard_bootstrap(UUID, TEXT);
DROP FUNCTION IF EXISTS public.get_full_dashboard_bootstrap(uuid, text);

CREATE OR REPLACE FUNCTION public.get_full_dashboard_bootstrap(p_user_id UUID, p_date_key TEXT)
RETURNS JSON AS $$
DECLARE
    v_my_health JSON;
    v_partner_health JSON;
    v_drawing JSON;
    v_tetris JSON;
    v_next_event JSON;
    v_active_quests JSON;
    v_habits JSON;
    v_habit_logs JSON;
    v_result JSON;
BEGIN
    -- 1. My Health Data for today (convert text[] movement and jsonb supplements properly)
    SELECT json_build_object(
        'water', COALESCE(water, 0),
        'sleep', COALESCE(sleep, 0),
        'mood', COALESCE(mood, 5),
        'movement', COALESCE(to_json(movement), '[]'::json),
        'bedtime', bedtime,
        'pills', COALESCE(pills, false),
        'supplements', COALESCE(to_json(supplements), '{"iron":false,"zinc":false,"magnesium":false}'::json)
    ) INTO v_my_health
    FROM public.health_data
    WHERE user_id = p_user_id AND date_key = p_date_key
    LIMIT 1;

    -- 2. Partner Health Data for today
    SELECT json_build_object(
        'water', COALESCE(water, 0),
        'sleep', COALESCE(sleep, 0),
        'mood', COALESCE(mood, 5),
        'movement', COALESCE(to_json(movement), '[]'::json),
        'bedtime', bedtime,
        'pills', COALESCE(pills, false),
        'supplements', COALESCE(to_json(supplements), '{"iron":false,"zinc":false,"magnesium":false}'::json)
    ) INTO v_partner_health
    FROM public.health_data
    WHERE user_id != p_user_id AND date_key = p_date_key
    LIMIT 1;

    -- 3. Pinned Drawing
    SELECT json_build_object(
        'id', d.id,
        'title', d.title,
        'thumbnail', d.thumbnail,
        'created_at', d.created_at
    ) INTO v_drawing
    FROM public.drawings d
    JOIN public.pinned_drawings pd ON d.id = pd.drawing_id
    ORDER BY pd.updated_at DESC
    LIMIT 1;

    -- 4. Tetris Scores
    SELECT json_build_object(
        'jose', COALESCE((SELECT score FROM public.tetris_scores WHERE user_id = p_user_id LIMIT 1), 0),
        'klarka', COALESCE((SELECT score FROM public.tetris_scores WHERE user_id != p_user_id LIMIT 1), 0)
    ) INTO v_tetris;

    -- 5. Next Upcoming Planned Date
    SELECT json_build_object(
        'id', id,
        'name', name,
        'cat', cat,
        'time', time,
        'note', note,
        'date_key', date_key,
        'status', status,
        'proposed_by', proposed_by,
        'checklist', checklist
    ) INTO v_next_event
    FROM public.planned_dates
    WHERE date_key >= p_date_key
    ORDER BY date_key ASC
    LIMIT 1;

    -- 6. Active Co-op Quests (using correct 'goal' column from coop_quests schema)
    SELECT COALESCE(json_agg(json_build_object(
        'id', id,
        'title', title,
        'description', description,
        'icon', icon,
        'color', color,
        'goal', goal,
        'unit', unit,
        'type', type,
        'is_active', is_active
    )), '[]'::json) INTO v_active_quests
    FROM public.coop_quests
    WHERE is_active = true;

    -- 7. Habits (app_habits)
    SELECT COALESCE(json_agg(json_build_object(
        'id', id,
        'user_id', user_id,
        'icon', icon,
        'name', name,
        'description', description,
        'is_shared', is_shared
    )), '[]'::json) INTO v_habits
    FROM public.app_habits
    WHERE user_id = p_user_id OR is_shared = true;

    -- 8. Habit Logs for today (app_habit_logs)
    SELECT COALESCE(json_agg(json_build_object(
        'id', id,
        'habit_id', habit_id,
        'user_id', user_id,
        'date_key', date_key
    )), '[]'::json) INTO v_habit_logs
    FROM public.app_habit_logs
    WHERE date_key = p_date_key;

    -- Combine into unified response
    v_result := json_build_object(
        'health', v_my_health,
        'partner_health', v_partner_health,
        'pinned_drawing', v_drawing,
        'tetris', COALESCE(v_tetris, '{"jose":0,"klarka":0}'::json),
        'next_event', v_next_event,
        'active_quests', v_active_quests,
        'habits', v_habits,
        'habit_logs', v_habit_logs,
        'relationship_xp', COALESCE(public.get_relationship_xp(), 0)
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
