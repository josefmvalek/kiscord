export const initialSettingsState = {
    settings: {
        theme: 'default',
        glassmorphism: true,
        blurIntensity: 10,
        haptics: true,
        soundEnabled: true,
        timelineViewMode: 'list',
        pinnedPhotos: [],
        sidebar: {
            hiddenChannels: [],
            channelOrder: [],
            categoryOrder: [],
            channelCategoryMap: {},
            collapsedCategories: ['📦 ARCHIV', '⚙️ SYSTÉM & INFO'],
            favoriteChannels: ['dashboard', 'calendar', 'love-shop', 'gym-tracker']
        },
        dashboardWidgets: {
            loveShop: true,
            health: true,
            supplements: true,
            schoolDorm: true,
            dailyQuestion: true,
            scheduleWidget: false,
            studyPlannerWidget: false,
            tetris: false,
            quests: false,
            funfacts: false,
            memoryBoard: false,
            alpskaHlidka: false,
            austrianWord: false
        },
        notifications: {
            nativeEnabled: false,
            reminders: {
                water: { enabled: true, interval: 120, haptic: true, sound: false },
                pills: { enabled: true, reminders: [{ time: '08:00', label: 'Léky' }], haptic: true, sound: true },
                bedtime: { enabled: true, time: '22:30', haptic: true, sound: false }
            },
            partner: {
                sunlight: { enabled: true, haptic: true, sound: true },
                dailyQuestions: { enabled: true, haptic: true, sound: true },
                letters: { enabled: true, haptic: true, sound: true },
                planning: { enabled: true, haptic: true, sound: true },
                mood: { enabled: true, haptic: true, sound: true },
                sleep: { enabled: true, haptic: true, sound: true }
            },
            system: {
                quests: { enabled: true, haptic: true, sound: false },
                dates: { enabled: true, haptic: true, sound: true }
            }
        }
    }
};

export class SettingsStore {
    constructor() {
        this.settings = structuredClone(initialSettingsState.settings);
    }
}
