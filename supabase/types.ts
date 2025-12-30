export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      achievements: {
        Row: {
          created_at: string
          goal: number
          id: string
          name: string
          profile_id: string | null
          progress: number
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          goal: number
          id?: string
          name: string
          profile_id?: string | null
          progress: number
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          goal?: number
          id?: string
          name?: string
          profile_id?: string | null
          progress?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievements_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_message_reactions: {
        Row: {
          id: string
          message_id: string
          profile_id: string
          emoji: string
          created_at: string
        }
        Insert: {
          id?: string
          message_id: string
          profile_id: string
          emoji: string
          created_at?: string
        }
        Update: {
          id?: string
          message_id?: string
          profile_id?: string
          emoji?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_message_reactions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          id: string
          room: string
          profile_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          room: string
          profile_id: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          room?: string
          profile_id?: string
          content?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_draft_events: {
        Row: {
          id: string
          game_id: string
          team_id: string | null
          profile_id: string | null
          action: string
          payload: Json
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          game_id: string
          team_id?: string | null
          profile_id?: string | null
          action: string
          payload?: Json
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          game_id?: string
          team_id?: string | null
          profile_id?: string | null
          action?: string
          payload?: Json
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_draft_events_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_draft_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "game_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_draft_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_draft_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string
          description: string | null
          end_time: string | null
          id: string
          name: string
          profile_id: string | null
          start_time: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_time?: string | null
          id?: string
          name: string
          profile_id?: string | null
          start_time?: string | null
          status: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_time?: string | null
          id?: string
          name?: string
          profile_id?: string | null
          start_time?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_user_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          id: string
          name: string
          description: string | null
          start_time: string
          end_time: string | null
          location_name: string | null
          location_notes: string | null
          cost_cents: number
          capacity: number
          waitlist_capacity: number | null
          status: Database["public"]["Enums"]["game_status"]
          draft_status: Database["public"]["Enums"]["draft_status"]
          draft_turn: number | null
          draft_direction: number | null
          created_by: string
          created_at: string
          updated_at: string
          cancelled_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          start_time: string
          end_time?: string | null
          location_name?: string | null
          location_notes?: string | null
          cost_cents?: number
          capacity: number
          waitlist_capacity?: number | null
          status?: Database["public"]["Enums"]["game_status"]
          draft_status?: Database["public"]["Enums"]["draft_status"]
          draft_turn?: number | null
          draft_direction?: number | null
          created_by: string
          created_at?: string
          updated_at?: string
          cancelled_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          start_time?: string
          end_time?: string | null
          location_name?: string | null
          location_notes?: string | null
          cost_cents?: number
          capacity?: number
          waitlist_capacity?: number | null
          status?: Database["public"]["Enums"]["game_status"]
          draft_status?: Database["public"]["Enums"]["draft_status"]
          draft_turn?: number | null
          draft_direction?: number | null
          created_by?: string
          created_at?: string
          updated_at?: string
          cancelled_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "games_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_queue: {
        Row: {
          id: string
          game_id: string
          profile_id: string
          status: Database["public"]["Enums"]["game_queue_status"]
          joined_at: string
          promoted_at: string | null
          cancelled_at: string | null
          attendance_confirmed_at: string | null
        }
        Insert: {
          id?: string
          game_id: string
          profile_id: string
          status?: Database["public"]["Enums"]["game_queue_status"]
          joined_at?: string
          promoted_at?: string | null
          cancelled_at?: string | null
          attendance_confirmed_at?: string | null
        }
        Update: {
          id?: string
          game_id?: string
          profile_id?: string
          status?: Database["public"]["Enums"]["game_queue_status"]
          joined_at?: string
          promoted_at?: string | null
          cancelled_at?: string | null
          attendance_confirmed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_queue_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_queue_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_captains: {
        Row: {
          id: string
          game_id: string
          profile_id: string
          slot: number
          created_at: string
        }
        Insert: {
          id?: string
          game_id: string
          profile_id: string
          slot: number
          created_at?: string
        }
        Update: {
          id?: string
          game_id?: string
          profile_id?: string
          slot?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_captains_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_captains_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_results: {
        Row: {
          id: string
          game_id: string
          winning_team_id: string | null
          losing_team_id: string | null
          winner_score: number | null
          loser_score: number | null
          reported_by: string | null
          reported_at: string
          status: string
        }
        Insert: {
          id?: string
          game_id: string
          winning_team_id?: string | null
          losing_team_id?: string | null
          winner_score?: number | null
          loser_score?: number | null
          reported_by?: string | null
          reported_at?: string
          status?: string
        }
        Update: {
          id?: string
          game_id?: string
          winning_team_id?: string | null
          losing_team_id?: string | null
          winner_score?: number | null
          loser_score?: number | null
          reported_by?: string | null
          reported_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_results_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: true
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_results_winning_team_id_fkey"
            columns: ["winning_team_id"]
            isOneToOne: false
            referencedRelation: "game_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_results_losing_team_id_fkey"
            columns: ["losing_team_id"]
            isOneToOne: false
            referencedRelation: "game_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      game_teams: {
        Row: {
          id: string
          game_id: string
          name: string
          draft_order: number
          captain_profile_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          game_id: string
          name: string
          draft_order: number
          captain_profile_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          game_id?: string
          name?: string
          draft_order?: number
          captain_profile_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_teams_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_teams_captain_profile_id_fkey"
            columns: ["captain_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_team_members: {
        Row: {
          id: string
          game_team_id: string
          profile_id: string
          assigned_by: string | null
          assigned_at: string
          pick_order: number | null
        }
        Insert: {
          id?: string
          game_team_id: string
          profile_id: string
          assigned_by?: string | null
          assigned_at?: string
          pick_order?: number | null
        }
        Update: {
          id?: string
          game_team_id?: string
          profile_id?: string
          assigned_by?: string | null
          assigned_at?: string
          pick_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "game_team_members_game_team_id_fkey"
            columns: ["game_team_id"]
            isOneToOne: false
            referencedRelation: "game_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_team_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_player_stats: {
        Row: {
          id: string
          game_id: string
          team_id: string
          profile_id: string
          result: string
          pick_order: number | null
          recorded_at: string
        }
        Insert: {
          id?: string
          game_id: string
          team_id: string
          profile_id: string
          result: string
          pick_order?: number | null
          recorded_at?: string
        }
        Update: {
          id?: string
          game_id?: string
          team_id?: string
          profile_id?: string
          result?: string
          pick_order?: number | null
          recorded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_player_stats_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_player_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "game_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_player_stats_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      installs: {
        Row: {
          expo_tokens: string[] | null
          user_id: string
        }
        Insert: {
          expo_tokens?: string[] | null
          user_id: string
        }
        Update: {
          expo_tokens?: string[] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "installs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          category_id: string | null
          content: string | null
          created_at: string
          id: string
          image_url: string | null
          profile_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          profile_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          profile_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          id: string
          name: string | null
          about: string | null
          avatar_url: string | null
          address: string | null
          first_name: string | null
          last_name: string | null
          email: string | null
          phone: string | null
          birth_date: string | null
          jersey_number: number | null
          position: string | null
          role: Database["public"]["Enums"]["profile_role"]
          approval_status: Database["public"]["Enums"]["profile_approval_status"]
        }
        Insert: {
          id: string
          name?: string | null
          about?: string | null
          avatar_url?: string | null
          address?: string | null
          first_name?: string | null
          last_name?: string | null
          email?: string | null
          phone?: string | null
          birth_date?: string | null
          jersey_number?: number | null
          position?: string | null
          role?: Database["public"]["Enums"]["profile_role"]
          approval_status?: Database["public"]["Enums"]["profile_approval_status"]
        }
        Update: {
          id?: string
          name?: string | null
          about?: string | null
          avatar_url?: string | null
          address?: string | null
          first_name?: string | null
          last_name?: string | null
          email?: string | null
          phone?: string | null
          birth_date?: string | null
          jersey_number?: number | null
          position?: string | null
          role?: Database["public"]["Enums"]["profile_role"]
          approval_status?: Database["public"]["Enums"]["profile_approval_status"]
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          number_of_days: number | null
          paid_project: boolean | null
          profile_id: string | null
          project_type: string | null
          street: string | null
          updated_at: string
          us_zip_code: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          number_of_days?: number | null
          paid_project?: boolean | null
          profile_id?: string | null
          project_type?: string | null
          street?: string | null
          updated_at?: string
          us_zip_code?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          number_of_days?: number | null
          paid_project?: boolean | null
          profile_id?: string | null
          project_type?: string | null
          street?: string | null
          updated_at?: string
          us_zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          referred_id: string | null
          referrer_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          referred_id?: string | null
          referrer_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          referred_id?: string | null
          referrer_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_stats: {
        Row: {
          arr: number | null
          created_at: string
          id: string
          mrr: number | null
          profile_id: string | null
          updated_at: string
          weekly_post_views: number | null
        }
        Insert: {
          arr?: number | null
          created_at?: string
          id?: string
          mrr?: number | null
          profile_id?: string | null
          updated_at?: string
          weekly_post_views?: number | null
        }
        Update: {
          arr?: number | null
          created_at?: string
          id?: string
          mrr?: number | null
          profile_id?: string | null
          updated_at?: string
          weekly_post_views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_stats_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_game_statistics: {
        Args: {
          p_game_ids: string[]
          p_profile_id: string
        }
        Returns: {
          game_id: string
          confirmed_count: number
          waitlisted_count: number
          attendance_confirmed_count: number
          user_status: Database["public"]["Enums"]["game_queue_status"] | null
          user_attendance_confirmed_at: string | null
        }[]
      }
      get_player_stats: {
        Args: {
          p_profile_id: string
        }
        Returns: {
          wins: number
          losses: number
          games: number
        }[]
      }
      get_player_recent_records: {
        Args: {
          p_profile_ids: string[]
        }
        Returns: {
          profile_id: string
          wins: number
          losses: number
          recent_outcomes: string[]
        }[]
      }
      join_game_queue: {
        Args: {
          p_game_id: string
        }
        Returns: {
          status: Database["public"]["Enums"]["game_queue_status"]
        }
      }
      leave_game_queue: {
        Args: {
          p_game_id: string
        }
        Returns: {
          status: Database["public"]["Enums"]["game_queue_status"]
        }
      }
    }
    Enums: {
      draft_status: "pending" | "ready" | "in_progress" | "completed"
      game_queue_status: "confirmed" | "waitlisted" | "cancelled"
      game_status: "scheduled" | "locked" | "completed" | "cancelled"
      profile_role: "member" | "captain" | "admin"
      profile_approval_status: "pending" | "approved" | "draft"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never
