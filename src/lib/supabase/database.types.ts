// Generated from the Supabase schema (supabase/migrations) and lightly
// adjusted for nullability of RPC columns.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type TeamRole = "admin" | "member";
export type InsightsVisibility = "admins" | "members";

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      entries: {
        Row: {
          author_id: string | null;
          content: string;
          created_at: string;
          field_id: string;
          id: string;
          team_id: string;
          updated_at: string;
        };
        Insert: {
          author_id?: string | null;
          content: string;
          created_at?: string;
          field_id: string;
          id?: string;
          team_id: string;
          updated_at?: string;
        };
        Update: {
          content?: string;
          field_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "entries_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "entries_field_id_team_id_fkey";
            columns: ["field_id", "team_id"];
            isOneToOne: false;
            referencedRelation: "team_fields";
            referencedColumns: ["id", "team_id"];
          },
          {
            foreignKeyName: "entries_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string;
          full_name: string | null;
          google_sub: string;
          id: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          email: string;
          full_name?: string | null;
          google_sub: string;
          id?: string;
        };
        Update: {
          avatar_url?: string | null;
          email?: string;
          full_name?: string | null;
        };
        Relationships: [];
      };
      team_fields: {
        Row: {
          created_at: string;
          emoji: string;
          id: string;
          is_active: boolean;
          label: string;
          placeholder: string | null;
          position: number;
          team_id: string;
          updated_at: string;
        };
        Insert: {
          emoji?: string;
          is_active?: boolean;
          label: string;
          placeholder?: string | null;
          position?: number;
          team_id: string;
        };
        Update: {
          emoji?: string;
          is_active?: boolean;
          label?: string;
          placeholder?: string | null;
          position?: number;
        };
        Relationships: [
          {
            foreignKeyName: "team_fields_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      team_members: {
        Row: {
          added_by: string | null;
          created_at: string;
          email: string;
          id: string;
          role: TeamRole;
          team_id: string;
        };
        Insert: {
          email: string;
          role?: TeamRole;
          team_id: string;
        };
        Update: {
          role?: TeamRole;
        };
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      teams: {
        Row: {
          created_at: string;
          created_by: string | null;
          description: string | null;
          id: string;
          insights_visibility: InsightsVisibility;
          name: string;
          public_submissions_enabled: boolean;
          public_requires_identity: boolean;
          updated_at: string;
        };
        Insert: never;
        Update: {
          description?: string | null;
          insights_visibility?: InsightsVisibility;
          name?: string;
          public_submissions_enabled?: boolean;
          public_requires_identity?: boolean;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      create_team: {
        Args: { p_description?: string; p_name: string };
        Returns: string;
      };
      get_achievements: {
        Args: { p_team_id: string };
        Returns: {
          avatar_url: string | null;
          entry_count: number;
          full_name: string | null;
          is_me: boolean;
          member_email: string;
        }[];
      };
      get_insights: {
        Args: { p_from: string; p_team_id: string; p_to: string };
        Returns: {
          author_avatar_url: string | null;
          author_email: string | null;
          author_id: string | null;
          author_name: string | null;
          content: string;
          created_at: string;
          entry_id: string;
          field_id: string;
          is_anonymous: boolean;
          updated_at: string;
        }[];
      };
      my_teams: {
        Args: never;
        Returns: {
          can_view_insights: boolean;
          created_at: string;
          description: string | null;
          id: string;
          insights_visibility: InsightsVisibility;
          name: string;
          public_submissions_enabled: boolean;
          public_requires_identity: boolean;
          public_token: string | null;
          role: TeamRole;
        }[];
      };
      reorder_fields: {
        Args: { p_field_ids: string[]; p_team_id: string };
        Returns: undefined;
      };
      submit_anonymous_entry: {
        Args: { p_team_id: string; p_field_id: string; p_content: string };
        Returns: undefined;
      };
      regenerate_public_token: {
        Args: { p_team_id: string };
        Returns: string;
      };
      get_public_form: {
        Args: { p_token: string };
        Returns: Json;
      };
      submit_public_entry: {
        Args: { p_token: string; p_field_id: string; p_content: string };
        Returns: undefined;
      };
    };
    Enums: {
      insights_visibility: InsightsVisibility;
      team_role: TeamRole;
    };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicSchema = Database["public"];
export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type RpcReturn<F extends keyof PublicSchema["Functions"]> = PublicSchema["Functions"][F]["Returns"];
