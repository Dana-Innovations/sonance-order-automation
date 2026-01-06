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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      customer_pricing: {
        Row: {
          created_at: string | null
          currency_code: string
          effective_date: string
          expiration_date: string | null
          id: string
          product_id: string
          ps_customer_id: string
          unit_price: number
          uom: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency_code: string
          effective_date: string
          expiration_date?: string | null
          id?: string
          product_id: string
          ps_customer_id: string
          unit_price: number
          uom: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency_code?: string
          effective_date?: string
          expiration_date?: string | null
          id?: string
          product_id?: string
          ps_customer_id?: string
          unit_price?: number
          uom?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_pricing_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_pricing_ps_customer_id_fkey"
            columns: ["ps_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["ps_customer_id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string | null
          customer_id: string
          customer_name: string
          is_active: boolean | null
          MultiAccount_Prompt: string | null
          order_header_prompt: string | null
          order_line_prompt: string | null
          ps_customer_id: string
          sender_email: string
          sharepoint_folder_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string
          customer_name: string
          is_active?: boolean | null
          MultiAccount_Prompt?: string | null
          order_header_prompt?: string | null
          order_line_prompt?: string | null
          ps_customer_id: string
          sender_email: string
          sharepoint_folder_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          customer_name?: string
          is_active?: boolean | null
          MultiAccount_Prompt?: string | null
          order_header_prompt?: string | null
          order_line_prompt?: string | null
          ps_customer_id?: string
          sender_email?: string
          sharepoint_folder_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      order_lines: {
        Row: {
          created_at: string | null
          cust_currency_code: string | null
          cust_line_desc: string | null
          cust_line_number: number
          cust_line_total: number | null
          cust_order_number: string
          cust_product_sku: string | null
          cust_quantity: number | null
          cust_unit_price: number | null
          cust_uom: string | null
          id: string
          ps_order_number: string | null
          sonance_prod_trans: string | null
          sonance_product_orig: string | null
        }
        Insert: {
          created_at?: string | null
          cust_currency_code?: string | null
          cust_line_desc?: string | null
          cust_line_number: number
          cust_line_total?: number | null
          cust_order_number: string
          cust_product_sku?: string | null
          cust_quantity?: number | null
          cust_unit_price?: number | null
          cust_uom?: string | null
          id?: string
          ps_order_number?: string | null
          sonance_prod_trans?: string | null
          sonance_product_orig?: string | null
        }
        Update: {
          created_at?: string | null
          cust_currency_code?: string | null
          cust_line_desc?: string | null
          cust_line_number?: number
          cust_line_total?: number | null
          cust_order_number?: string
          cust_product_sku?: string | null
          cust_quantity?: number | null
          cust_unit_price?: number | null
          cust_uom?: string | null
          id?: string
          ps_order_number?: string | null
          sonance_prod_trans?: string | null
          sonance_product_orig?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_lines_cust_order_number_fkey"
            columns: ["cust_order_number"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["cust_order_number"]
          },
        ]
      }
      order_statuses: {
        Row: {
          description: string | null
          sort_order: number
          status_code: string
          status_name: string
        }
        Insert: {
          description?: string | null
          sort_order: number
          status_code: string
          status_name: string
        }
        Update: {
          description?: string | null
          sort_order?: number
          status_code?: string
          status_name?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          created_at: string | null
          currency_code: string | null
          cust_carrier: string | null
          cust_header_notes: string | null
          cust_order_date: string
          cust_order_number: string
          cust_ship_via: string | null
          cust_shipto_address_line1: string | null
          cust_shipto_address_line2: string | null
          cust_shipto_address_line3: string | null
          cust_shipto_city: string | null
          cust_shipto_country: string | null
          cust_shipto_postal_code: string | null
          cust_shipto_state: string | null
          customername: string | null
          custshipmethod: string | null
          email_received_at: string | null
          email_sender: string | null
          email_subject: string | null
          id: string
          pdf_file_url: string | null
          ps_customer_id: string
          ps_order_number: string | null
          shipto_name: string | null
          Son_Carrier_ID: string | null
          Son_Ship_via: string | null
          status_code: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency_code?: string | null
          cust_carrier?: string | null
          cust_header_notes?: string | null
          cust_order_date: string
          cust_order_number: string
          cust_ship_via?: string | null
          cust_shipto_address_line1?: string | null
          cust_shipto_address_line2?: string | null
          cust_shipto_address_line3?: string | null
          cust_shipto_city?: string | null
          cust_shipto_country?: string | null
          cust_shipto_postal_code?: string | null
          cust_shipto_state?: string | null
          customername?: string | null
          custshipmethod?: string | null
          email_received_at?: string | null
          email_sender?: string | null
          email_subject?: string | null
          id?: string
          pdf_file_url?: string | null
          ps_customer_id: string
          ps_order_number?: string | null
          shipto_name?: string | null
          Son_Carrier_ID?: string | null
          Son_Ship_via?: string | null
          status_code?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency_code?: string | null
          cust_carrier?: string | null
          cust_header_notes?: string | null
          cust_order_date?: string
          cust_order_number?: string
          cust_ship_via?: string | null
          cust_shipto_address_line1?: string | null
          cust_shipto_address_line2?: string | null
          cust_shipto_address_line3?: string | null
          cust_shipto_city?: string | null
          cust_shipto_country?: string | null
          cust_shipto_postal_code?: string | null
          cust_shipto_state?: string | null
          customername?: string | null
          custshipmethod?: string | null
          email_received_at?: string | null
          email_sender?: string | null
          email_subject?: string | null
          id?: string
          pdf_file_url?: string | null
          ps_customer_id?: string
          ps_order_number?: string | null
          shipto_name?: string | null
          Son_Carrier_ID?: string | null
          Son_Ship_via?: string | null
          status_code?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_status_code_fkey"
            columns: ["status_code"]
            isOneToOne: false
            referencedRelation: "order_statuses"
            referencedColumns: ["status_code"]
          },
        ]
      }
      product_pricing: {
        Row: {
          created_at: string | null
          currency_code: string
          effective_date: string
          expiration_date: string | null
          id: string
          product_id: string
          unit_price: number
          uom: string
        }
        Insert: {
          created_at?: string | null
          currency_code: string
          effective_date: string
          expiration_date?: string | null
          id?: string
          product_id: string
          unit_price: number
          uom: string
        }
        Update: {
          created_at?: string | null
          currency_code?: string
          effective_date?: string
          expiration_date?: string | null
          id?: string
          product_id?: string
          unit_price?: number
          uom?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_pricing_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          long_description: string | null
          model_number: string | null
          product_sku: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          long_description?: string | null
          model_number?: string | null
          product_sku: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          long_description?: string | null
          model_number?: string | null
          product_sku?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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

