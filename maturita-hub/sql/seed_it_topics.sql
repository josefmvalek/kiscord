-- Simplified IT Topics Seed for MaturitaHub 2026
-- Run this AFTER adding the flashcards column

DELETE FROM public.matura_topics WHERE category = 'Informatika';

INSERT INTO public.matura_topics (id, title, description, category, icon, is_public)
VALUES
('it1', '01 - Data a informace', 'Základní jednotky informace, šum, redundance, entropie.', 'Informatika', '📊', true),
('it2', '02 - Kódování a komprese', 'Binární kódování, ASCII, Unicode, komprese.', 'Informatika', '📦', true),
('it3', '03 - Přenos dat a komunikace', 'Přenosové protokoly, chyby při přenosu, kontrolní součty.', 'Informatika', '📡', true),
('it4', '04 - Číselné soustavy a převody', 'Binární, osmičková, šestnáctková soustava, převody.', 'Informatika', '🔢', true),
('it5', '05 - Základní části počítače', 'Skříně, základní desky, paměti, procesory, grafické karty.', 'Informatika', '🖥️', true),
('it6', '06 - Vstupní a výstupní zařízení', 'Klávesnice, myši, skenery, monitory, tiskárny.', 'Informatika', '⌨️', true),
('it7', '07 - Operační systémy', 'Funkce OS, správa souborů, multitasking, uživatelská práva.', 'Informatika', '⚙️', true),
('it8', '08 - Modelování a reprezentace', 'Modely, schémata, grafy, tabulky, diagramy.', 'Informatika', '📊', true),
('it9', '09 - Algoritmizace a logika', 'Algoritmus, vývojové diagramy, pseudokód, algoritmy.', 'Informatika', '🧠', true),
('it10', '10 - Základy programování', 'Proměnné, vstup/výstup, podmínky, cykly.', 'Informatika', '🐍', true),
('it11', '11 - Datové struktury', 'Seznamy, slovníky, funkce, práce s textem.', 'Informatika', '🧱', true),
('it12', '12 - Tabulkový procesor', 'Vzorce, funkce, grafy, filtrování, kontingenční tabulky.', 'Informatika', '📋', true),
('it13', '13 - Databáze', 'Relační databáze, tabulky, dotazy, základní příkazy.', 'Informatika', '🗄️', true),
('it14', '14 - Informační systémy', 'Návrh a správa informačních systémů.', 'Informatika', '☁️', true),
('it15', '15 - Počítačové sítě', 'Topologie, IP adresace, DNS, protokoly, internet.', 'Informatika', '🌐', true),
('it16', '16 - Digitální bezpečnost', 'Šifrování, hesla, phishing, GDPR.', 'Informatika', '🔐', true),
('it17', '17 - Umělá inteligence', 'Strojové učení, neuronové sítě.', 'Informatika', '🤖', true),
('it18', '18 - Etika a právo v ICT', 'Autorská práva, licencování, digitální stopa.', 'Informatika', '⚖️', true),
('it19', '19 - Moderní technologie', 'Cloud computing, IoT, blockchain, rozšířená realita.', 'Informatika', '🚀', true),
('it20', '20 - Historické milníky', 'Historie počítačů a osobnosti informatiky.', 'Informatika', '⏳', true);
