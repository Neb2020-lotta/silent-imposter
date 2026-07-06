export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      account_sessions: {
        Row: {
          account_id: string
          created_at: string
          ip: string | null
          token: string
        }
        Insert: {
          account_id: string
          created_at?: string
          ip?: string | null
          token?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          ip?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_sessions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          created_at: string
          id: string
          last_ip: string | null
          password_hash: string
          username: string
          username_lower: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_ip?: string | null
          password_hash: string
          username: string
          username_lower: string
        }
        Update: {
          created_at?: string
          id?: string
          last_ip?: string | null
          password_hash?: string
          username?: string
          username_lower?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          kind: string
          player_id: string | null
          player_name: string
          room_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          kind?: string
          player_id?: string | null
          player_name: string
          room_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          kind?: string
          player_id?: string | null
          player_name?: string
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_bans: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          ip: string
          kind: string
          reason: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          ip: string
          kind: string
          reason?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          ip?: string
          kind?: string
          reason?: string | null
        }
        Relationships: []
      }
      player_secrets: {
        Row: {
          client_id: string
          imposter_tip: string | null
          is_imposter: boolean
          player_id: string
          room_id: string
          voted_for: string | null
          word: string | null
        }
        Insert: {
          client_id: string
          imposter_tip?: string | null
          is_imposter?: boolean
          player_id: string
          room_id: string
          voted_for?: string | null
          word?: string | null
        }
        Update: {
          client_id?: string
          imposter_tip?: string | null
          is_imposter?: boolean
          player_id?: string
          room_id?: string
          voted_for?: string | null
          word?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_secrets_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_secrets_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          id: string
          is_host: boolean
          joined_at: string
          name: string
          room_id: string
        }
        Insert: {
          id?: string
          is_host?: boolean
          joined_at?: string
          name: string
          room_id: string
        }
        Update: {
          id?: string
          is_host?: boolean
          joined_at?: string
          name?: string
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_secrets: {
        Row: {
          host_id: string
          host_secret: string
          room_id: string
        }
        Insert: {
          host_id: string
          host_secret?: string
          room_id: string
        }
        Update: {
          host_id?: string
          host_secret?: string
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_secrets_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: true
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          category: string
          code: string
          created_at: string
          current_turn_player_id: string | null
          eliminated_player_id: string | null
          hint: string | null
          id: string
          imposter_count: number
          starting_player_id: string | null
          state: string
          word: string | null
        }
        Insert: {
          category?: string
          code: string
          created_at?: string
          current_turn_player_id?: string | null
          eliminated_player_id?: string | null
          hint?: string | null
          id?: string
          imposter_count?: number
          starting_player_id?: string | null
          state?: string
          word?: string | null
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          current_turn_player_id?: string | null
          eliminated_player_id?: string | null
          hint?: string | null
          id?: string
          imposter_count?: number
          starting_player_id?: string | null
          state?: string
          word?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      account_from_token: {
        Args: { p_token: string }
        Returns: {
          account_id: string
          username: string
        }[]
      }
      account_login: {
        Args: { p_ip: string; p_password: string; p_username: string }
        Returns: {
          account_id: string
          token: string
          username: string
        }[]
      }
      account_login_by_ip: {
        Args: { p_ip: string }
        Returns: {
          account_id: string
          token: string
          username: string
        }[]
      }
      account_logout: { Args: { p_token: string }; Returns: undefined }
      account_register: {
        Args: { p_ip: string; p_password: string; p_username: string }
        Returns: {
          account_id: string
          token: string
          username: string
        }[]
      }
      create_room: {
        Args: {
          p_category: string
          p_client_id: string
          p_code: string
          p_name: string
        }
        Returns: {
          host_secret: string
          player_id: string
          room_id: string
        }[]
      }
      friend_accept: {
        Args: { p_requester_id: string; p_token: string }
        Returns: undefined
      }
      friend_list: {
        Args: { p_token: string }
        Returns: {
          direction: string
          other_id: string
          status: string
          username: string
        }[]
      }
      friend_remove: {
        Args: { p_other_id: string; p_token: string }
        Returns: undefined
      }
      friend_request: {
        Args: { p_target_username: string; p_token: string }
        Returns: undefined
      }
      get_imposters: { Args: { p_room_id: string }; Returns: string[] }
      get_my_role: {
        Args: { p_client_id: string; p_room_id: string }
        Returns: {
          imposter_tip: string
          is_imposter: boolean
          player_id: string
          voted_for: string
          word: string
        }[]
      }
      get_vote_tally: {
        Args: { p_room_id: string }
        Returns: {
          target_id: string
          votes: number
        }[]
      }
      get_voted_count: { Args: { p_room_id: string }; Returns: number }
      host_new_round: {
        Args: { p_room_id: string; p_secret: string }
        Returns: undefined
      }
      host_set_category: {
        Args: { p_category: string; p_room_id: string; p_secret: string }
        Returns: undefined
      }
      host_set_elimination: {
        Args: { p_eliminated: string; p_room_id: string; p_secret: string }
        Returns: undefined
      }
      host_set_state: {
        Args: { p_room_id: string; p_secret: string; p_state: string }
        Returns: undefined
      }
      host_start_game: {
        Args: {
          p_hint: string
          p_imposters: string[]
          p_room_id: string
          p_secret: string
          p_starting: string
          p_tips: string[]
          p_word: string
        }
        Returns: undefined
      }
      join_room: {
        Args: { p_client_id: string; p_code: string; p_name: string }
        Returns: {
          player_id: string
          room_id: string
        }[]
      }
      player_advance_turn: {
        Args: { p_client_id: string; p_next_player: string; p_room_id: string }
        Returns: undefined
      }
      player_cast_vote: {
        Args: { p_client_id: string; p_room_id: string; p_target: string }
        Returns: undefined
      }
      player_leave: {
        Args: { p_client_id: string; p_room_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
