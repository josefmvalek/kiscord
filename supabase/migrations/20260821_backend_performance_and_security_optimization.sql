-- ====================================================================
-- KISCORD BACKEND PERFORMANCE & SECURITY OPTIMIZATION MIGRATION
-- Datum: 21. 8. 2026
-- ====================================================================

-- 1. Zabezpečení chybějící tabulky (RLS)
ALTER TABLE IF EXISTS public.relationship_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'relationship_settings' AND policyname = 'Authenticated access'
    ) THEN
        CREATE POLICY "Authenticated access" ON public.relationship_settings
        FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 2. Indexy pro cizí klíče (Foreign Keys - prevence Sequential Scan a zamykání tabulek)
CREATE INDEX IF NOT EXISTS idx_gym_logs_template_id ON public.gym_logs(template_id);
CREATE INDEX IF NOT EXISTS idx_gym_prs_log_id ON public.gym_prs(log_id);
CREATE INDEX IF NOT EXISTS idx_daily_answers_question_id ON public.daily_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_app_habit_logs_habit_id ON public.app_habit_logs(habit_id);
CREATE INDEX IF NOT EXISTS idx_user_coupons_shop_item_id ON public.user_coupons(shop_item_id);
CREATE INDEX IF NOT EXISTS idx_user_coupons_owner_id ON public.user_coupons(owner_id);
CREATE INDEX IF NOT EXISTS idx_app_fact_favorites_fact_id ON public.app_fact_favorites(fact_id);
CREATE INDEX IF NOT EXISTS idx_library_series_progress_media_id ON public.library_series_progress(media_id);
CREATE INDEX IF NOT EXISTS idx_pinned_drawings_drawing_id ON public.pinned_drawings(drawing_id);

-- 3. Kompozitní indexy pro nejčastější dotazy a řazení
CREATE INDEX IF NOT EXISTS idx_gym_logs_user_date ON public.gym_logs(user_id, date_key DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_events_date ON public.timeline_events(event_date DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_health_data_user_date ON public.health_data(user_id, date_key DESC);
CREATE INDEX IF NOT EXISTS idx_planned_dates_date_key ON public.planned_dates(date_key);

-- 4. Sjednocená RPC funkce pro Questy (nahrazuje 11 samostatných HTTP volání)
CREATE OR REPLACE FUNCTION public.get_all_quest_stats(month_prefix TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_water BIGINT := 0;
    v_sleep BIGINT := 0;
    v_bucket BIGINT := 0;
    v_movement BIGINT := 0;
    v_mood BIGINT := 0;
    v_timeline BIGINT := 0;
    v_dates BIGINT := 0;
    v_sunlight BIGINT := 0;
    v_tetris BIGINT := 0;
    v_questions BIGINT := 0;
BEGIN
    -- 1. Voda
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'health_data') THEN
        SELECT COALESCE(SUM(water), 0) INTO v_water 
        FROM public.health_data 
        WHERE date_key LIKE month_prefix || '%';

        -- 2. Spánek (oba alespoň 7h)
        SELECT COUNT(*) INTO v_sleep FROM (
            SELECT date_key 
            FROM public.health_data 
            WHERE sleep >= 7 AND date_key LIKE month_prefix || '%' 
            GROUP BY date_key 
            HAVING COUNT(DISTINCT user_id) >= 2
        ) s;

        -- 4. Pohyb
        SELECT COALESCE(SUM(movement), 0) INTO v_movement 
        FROM public.health_data 
        WHERE date_key LIKE month_prefix || '%';

        -- 5. Nálada
        SELECT COUNT(*) INTO v_mood 
        FROM public.health_data 
        WHERE mood >= 4 AND date_key LIKE month_prefix || '%';
    END IF;

    -- 3. Bucket List
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bucket_list') THEN
        SELECT COUNT(*) INTO v_bucket 
        FROM public.bucket_list 
        WHERE is_completed = true;
    END IF;

    -- 6. Timeline události v daném měsíci
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'timeline_events') THEN
        SELECT COUNT(*) INTO v_timeline 
        FROM public.timeline_events 
        WHERE event_date::text LIKE month_prefix || '%';
    END IF;

    -- 7. Dokončená rande
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'planned_dates') THEN
        SELECT COUNT(*) INTO v_dates 
        FROM public.planned_dates 
        WHERE status = 'completed' AND date_key LIKE month_prefix || '%';
    END IF;

    -- 8. Slunce / Sunlight & 10. Denní otázky
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'daily_answers') THEN
        SELECT COUNT(*) INTO v_questions 
        FROM public.daily_answers 
        WHERE created_at::text LIKE month_prefix || '%';

        SELECT COUNT(*) INTO v_sunlight 
        FROM public.daily_answers 
        WHERE (answer ILIKE '%slunc%' OR answer ILIKE '%sunlight%') 
          AND created_at::text LIKE month_prefix || '%';
    END IF;

    -- 9. Tetris celkové skóre
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tetris_scores') THEN
        SELECT COALESCE(SUM(score), 0) INTO v_tetris 
        FROM public.tetris_scores;
    END IF;

    RETURN jsonb_build_object(
        'sum_water', v_water,
        'both_sleep', v_sleep,
        'count_bucket', v_bucket,
        'count_shared_movement', v_movement,
        'count_shared_mood_high', v_mood,
        'count_new_timeline', v_timeline,
        'count_completed_dates', v_dates,
        'count_sunlight_sent', v_sunlight,
        'sum_tetris_score', v_tetris,
        'count_daily_questions', v_questions
    );
END;
$$;
