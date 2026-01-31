export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      document_extractions: {
        Row: {
          created_at: string;
          created_by: string | null;
          encrypted_data: string;
          error_message: string | null;
          extracted_at: string | null;
          field_names: string[];
          id: string;
          reducto_job_id: string | null;
          schema_id: string;
          source_filename: string;
          source_type: string;
          source_url: string | null;
          status: string;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          encrypted_data: string;
          error_message?: string | null;
          extracted_at?: string | null;
          field_names?: string[];
          id?: string;
          reducto_job_id?: string | null;
          schema_id: string;
          source_filename: string;
          source_type?: string;
          source_url?: string | null;
          status?: string;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          encrypted_data?: string;
          error_message?: string | null;
          extracted_at?: string | null;
          field_names?: string[];
          id?: string;
          reducto_job_id?: string | null;
          schema_id?: string;
          source_filename?: string;
          source_type?: string;
          source_url?: string | null;
          status?: string;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "document_extractions_schema_id_fkey";
            columns: ["schema_id"];
            isOneToOne: false;
            referencedRelation: "extraction_schemas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "document_extractions_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      extraction_schemas: {
        Row: {
          created_at: string;
          created_by: string | null;
          description: string | null;
          fields: Json;
          id: string;
          is_active: boolean;
          name: string;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          fields?: Json;
          id?: string;
          is_active?: boolean;
          name: string;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          fields?: Json;
          id?: string;
          is_active?: boolean;
          name?: string;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "extraction_schemas_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      extractions: {
        Row: {
          created_at: string | null;
          data: Json | null;
          id: string;
          status: string | null;
          tenant_id: string;
          updated_at: string | null;
          workflow_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          data?: Json | null;
          id?: string;
          status?: string | null;
          tenant_id: string;
          updated_at?: string | null;
          workflow_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          data?: Json | null;
          id?: string;
          status?: string | null;
          tenant_id?: string;
          updated_at?: string | null;
          workflow_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "extractions_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "extractions_workflow_id_fkey";
            columns: ["workflow_id"];
            isOneToOne: false;
            referencedRelation: "workflows";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          created_at: string | null;
          id: string;
          is_read: boolean | null;
          message: string;
          title: string;
          type: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          is_read?: boolean | null;
          message: string;
          title: string;
          type?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          is_read?: boolean | null;
          message?: string;
          title?: string;
          type?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      organization_members: {
        Row: {
          created_at: string | null;
          organization_id: string;
          role: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          organization_id: string;
          role?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          organization_id?: string;
          role?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "organization_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      organizations: {
        Row: {
          created_at: string | null;
          created_by: string;
          id: string;
          name: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          created_by?: string;
          id?: string;
          name: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          created_by?: string;
          id?: string;
          name?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string | null;
          email: string | null;
          full_name: string | null;
          id: string;
          updated_at: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string | null;
          email?: string | null;
          full_name?: string | null;
          id: string;
          updated_at?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string | null;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      tenant_invites: {
        Row: {
          created_at: string | null;
          email: string;
          id: string;
          invited_by: string | null;
          role: string | null;
          tenant_id: string;
        };
        Insert: {
          created_at?: string | null;
          email: string;
          id?: string;
          invited_by?: string | null;
          role?: string | null;
          tenant_id: string;
        };
        Update: {
          created_at?: string | null;
          email?: string;
          id?: string;
          invited_by?: string | null;
          role?: string | null;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tenant_invites_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      tenant_members: {
        Row: {
          created_at: string | null;
          role: string | null;
          tenant_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          role?: string | null;
          tenant_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          role?: string | null;
          tenant_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tenant_members_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tenant_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      tenants: {
        Row: {
          created_at: string | null;
          id: string;
          name: string;
          organization_id: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          name: string;
          organization_id: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          name?: string;
          organization_id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tenants_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      vault_error_logs: {
        Row: {
          created_at: string | null;
          error_message: string | null;
          error_type: string;
          id: string;
          request_url: string | null;
          status_code: number | null;
          tenant_id: string;
          vault_session_id: string;
        };
        Insert: {
          created_at?: string | null;
          error_message?: string | null;
          error_type: string;
          id?: string;
          request_url?: string | null;
          status_code?: number | null;
          tenant_id: string;
          vault_session_id: string;
        };
        Update: {
          created_at?: string | null;
          error_message?: string | null;
          error_type?: string;
          id?: string;
          request_url?: string | null;
          status_code?: number | null;
          tenant_id?: string;
          vault_session_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vault_error_logs_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vault_error_logs_vault_session_id_fkey";
            columns: ["vault_session_id"];
            isOneToOne: false;
            referencedRelation: "vault_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vault_error_logs_vault_session_id_fkey";
            columns: ["vault_session_id"];
            isOneToOne: false;
            referencedRelation: "vault_sessions_with_stats";
            referencedColumns: ["id"];
          },
        ];
      };
      vault_notification_logs: {
        Row: {
          id: string;
          notification_type: string;
          resend_message_id: string | null;
          sent_at: string;
          sent_to: string;
          session_expires_at: string | null;
          tenant_id: string;
          vault_session_id: string;
          warning_minutes: number;
        };
        Insert: {
          id?: string;
          notification_type?: string;
          resend_message_id?: string | null;
          sent_at?: string;
          sent_to: string;
          session_expires_at?: string | null;
          tenant_id: string;
          vault_session_id: string;
          warning_minutes: number;
        };
        Update: {
          id?: string;
          notification_type?: string;
          resend_message_id?: string | null;
          sent_at?: string;
          sent_to?: string;
          session_expires_at?: string | null;
          tenant_id?: string;
          vault_session_id?: string;
          warning_minutes?: number;
        };
        Relationships: [
          {
            foreignKeyName: "vault_notification_logs_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vault_notification_logs_vault_session_id_fkey";
            columns: ["vault_session_id"];
            isOneToOne: false;
            referencedRelation: "vault_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vault_notification_logs_vault_session_id_fkey";
            columns: ["vault_session_id"];
            isOneToOne: false;
            referencedRelation: "vault_sessions_with_stats";
            referencedColumns: ["id"];
          },
        ];
      };
      vault_rate_limits: {
        Row: {
          created_at: string | null;
          id: string;
          request_count: number | null;
          vault_session_id: string;
          window_start: string;
          window_type: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          request_count?: number | null;
          vault_session_id: string;
          window_start: string;
          window_type: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          request_count?: number | null;
          vault_session_id?: string;
          window_start?: string;
          window_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vault_rate_limits_vault_session_id_fkey";
            columns: ["vault_session_id"];
            isOneToOne: false;
            referencedRelation: "vault_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vault_rate_limits_vault_session_id_fkey";
            columns: ["vault_session_id"];
            isOneToOne: false;
            referencedRelation: "vault_sessions_with_stats";
            referencedColumns: ["id"];
          },
        ];
      };
      vault_sessions: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          description: string | null;
          encrypted_data: string | null;
          expires_at: string | null;
          expiry_warning_minutes: number | null;
          expiry_warning_sent: boolean | null;
          id: string;
          is_active: boolean | null;
          last_used_at: string | null;
          last_warning_sent_at: string | null;
          name: string;
          notification_email: string | null;
          rate_limit_per_day: number | null;
          rate_limit_per_hour: number | null;
          tenant_id: string;
          updated_at: string | null;
          use_count: number | null;
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          encrypted_data?: string | null;
          expires_at?: string | null;
          expiry_warning_minutes?: number | null;
          expiry_warning_sent?: boolean | null;
          id?: string;
          is_active?: boolean | null;
          last_used_at?: string | null;
          last_warning_sent_at?: string | null;
          name?: string;
          notification_email?: string | null;
          rate_limit_per_day?: number | null;
          rate_limit_per_hour?: number | null;
          tenant_id: string;
          updated_at?: string | null;
          use_count?: number | null;
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          encrypted_data?: string | null;
          expires_at?: string | null;
          expiry_warning_minutes?: number | null;
          expiry_warning_sent?: boolean | null;
          id?: string;
          is_active?: boolean | null;
          last_used_at?: string | null;
          last_warning_sent_at?: string | null;
          name?: string;
          notification_email?: string | null;
          rate_limit_per_day?: number | null;
          rate_limit_per_hour?: number | null;
          tenant_id?: string;
          updated_at?: string | null;
          use_count?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "vault_sessions_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vault_sessions_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      workflows: {
        Row: {
          created_at: string | null;
          definition: Json | null;
          id: string;
          name: string;
          organization_id: string;
          tenant_id: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          definition?: Json | null;
          id?: string;
          name: string;
          organization_id: string;
          tenant_id?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          definition?: Json | null;
          id?: string;
          name?: string;
          organization_id?: string;
          tenant_id?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "workflows_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workflows_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      tenant_members_with_profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string | null;
          email: string | null;
          full_name: string | null;
          organization_id: string | null;
          role: string | null;
          tenant_id: string | null;
          tenant_name: string | null;
          user_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tenant_members_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tenant_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tenants_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      vault_sessions_with_stats: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          daily_requests: number | null;
          description: string | null;
          encrypted_data: string | null;
          errors_last_24h: number | null;
          expires_at: string | null;
          expiry_status: string | null;
          expiry_warning_minutes: number | null;
          expiry_warning_sent: boolean | null;
          hourly_requests: number | null;
          id: string | null;
          is_active: boolean | null;
          last_used_at: string | null;
          last_warning_sent_at: string | null;
          name: string | null;
          notification_email: string | null;
          rate_limit_per_day: number | null;
          rate_limit_per_hour: number | null;
          tenant_id: string | null;
          updated_at: string | null;
          use_count: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "vault_sessions_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vault_sessions_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      get_sessions_needing_notification: {
        Args: never;
        Returns: {
          expires_at: string;
          notification_email: string;
          session_id: string;
          session_name: string;
          tenant_id: string;
          tenant_name: string;
          warning_minutes: number;
        }[];
      };
      is_org_member: { Args: { org_id: string }; Returns: boolean };
      is_org_member_of_tenant: {
        Args: { _tenant_id: string };
        Returns: boolean;
      };
      is_tenant_member: { Args: { _tenant_id: string }; Returns: boolean };
      log_vault_error: {
        Args: {
          p_error_message?: string;
          p_error_type: string;
          p_request_url?: string;
          p_session_id: string;
          p_status_code?: number;
        };
        Returns: undefined;
      };
      use_vault_session: { Args: { p_session_id: string }; Returns: Json };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
