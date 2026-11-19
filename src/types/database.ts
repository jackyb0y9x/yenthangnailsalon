export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AustralianState = 'NSW' | 'VIC' | 'QLD' | 'WA' | 'SA' | 'TAS' | 'ACT' | 'NT';

export type ServiceCategory =
  | 'Manicure'
  | 'Pedicure'
  | 'SNS & Dipping'
  | 'Acrylic & Extensions'
  | 'Gel Art & Design'
  | 'Spa Packages';

export type ConsultationStatus = 'new' | 'contacted' | 'booked' | 'completed' | 'cancelled';
export type ConsultationSource = 'web_form' | 'phone' | 'walk_in' | 'social_media';

export type StaffRole =
  | 'super_admin'
  | 'manager'
  | 'staff'
  | 'owner'
  | 'senior_technician'
  | 'technician'
  | 'apprentice'
  | 'receptionist';

export type EmploymentType = 'Full-time' | 'Part-time' | 'Casual' | 'Contractor';
export type ProficiencyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'master';

export type PaymentMethod = 'cash' | 'card' | 'eftpos' | 'bank_transfer' | 'gift_card' | 'other';
export type TransactionType = 'income' | 'expense';
export type UserRole = 'super_admin' | 'manager' | 'staff';

export interface Database {
  public: {
    Tables: {
      nail_business_info: {
        Row: {
          id: string;
          salon_name: string;
          abn: string;
          phone: string;
          mobile: string;
          email: string;
          address_street: string;
          suburb: string;
          state: AustralianState;
          postcode: string;
          country: string;
          latitude: number;
          longitude: number;
          opening_hours: Json;
          social_links: Json;
          google_maps_url?: string | null;
          google_maps_embed_url?: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          salon_name?: string;
          abn?: string;
          phone?: string;
          mobile?: string;
          email?: string;
          address_street?: string;
          suburb?: string;
          state?: AustralianState;
          postcode?: string;
          country?: string;
          latitude?: number;
          longitude?: number;
          opening_hours?: Json;
          social_links?: Json;
          google_maps_url?: string | null;
          google_maps_embed_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          salon_name?: string;
          abn?: string;
          phone?: string;
          mobile?: string;
          email?: string;
          address_street?: string;
          suburb?: string;
          state?: AustralianState;
          postcode?: string;
          country?: string;
          latitude?: number;
          longitude?: number;
          opening_hours?: Json;
          social_links?: Json;
          google_maps_url?: string | null;
          google_maps_embed_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      nail_cms_sections: {
        Row: {
          id: string;
          section_key: string;
          title_en: string;
          title_vi: string;
          subtitle_en: string | null;
          subtitle_vi: string | null;
          content_en: string | null;
          content_vi: string | null;
          cta_text_en: string | null;
          cta_text_vi: string | null;
          cta_link: string | null;
          image_url: string | null;
          is_active: boolean;
          display_order: number;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          section_key: string;
          title_en: string;
          title_vi: string;
          subtitle_en?: string | null;
          subtitle_vi?: string | null;
          content_en?: string | null;
          content_vi?: string | null;
          cta_text_en?: string | null;
          cta_text_vi?: string | null;
          cta_link?: string | null;
          image_url?: string | null;
          is_active?: boolean;
          display_order?: number;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          section_key?: string;
          title_en?: string;
          title_vi?: string;
          subtitle_en?: string | null;
          subtitle_vi?: string | null;
          content_en?: string | null;
          content_vi?: string | null;
          cta_text_en?: string | null;
          cta_text_vi?: string | null;
          cta_link?: string | null;
          image_url?: string | null;
          is_active?: boolean;
          display_order?: number;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      nail_services: {
        Row: {
          id: string;
          category: ServiceCategory;
          name_en: string;
          name_vi: string;
          description_en: string | null;
          description_vi: string | null;
          duration_minutes: number;
          price_aud: number;
          image_url: string | null;
          is_featured: boolean;
          is_active: boolean;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category: ServiceCategory;
          name_en: string;
          name_vi: string;
          description_en?: string | null;
          description_vi?: string | null;
          duration_minutes?: number;
          price_aud: number;
          image_url?: string | null;
          is_featured?: boolean;
          is_active?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          category?: ServiceCategory;
          name_en?: string;
          name_vi?: string;
          description_en?: string | null;
          description_vi?: string | null;
          duration_minutes?: number;
          price_aud?: number;
          image_url?: string | null;
          is_featured?: boolean;
          is_active?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      nail_gallery_items: {
        Row: {
          id: string;
          title_en: string;
          title_vi: string;
          category_tag: string;
          image_url: string;
          thumbnail_url: string | null;
          tags: string[];
          is_featured: boolean;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title_en: string;
          title_vi: string;
          category_tag: string;
          image_url: string;
          thumbnail_url?: string | null;
          tags?: string[];
          is_featured?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title_en?: string;
          title_vi?: string;
          category_tag?: string;
          image_url?: string;
          thumbnail_url?: string | null;
          tags?: string[];
          is_featured?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      nail_announcements: {
        Row: {
          id: string;
          title_en: string;
          title_vi: string;
          content_en: string;
          content_vi: string;
          badge_text_en: string | null;
          badge_text_vi: string | null;
          link_url: string | null;
          start_date: string;
          end_date: string | null;
          is_active: boolean;
          priority: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title_en: string;
          title_vi: string;
          content_en: string;
          content_vi: string;
          badge_text_en?: string | null;
          badge_text_vi?: string | null;
          link_url?: string | null;
          start_date?: string;
          end_date?: string | null;
          is_active?: boolean;
          priority?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title_en?: string;
          title_vi?: string;
          content_en?: string;
          content_vi?: string;
          badge_text_en?: string | null;
          badge_text_vi?: string | null;
          link_url?: string | null;
          start_date?: string;
          end_date?: string | null;
          is_active?: boolean;
          priority?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      crm_customers: {
        Row: {
          id: string;
          full_name: string;
          phone: string;
          email: string | null;
          address: string | null;
          preferred_language: 'en' | 'vi';
          nail_shape_preference: string | null;
          nail_length_preference: 'Short' | 'Medium' | 'Long' | 'Extra Long' | null;
          preferred_services: string[];
          allergies_sensitivities: string | null;
          general_notes: string | null;
          total_visits: number;
          total_spent_aud: number;
          first_visit_date: string | null;
          last_visit_date: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          full_name: string;
          phone: string;
          email?: string | null;
          address?: string | null;
          preferred_language?: 'en' | 'vi';
          nail_shape_preference?: string | null;
          nail_length_preference?: 'Short' | 'Medium' | 'Long' | 'Extra Long' | null;
          preferred_services?: string[];
          allergies_sensitivities?: string | null;
          general_notes?: string | null;
          total_visits?: number;
          total_spent_aud?: number;
          first_visit_date?: string | null;
          last_visit_date?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          phone?: string;
          email?: string | null;
          address?: string | null;
          preferred_language?: 'en' | 'vi';
          nail_shape_preference?: string | null;
          nail_length_preference?: 'Short' | 'Medium' | 'Long' | 'Extra Long' | null;
          preferred_services?: string[];
          allergies_sensitivities?: string | null;
          general_notes?: string | null;
          total_visits?: number;
          total_spent_aud?: number;
          first_visit_date?: string | null;
          last_visit_date?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      crm_consultations: {
        Row: {
          id: string;
          customer_id: string | null;
          customer_name: string;
          phone: string;
          email: string | null;
          preferred_language: 'en' | 'vi';
          preferred_date: string | null;
          preferred_time: string | null;
          service_requested_id: string | null;
          services_requested: string[];
          notes: string | null;
          status: ConsultationStatus;
          source: ConsultationSource;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id?: string | null;
          customer_name: string;
          phone: string;
          email?: string | null;
          preferred_language?: 'en' | 'vi';
          preferred_date?: string | null;
          preferred_time?: string | null;
          service_requested_id?: string | null;
          services_requested?: string[];
          notes?: string | null;
          status?: ConsultationStatus;
          source?: ConsultationSource;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string | null;
          customer_name?: string;
          phone?: string;
          email?: string | null;
          preferred_language?: 'en' | 'vi';
          preferred_date?: string | null;
          preferred_time?: string | null;
          service_requested_id?: string | null;
          services_requested?: string[];
          notes?: string | null;
          status?: ConsultationStatus;
          source?: ConsultationSource;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'crm_consultations_customer_id_fkey';
            columns: ['customer_id'];
            referencedRelation: 'crm_customers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_consultations_service_requested_id_fkey';
            columns: ['service_requested_id'];
            referencedRelation: 'nail_services';
            referencedColumns: ['id'];
          },
        ];
      };
      staff_members: {
        Row: {
          id: string;
          auth_user_id: string | null;
          full_name: string;
          email: string;
          phone: string | null;
          role: StaffRole;
          employment_type: EmploymentType;
          bio_en: string | null;
          bio_vi: string | null;
          avatar_url: string | null;
          is_active: boolean;
          hire_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auth_user_id?: string | null;
          full_name: string;
          email: string;
          phone?: string | null;
          role?: StaffRole;
          employment_type?: EmploymentType;
          bio_en?: string | null;
          bio_vi?: string | null;
          avatar_url?: string | null;
          is_active?: boolean;
          hire_date?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          auth_user_id?: string | null;
          full_name?: string;
          email?: string;
          phone?: string | null;
          role?: StaffRole;
          employment_type?: EmploymentType;
          bio_en?: string | null;
          bio_vi?: string | null;
          avatar_url?: string | null;
          is_active?: boolean;
          hire_date?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      staff_specializations: {
        Row: {
          id: string;
          staff_id: string;
          specialization: string;
          proficiency_level: ProficiencyLevel;
          created_at: string;
        };
        Insert: {
          id?: string;
          staff_id: string;
          specialization: string;
          proficiency_level?: ProficiencyLevel;
          created_at?: string;
        };
        Update: {
          id?: string;
          staff_id?: string;
          specialization?: string;
          proficiency_level?: ProficiencyLevel;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'staff_specializations_staff_id_fkey';
            columns: ['staff_id'];
            referencedRelation: 'staff_members';
            referencedColumns: ['id'];
          },
        ];
      };
      crm_visit_history: {
        Row: {
          id: string;
          customer_id: string;
          staff_id: string | null;
          service_id: string | null;
          visit_date: string;
          services_rendered: Json;
          price_charged_aud: number;
          tip_aud: number;
          total_paid_aud: number;
          payment_method: PaymentMethod;
          notes: string | null;
          rating: number | null;
          photo_urls: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          staff_id?: string | null;
          service_id?: string | null;
          visit_date?: string;
          services_rendered?: Json;
          price_charged_aud: number;
          tip_aud?: number;
          payment_method?: PaymentMethod;
          notes?: string | null;
          rating?: number | null;
          photo_urls?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          staff_id?: string | null;
          service_id?: string | null;
          visit_date?: string;
          services_rendered?: Json;
          price_charged_aud?: number;
          tip_aud?: number;
          payment_method?: PaymentMethod;
          notes?: string | null;
          rating?: number | null;
          photo_urls?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'crm_visit_history_customer_id_fkey';
            columns: ['customer_id'];
            referencedRelation: 'crm_customers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_visit_history_staff_id_fkey';
            columns: ['staff_id'];
            referencedRelation: 'staff_members';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_visit_history_service_id_fkey';
            columns: ['service_id'];
            referencedRelation: 'nail_services';
            referencedColumns: ['id'];
          },
        ];
      };
      finance_categories: {
        Row: {
          id: string;
          name: string;
          type: TransactionType;
          description: string | null;
          is_tax_deductible: boolean;
          is_default: boolean;
          display_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type: TransactionType;
          description?: string | null;
          is_tax_deductible?: boolean;
          is_default?: boolean;
          display_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: TransactionType;
          description?: string | null;
          is_tax_deductible?: boolean;
          is_default?: boolean;
          display_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      finance_transactions: {
        Row: {
          id: string;
          transaction_date: string;
          type: TransactionType;
          category_id: string;
          amount_aud: number;
          gst_amount_aud: number;
          payment_method: PaymentMethod;
          description: string;
          reference_id: string | null;
          receipt_url: string | null;
          customer_id: string | null;
          staff_id: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          transaction_date?: string;
          type: TransactionType;
          category_id: string;
          amount_aud: number;
          gst_amount_aud?: number;
          payment_method?: PaymentMethod;
          description: string;
          reference_id?: string | null;
          receipt_url?: string | null;
          customer_id?: string | null;
          staff_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          transaction_date?: string;
          type?: TransactionType;
          category_id?: string;
          amount_aud?: number;
          gst_amount_aud?: number;
          payment_method?: PaymentMethod;
          description?: string;
          reference_id?: string | null;
          receipt_url?: string | null;
          customer_id?: string | null;
          staff_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'finance_transactions_category_id_fkey';
            columns: ['category_id'];
            referencedRelation: 'finance_categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'finance_transactions_customer_id_fkey';
            columns: ['customer_id'];
            referencedRelation: 'crm_customers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'finance_transactions_staff_id_fkey';
            columns: ['staff_id'];
            referencedRelation: 'staff_members';
            referencedColumns: ['id'];
          },
        ];
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role: UserRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role: UserRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      current_user_role: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
