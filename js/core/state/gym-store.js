export const initialGymState = {
    gymExercises: [],
    gymTemplates: [],
    gymLogs: [],
    gymPRs: [],
    gymBodyMeasurements: [],
    activeWorkout: null
};

export class GymStore {
    constructor() {
        this.gymExercises = [];
        this.gymTemplates = [];
        this.gymLogs = [];
        this.gymPRs = [];
        this.gymBodyMeasurements = [];
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

    setActiveWorkout(workout) {
        this.activeWorkout = workout;
    }
}
