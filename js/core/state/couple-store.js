export const initialCoupleState = {
    relationshipXP: 0,
    loveCoins: { jose: 0, klarka: 0 },
    inventory: [],
    partnerObligations: [],
    shopItems: [],
    timelineEvents: [],
    timelineHighlights: {},
    bucketList: [],
    dateLocations: [],
    dateRatings: {},
    plannedDates: {},
    conversationTopics: [],
    topicProgress: {},
    achievementCategories: [],
    achievementDefinitions: [],
    achievements: [],
    dailyQuestion: null,
    dailyAnswers: [],
    gameQuestions: [],
    gamePrompts: [],
    gameVotes: [],
    drawStrokes: [],
    pinnedDrawing: null,
    coopQuests: [],
    quizAnswers: { score: 0, completed: false },
    tetris: { jose: 0, klarka: 0 },
    startDate: "2025-12-24",
    isValentine: false
};

export class CoupleStore {
    constructor() {
        this.relationshipXP = initialCoupleState.relationshipXP;
        this.loveCoins = { ...initialCoupleState.loveCoins };
        this.inventory = [];
        this.shopItems = [];
        this.timelineEvents = [];
        this.timelineHighlights = {};
        this.bucketList = [];
        this.dateLocations = [];
        this.dateRatings = {};
        this.plannedDates = {};
        this.conversationTopics = [];
        this.topicProgress = {};
        this.achievementCategories = [];
        this.achievementDefinitions = [];
        this.achievements = [];
        this.dailyQuestion = null;
        this.dailyAnswers = [];
        this.gameQuestions = [];
        this.gamePrompts = [];
        this.gameVotes = [];
        this.drawStrokes = [];
        this.pinnedDrawing = null;
        this.coopQuests = [];
        this.quizAnswers = { ...initialCoupleState.quizAnswers };
        this.tetris = { ...initialCoupleState.tetris };
        this.startDate = initialCoupleState.startDate;
        this.isValentine = initialCoupleState.isValentine;
    }
}
