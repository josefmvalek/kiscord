# ADR-0009: Discord Slash Commands & Smart Voice Logging Engine

## Status
Accepted

## Context
Aplikace vyžadovala rychlé ovládací metody bez nutnosti zdlouhavého klikání – power-user příkazy přes klávesnici v Command Palette a hands-free hlasové logování v posilovně.

## Decision
1. Zavedení **SlashCommandRegistry** v [js/core/slash-commands.js](file:///c:/Users/Jozka/Desktop/Projekty/kiscord/js/core/slash-commands.js) (`/voda`, `/rande`, `/posli-mince`, `/spanek`).
2. Zavedení **VoiceLogger** v [js/core/voice-logger.js](file:///c:/Users/Jozka/Desktop/Projekty/kiscord/js/core/voice-logger.js) využívající Web Speech API a parser českých gramatických struktur.

## Consequences
### Positive
* Bleskové provádění akcí v řádu vteřin
* Hands-free záznam sérií v posilovně a vody v jídelníčku
