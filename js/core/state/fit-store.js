export const initialFitState = {
    schoolDeadlines: [],
    schoolSubjects: [],
    scheduleItems: [],
    studyPlannerItems: [],
    customPlans: [],
    shifts: {},
    shiftsSchedule: [],
    brigadeFinances: [],
    brigadeChallenges: [],
    brigadeDiary: [],
    maturaProgress: {},
    maturaStreaks: { jose: 0, klarka: 0 },
    maturaSchedule: [],
    maturaAchievements: [],
    maturaTopics: {},
    maturaKBContent: {}
};

export class FitStore {
    constructor() {
        this.schoolDeadlines = [];
        this.schoolSubjects = [];
        this.scheduleItems = [];
        this.studyPlannerItems = [];
        this.customPlans = [];
        this.shifts = {};
        this.shiftsSchedule = [];
        this.brigadeFinances = [];
        this.brigadeChallenges = [];
        this.brigadeDiary = [];
        this.maturaProgress = {};
        this.maturaStreaks = { ...initialFitState.maturaStreaks };
        this.maturaSchedule = [];
        this.maturaAchievements = [];
        this.maturaTopics = {};
        this.maturaKBContent = {};
    }
}
