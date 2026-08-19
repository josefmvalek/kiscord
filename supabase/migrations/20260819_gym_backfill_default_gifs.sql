-- ============================================================================
-- KISCORD GYM: Backfill GymVisual GIFs & Instructions for Default Exercises
-- Run this in Supabase SQL Editor to update existing default exercises.
-- ============================================================================

UPDATE public.gym_exercises 
SET 
  image_url = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0025-EIeI8Vf.gif',
  instructions = 'Lehněte si na lavici, lopatky stáhněte k sobě a dolů. Osu spusťte pod kontrolou ke spodní části hrudníku a s výdechem vytlačte nahoru.',
  secondary_muscles = ARRAY['Triceps', 'Přední ramena']
WHERE id = 'bench_press';

UPDATE public.gym_exercises 
SET 
  image_url = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0308-3w39sPq.gif',
  instructions = 'S mírně pokrčenými lokty spouštějte jednoručky do stran, dokud neucítíte protažení prsních svalů, poté plynule stáhněte zpět k sobě.',
  secondary_muscles = ARRAY['Přední ramena']
WHERE id = 'dumbbell_flys';

UPDATE public.gym_exercises 
SET 
  image_url = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0405-b0Q3lT9.gif',
  instructions = 'Sedněte si s oporou zad. Činky držte ve výšce uší a s výdechem je vytlačte nad hlavu bez propínání loktů.',
  secondary_muscles = ARRAY['Triceps', 'Horní hrudník']
WHERE id = 'shoulder_press';

UPDATE public.gym_exercises 
SET 
  image_url = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0334-DsgkuIt.gif',
  instructions = 'Mírný předklon v bocích, lokty lehce pokrčené. Zvedejte paže do stran do výšky ramen, malíčky mírně nahoru.',
  secondary_muscles = ARRAY['Trapézy']
WHERE id = 'lateral_raises';

UPDATE public.gym_exercises 
SET 
  image_url = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0043-qXTaZnJ.gif',
  instructions = 'Nohy na šířku ramen, špičky mírně ven. Držte rovná záda a klesejte hýžděmi dolů alespoň do úrovně kolen (paralela).',
  secondary_muscles = ARRAY['Hýždě', 'Hamstringy', 'Spodní záda']
WHERE id = 'squat';

UPDATE public.gym_exercises 
SET 
  image_url = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0740-4K42N6m.gif',
  instructions = 'Chodidla umístěte na střed desky. Spouštějte závaží do úhlu 90 stupňů v kolenou a plynule vytlačte přes paty bez zvedání pánve.',
  secondary_muscles = ARRAY['Hýždě', 'Kvadricepsy']
WHERE id = 'leg_press';

UPDATE public.gym_exercises 
SET 
  image_url = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0585-6p98r5D.gif',
  instructions = 'Zadní část kolen opřená o hranu sedáku. S výdechem propněte nohy v kolenou a v horní fázi na 1 sekundu zatněte kvadricepsy.',
  secondary_muscles = ARRAY['Kvadricepsy']
WHERE id = 'leg_extensions';

UPDATE public.gym_exercises 
SET 
  image_url = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0032-ila4NZS.gif',
  instructions = 'Osa nad středem chodidel. Chytněte osu, zatáhněte ramena dozadu, zpevněte břicho a zvedejte činku s rovnými zády pomocí tahu nohou a boků.',
  secondary_muscles = ARRAY['Hýždě', 'Hamstringy', 'Trapézy', 'Střed těla']
WHERE id = 'deadlift';

UPDATE public.gym_exercises 
SET 
  image_url = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0652-lBDjFxJ.gif',
  instructions = 'Úchop na šířku ramen nebo širší nadhmatem. Z plného visutého protažení táhněte hrudník k hrazdě, lokty směřují k pasu.',
  secondary_muscles = ARRAY['Biceps', 'Předloktí']
WHERE id = 'pull_ups';

UPDATE public.gym_exercises 
SET 
  image_url = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0198-1Y9t9vH.gif',
  instructions = 'Mírný záklon, hrudník vypnutý. Tyč stahujte k horní části hrudníku a v dolní pozici zatněte zádové svaly (křídla).',
  secondary_muscles = ARRAY['Biceps', 'Zadní ramena']
WHERE id = 'lat_pulldown';

UPDATE public.gym_exercises 
SET 
  image_url = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0027-5g3t9Pz.gif',
  instructions = 'Předklon v trupu cca 45 stupňů s rovnými zády. Přitahujte osu k pupku, lokty držte blízko těla.',
  secondary_muscles = ARRAY['Biceps', 'Trapézy', 'Zadní ramena']
WHERE id = 'barbell_rows';

UPDATE public.gym_exercises 
SET 
  image_url = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0294-NbVPDMW.gif',
  instructions = 'Lokty zafixované u těla. S výdechem zvedejte činky k ramenům se supinací (vytáčením dlaní nahoru) a v horní fázi zatněte biceps.',
  secondary_muscles = ARRAY['Předloktí']
WHERE id = 'bicep_curls';

UPDATE public.gym_exercises 
SET 
  image_url = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0241-1vP8p8Y.gif',
  instructions = 'Stůjte vzpřímeně, lokty u těla. Tlačte lano/tyč dolů do úplného propnutí paží a na vteřinu zatněte triceps.',
  secondary_muscles = ARRAY['Triceps']
WHERE id = 'tricep_pushdowns';

UPDATE public.gym_exercises 
SET 
  image_url = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0644-3g10p7Y.gif',
  instructions = 'Opřete se o předloktí a špičky nohou. Tělo tvoří přímku od hlavy k patám, zpevněte břicho i hýždě a nezvedejte zadek.',
  secondary_muscles = ARRAY['Ramena', 'Hýždě', 'Střed těla']
WHERE id = 'plank';

UPDATE public.gym_exercises 
SET 
  image_url = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0472-8m9p7Y1.gif',
  instructions = 'Zavěste se na hrazdu. Bez švihu a kontrolovaně zvedejte nohy nebo pokrčená kolena k hrudníku se stahováním spodního břicha.',
  secondary_muscles = ARRAY['Ohybače kyčlí']
WHERE id = 'leg_raises';
