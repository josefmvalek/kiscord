/**
 * Supabase Database TypeScript Definitions for Kiscord
 * Auto-generated schema mappings matching Supabase PostgreSQL tables.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          email: string | null;
          avatar_url: string | null;
          love_coins: number;
          relationship_xp: number;
          level: number;
          created_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          love_coins?: number;
          relationship_xp?: number;
          level?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          username?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          love_coins?: number;
          relationship_xp?: number;
          level?: number;
          created_at?: string;
        };
      };

      health_data: {
        Row: {
          date_key: string;
          user_id: string;
          water: number;
          sleep_hours: number | null;
          sleep_start: string | null;
          sleep_end: string | null;
          mood: number | null;
          pills: Json | null;
          notes: string | null;
          activities: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Insert: {
          date_key: string;
          user_id: string;
          water?: number;
          sleep_hours?: number | null;
          sleep_start?: string | null;
          sleep_end?: string | null;
          mood?: number | null;
          pills?: Json | null;
          notes?: string | null;
          activities?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          date_key?: string;
          user_id?: string;
          water?: number;
          sleep_hours?: number | null;
          sleep_start?: string | null;
          sleep_end?: string | null;
          mood?: number | null;
          pills?: Json | null;
          notes?: string | null;
          activities?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
      };

      gym_workouts: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          duration_seconds: number;
          volume_kg: number;
          total_sets: number;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          duration_seconds?: number;
          volume_kg?: number;
          total_sets?: number;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          duration_seconds?: number;
          volume_kg?: number;
          total_sets?: number;
          notes?: string | null;
          created_at?: string;
        };
      };

      gym_sets: {
        Row: {
          id: string;
          workout_id: string;
          exercise_id: string;
          set_order: number;
          reps: number;
          weight_kg: number;
          is_warmup: boolean;
          rpe: number | null;
          created_at?: string;
        };
        Insert: {
          id?: string;
          workout_id: string;
          exercise_id: string;
          set_order?: number;
          reps?: number;
          weight_kg?: number;
          is_warmup?: boolean;
          rpe?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          workout_id?: string;
          exercise_id?: string;
          set_order?: number;
          reps?: number;
          weight_kg?: number;
          is_warmup?: boolean;
          rpe?: number | null;
          created_at?: string;
        };
      };

      gym_exercises: {
        Row: {
          id: string;
          name: string;
          category: string;
          muscle_primary: string;
          muscle_secondary: string | null;
          gif_url: string | null;
          instructions: string | null;
          pr_weight_kg: number | null;
          pr_reps: number | null;
        };
        Insert: {
          id: string;
          name: string;
          category: string;
          muscle_primary: string;
          muscle_secondary?: string | null;
          gif_url?: string | null;
          instructions?: string | null;
          pr_weight_kg?: number | null;
          pr_reps?: number | null;
        };
        Update: {
          id?: string;
          name?: string;
          category?: string;
          muscle_primary?: string;
          muscle_secondary?: string | null;
          gif_url?: string | null;
          instructions?: string | null;
          pr_weight_kg?: number | null;
          pr_reps?: number | null;
        };
      };

      gym_templates: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          exercises_json: Json;
          is_shared: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          exercises_json?: Json;
          is_shared?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          exercises_json?: Json;
          is_shared?: boolean;
          created_at?: string;
        };
      };

      gym_body_measurements: {
        Row: {
          id: string;
          user_id: string;
          date_key: string;
          weight_kg: number | null;
          waist_cm: number | null;
          arms_cm: number | null;
          chest_cm: number | null;
          photos: string[] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date_key: string;
          weight_kg?: number | null;
          waist_cm?: number | null;
          arms_cm?: number | null;
          chest_cm?: number | null;
          photos?: string[] | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date_key?: string;
          weight_kg?: number | null;
          waist_cm?: number | null;
          arms_cm?: number | null;
          chest_cm?: number | null;
          photos?: string[] | null;
          created_at?: string;
        };
      };

      love_coupons: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          cost: number;
          icon: string;
          category: string;
          is_active: boolean;
          redeemed_at: string | null;
          redeemed_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          cost?: number;
          icon?: string;
          category?: string;
          is_active?: boolean;
          redeemed_at?: string | null;
          redeemed_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          cost?: number;
          icon?: string;
          category?: string;
          is_active?: boolean;
          redeemed_at?: string | null;
          redeemed_by?: string | null;
          created_at?: string;
        };
      };

      achievements: {
        Row: {
          id: string;
          user_id: string;
          achievement_key: string;
          progress: number;
          unlocked_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          achievement_key: string;
          progress?: number;
          unlocked_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          achievement_key?: string;
          progress?: number;
          unlocked_at?: string | null;
        };
      };

      quests: {
        Row: {
          id: string;
          title: string;
          description: string;
          target_value: number;
          current_value: number;
          is_completed: boolean;
          reward_coins: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          target_value: number;
          current_value?: number;
          is_completed?: boolean;
          reward_coins?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          target_value?: number;
          current_value?: number;
          is_completed?: boolean;
          reward_coins?: number;
          created_at?: string;
        };
      };

      app_finances: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          amount: number;
          type: 'income' | 'expense';
          category: string;
          date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          amount: number;
          type: 'income' | 'expense';
          category?: string;
          date?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          amount?: number;
          type?: 'income' | 'expense';
          category?: string;
          date?: string;
          created_at?: string;
        };
      };

      vut_subjects: {
        Row: {
          id: string;
          code: string;
          name: string;
          credits: number;
          points_current: number;
          points_max: number;
          has_credit: boolean;
          has_exam: boolean;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          credits?: number;
          points_current?: number;
          points_max?: number;
          has_credit?: boolean;
          has_exam?: boolean;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          credits?: number;
          points_current?: number;
          points_max?: number;
          has_credit?: boolean;
          has_exam?: boolean;
        };
      };

      study_deadlines: {
        Row: {
          id: string;
          subject_code: string;
          title: string;
          due_date: string;
          type: 'project' | 'exam' | 'quiz' | 'homework';
          is_done: boolean;
        };
        Insert: {
          id?: string;
          subject_code: string;
          title: string;
          due_date: string;
          type?: 'project' | 'exam' | 'quiz' | 'homework';
          is_done?: boolean;
        };
        Update: {
          id?: string;
          subject_code?: string;
          title?: string;
          due_date?: string;
          type?: 'project' | 'exam' | 'quiz' | 'homework';
          is_done?: boolean;
        };
      };

      dorm_checklist: {
        Row: {
          id: string;
          category: string;
          item_name: string;
          is_packed: boolean;
          assigned_to: string | null;
        };
        Insert: {
          id?: string;
          category: string;
          item_name: string;
          is_packed?: boolean;
          assigned_to?: string | null;
        };
        Update: {
          id?: string;
          category?: string;
          item_name?: string;
          is_packed?: boolean;
          assigned_to?: string | null;
        };
      };

      dorm_laundry: {
        Row: {
          id: string;
          machine_id: string;
          slot_start: string;
          slot_end: string;
          user_id: string;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          machine_id: string;
          slot_start: string;
          slot_end: string;
          user_id: string;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          machine_id?: string;
          slot_start?: string;
          slot_end?: string;
          user_id?: string;
          is_active?: boolean;
        };
      };

      library_content: {
        Row: {
          id: string;
          title: string;
          type: 'movie' | 'series' | 'game';
          cat: string;
          poster_path: string | null;
          rating: number | null;
          year: number | null;
          runtime_min: number | null;
          is_staple: boolean;
          magnet_link: string | null;
          gdrive_link: string | null;
          trailer_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          type: 'movie' | 'series' | 'game';
          cat?: string;
          poster_path?: string | null;
          rating?: number | null;
          year?: number | null;
          runtime_min?: number | null;
          is_staple?: boolean;
          magnet_link?: string | null;
          gdrive_link?: string | null;
          trailer_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          type?: 'movie' | 'series' | 'game';
          cat?: string;
          poster_path?: string | null;
          rating?: number | null;
          year?: number | null;
          runtime_min?: number | null;
          is_staple?: boolean;
          magnet_link?: string | null;
          gdrive_link?: string | null;
          trailer_url?: string | null;
          created_at?: string;
        };
      };

      library_watchlist: {
        Row: {
          id: string;
          media_id: string;
          added_by: string;
          type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          media_id: string;
          added_by: string;
          type?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          media_id?: string;
          added_by?: string;
          type?: string;
          created_at?: string;
        };
      };

      library_ratings: {
        Row: {
          id: string;
          media_id: string;
          user_id: string;
          status: 'watching' | 'seen' | 'planned';
          rating: number;
          reaction: string | null;
          review: string | null;
          watched_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          media_id: string;
          user_id: string;
          status?: 'watching' | 'seen' | 'planned';
          rating?: number;
          reaction?: string | null;
          review?: string | null;
          watched_date?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          media_id?: string;
          user_id?: string;
          status?: 'watching' | 'seen' | 'planned';
          rating?: number;
          reaction?: string | null;
          review?: string | null;
          watched_date?: string | null;
          created_at?: string;
        };
      };

      drawings: {
        Row: {
          id: string;
          image_data: string;
          prompt: string | null;
          created_by: string;
          likes: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          image_data: string;
          prompt?: string | null;
          created_by: string;
          likes?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          image_data?: string;
          prompt?: string | null;
          created_by?: string;
          likes?: number;
          created_at?: string;
        };
      };

      tier_lists: {
        Row: {
          id: string;
          title: string;
          category: string;
          items_json: Json;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          category?: string;
          items_json?: Json;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          category?: string;
          items_json?: Json;
          created_by?: string;
          created_at?: string;
        };
      };

      timeline_events: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          event_date: string;
          images: string[];
          location: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          event_date: string;
          images?: string[];
          location?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          event_date?: string;
          images?: string[];
          location?: string | null;
          created_at?: string;
        };
      };

      planned_dates: {
        Row: {
          id: string;
          date_key: string;
          name: string;
          cat: string;
          status: 'pending' | 'accepted' | 'rejected';
          proposto_by: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          date_key: string;
          name: string;
          cat?: string;
          status?: 'pending' | 'accepted' | 'rejected';
          proposto_by: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          date_key?: string;
          name?: string;
          cat?: string;
          status?: 'pending' | 'accepted' | 'rejected';
          proposto_by?: string;
          notes?: string | null;
          created_at?: string;
        };
      };

      bucket_list: {
        Row: {
          id: string;
          title: string;
          category: string;
          is_completed: boolean;
          is_priority: boolean;
          photo_url: string | null;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          category?: string;
          is_completed?: boolean;
          is_priority?: boolean;
          photo_url?: string | null;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          category?: string;
          is_completed?: boolean;
          is_priority?: boolean;
          photo_url?: string | null;
          completed_at?: string | null;
          created_at?: string;
        };
      };

      date_locations: {
        Row: {
          id: string;
          name: string;
          lat: number;
          lng: number;
          category: string;
          notes: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          lat: number;
          lng: number;
          category?: string;
          notes?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          lat?: number;
          lng?: number;
          category?: string;
          notes?: string | null;
        };
      };

      future_letters: {
        Row: {
          id: string;
          title: string;
          body: string;
          unlock_at: string;
          from_user: string;
          to_user: string;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          body: string;
          unlock_at: string;
          from_user: string;
          to_user: string;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          body?: string;
          unlock_at?: string;
          from_user?: string;
          to_user?: string;
          is_read?: boolean;
          created_at?: string;
        };
      };

      habits_items: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          icon: string;
          target_frequency: string;
          history: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          icon?: string;
          target_frequency?: string;
          history?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          icon?: string;
          target_frequency?: string;
          history?: Json;
          created_at?: string;
        };
      };
    };
  };
}

/** Convenience Generic Type Helpers */
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
