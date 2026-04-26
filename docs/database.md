# Databázový Model

Kiscord využívá **PostgreSQL** hostovaný na platformě **Supabase**. Databáze je navržena tak, aby podporovala jak soukromá data jednotlivců (zdraví, achievementy), tak sdílená data páru (kalendář, média, timeline).

## 1. Architektura dat
Většina tabulek používá UUID pro identifikaci uživatelů a integruje se se systémem **Supabase Auth**.

### Osobní vs. Sdílená data
1. **Osobní data**: Přístupná pouze vlastníkovi (např. nálada, vlastní achievementy).
2. **Sdílená data**: Přístupná oběma uživatelům (např. společný kalendář, bucket list).

## 2. Přehled Tabulek

### Jádro a Zdraví
| Tabulka | Popis | Klíčová Pole |
|---|---|---|
| `health_data` | Denní záznamy zdraví | `date_key`, `user_id`, `water`, `sleep`, `mood`, `pills` |
| `profiles` | Rozšířené info o uživatelích | `id`, `username`, `email`, `avatar_url` |

### Vzpomínky a Plánování
| Tabulka | Popis | Klíčová Pole |
|---|---|---|
| `timeline_events` | Záznamy v timelinu | `title`, `description`, `event_date`, `images` (array) |
| `planned_dates` | Akce v kalendáři | `date_key`, `name`, `cat`, `status`, ` proposto_by` |
| `bucket_list` | Společné sny a cíle | `title`, `category`, `is_completed`, `is_priority` |
| `date_locations` | Špendlíky na mapě | `name`, `lat`, `lng`, `category` |

### Knihovna Médií
| Tabulka | Popis | Klíčová Pole |
|---|---|---|
| `library_content` | Katalog filmů/her | `title`, `type`, `category`, `magnet`, `gdrive` |
| `library_ratings` | Stav a hodnocení | `media_id`, `user_id`, `status`, `rating`, `reaction` |
| `library_watchlist` | Seznam Heartíků | `media_id`, `added_by` |

### Studium (Maturita 2026)
| Tabulka | Popis | Klíčová Pole |
|---|---|---|
| `matura_topics` | Katalog témat | `id`, `category_id`, `title`, `content_url` |
| `matura_topic_progress` | Stav naučení | `item_id`, `user_id`, `status`, `notes` |
| `matura_streaks` | Studijní série | `user_id`, `current_streak`, `last_activity` |

## 3. Row Level Security (RLS)
RLS zajišťuje, že uživatelé vidí jen to, co mají.

### Příklad politiky pro osobní data (Zdraví):
```sql
CREATE POLICY "Individuální přístup k zdraví" ON public.health_data 
    FOR ALL TO authenticated 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);
```

### Příklad politiky pro sdílená data (Kalendář):
```sql
CREATE POLICY "Povolit vše pro přihlášené" ON public.planned_dates 
    FOR ALL TO authenticated 
    USING (true) 
    WITH CHECK (true);
```

## 4. RPC Funkce (Vzdálené procedury)
Některé komplexní operace (zejména pro Questy) jsou implementovány jako SQL funkce přímo v DB pro zajištění výkonu.

- **`get_shared_water_stats(month_prefix)`**: Sečte kapky vody obou uživatelů za daný měsíc.
- **`get_shared_sleep_sync(min_hours, month_prefix)`**: Vrátí počet dní, kdy oba splnili limit spánku.
- **`get_tetris_total_score()`**: Agreguje skóre z historických tabulek.

## 5. Storage Buckets
Pro ukládání souborů používáme Supabase Storage:
- `timeline-photos`: Fotky k událostem.
- `avatars`: Profilové obrázky.
- `matura-docs`: PDF a materiály ke studiu.
