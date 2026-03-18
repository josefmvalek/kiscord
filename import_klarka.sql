-- Import script for Klárka (vyslouzilova.klara07@gmail.com)
-- Generated on 2026-03-18T17:18:48.421Z

DO $$
DECLARE
  klarka_id UUID;
BEGIN

  -- Find user ID
  SELECT id INTO klarka_id FROM auth.users WHERE email = 'vyslouzilova.klara07@gmail.com';

  IF klarka_id IS NULL THEN
    RAISE EXCEPTION 'User not found. Ensure the user has registered with email: vyslouzilova.klara07@gmail.com';
  END IF;

  -- Health Data
  INSERT INTO public.health_data (date_key, user_id, water, sleep, mood, movement)
  VALUES ('2026-01-11', klarka_id, 1, 8, 30, ARRAY[]::text[])
  ON CONFLICT (date_key, user_id) DO UPDATE SET
    water = EXCLUDED.water, sleep = EXCLUDED.sleep, mood = EXCLUDED.mood, movement = EXCLUDED.movement;

  INSERT INTO public.health_data (date_key, user_id, water, sleep, mood, movement)
  VALUES ('2026-01-12', klarka_id, 1, 4, 40, ARRAY[]::text[])
  ON CONFLICT (date_key, user_id) DO UPDATE SET
    water = EXCLUDED.water, sleep = EXCLUDED.sleep, mood = EXCLUDED.mood, movement = EXCLUDED.movement;

  INSERT INTO public.health_data (date_key, user_id, water, sleep, mood, movement)
  VALUES ('2026-01-13', klarka_id, 1, 4, 30, ARRAY[]::text[])
  ON CONFLICT (date_key, user_id) DO UPDATE SET
    water = EXCLUDED.water, sleep = EXCLUDED.sleep, mood = EXCLUDED.mood, movement = EXCLUDED.movement;

  INSERT INTO public.health_data (date_key, user_id, water, sleep, mood, movement)
  VALUES ('2026-01-14', klarka_id, 1, 4, 40, ARRAY['gym']::text[])
  ON CONFLICT (date_key, user_id) DO UPDATE SET
    water = EXCLUDED.water, sleep = EXCLUDED.sleep, mood = EXCLUDED.mood, movement = EXCLUDED.movement;

  INSERT INTO public.health_data (date_key, user_id, water, sleep, mood, movement)
  VALUES ('2026-01-15', klarka_id, 3, 4, 40, ARRAY['gym']::text[])
  ON CONFLICT (date_key, user_id) DO UPDATE SET
    water = EXCLUDED.water, sleep = EXCLUDED.sleep, mood = EXCLUDED.mood, movement = EXCLUDED.movement;

  INSERT INTO public.health_data (date_key, user_id, water, sleep, mood, movement)
  VALUES ('2026-01-16', klarka_id, 1, 4, 80, ARRAY['gym', 'walk']::text[])
  ON CONFLICT (date_key, user_id) DO UPDATE SET
    water = EXCLUDED.water, sleep = EXCLUDED.sleep, mood = EXCLUDED.mood, movement = EXCLUDED.movement;

  INSERT INTO public.health_data (date_key, user_id, water, sleep, mood, movement)
  VALUES ('2026-01-17', klarka_id, 0, 8, 80, ARRAY['gym']::text[])
  ON CONFLICT (date_key, user_id) DO UPDATE SET
    water = EXCLUDED.water, sleep = EXCLUDED.sleep, mood = EXCLUDED.mood, movement = EXCLUDED.movement;

  INSERT INTO public.health_data (date_key, user_id, water, sleep, mood, movement)
  VALUES ('2026-01-18', klarka_id, 1, 8, 80, ARRAY[]::text[])
  ON CONFLICT (date_key, user_id) DO UPDATE SET
    water = EXCLUDED.water, sleep = EXCLUDED.sleep, mood = EXCLUDED.mood, movement = EXCLUDED.movement;

  INSERT INTO public.health_data (date_key, user_id, water, sleep, mood, movement)
  VALUES ('2026-01-19', klarka_id, 3, 6, 50, ARRAY[]::text[])
  ON CONFLICT (date_key, user_id) DO UPDATE SET
    water = EXCLUDED.water, sleep = EXCLUDED.sleep, mood = EXCLUDED.mood, movement = EXCLUDED.movement;

  INSERT INTO public.health_data (date_key, user_id, water, sleep, mood, movement)
  VALUES ('2026-01-20', klarka_id, 2, 6, 40, ARRAY[]::text[])
  ON CONFLICT (date_key, user_id) DO UPDATE SET
    water = EXCLUDED.water, sleep = EXCLUDED.sleep, mood = EXCLUDED.mood, movement = EXCLUDED.movement;

  INSERT INTO public.health_data (date_key, user_id, water, sleep, mood, movement)
  VALUES ('2026-01-21', klarka_id, 1, 4, 40, ARRAY['gym']::text[])
  ON CONFLICT (date_key, user_id) DO UPDATE SET
    water = EXCLUDED.water, sleep = EXCLUDED.sleep, mood = EXCLUDED.mood, movement = EXCLUDED.movement;

  INSERT INTO public.health_data (date_key, user_id, water, sleep, mood, movement)
  VALUES ('2026-01-22', klarka_id, 3, 4, 40, ARRAY['gym']::text[])
  ON CONFLICT (date_key, user_id) DO UPDATE SET
    water = EXCLUDED.water, sleep = EXCLUDED.sleep, mood = EXCLUDED.mood, movement = EXCLUDED.movement;

  INSERT INTO public.health_data (date_key, user_id, water, sleep, mood, movement)
  VALUES ('2026-01-23', klarka_id, 1, 4, 80, ARRAY['gym', 'walk', 'sex']::text[])
  ON CONFLICT (date_key, user_id) DO UPDATE SET
    water = EXCLUDED.water, sleep = EXCLUDED.sleep, mood = EXCLUDED.mood, movement = EXCLUDED.movement;

  INSERT INTO public.health_data (date_key, user_id, water, sleep, mood, movement)
  VALUES ('2026-01-24', klarka_id, 1, 6, 50, ARRAY[]::text[])
  ON CONFLICT (date_key, user_id) DO UPDATE SET
    water = EXCLUDED.water, sleep = EXCLUDED.sleep, mood = EXCLUDED.mood, movement = EXCLUDED.movement;

  INSERT INTO public.health_data (date_key, user_id, water, sleep, mood, movement)
  VALUES ('2026-01-25', klarka_id, 3, 8, 30, ARRAY[]::text[])
  ON CONFLICT (date_key, user_id) DO UPDATE SET
    water = EXCLUDED.water, sleep = EXCLUDED.sleep, mood = EXCLUDED.mood, movement = EXCLUDED.movement;

  INSERT INTO public.health_data (date_key, user_id, water, sleep, mood, movement)
  VALUES ('2026-01-26', klarka_id, 2, 4, 30, ARRAY[]::text[])
  ON CONFLICT (date_key, user_id) DO UPDATE SET
    water = EXCLUDED.water, sleep = EXCLUDED.sleep, mood = EXCLUDED.mood, movement = EXCLUDED.movement;

  INSERT INTO public.health_data (date_key, user_id, water, sleep, mood, movement)
  VALUES ('2026-01-27', klarka_id, 2, 6, 30, ARRAY['walk']::text[])
  ON CONFLICT (date_key, user_id) DO UPDATE SET
    water = EXCLUDED.water, sleep = EXCLUDED.sleep, mood = EXCLUDED.mood, movement = EXCLUDED.movement;

  INSERT INTO public.health_data (date_key, user_id, water, sleep, mood, movement)
  VALUES ('2026-01-28', klarka_id, 1, 6, 30, ARRAY[]::text[])
  ON CONFLICT (date_key, user_id) DO UPDATE SET
    water = EXCLUDED.water, sleep = EXCLUDED.sleep, mood = EXCLUDED.mood, movement = EXCLUDED.movement;

  INSERT INTO public.health_data (date_key, user_id, water, sleep, mood, movement)
  VALUES ('2026-01-29', klarka_id, 0, 6, 50, ARRAY[]::text[])
  ON CONFLICT (date_key, user_id) DO UPDATE SET
    water = EXCLUDED.water, sleep = EXCLUDED.sleep, mood = EXCLUDED.mood, movement = EXCLUDED.movement;

  INSERT INTO public.health_data (date_key, user_id, water, sleep, mood, movement)
  VALUES ('2026-01-30', klarka_id, 0, 6, 30, ARRAY[]::text[])
  ON CONFLICT (date_key, user_id) DO UPDATE SET
    water = EXCLUDED.water, sleep = EXCLUDED.sleep, mood = EXCLUDED.mood, movement = EXCLUDED.movement;

  INSERT INTO public.health_data (date_key, user_id, water, sleep, mood, movement)
  VALUES ('2026-01-31', klarka_id, 2, 6, 30, ARRAY[]::text[])
  ON CONFLICT (date_key, user_id) DO UPDATE SET
    water = EXCLUDED.water, sleep = EXCLUDED.sleep, mood = EXCLUDED.mood, movement = EXCLUDED.movement;

  INSERT INTO public.health_data (date_key, user_id, water, sleep, mood, movement)
  VALUES ('2026-02-01', klarka_id, 2, 8, 80, ARRAY[]::text[])
  ON CONFLICT (date_key, user_id) DO UPDATE SET
    water = EXCLUDED.water, sleep = EXCLUDED.sleep, mood = EXCLUDED.mood, movement = EXCLUDED.movement;

  INSERT INTO public.health_data (date_key, user_id, water, sleep, mood, movement)
  VALUES ('2026-02-02', klarka_id, 4, 6, 30, ARRAY[]::text[])
  ON CONFLICT (date_key, user_id) DO UPDATE SET
    water = EXCLUDED.water, sleep = EXCLUDED.sleep, mood = EXCLUDED.mood, movement = EXCLUDED.movement;

  INSERT INTO public.health_data (date_key, user_id, water, sleep, mood, movement)
  VALUES ('2026-02-03', klarka_id, 2, 4, 40, ARRAY['gym']::text[])
  ON CONFLICT (date_key, user_id) DO UPDATE SET
    water = EXCLUDED.water, sleep = EXCLUDED.sleep, mood = EXCLUDED.mood, movement = EXCLUDED.movement;

  INSERT INTO public.health_data (date_key, user_id, water, sleep, mood, movement)
  VALUES ('2026-02-04', klarka_id, 1, 4, 40, ARRAY['gym']::text[])
  ON CONFLICT (date_key, user_id) DO UPDATE SET
    water = EXCLUDED.water, sleep = EXCLUDED.sleep, mood = EXCLUDED.mood, movement = EXCLUDED.movement;

  INSERT INTO public.health_data (date_key, user_id, water, sleep, mood, movement)
  VALUES ('2026-02-05', klarka_id, 3, 6, 40, ARRAY['gym']::text[])
  ON CONFLICT (date_key, user_id) DO UPDATE SET
    water = EXCLUDED.water, sleep = EXCLUDED.sleep, mood = EXCLUDED.mood, movement = EXCLUDED.movement;

  INSERT INTO public.health_data (date_key, user_id, water, sleep, mood, movement)
  VALUES ('2026-02-07', klarka_id, 3, 6, 20, ARRAY[]::text[])
  ON CONFLICT (date_key, user_id) DO UPDATE SET
    water = EXCLUDED.water, sleep = EXCLUDED.sleep, mood = EXCLUDED.mood, movement = EXCLUDED.movement;

  INSERT INTO public.health_data (date_key, user_id, water, sleep, mood, movement)
  VALUES ('2026-02-08', klarka_id, 4, 8, 80, ARRAY[]::text[])
  ON CONFLICT (date_key, user_id) DO UPDATE SET
    water = EXCLUDED.water, sleep = EXCLUDED.sleep, mood = EXCLUDED.mood, movement = EXCLUDED.movement;

  INSERT INTO public.health_data (date_key, user_id, water, sleep, mood, movement)
  VALUES ('2026-02-09', klarka_id, 3, 6, 40, ARRAY[]::text[])
  ON CONFLICT (date_key, user_id) DO UPDATE SET
    water = EXCLUDED.water, sleep = EXCLUDED.sleep, mood = EXCLUDED.mood, movement = EXCLUDED.movement;

  INSERT INTO public.health_data (date_key, user_id, water, sleep, mood, movement)
  VALUES ('2026-02-10', klarka_id, 3, 4, 40, ARRAY['gym']::text[])
  ON CONFLICT (date_key, user_id) DO UPDATE SET
    water = EXCLUDED.water, sleep = EXCLUDED.sleep, mood = EXCLUDED.mood, movement = EXCLUDED.movement;

  INSERT INTO public.health_data (date_key, user_id, water, sleep, mood, movement)
  VALUES ('2026-02-12', klarka_id, 2, 4, 30, ARRAY['gym']::text[])
  ON CONFLICT (date_key, user_id) DO UPDATE SET
    water = EXCLUDED.water, sleep = EXCLUDED.sleep, mood = EXCLUDED.mood, movement = EXCLUDED.movement;

  INSERT INTO public.health_data (date_key, user_id, water, sleep, mood, movement)
  VALUES ('2026-02-13', klarka_id, 1, 4, 40, ARRAY['gym']::text[])
  ON CONFLICT (date_key, user_id) DO UPDATE SET
    water = EXCLUDED.water, sleep = EXCLUDED.sleep, mood = EXCLUDED.mood, movement = EXCLUDED.movement;

  INSERT INTO public.health_data (date_key, user_id, water, sleep, mood, movement)
  VALUES ('2026-02-14', klarka_id, 0, 0, 100, ARRAY[]::text[])
  ON CONFLICT (date_key, user_id) DO UPDATE SET
    water = EXCLUDED.water, sleep = EXCLUDED.sleep, mood = EXCLUDED.mood, movement = EXCLUDED.movement;

  INSERT INTO public.health_data (date_key, user_id, water, sleep, mood, movement)
  VALUES ('2026-02-15', klarka_id, 3, 0, 40, ARRAY[]::text[])
  ON CONFLICT (date_key, user_id) DO UPDATE SET
    water = EXCLUDED.water, sleep = EXCLUDED.sleep, mood = EXCLUDED.mood, movement = EXCLUDED.movement;

  INSERT INTO public.health_data (date_key, user_id, water, sleep, mood, movement)
  VALUES ('2026-02-16', klarka_id, 1, 5.4, 30, ARRAY[]::text[])
  ON CONFLICT (date_key, user_id) DO UPDATE SET
    water = EXCLUDED.water, sleep = EXCLUDED.sleep, mood = EXCLUDED.mood, movement = EXCLUDED.movement;

  INSERT INTO public.health_data (date_key, user_id, water, sleep, mood, movement)
  VALUES ('2026-02-17', klarka_id, 1, 6, 50, ARRAY[]::text[])
  ON CONFLICT (date_key, user_id) DO UPDATE SET
    water = EXCLUDED.water, sleep = EXCLUDED.sleep, mood = EXCLUDED.mood, movement = EXCLUDED.movement;

  INSERT INTO public.health_data (date_key, user_id, water, sleep, mood, movement)
  VALUES ('2026-02-18', klarka_id, 2, 5, 40, ARRAY[]::text[])
  ON CONFLICT (date_key, user_id) DO UPDATE SET
    water = EXCLUDED.water, sleep = EXCLUDED.sleep, mood = EXCLUDED.mood, movement = EXCLUDED.movement;

  INSERT INTO public.health_data (date_key, user_id, water, sleep, mood, movement)
  VALUES ('2026-02-19', klarka_id, 4, 7, 60, ARRAY[]::text[])
  ON CONFLICT (date_key, user_id) DO UPDATE SET
    water = EXCLUDED.water, sleep = EXCLUDED.sleep, mood = EXCLUDED.mood, movement = EXCLUDED.movement;

  INSERT INTO public.health_data (date_key, user_id, water, sleep, mood, movement)
  VALUES ('2026-02-20', klarka_id, 2, 6, 70, ARRAY[]::text[])
  ON CONFLICT (date_key, user_id) DO UPDATE SET
    water = EXCLUDED.water, sleep = EXCLUDED.sleep, mood = EXCLUDED.mood, movement = EXCLUDED.movement;

  INSERT INTO public.health_data (date_key, user_id, water, sleep, mood, movement)
  VALUES ('2026-02-21', klarka_id, 0, 8, 70, ARRAY[]::text[])
  ON CONFLICT (date_key, user_id) DO UPDATE SET
    water = EXCLUDED.water, sleep = EXCLUDED.sleep, mood = EXCLUDED.mood, movement = EXCLUDED.movement;

  INSERT INTO public.health_data (date_key, user_id, water, sleep, mood, movement)
  VALUES ('2026-02-22', klarka_id, 3, 8, 90, ARRAY[]::text[])
  ON CONFLICT (date_key, user_id) DO UPDATE SET
    water = EXCLUDED.water, sleep = EXCLUDED.sleep, mood = EXCLUDED.mood, movement = EXCLUDED.movement;

  INSERT INTO public.health_data (date_key, user_id, water, sleep, mood, movement)
  VALUES ('2026-02-23', klarka_id, 2, 5, 10, ARRAY[]::text[])
  ON CONFLICT (date_key, user_id) DO UPDATE SET
    water = EXCLUDED.water, sleep = EXCLUDED.sleep, mood = EXCLUDED.mood, movement = EXCLUDED.movement;

  INSERT INTO public.health_data (date_key, user_id, water, sleep, mood, movement)
  VALUES ('2026-02-24', klarka_id, 3, 7, 60, ARRAY[]::text[])
  ON CONFLICT (date_key, user_id) DO UPDATE SET
    water = EXCLUDED.water, sleep = EXCLUDED.sleep, mood = EXCLUDED.mood, movement = EXCLUDED.movement;

  INSERT INTO public.health_data (date_key, user_id, water, sleep, mood, movement)
  VALUES ('2026-02-25', klarka_id, 2, 6, 50, ARRAY[]::text[])
  ON CONFLICT (date_key, user_id) DO UPDATE SET
    water = EXCLUDED.water, sleep = EXCLUDED.sleep, mood = EXCLUDED.mood, movement = EXCLUDED.movement;

  INSERT INTO public.health_data (date_key, user_id, water, sleep, mood, movement)
  VALUES ('2026-02-26', klarka_id, 1, 5, 10, ARRAY['gym']::text[])
  ON CONFLICT (date_key, user_id) DO UPDATE SET
    water = EXCLUDED.water, sleep = EXCLUDED.sleep, mood = EXCLUDED.mood, movement = EXCLUDED.movement;

  INSERT INTO public.health_data (date_key, user_id, water, sleep, mood, movement)
  VALUES ('2026-02-27', klarka_id, 2, 6, 70, ARRAY[]::text[])
  ON CONFLICT (date_key, user_id) DO UPDATE SET
    water = EXCLUDED.water, sleep = EXCLUDED.sleep, mood = EXCLUDED.mood, movement = EXCLUDED.movement;

  INSERT INTO public.health_data (date_key, user_id, water, sleep, mood, movement)
  VALUES ('2026-02-28', klarka_id, 1, 8, 90, ARRAY['walk']::text[])
  ON CONFLICT (date_key, user_id) DO UPDATE SET
    water = EXCLUDED.water, sleep = EXCLUDED.sleep, mood = EXCLUDED.mood, movement = EXCLUDED.movement;

  INSERT INTO public.health_data (date_key, user_id, water, sleep, mood, movement)
  VALUES ('2026-03-01', klarka_id, 2, 9, 90, ARRAY[]::text[])
  ON CONFLICT (date_key, user_id) DO UPDATE SET
    water = EXCLUDED.water, sleep = EXCLUDED.sleep, mood = EXCLUDED.mood, movement = EXCLUDED.movement;

  INSERT INTO public.health_data (date_key, user_id, water, sleep, mood, movement)
  VALUES ('2026-03-02', klarka_id, 1, 6, 50, ARRAY['gym']::text[])
  ON CONFLICT (date_key, user_id) DO UPDATE SET
    water = EXCLUDED.water, sleep = EXCLUDED.sleep, mood = EXCLUDED.mood, movement = EXCLUDED.movement;

  INSERT INTO public.health_data (date_key, user_id, water, sleep, mood, movement)
  VALUES ('2026-03-03', klarka_id, 0, 8, 20, ARRAY['gym', 'walk']::text[])
  ON CONFLICT (date_key, user_id) DO UPDATE SET
    water = EXCLUDED.water, sleep = EXCLUDED.sleep, mood = EXCLUDED.mood, movement = EXCLUDED.movement;

  INSERT INTO public.health_data (date_key, user_id, water, sleep, mood, movement)
  VALUES ('2026-03-04', klarka_id, 1, 6, 70, ARRAY['gym']::text[])
  ON CONFLICT (date_key, user_id) DO UPDATE SET
    water = EXCLUDED.water, sleep = EXCLUDED.sleep, mood = EXCLUDED.mood, movement = EXCLUDED.movement;

  INSERT INTO public.health_data (date_key, user_id, water, sleep, mood, movement)
  VALUES ('2026-03-05', klarka_id, 1, 6, 60, ARRAY[]::text[])
  ON CONFLICT (date_key, user_id) DO UPDATE SET
    water = EXCLUDED.water, sleep = EXCLUDED.sleep, mood = EXCLUDED.mood, movement = EXCLUDED.movement;

  INSERT INTO public.health_data (date_key, user_id, water, sleep, mood, movement)
  VALUES ('2026-03-08', klarka_id, 1, 8, 40, ARRAY[]::text[])
  ON CONFLICT (date_key, user_id) DO UPDATE SET
    water = EXCLUDED.water, sleep = EXCLUDED.sleep, mood = EXCLUDED.mood, movement = EXCLUDED.movement;

  INSERT INTO public.health_data (date_key, user_id, water, sleep, mood, movement)
  VALUES ('2026-03-09', klarka_id, 0, 0, 50, ARRAY[]::text[])
  ON CONFLICT (date_key, user_id) DO UPDATE SET
    water = EXCLUDED.water, sleep = EXCLUDED.sleep, mood = EXCLUDED.mood, movement = EXCLUDED.movement;

  INSERT INTO public.health_data (date_key, user_id, water, sleep, mood, movement)
  VALUES ('2026-03-11', klarka_id, 3, 6, 50, ARRAY['gym']::text[])
  ON CONFLICT (date_key, user_id) DO UPDATE SET
    water = EXCLUDED.water, sleep = EXCLUDED.sleep, mood = EXCLUDED.mood, movement = EXCLUDED.movement;

  INSERT INTO public.health_data (date_key, user_id, water, sleep, mood, movement)
  VALUES ('2026-03-12', klarka_id, 3, 6, 10, ARRAY['gym']::text[])
  ON CONFLICT (date_key, user_id) DO UPDATE SET
    water = EXCLUDED.water, sleep = EXCLUDED.sleep, mood = EXCLUDED.mood, movement = EXCLUDED.movement;

  INSERT INTO public.health_data (date_key, user_id, water, sleep, mood, movement)
  VALUES ('2026-03-13', klarka_id, 0, 7, 40, ARRAY['gym', 'walk']::text[])
  ON CONFLICT (date_key, user_id) DO UPDATE SET
    water = EXCLUDED.water, sleep = EXCLUDED.sleep, mood = EXCLUDED.mood, movement = EXCLUDED.movement;

  INSERT INTO public.health_data (date_key, user_id, water, sleep, mood, movement)
  VALUES ('2026-03-14', klarka_id, 2, 8, 60, ARRAY['gym']::text[])
  ON CONFLICT (date_key, user_id) DO UPDATE SET
    water = EXCLUDED.water, sleep = EXCLUDED.sleep, mood = EXCLUDED.mood, movement = EXCLUDED.movement;

  INSERT INTO public.health_data (date_key, user_id, water, sleep, mood, movement)
  VALUES ('2026-03-16', klarka_id, 3, 6, 40, ARRAY[]::text[])
  ON CONFLICT (date_key, user_id) DO UPDATE SET
    water = EXCLUDED.water, sleep = EXCLUDED.sleep, mood = EXCLUDED.mood, movement = EXCLUDED.movement;

  INSERT INTO public.health_data (date_key, user_id, water, sleep, mood, movement)
  VALUES ('2026-03-17', klarka_id, 0, 0, 40, ARRAY[]::text[])
  ON CONFLICT (date_key, user_id) DO UPDATE SET
    water = EXCLUDED.water, sleep = EXCLUDED.sleep, mood = EXCLUDED.mood, movement = EXCLUDED.movement;

  INSERT INTO public.health_data (date_key, user_id, water, sleep, mood, movement)
  VALUES ('2026-03-18', klarka_id, 0, 0, 50, ARRAY[]::text[])
  ON CONFLICT (date_key, user_id) DO UPDATE SET
    water = EXCLUDED.water, sleep = EXCLUDED.sleep, mood = EXCLUDED.mood, movement = EXCLUDED.movement;

  -- Date Ratings
  INSERT INTO public.date_ratings (location_id, user_id, rating)
  VALUES (208, klarka_id, 4)
  ON CONFLICT (location_id) DO UPDATE SET rating = EXCLUDED.rating, user_id = EXCLUDED.user_id;

  -- Topic Progress
  INSERT INTO public.topic_progress (topic_id, user_id, bookmarks, current_index)
  VALUES ('relationships', klarka_id, ARRAY['9', '25', '8', '13', '21', '4', '3', '11', '17', '19', '1', '15']::text[], 5)
  ON CONFLICT (topic_id, user_id) DO UPDATE SET bookmarks = EXCLUDED.bookmarks, current_index = EXCLUDED.current_index;

  INSERT INTO public.topic_progress (topic_id, user_id, bookmarks, current_index)
  VALUES ('fun_dilemmas', klarka_id, ARRAY['43', '24']::text[], 0)
  ON CONFLICT (topic_id, user_id) DO UPDATE SET bookmarks = EXCLUDED.bookmarks, current_index = EXCLUDED.current_index;

  -- Tetris Score
  INSERT INTO public.tetris_scores (user_id, score)
  VALUES (klarka_id, 9)
  ON CONFLICT (user_id) DO UPDATE SET score = EXCLUDED.score;

END $$;
