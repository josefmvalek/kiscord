BEGIN;
SELECT plan(8);

-- 1. Check if pgTAP extension is active
SELECT has_extension('pgtap', 'Extension pgtap should be enabled');

-- 2. Verify RLS is enabled on key private tables
SELECT results_eq(
    'SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = ''public'' AND tablename IN (''health_data'', ''app_finances'', ''gym_body_measurements'')',
    '$$ VALUES (''app_finances'', true), (''gym_body_measurements'', true), (''health_data'', true) $$',
    'Row Level Security must be enabled on all private tables'
);

-- 3. Verify RLS is enabled on shared tables
SELECT results_eq(
    'SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = ''public'' AND tablename IN (''library_content'', ''planned_dates'', ''coop_quests'')',
    '$$ VALUES (''coop_quests'', true), (''library_content'', true), (''planned_dates'', true) $$',
    'Row Level Security must be enabled on shared couple tables'
);

-- 4. Test RLS Isolation: Setup mock users
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

-- 5. User 1 inserts private record
INSERT INTO public.health_data (date_key, user_id, water, sleep)
VALUES ('2026-08-23', '11111111-1111-1111-1111-111111111111', 8, 7.5);

SELECT results_eq(
    'SELECT water FROM public.health_data WHERE date_key = ''2026-08-23''',
    '$$ VALUES (8) $$',
    'User 1 should be able to read their own health data'
);

-- 6. Switch to User 2 (Partner) and verify private data is NOT readable
SET LOCAL "request.jwt.claims" = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

SELECT is_empty(
    'SELECT * FROM public.health_data WHERE user_id = ''11111111-1111-1111-1111-111111111111''',
    'User 2 must NOT be able to read User 1 private health records'
);

-- 7. Shared Table Test: User 1 creates shared date plan
SET LOCAL "request.jwt.claims" = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';
INSERT INTO public.planned_dates (id, date_key, name, proposed_by, status)
VALUES ('99999999-9999-9999-9999-999999999999', '2026-08-25', 'Piknik v parku', '11111111-1111-1111-1111-111111111111', 'pending');

-- 8. User 2 should be able to read and update shared date
SET LOCAL "request.jwt.claims" = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';
SELECT results_eq(
    'SELECT name FROM public.planned_dates WHERE id = ''99999999-9999-9999-9999-999999999999''',
    '$$ VALUES (''Piknik v parku'') $$',
    'User 2 should be able to view shared date proposed by User 1'
);

SELECT * FROM finish();
ROLLBACK;
