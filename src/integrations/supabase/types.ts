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
      churches: {
        Row: {
          address: string | null
          created_at: string
          id: string
          logo_url: string | null
          name: string
          organization_id: string | null
          owner_id: string
          pastor: string | null
          phone: string | null
          type: Database["public"]["Enums"]["church_type"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          organization_id?: string | null
          owner_id: string
          pastor?: string | null
          phone?: string | null
          type?: Database["public"]["Enums"]["church_type"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          organization_id?: string | null
          owner_id?: string
          pastor?: string | null
          phone?: string | null
          type?: Database["public"]["Enums"]["church_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "churches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          church_id: string
          created_at: string
          description: string | null
          id: string
          organization_id: string | null
          owner_id: string
          starts_at: string
          title: string
          type: Database["public"]["Enums"]["event_type"]
          updated_at: string
        }
        Insert: {
          church_id: string
          created_at?: string
          description?: string | null
          id?: string
          organization_id?: string | null
          owner_id: string
          starts_at: string
          title: string
          type?: Database["public"]["Enums"]["event_type"]
          updated_at?: string
        }
        Update: {
          church_id?: string
          created_at?: string
          description?: string | null
          id?: string
          organization_id?: string | null
          owner_id?: string
          starts_at?: string
          title?: string
          type?: Database["public"]["Enums"]["event_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          accepted_by_user_id: string | null
          branch_church_id: string | null
          created_at: string
          email: string
          expires_at: string
          full_name: string | null
          id: string
          invited_by_user_id: string
          organization_id: string
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by_user_id?: string | null
          branch_church_id?: string | null
          created_at?: string
          email: string
          expires_at?: string
          full_name?: string | null
          id?: string
          invited_by_user_id: string
          organization_id: string
          phone?: string | null
          role: Database["public"]["Enums"]["app_role"]
          status?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by_user_id?: string | null
          branch_church_id?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          full_name?: string | null
          id?: string
          invited_by_user_id?: string
          organization_id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_branch_church_id_fkey"
            columns: ["branch_church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          birthday: string | null
          church_id: string
          created_at: string
          email: string | null
          id: string
          ministerial_role: string | null
          name: string
          notes: string | null
          organization_id: string | null
          owner_id: string
          phone: string | null
          sex: string | null
          type: Database["public"]["Enums"]["member_type"]
          updated_at: string
        }
        Insert: {
          birthday?: string | null
          church_id: string
          created_at?: string
          email?: string | null
          id?: string
          ministerial_role?: string | null
          name: string
          notes?: string | null
          organization_id?: string | null
          owner_id: string
          phone?: string | null
          sex?: string | null
          type?: Database["public"]["Enums"]["member_type"]
          updated_at?: string
        }
        Update: {
          birthday?: string | null
          church_id?: string
          created_at?: string
          email?: string | null
          id?: string
          ministerial_role?: string | null
          name?: string
          notes?: string | null
          organization_id?: string | null
          owner_id?: string
          phone?: string | null
          sex?: string | null
          type?: Database["public"]["Enums"]["member_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "members_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_members: {
        Row: {
          branch_church_id: string | null
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          branch_church_id?: string | null
          created_at?: string
          id?: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          branch_church_id?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_members_branch_church_id_fkey"
            columns: ["branch_church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          theme: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          theme?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          theme?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          category: string | null
          church_id: string
          created_at: string
          description: string | null
          id: string
          occurred_at: string
          organization_id: string | null
          owner_id: string
          tither_member_id: string | null
          tither_name: string | null
          type: Database["public"]["Enums"]["tx_type"]
          updated_at: string
        }
        Insert: {
          amount: number
          category?: string | null
          church_id: string
          created_at?: string
          description?: string | null
          id?: string
          occurred_at?: string
          organization_id?: string | null
          owner_id: string
          tither_member_id?: string | null
          tither_name?: string | null
          type: Database["public"]["Enums"]["tx_type"]
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string | null
          church_id?: string
          created_at?: string
          description?: string | null
          id?: string
          occurred_at?: string
          organization_id?: string | null
          owner_id?: string
          tither_member_id?: string | null
          tither_name?: string | null
          type?: Database["public"]["Enums"]["tx_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_tither_member_id_fkey"
            columns: ["tither_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_branch: {
        Args: { _org: string; _user: string }
        Returns: string
      }
      get_user_org_role: {
        Args: { _org: string; _user: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_org_role: {
        Args: {
          _org: string
          _role: Database["public"]["Enums"]["app_role"]
          _user: string
        }
        Returns: boolean
      }
      is_org_member: { Args: { _org: string; _user: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "treasurer" | "secretary" | "branch_leader"
      church_type: "matriz" | "filial"
      event_type: "culto" | "reuniao" | "campanha" | "outro"
      member_type: "member" | "visitor" | "leader"
      tx_type: "income" | "expense"
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
    Enums: {
      app_role: ["admin", "treasurer", "secretary", "branch_leader"],
      church_type: ["matriz", "filial"],
      event_type: ["culto", "reuniao", "campanha", "outro"],
      member_type: ["member", "visitor", "leader"],
      tx_type: ["income", "expense"],
    },
  },
} as const
