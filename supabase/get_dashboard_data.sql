-- Function to fetch initial dashboard data in one request
CREATE OR REPLACE FUNCTION get_dashboard_data(p_user_id UUID, p_date DATE)
RETURNS JSON AS $$
DECLARE
    v_health JSON;
    v_drawing JSON;
    v_tetris JSON;
    v_next_event JSON;
    v_result JSON;
BEGIN
    -- 1. Get Health Data for today (using date_key like 'YYYY-MM-DD')
    SELECT json_build_object(
        'water', water,
        'sleep', sleep,
        'mood', mood,
        'movement', movement,
        'bedtime', bedtime
    ) INTO v_health
    FROM health_data
    WHERE user_id = p_user_id AND date_key = to_char(p_date, 'YYYY-MM-DD')
    LIMIT 1;

    -- 2. Get Pinned Drawing (from Drawings and Pinned_Drawings)
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

    -- 3. Get Tetris Scores (using Jožka and Klárka names)
    SELECT json_build_object(
        'jose', (SELECT score FROM tetris_scores WHERE user_id = (SELECT id FROM profiles WHERE (name = 'Jožka' OR name = 'Jose') LIMIT 1)),
        'klarka', (SELECT score FROM tetris_scores WHERE user_id = (SELECT id FROM profiles WHERE (name = 'Klárka' OR name = 'Klarka') LIMIT 1))
    ) INTO v_tetris;

    -- 4. Get Next Upcoming Event (Planned Date)
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

    -- Combine into one JSON
    v_result := json_build_object(
        'health', COALESCE(v_health, '{"water":0,"mood":5,"sleep":0,"movement":[],"bedtime":null}'::json),
        'pinned_drawing', v_drawing,
        'tetris', COALESCE(v_tetris, '{"jose":0,"klarka":0}'::json),
        'next_event', v_next_event
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;
