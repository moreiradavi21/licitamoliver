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
      document_analyses: {
        Row: {
          attention: Json
          created_at: string
          extracted: Json
          favorable: Json
          file_name: string
          id: string
          opportunity_id: string | null
          risks: Json
          summary: string | null
          user_id: string
        }
        Insert: {
          attention?: Json
          created_at?: string
          extracted?: Json
          favorable?: Json
          file_name: string
          id?: string
          opportunity_id?: string | null
          risks?: Json
          summary?: string | null
          user_id: string
        }
        Update: {
          attention?: Json
          created_at?: string
          extracted?: Json
          favorable?: Json
          file_name?: string
          id?: string
          opportunity_id?: string | null
          risks?: Json
          summary?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_analyses_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      item_supplier_prices: {
        Row: {
          created_at: string
          delivery_days: number | null
          freight: number
          id: string
          item_id: string
          notes: string | null
          price: number
          quoted_at: string
          role: string
          stock_confirmed: boolean
          supplier_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delivery_days?: number | null
          freight?: number
          id?: string
          item_id: string
          notes?: string | null
          price?: number
          quoted_at?: string
          role?: string
          stock_confirmed?: boolean
          supplier_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          delivery_days?: number | null
          freight?: number
          id?: string
          item_id?: string
          notes?: string | null
          price?: number
          quoted_at?: string
          role?: string
          stock_confirmed?: boolean
          supplier_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_supplier_prices_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_supplier_prices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          avg_margin: number | null
          brand: string | null
          category: string | null
          created_at: string
          gtin: string | null
          historic_cost: number | null
          id: string
          manufacturer_code: string | null
          max_price: number | null
          min_price: number | null
          model: string | null
          name: string
          ncm: string | null
          notes: string | null
          specs: string | null
          updated_at: string
          user_id: string
          won_before: boolean
        }
        Insert: {
          avg_margin?: number | null
          brand?: string | null
          category?: string | null
          created_at?: string
          gtin?: string | null
          historic_cost?: number | null
          id?: string
          manufacturer_code?: string | null
          max_price?: number | null
          min_price?: number | null
          model?: string | null
          name: string
          ncm?: string | null
          notes?: string | null
          specs?: string | null
          updated_at?: string
          user_id: string
          won_before?: boolean
        }
        Update: {
          avg_margin?: number | null
          brand?: string | null
          category?: string | null
          created_at?: string
          gtin?: string | null
          historic_cost?: number | null
          id?: string
          manufacturer_code?: string | null
          max_price?: number | null
          min_price?: number | null
          model?: string | null
          name?: string
          ncm?: string | null
          notes?: string | null
          specs?: string | null
          updated_at?: string
          user_id?: string
          won_before?: boolean
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          agency: string | null
          classification: string
          created_at: string
          delivery_days: number | null
          delivery_place: string | null
          dispute_at: string | null
          documents_pending: boolean
          estimated_profit: number | null
          estimated_value: number | null
          id: string
          notes: string | null
          number: string
          payment_days: number | null
          platform: string | null
          process_url: string | null
          published_at: string | null
          realized_profit: number | null
          status: string
          supplier_confirmed: boolean
          traffic_light: string
          uasg: string | null
          updated_at: string
          user_id: string
          won_value: number | null
        }
        Insert: {
          agency?: string | null
          classification?: string
          created_at?: string
          delivery_days?: number | null
          delivery_place?: string | null
          dispute_at?: string | null
          documents_pending?: boolean
          estimated_profit?: number | null
          estimated_value?: number | null
          id?: string
          notes?: string | null
          number: string
          payment_days?: number | null
          platform?: string | null
          process_url?: string | null
          published_at?: string | null
          realized_profit?: number | null
          status?: string
          supplier_confirmed?: boolean
          traffic_light?: string
          uasg?: string | null
          updated_at?: string
          user_id: string
          won_value?: number | null
        }
        Update: {
          agency?: string | null
          classification?: string
          created_at?: string
          delivery_days?: number | null
          delivery_place?: string | null
          dispute_at?: string | null
          documents_pending?: boolean
          estimated_profit?: number | null
          estimated_value?: number | null
          id?: string
          notes?: string | null
          number?: string
          payment_days?: number | null
          platform?: string | null
          process_url?: string | null
          published_at?: string | null
          realized_profit?: number | null
          status?: string
          supplier_confirmed?: boolean
          traffic_light?: string
          uasg?: string | null
          updated_at?: string
          user_id?: string
          won_value?: number | null
        }
        Relationships: []
      }
      opportunity_items: {
        Row: {
          created_at: string
          description: string
          freight: number
          id: string
          item_id: string | null
          opportunity_id: string
          other_costs: number
          proposed_price: number
          quantity: number
          risk_reserve: number
          stock_confirmed: boolean
          supplier_id: string | null
          taxes: number
          unit_cost: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          freight?: number
          id?: string
          item_id?: string | null
          opportunity_id: string
          other_costs?: number
          proposed_price?: number
          quantity?: number
          risk_reserve?: number
          stock_confirmed?: boolean
          supplier_id?: string | null
          taxes?: number
          unit_cost?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          freight?: number
          id?: string
          item_id?: string | null
          opportunity_id?: string
          other_costs?: number
          proposed_price?: number
          quantity?: number
          risk_reserve?: number
          stock_confirmed?: boolean
          supplier_id?: string | null
          taxes?: number
          unit_cost?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_items_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          created_at: string
          default_risk_percent: number
          default_tax_percent: number
          good_margin: number
          min_margin: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_risk_percent?: number
          default_tax_percent?: number
          good_margin?: number
          min_margin?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_risk_percent?: number
          default_tax_percent?: number
          good_margin?: number
          min_margin?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          avg_delivery_days: number | null
          categories: string[]
          cnpj: string | null
          contact_name: string | null
          created_at: string
          delivers_to_agency: boolean
          email: string | null
          had_problems: boolean
          id: string
          issues_invoice: boolean
          legal_name: string
          notes: string | null
          rating_aftersales: number
          rating_deadline: number
          rating_price: number
          rating_quality: number
          rating_response: number
          real_stock: boolean
          return_policy: string | null
          trust_level: string
          updated_at: string
          user_id: string
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          avg_delivery_days?: number | null
          categories?: string[]
          cnpj?: string | null
          contact_name?: string | null
          created_at?: string
          delivers_to_agency?: boolean
          email?: string | null
          had_problems?: boolean
          id?: string
          issues_invoice?: boolean
          legal_name: string
          notes?: string | null
          rating_aftersales?: number
          rating_deadline?: number
          rating_price?: number
          rating_quality?: number
          rating_response?: number
          real_stock?: boolean
          return_policy?: string | null
          trust_level?: string
          updated_at?: string
          user_id: string
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          avg_delivery_days?: number | null
          categories?: string[]
          cnpj?: string | null
          contact_name?: string | null
          created_at?: string
          delivers_to_agency?: boolean
          email?: string | null
          had_problems?: boolean
          id?: string
          issues_invoice?: boolean
          legal_name?: string
          notes?: string | null
          rating_aftersales?: number
          rating_deadline?: number
          rating_price?: number
          rating_quality?: number
          rating_response?: number
          real_stock?: boolean
          return_policy?: string | null
          trust_level?: string
          updated_at?: string
          user_id?: string
          website?: string | null
          whatsapp?: string | null
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
