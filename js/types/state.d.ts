import type { Database, Tables } from './database.js';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
}

export interface ActiveWorkoutSet {
  exercise_id: string;
  set_order: number;
  reps: number;
  weight_kg: number;
  is_warmup: boolean;
  completed?: boolean;
}

export interface ActiveWorkoutState {
  id?: string;
  title: string;
  startTime: string;
  durationSeconds: number;
  sets: ActiveWorkoutSet[];
  isResting?: boolean;
  restStartTime?: string;
  restDurationSeconds?: number;
}

export interface MediaLibraryState {
  movies: Tables<'library_content'>[];
  series: Tables<'library_content'>[];
  games: Tables<'library_content'>[];
}

export interface ChannelItem {
  id: string;
  name: string;
  icon: string;
  type?: string;
  color?: string;
  desc?: string;
}

export interface ChannelCategory {
  name: string;
  items: ChannelItem[];
}

export interface AppSettings {
  theme: string;
  glassmorphism: boolean;
  blurIntensity: number;
  haptics: boolean;
  soundEnabled: boolean;
  timelineViewMode: 'list' | 'grid';
  pinnedPhotos: string[];
  sidebar: {
    hiddenChannels: string[];
    channelOrder: string[];
    categoryOrder: string[];
    channelCategoryMap: Record<string, string>;
    collapsedCategories: string[];
  };
  dashboardWidgets: {
    loveShop: boolean;
    health: boolean;
    supplements: boolean;
    schoolDorm: boolean;
    dailyQuestion: boolean;
    facts: boolean;
    notes: boolean;
    calendar: boolean;
  };
}

export interface TrainingSplitDay {
  dayOfWeek: number; // 1 = Pondělí, ..., 7 = Neděle (or 0)
  splitName: string; // např. "Push Day 🦍"
  templateId?: string | null;
  isRest: boolean;
  preferredTime?: string | null; // "17:00"
}

export interface TrainingSplit {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  is_active: boolean;
  rotation_mode?: 'fixed_days' | 'rolling';
  schedule_pattern: TrainingSplitDay[];
  created_at?: string;
  updated_at?: string;
}

export interface AppState {
  currentChannel: string;
  currentUser: UserProfile;
  user_ids: { jose: string | null; klarka: string | null };
  healthData: Record<string, Tables<'health_data'>>;
  library: MediaLibraryState;
  watchlist: Tables<'library_watchlist'>[];
  watchHistory: Record<string, Tables<'library_ratings'>>;
  movieHistory: Record<string, Array<{ media_id: string; rating: number; status: string }>>;
  calendarFilter: string;
  plannedDates: Record<string, Tables<'planned_dates'>>;
  timelineEvents: Tables<'timeline_events'>[];
  bucketList: Tables<'bucket_list'>[];
  dateLocations: Tables<'date_locations'>[];
  achievements: Tables<'achievements'>[];
  loveCoins: { jose: number; klarka: number };
  relationshipXP?: number;
  gymExercises: Tables<'gym_exercises'>[];
  gymTemplates: Tables<'gym_templates'>[];
  gymLogs: Tables<'gym_workouts'>[];
  gymPRs: any[];
  gymBodyMeasurements: Tables<'gym_body_measurements'>[];
  trainingSplits?: TrainingSplit[];
  activeTrainingSplit?: TrainingSplit | null;
  activeWorkout: ActiveWorkoutState | null;
  schoolDeadlines: Tables<'study_deadlines'>[];
  schoolSubjects: Tables<'vut_subjects'>[];
  coopQuests: Tables<'quests'>[];
  habits?: Tables<'habits_items'>[];
  futureLetters?: Tables<'future_letters'>[];
  settings: AppSettings;
  _loaded?: Record<string, boolean>;
  [key: string]: any;
}

