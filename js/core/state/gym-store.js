export const initialGymState = {
    gymExercises: [],
    gymTemplates: [],
    gymLogs: [],
    gymPRs: [],
    gymBodyMeasurements: [],
    trainingSplits: [],
    activeTrainingSplit: null,
    activeWorkout: null
};

export class GymStore {
    constructor() {
        this.gymExercises = [];
        this.gymTemplates = [];
        this.gymLogs = [];
        this.gymPRs = [];
        this.gymBodyMeasurements = [];
        this.trainingSplits = [];
        this.activeTrainingSplit = null;
        this.activeWorkout = null;
    }

    setExercises(exercises) {
        this.gymExercises = Array.isArray(exercises) ? exercises : [];
    }

    setTemplates(templates) {
        this.gymTemplates = Array.isArray(templates) ? templates : [];
    }

    setLogs(logs) {
        this.gymLogs = Array.isArray(logs) ? logs : [];
    }

    setPRs(prs) {
        this.gymPRs = Array.isArray(prs) ? prs : [];
    }

    setMeasurements(measurements) {
        this.gymBodyMeasurements = Array.isArray(measurements) ? measurements : [];
    }

    setTrainingSplits(splits) {
        this.trainingSplits = Array.isArray(splits) ? splits : [];
    }

    setActiveTrainingSplit(split) {
        this.activeTrainingSplit = split || null;
    }

    setActiveWorkout(workout) {
        this.activeWorkout = workout;
    }
}

