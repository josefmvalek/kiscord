-- =========================================================================
-- MIGRACE: Optimalizace výkonu databáze 2.0 (Kiscord)
-- Datum: 26. 5. 2026
-- =========================================================================

-- Tabulka health_data je intenzivně dotazována na Dashboardu a v Kalendáři
-- Dotazy typicky využívají kombinaci date_key a user_id
CREATE INDEX IF NOT EXISTS idx_health_data_date_user 
    ON public.health_data(date_key, user_id);

-- Pro čisté filtrování kalendáře pouze podle data
CREATE INDEX IF NOT EXISTS idx_health_data_date 
    ON public.health_data(date_key);

-- Tabulka planned_dates je dotazována v Dashboardu (budoucí události) a Kalendáři
CREATE INDEX IF NOT EXISTS idx_planned_dates_date 
    ON public.planned_dates(date_key);

-- Ujistíme se, že i kalendář směny má index pro rychlé čtení, i když by měl být v rakouském skriptu
CREATE INDEX IF NOT EXISTS idx_brigade_shifts_date 
    ON public.brigade_shifts(date_key);
