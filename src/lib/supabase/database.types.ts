export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      addresses: {
        Row: {
          city: string;
          created_at: string;
          deleted_at: string | null;
          id: string;
          is_default: boolean;
          label: string | null;
          line1: string;
          line2: string | null;
          phone: string | null;
          postal_code: string;
          province: string;
          recipient_name: string;
          suburb: string | null;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          city: string;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          is_default?: boolean;
          label?: string | null;
          line1: string;
          line2?: string | null;
          phone?: string | null;
          postal_code: string;
          province: string;
          recipient_name: string;
          suburb?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          city?: string;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          is_default?: boolean;
          label?: string | null;
          line1?: string;
          line2?: string | null;
          phone?: string | null;
          postal_code?: string;
          province?: string;
          recipient_name?: string;
          suburb?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      ai_conversations: {
        Row: {
          anonymous_id: string | null;
          consent_given: boolean;
          converted_order_id: string | null;
          created_at: string;
          deleted_at: string | null;
          id: string;
          lead_email: string | null;
          lead_phone: string | null;
          messages: NonNullable<Json>;
          mode: string;
          recommended_skus: string[];
          sizing_result: Json | null;
          token_count: number;
          updated_at: string;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          anonymous_id?: string | null;
          consent_given?: boolean;
          converted_order_id?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          lead_email?: string | null;
          lead_phone?: string | null;
          messages?: NonNullable<Json>;
          mode?: string;
          recommended_skus?: string[];
          sizing_result?: Json | null;
          token_count?: number;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          anonymous_id?: string | null;
          consent_given?: boolean;
          converted_order_id?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          lead_email?: string | null;
          lead_phone?: string | null;
          messages?: NonNullable<Json>;
          mode?: string;
          recommended_skus?: string[];
          sizing_result?: Json | null;
          token_count?: number;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ai_conversations_converted_order_id_fkey";
            columns: ["converted_order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_log: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          details: NonNullable<Json>;
          id: number;
          record_id: string | null;
          table_name: string | null;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          details?: NonNullable<Json>;
          id?: never;
          record_id?: string | null;
          table_name?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          details?: NonNullable<Json>;
          id?: never;
          record_id?: string | null;
          table_name?: string | null;
        };
        Relationships: [];
      };
      back_in_stock_requests: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          notified_at: string | null;
          product_id: string;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
          notified_at?: string | null;
          product_id: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          notified_at?: string | null;
          product_id?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "back_in_stock_requests_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      brands: {
        Row: {
          created_at: string;
          id: string;
          logo_path: string | null;
          name: string;
          sku_code: string | null;
          slug: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          logo_path?: string | null;
          name: string;
          sku_code?: string | null;
          slug: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          logo_path?: string | null;
          name?: string;
          sku_code?: string | null;
          slug?: string;
        };
        Relationships: [];
      };
      bundle_items: {
        Row: {
          bundle_id: string;
          description: string | null;
          id: string;
          product_id: string | null;
          quantity: number;
        };
        ComputedFields: never;
        Insert: {
          bundle_id: string;
          description?: string | null;
          id?: string;
          product_id?: string | null;
          quantity?: number;
        };
        Update: {
          bundle_id?: string;
          description?: string | null;
          id?: string;
          product_id?: string | null;
          quantity?: number;
        };
        Relationships: [
          {
            foreignKeyName: "bundle_items_bundle_id_fkey";
            columns: ["bundle_id"];
            isOneToOne: false;
            referencedRelation: "bundles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bundle_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      bundles: {
        Row: {
          battery_kwh: number | null;
          config: string | null;
          created_at: string;
          id: string;
          is_approved: boolean;
          product_id: string;
          size_kw: number | null;
        };
        ComputedFields: never;
        Insert: {
          battery_kwh?: number | null;
          config?: string | null;
          created_at?: string;
          id?: string;
          is_approved?: boolean;
          product_id: string;
          size_kw?: number | null;
        };
        Update: {
          battery_kwh?: number | null;
          config?: string | null;
          created_at?: string;
          id?: string;
          is_approved?: boolean;
          product_id?: string;
          size_kw?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "bundles_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: true;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      cart_items: {
        Row: {
          added_at: string;
          cart_id: string;
          id: string;
          product_id: string;
          quantity: number;
          with_installation: boolean;
        };
        ComputedFields: never;
        Insert: {
          added_at?: string;
          cart_id: string;
          id?: string;
          product_id: string;
          quantity: number;
          with_installation?: boolean;
        };
        Update: {
          added_at?: string;
          cart_id?: string;
          id?: string;
          product_id?: string;
          quantity?: number;
          with_installation?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey";
            columns: ["cart_id"];
            isOneToOne: false;
            referencedRelation: "carts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cart_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      carts: {
        Row: {
          coupon_code: string | null;
          created_at: string;
          email_for_recovery: string | null;
          guest_token_hash: string | null;
          id: string;
          recovery_opt_in: boolean;
          updated_at: string;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          coupon_code?: string | null;
          created_at?: string;
          email_for_recovery?: string | null;
          guest_token_hash?: string | null;
          id?: string;
          recovery_opt_in?: boolean;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          coupon_code?: string | null;
          created_at?: string;
          email_for_recovery?: string | null;
          guest_token_hash?: string | null;
          id?: string;
          recovery_opt_in?: boolean;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          sku_prefix: string;
          slug: string;
          sort_order: number;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          sku_prefix: string;
          slug: string;
          sort_order?: number;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          sku_prefix?: string;
          slug?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      consent_records: {
        Row: {
          anonymous_id: string | null;
          consent_type: Database["public"]["Enums"]["consent_type"];
          created_at: string;
          document_version: string | null;
          granted: boolean;
          id: number;
          ip_hash: string | null;
          source: string;
          user_agent: string | null;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          anonymous_id?: string | null;
          consent_type: Database["public"]["Enums"]["consent_type"];
          created_at?: string;
          document_version?: string | null;
          granted: boolean;
          id?: never;
          ip_hash?: string | null;
          source: string;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Update: {
          anonymous_id?: string | null;
          consent_type?: Database["public"]["Enums"]["consent_type"];
          created_at?: string;
          document_version?: string | null;
          granted?: boolean;
          id?: never;
          ip_hash?: string | null;
          source?: string;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      coupons: {
        Row: {
          code: string;
          created_at: string;
          ends_at: string | null;
          id: string;
          is_active: boolean;
          is_referral: boolean;
          max_uses: number | null;
          min_order_incl_vat: number;
          referrer_id: string | null;
          starts_at: string | null;
          type: Database["public"]["Enums"]["coupon_type"];
          uses: number;
          value: number;
        };
        ComputedFields: never;
        Insert: {
          code: string;
          created_at?: string;
          ends_at?: string | null;
          id?: string;
          is_active?: boolean;
          is_referral?: boolean;
          max_uses?: number | null;
          min_order_incl_vat?: number;
          referrer_id?: string | null;
          starts_at?: string | null;
          type: Database["public"]["Enums"]["coupon_type"];
          uses?: number;
          value: number;
        };
        Update: {
          code?: string;
          created_at?: string;
          ends_at?: string | null;
          id?: string;
          is_active?: boolean;
          is_referral?: boolean;
          max_uses?: number | null;
          min_order_incl_vat?: number;
          referrer_id?: string | null;
          starts_at?: string | null;
          type?: Database["public"]["Enums"]["coupon_type"];
          uses?: number;
          value?: number;
        };
        Relationships: [];
      };
      data_requests: {
        Row: {
          completed_at: string | null;
          created_at: string;
          details: string | null;
          email: string;
          export_path: string | null;
          handled_by: string | null;
          id: string;
          status: Database["public"]["Enums"]["data_request_status"];
          type: Database["public"]["Enums"]["data_request_type"];
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          details?: string | null;
          email: string;
          export_path?: string | null;
          handled_by?: string | null;
          id?: string;
          status?: Database["public"]["Enums"]["data_request_status"];
          type: Database["public"]["Enums"]["data_request_type"];
          user_id?: string | null;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          details?: string | null;
          email?: string;
          export_path?: string | null;
          handled_by?: string | null;
          id?: string;
          status?: Database["public"]["Enums"]["data_request_status"];
          type?: Database["public"]["Enums"]["data_request_type"];
          user_id?: string | null;
        };
        Relationships: [];
      };
      import_logs: {
        Row: {
          created_at: string;
          dry_run: boolean;
          file_name: string;
          file_sha256: string | null;
          id: number;
          report: NonNullable<Json>;
          rows_inserted: number;
          rows_invalid: number;
          rows_skipped: number;
          rows_total: number;
          rows_updated: number;
          run_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          dry_run?: boolean;
          file_name: string;
          file_sha256?: string | null;
          id?: never;
          report?: NonNullable<Json>;
          rows_inserted?: number;
          rows_invalid?: number;
          rows_skipped?: number;
          rows_total?: number;
          rows_updated?: number;
          run_by?: string | null;
        };
        Update: {
          created_at?: string;
          dry_run?: boolean;
          file_name?: string;
          file_sha256?: string | null;
          id?: never;
          report?: NonNullable<Json>;
          rows_inserted?: number;
          rows_invalid?: number;
          rows_skipped?: number;
          rows_total?: number;
          rows_updated?: number;
          run_by?: string | null;
        };
        Relationships: [];
      };
      installation_bookings: {
        Row: {
          access_notes: string | null;
          address: NonNullable<Json>;
          availability_id: string | null;
          coc_path: string | null;
          completed_at: string | null;
          completion_photo_paths: string[];
          contact_email: string;
          contact_name: string;
          contact_phone: string;
          created_at: string;
          db_board_photo_paths: string[];
          deleted_at: string | null;
          existing_system: string | null;
          id: string;
          order_id: string | null;
          property_type: Database["public"]["Enums"]["property_type"] | null;
          roof_photo_paths: string[];
          roof_type: Database["public"]["Enums"]["roof_type"] | null;
          scheduled_end: string | null;
          scheduled_start: string | null;
          status: Database["public"]["Enums"]["installation_status"];
          supply_phase: Database["public"]["Enums"]["supply_phase"];
          technician_id: string | null;
          tier_id: string | null;
          updated_at: string;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          access_notes?: string | null;
          address: NonNullable<Json>;
          availability_id?: string | null;
          coc_path?: string | null;
          completed_at?: string | null;
          completion_photo_paths?: string[];
          contact_email: string;
          contact_name: string;
          contact_phone: string;
          created_at?: string;
          db_board_photo_paths?: string[];
          deleted_at?: string | null;
          existing_system?: string | null;
          id?: string;
          order_id?: string | null;
          property_type?: Database["public"]["Enums"]["property_type"] | null;
          roof_photo_paths?: string[];
          roof_type?: Database["public"]["Enums"]["roof_type"] | null;
          scheduled_end?: string | null;
          scheduled_start?: string | null;
          status?: Database["public"]["Enums"]["installation_status"];
          supply_phase?: Database["public"]["Enums"]["supply_phase"];
          technician_id?: string | null;
          tier_id?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          access_notes?: string | null;
          address?: NonNullable<Json>;
          availability_id?: string | null;
          coc_path?: string | null;
          completed_at?: string | null;
          completion_photo_paths?: string[];
          contact_email?: string;
          contact_name?: string;
          contact_phone?: string;
          created_at?: string;
          db_board_photo_paths?: string[];
          deleted_at?: string | null;
          existing_system?: string | null;
          id?: string;
          order_id?: string | null;
          property_type?: Database["public"]["Enums"]["property_type"] | null;
          roof_photo_paths?: string[];
          roof_type?: Database["public"]["Enums"]["roof_type"] | null;
          scheduled_end?: string | null;
          scheduled_start?: string | null;
          status?: Database["public"]["Enums"]["installation_status"];
          supply_phase?: Database["public"]["Enums"]["supply_phase"];
          technician_id?: string | null;
          tier_id?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "installation_bookings_availability_id_fkey";
            columns: ["availability_id"];
            isOneToOne: true;
            referencedRelation: "technician_availability";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "installation_bookings_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "installation_bookings_technician_id_fkey";
            columns: ["technician_id"];
            isOneToOne: false;
            referencedRelation: "technicians";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "installation_bookings_tier_id_fkey";
            columns: ["tier_id"];
            isOneToOne: false;
            referencedRelation: "installation_tiers";
            referencedColumns: ["id"];
          },
        ];
      };
      installation_tiers: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          inclusions: string[];
          is_active: boolean;
          is_maintenance: boolean;
          name: string;
          price_incl_vat: number | null;
          requires_site_assessment: boolean;
          sku: string;
          sort_order: number;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          inclusions?: string[];
          is_active?: boolean;
          is_maintenance?: boolean;
          name: string;
          price_incl_vat?: number | null;
          requires_site_assessment?: boolean;
          sku: string;
          sort_order?: number;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          inclusions?: string[];
          is_active?: boolean;
          is_maintenance?: boolean;
          name?: string;
          price_incl_vat?: number | null;
          requires_site_assessment?: boolean;
          sku?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      inventory_movements: {
        Row: {
          created_at: string;
          created_by: string | null;
          delta: number;
          id: number;
          product_id: string;
          reason: Database["public"]["Enums"]["inventory_reason"];
          reference: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          delta: number;
          id?: never;
          product_id: string;
          reason: Database["public"]["Enums"]["inventory_reason"];
          reference?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          delta?: number;
          id?: never;
          product_id?: string;
          reason?: Database["public"]["Enums"]["inventory_reason"];
          reference?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_movements_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      invoice_counter: {
        Row: {
          id: boolean;
          last_number: number;
        };
        ComputedFields: never;
        Insert: {
          id?: boolean;
          last_number?: number;
        };
        Update: {
          id?: boolean;
          last_number?: number;
        };
        Relationships: [];
      };
      invoices: {
        Row: {
          customer_snapshot: NonNullable<Json>;
          id: string;
          invoice_code: string | null;
          invoice_number: number;
          issued_at: string;
          order_id: string;
          pdf_path: string | null;
          supplier_snapshot: NonNullable<Json>;
        };
        ComputedFields: never;
        Insert: {
          customer_snapshot?: NonNullable<Json>;
          id?: string;
          invoice_code?: never;
          invoice_number: number;
          issued_at?: string;
          order_id: string;
          pdf_path?: string | null;
          supplier_snapshot?: NonNullable<Json>;
        };
        Update: {
          customer_snapshot?: NonNullable<Json>;
          id?: string;
          invoice_code?: never;
          invoice_number?: number;
          issued_at?: string;
          order_id?: string;
          pdf_path?: string | null;
          supplier_snapshot?: NonNullable<Json>;
        };
        Relationships: [
          {
            foreignKeyName: "invoices_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: true;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      legal_documents: {
        Row: {
          body_markdown: string;
          created_at: string;
          id: string;
          published_at: string | null;
          slug: string;
          title: string;
          version: string;
        };
        ComputedFields: never;
        Insert: {
          body_markdown: string;
          created_at?: string;
          id?: string;
          published_at?: string | null;
          slug: string;
          title: string;
          version: string;
        };
        Update: {
          body_markdown?: string;
          created_at?: string;
          id?: string;
          published_at?: string | null;
          slug?: string;
          title?: string;
          version?: string;
        };
        Relationships: [];
      };
      order_items: {
        Row: {
          id: string;
          is_service: boolean;
          line_total_incl_vat: number;
          line_vat_amount: number;
          name: string;
          order_id: string;
          product_id: string | null;
          quantity: number;
          shipping_class: Database["public"]["Enums"]["shipping_class"] | null;
          sku: string;
          unit_price_incl_vat: number;
          vat_rate: number;
        };
        ComputedFields: never;
        Insert: {
          id?: string;
          is_service?: boolean;
          line_total_incl_vat: number;
          line_vat_amount: number;
          name: string;
          order_id: string;
          product_id?: string | null;
          quantity: number;
          shipping_class?: Database["public"]["Enums"]["shipping_class"] | null;
          sku: string;
          unit_price_incl_vat: number;
          vat_rate?: number;
        };
        Update: {
          id?: string;
          is_service?: boolean;
          line_total_incl_vat?: number;
          line_vat_amount?: number;
          name?: string;
          order_id?: string;
          product_id?: string | null;
          quantity?: number;
          shipping_class?: Database["public"]["Enums"]["shipping_class"] | null;
          sku?: string;
          unit_price_incl_vat?: number;
          vat_rate?: number;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          access_token_hash: string | null;
          billing_address: Json | null;
          cancelled_at: string | null;
          coupon_code: string | null;
          created_at: string;
          currency: string;
          customer_name: string | null;
          customer_notes: string | null;
          deleted_at: string | null;
          delivery_method: Database["public"]["Enums"]["delivery_method"];
          delivery_pending: boolean;
          discount_incl_vat: number;
          email: string;
          id: string;
          installation_incl_vat: number;
          installation_requested: boolean;
          marketing_opt_in: boolean;
          order_number: string;
          paid_at: string | null;
          payment_method: Database["public"]["Enums"]["payment_method"];
          phone: string | null;
          shipping_address: Json | null;
          shipping_incl_vat: number;
          status: Database["public"]["Enums"]["order_status"];
          subtotal_incl_vat: number;
          terms_accepted_at: string;
          terms_version: string;
          total_incl_vat: number;
          updated_at: string;
          user_id: string | null;
          vat_amount: number;
          vat_rate: number;
        };
        ComputedFields: never;
        Insert: {
          access_token_hash?: string | null;
          billing_address?: Json | null;
          cancelled_at?: string | null;
          coupon_code?: string | null;
          created_at?: string;
          currency?: string;
          customer_name?: string | null;
          customer_notes?: string | null;
          deleted_at?: string | null;
          delivery_method?: Database["public"]["Enums"]["delivery_method"];
          delivery_pending?: boolean;
          discount_incl_vat?: number;
          email: string;
          id?: string;
          installation_incl_vat?: number;
          installation_requested?: boolean;
          marketing_opt_in?: boolean;
          order_number?: string;
          paid_at?: string | null;
          payment_method?: Database["public"]["Enums"]["payment_method"];
          phone?: string | null;
          shipping_address?: Json | null;
          shipping_incl_vat?: number;
          status?: Database["public"]["Enums"]["order_status"];
          subtotal_incl_vat: number;
          terms_accepted_at: string;
          terms_version: string;
          total_incl_vat: number;
          updated_at?: string;
          user_id?: string | null;
          vat_amount: number;
          vat_rate?: number;
        };
        Update: {
          access_token_hash?: string | null;
          billing_address?: Json | null;
          cancelled_at?: string | null;
          coupon_code?: string | null;
          created_at?: string;
          currency?: string;
          customer_name?: string | null;
          customer_notes?: string | null;
          deleted_at?: string | null;
          delivery_method?: Database["public"]["Enums"]["delivery_method"];
          delivery_pending?: boolean;
          discount_incl_vat?: number;
          email?: string;
          id?: string;
          installation_incl_vat?: number;
          installation_requested?: boolean;
          marketing_opt_in?: boolean;
          order_number?: string;
          paid_at?: string | null;
          payment_method?: Database["public"]["Enums"]["payment_method"];
          phone?: string | null;
          shipping_address?: Json | null;
          shipping_incl_vat?: number;
          status?: Database["public"]["Enums"]["order_status"];
          subtotal_incl_vat?: number;
          terms_accepted_at?: string;
          terms_version?: string;
          total_incl_vat?: number;
          updated_at?: string;
          user_id?: string | null;
          vat_amount?: number;
          vat_rate?: number;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          amount: number;
          id: string;
          method: string | null;
          order_id: string;
          provider: string;
          provider_payment_id: string | null;
          raw_payload: Json | null;
          received_at: string;
          signature_valid: boolean | null;
          status: Database["public"]["Enums"]["payment_status"];
          verified_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          amount: number;
          id?: string;
          method?: string | null;
          order_id: string;
          provider: string;
          provider_payment_id?: string | null;
          raw_payload?: Json | null;
          received_at?: string;
          signature_valid?: boolean | null;
          status?: Database["public"]["Enums"]["payment_status"];
          verified_at?: string | null;
        };
        Update: {
          amount?: number;
          id?: string;
          method?: string | null;
          order_id?: string;
          provider?: string;
          provider_payment_id?: string | null;
          raw_payload?: Json | null;
          received_at?: string;
          signature_valid?: boolean | null;
          status?: Database["public"]["Enums"]["payment_status"];
          verified_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      product_compatibility: {
        Row: {
          battery_id: string;
          confirmed_at: string | null;
          confirmed_by: string | null;
          created_at: string;
          id: string;
          inverter_id: string;
          protocol: string | null;
          reason: string | null;
          status: Database["public"]["Enums"]["compatibility_status"];
        };
        ComputedFields: never;
        Insert: {
          battery_id: string;
          confirmed_at?: string | null;
          confirmed_by?: string | null;
          created_at?: string;
          id?: string;
          inverter_id: string;
          protocol?: string | null;
          reason?: string | null;
          status?: Database["public"]["Enums"]["compatibility_status"];
        };
        Update: {
          battery_id?: string;
          confirmed_at?: string | null;
          confirmed_by?: string | null;
          created_at?: string;
          id?: string;
          inverter_id?: string;
          protocol?: string | null;
          reason?: string | null;
          status?: Database["public"]["Enums"]["compatibility_status"];
        };
        Relationships: [
          {
            foreignKeyName: "product_compatibility_battery_id_fkey";
            columns: ["battery_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_compatibility_inverter_id_fkey";
            columns: ["inverter_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_costs: {
        Row: {
          cost_price_excl_vat: number;
          product_id: string;
          supplier: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          cost_price_excl_vat: number;
          product_id: string;
          supplier?: string | null;
          updated_at?: string;
        };
        Update: {
          cost_price_excl_vat?: number;
          product_id?: string;
          supplier?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_costs_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: true;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_images: {
        Row: {
          alt: string;
          created_at: string;
          id: string;
          product_id: string;
          sort_order: number;
          storage_path: string;
        };
        ComputedFields: never;
        Insert: {
          alt: string;
          created_at?: string;
          id?: string;
          product_id: string;
          sort_order?: number;
          storage_path: string;
        };
        Update: {
          alt?: string;
          created_at?: string;
          id?: string;
          product_id?: string;
          sort_order?: number;
          storage_path?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_specs: {
        Row: {
          id: string;
          key: string;
          label: string;
          product_id: string;
          sort_order: number;
          unit: string | null;
          value_num: number | null;
          value_text: string;
        };
        ComputedFields: never;
        Insert: {
          id?: string;
          key: string;
          label: string;
          product_id: string;
          sort_order?: number;
          unit?: string | null;
          value_num?: number | null;
          value_text: string;
        };
        Update: {
          id?: string;
          key?: string;
          label?: string;
          product_id?: string;
          sort_order?: number;
          unit?: string | null;
          value_num?: number | null;
          value_text?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_specs_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          allow_backorder: boolean;
          brand_id: string | null;
          category_id: string;
          compare_at_price_incl_vat: number | null;
          created_at: string;
          datasheet_path: string | null;
          deleted_at: string | null;
          description: string | null;
          height_mm: number | null;
          id: string;
          incomplete_fields: string[];
          installation_eligible: boolean;
          is_active: boolean;
          is_dangerous_goods: boolean;
          is_featured: boolean;
          length_mm: number | null;
          low_stock_threshold: number;
          name: string;
          nrs_097_2_1_approved: boolean | null;
          performance_warranty_years: number | null;
          price_incl_vat: number;
          shipping_class: Database["public"]["Enums"]["shipping_class"];
          short_description: string | null;
          sku: string;
          slug: string;
          source_import_id: number | null;
          stock_qty: number;
          updated_at: string;
          warranty_months: number | null;
          weight_kg: number | null;
          width_mm: number | null;
        };
        ComputedFields: never;
        Insert: {
          allow_backorder?: boolean;
          brand_id?: string | null;
          category_id: string;
          compare_at_price_incl_vat?: number | null;
          created_at?: string;
          datasheet_path?: string | null;
          deleted_at?: string | null;
          description?: string | null;
          height_mm?: number | null;
          id?: string;
          incomplete_fields?: string[];
          installation_eligible?: boolean;
          is_active?: boolean;
          is_dangerous_goods?: boolean;
          is_featured?: boolean;
          length_mm?: number | null;
          low_stock_threshold?: number;
          name: string;
          nrs_097_2_1_approved?: boolean | null;
          performance_warranty_years?: number | null;
          price_incl_vat: number;
          shipping_class?: Database["public"]["Enums"]["shipping_class"];
          short_description?: string | null;
          sku: string;
          slug: string;
          source_import_id?: number | null;
          stock_qty?: number;
          updated_at?: string;
          warranty_months?: number | null;
          weight_kg?: number | null;
          width_mm?: number | null;
        };
        Update: {
          allow_backorder?: boolean;
          brand_id?: string | null;
          category_id?: string;
          compare_at_price_incl_vat?: number | null;
          created_at?: string;
          datasheet_path?: string | null;
          deleted_at?: string | null;
          description?: string | null;
          height_mm?: number | null;
          id?: string;
          incomplete_fields?: string[];
          installation_eligible?: boolean;
          is_active?: boolean;
          is_dangerous_goods?: boolean;
          is_featured?: boolean;
          length_mm?: number | null;
          low_stock_threshold?: number;
          name?: string;
          nrs_097_2_1_approved?: boolean | null;
          performance_warranty_years?: number | null;
          price_incl_vat?: number;
          shipping_class?: Database["public"]["Enums"]["shipping_class"];
          short_description?: string | null;
          sku?: string;
          slug?: string;
          source_import_id?: number | null;
          stock_qty?: number;
          updated_at?: string;
          warranty_months?: number | null;
          weight_kg?: number | null;
          width_mm?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey";
            columns: ["brand_id"];
            isOneToOne: false;
            referencedRelation: "brands";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_source_import_fk";
            columns: ["source_import_id"];
            isOneToOne: false;
            referencedRelation: "import_logs";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          company_name: string | null;
          created_at: string;
          deleted_at: string | null;
          full_name: string | null;
          id: string;
          marketing_email_opt_in: boolean;
          marketing_whatsapp_opt_in: boolean;
          phone: string | null;
          role: Database["public"]["Enums"]["user_role"];
          trade_status: Database["public"]["Enums"]["trade_status"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          company_name?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          full_name?: string | null;
          id: string;
          marketing_email_opt_in?: boolean;
          marketing_whatsapp_opt_in?: boolean;
          phone?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          trade_status?: Database["public"]["Enums"]["trade_status"];
          updated_at?: string;
        };
        Update: {
          company_name?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          full_name?: string | null;
          id?: string;
          marketing_email_opt_in?: boolean;
          marketing_whatsapp_opt_in?: boolean;
          phone?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          trade_status?: Database["public"]["Enums"]["trade_status"];
          updated_at?: string;
        };
        Relationships: [];
      };
      quote_requests: {
        Row: {
          ai_conversation_id: string | null;
          assigned_to: string | null;
          attachment_paths: string[];
          company: string | null;
          created_at: string;
          deleted_at: string | null;
          details: string;
          email: string;
          id: string;
          monthly_bill_rand: number | null;
          name: string;
          phone: string | null;
          province: string | null;
          source: string;
          status: Database["public"]["Enums"]["quote_status"];
          updated_at: string;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          ai_conversation_id?: string | null;
          assigned_to?: string | null;
          attachment_paths?: string[];
          company?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          details: string;
          email: string;
          id?: string;
          monthly_bill_rand?: number | null;
          name: string;
          phone?: string | null;
          province?: string | null;
          source?: string;
          status?: Database["public"]["Enums"]["quote_status"];
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          ai_conversation_id?: string | null;
          assigned_to?: string | null;
          attachment_paths?: string[];
          company?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          details?: string;
          email?: string;
          id?: string;
          monthly_bill_rand?: number | null;
          name?: string;
          phone?: string | null;
          province?: string | null;
          source?: string;
          status?: Database["public"]["Enums"]["quote_status"];
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "quote_requests_ai_conversation_fk";
            columns: ["ai_conversation_id"];
            isOneToOne: false;
            referencedRelation: "ai_conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      quotes: {
        Row: {
          access_token_hash: string;
          company: string | null;
          converted_order_id: string | null;
          created_at: string;
          customer_name: string;
          email: string;
          id: string;
          installation_requested: boolean;
          items: NonNullable<Json>;
          marketing_opt_in: boolean;
          phone: string | null;
          quote_code: string | null;
          quote_number: number;
          subtotal_incl_vat: number;
          total_incl_vat: number;
          user_id: string | null;
          valid_until: string;
          vat_amount: number;
        };
        ComputedFields: never;
        Insert: {
          access_token_hash: string;
          company?: string | null;
          converted_order_id?: string | null;
          created_at?: string;
          customer_name: string;
          email: string;
          id?: string;
          installation_requested?: boolean;
          items: NonNullable<Json>;
          marketing_opt_in?: boolean;
          phone?: string | null;
          quote_code?: never;
          quote_number?: number;
          subtotal_incl_vat: number;
          total_incl_vat: number;
          user_id?: string | null;
          valid_until: string;
          vat_amount: number;
        };
        Update: {
          access_token_hash?: string;
          company?: string | null;
          converted_order_id?: string | null;
          created_at?: string;
          customer_name?: string;
          email?: string;
          id?: string;
          installation_requested?: boolean;
          items?: NonNullable<Json>;
          marketing_opt_in?: boolean;
          phone?: string | null;
          quote_code?: never;
          quote_number?: number;
          subtotal_incl_vat?: number;
          total_incl_vat?: number;
          user_id?: string | null;
          valid_until?: string;
          vat_amount?: number;
        };
        Relationships: [
          {
            foreignKeyName: "quotes_converted_order_id_fkey";
            columns: ["converted_order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      refunds: {
        Row: {
          amount: number;
          created_at: string;
          id: string;
          order_id: string;
          payment_id: string | null;
          processed_at: string | null;
          processed_by: string | null;
          provider_refund_id: string | null;
          reason: string;
          requested_by: string | null;
          status: Database["public"]["Enums"]["refund_status"];
        };
        ComputedFields: never;
        Insert: {
          amount: number;
          created_at?: string;
          id?: string;
          order_id: string;
          payment_id?: string | null;
          processed_at?: string | null;
          processed_by?: string | null;
          provider_refund_id?: string | null;
          reason: string;
          requested_by?: string | null;
          status?: Database["public"]["Enums"]["refund_status"];
        };
        Update: {
          amount?: number;
          created_at?: string;
          id?: string;
          order_id?: string;
          payment_id?: string | null;
          processed_at?: string | null;
          processed_by?: string | null;
          provider_refund_id?: string | null;
          reason?: string;
          requested_by?: string | null;
          status?: Database["public"]["Enums"]["refund_status"];
        };
        Relationships: [
          {
            foreignKeyName: "refunds_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "refunds_payment_id_fkey";
            columns: ["payment_id"];
            isOneToOne: false;
            referencedRelation: "payments";
            referencedColumns: ["id"];
          },
        ];
      };
      return_requests: {
        Row: {
          created_at: string;
          details: string | null;
          goods_received_at: string | null;
          id: string;
          items: NonNullable<Json>;
          order_id: string;
          photo_paths: string[];
          reason: Database["public"]["Enums"]["return_reason"];
          refund_id: string | null;
          status: Database["public"]["Enums"]["return_status"];
          updated_at: string;
          user_id: string | null;
          within_cooling_off: boolean;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          details?: string | null;
          goods_received_at?: string | null;
          id?: string;
          items: NonNullable<Json>;
          order_id: string;
          photo_paths?: string[];
          reason: Database["public"]["Enums"]["return_reason"];
          refund_id?: string | null;
          status?: Database["public"]["Enums"]["return_status"];
          updated_at?: string;
          user_id?: string | null;
          within_cooling_off?: boolean;
        };
        Update: {
          created_at?: string;
          details?: string | null;
          goods_received_at?: string | null;
          id?: string;
          items?: NonNullable<Json>;
          order_id?: string;
          photo_paths?: string[];
          reason?: Database["public"]["Enums"]["return_reason"];
          refund_id?: string | null;
          status?: Database["public"]["Enums"]["return_status"];
          updated_at?: string;
          user_id?: string | null;
          within_cooling_off?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "return_requests_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "return_requests_refund_id_fkey";
            columns: ["refund_id"];
            isOneToOne: false;
            referencedRelation: "refunds";
            referencedColumns: ["id"];
          },
        ];
      };
      reviews: {
        Row: {
          author_display_name: string;
          body: string;
          created_at: string;
          deleted_at: string | null;
          id: string;
          is_verified_purchase: boolean;
          moderated_at: string | null;
          order_id: string | null;
          product_id: string;
          rating: number;
          status: Database["public"]["Enums"]["review_status"];
          title: string | null;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          author_display_name: string;
          body: string;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          is_verified_purchase?: boolean;
          moderated_at?: string | null;
          order_id?: string | null;
          product_id: string;
          rating: number;
          status?: Database["public"]["Enums"]["review_status"];
          title?: string | null;
          user_id?: string | null;
        };
        Update: {
          author_display_name?: string;
          body?: string;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          is_verified_purchase?: boolean;
          moderated_at?: string | null;
          order_id?: string | null;
          product_id?: string;
          rating?: number;
          status?: Database["public"]["Enums"]["review_status"];
          title?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      shipments: {
        Row: {
          booked_at: string | null;
          cost_incl_vat: number | null;
          created_at: string;
          delivered_at: string | null;
          events: NonNullable<Json>;
          id: string;
          label_path: string | null;
          order_id: string;
          parcels: NonNullable<Json>;
          provider: string;
          service_code: string | null;
          shipping_class: Database["public"]["Enums"]["shipping_class"];
          status: Database["public"]["Enums"]["shipment_status"];
          tracking_number: string | null;
          tracking_url: string | null;
          updated_at: string;
          waybill_number: string | null;
        };
        ComputedFields: never;
        Insert: {
          booked_at?: string | null;
          cost_incl_vat?: number | null;
          created_at?: string;
          delivered_at?: string | null;
          events?: NonNullable<Json>;
          id?: string;
          label_path?: string | null;
          order_id: string;
          parcels?: NonNullable<Json>;
          provider: string;
          service_code?: string | null;
          shipping_class: Database["public"]["Enums"]["shipping_class"];
          status?: Database["public"]["Enums"]["shipment_status"];
          tracking_number?: string | null;
          tracking_url?: string | null;
          updated_at?: string;
          waybill_number?: string | null;
        };
        Update: {
          booked_at?: string | null;
          cost_incl_vat?: number | null;
          created_at?: string;
          delivered_at?: string | null;
          events?: NonNullable<Json>;
          id?: string;
          label_path?: string | null;
          order_id?: string;
          parcels?: NonNullable<Json>;
          provider?: string;
          service_code?: string | null;
          shipping_class?: Database["public"]["Enums"]["shipping_class"];
          status?: Database["public"]["Enums"]["shipment_status"];
          tracking_number?: string | null;
          tracking_url?: string | null;
          updated_at?: string;
          waybill_number?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "shipments_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      shipping_quotes: {
        Row: {
          cart_id: string | null;
          created_at: string;
          eta_days_max: number | null;
          eta_days_min: number | null;
          expires_at: string;
          id: string;
          is_fallback: boolean;
          order_id: string | null;
          price_incl_vat: number;
          provider: string;
          request_payload: Json | null;
          response_payload: Json | null;
          service_code: string;
          service_name: string;
          shipping_class: Database["public"]["Enums"]["shipping_class"];
        };
        ComputedFields: never;
        Insert: {
          cart_id?: string | null;
          created_at?: string;
          eta_days_max?: number | null;
          eta_days_min?: number | null;
          expires_at: string;
          id?: string;
          is_fallback?: boolean;
          order_id?: string | null;
          price_incl_vat: number;
          provider: string;
          request_payload?: Json | null;
          response_payload?: Json | null;
          service_code: string;
          service_name: string;
          shipping_class: Database["public"]["Enums"]["shipping_class"];
        };
        Update: {
          cart_id?: string | null;
          created_at?: string;
          eta_days_max?: number | null;
          eta_days_min?: number | null;
          expires_at?: string;
          id?: string;
          is_fallback?: boolean;
          order_id?: string | null;
          price_incl_vat?: number;
          provider?: string;
          request_payload?: Json | null;
          response_payload?: Json | null;
          service_code?: string;
          service_name?: string;
          shipping_class?: Database["public"]["Enums"]["shipping_class"];
        };
        Relationships: [
          {
            foreignKeyName: "shipping_quotes_cart_id_fkey";
            columns: ["cart_id"];
            isOneToOne: false;
            referencedRelation: "carts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shipping_quotes_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      shipping_rate_table: {
        Row: {
          base_price_incl_vat: number;
          eta_days_max: number | null;
          eta_days_min: number | null;
          id: string;
          is_active: boolean;
          per_item_incl_vat: number;
          per_kg_incl_vat: number;
          postal_code_from: string | null;
          postal_code_to: string | null;
          province: string;
          shipping_class: Database["public"]["Enums"]["shipping_class"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          base_price_incl_vat: number;
          eta_days_max?: number | null;
          eta_days_min?: number | null;
          id?: string;
          is_active?: boolean;
          per_item_incl_vat?: number;
          per_kg_incl_vat?: number;
          postal_code_from?: string | null;
          postal_code_to?: string | null;
          province: string;
          shipping_class: Database["public"]["Enums"]["shipping_class"];
          updated_at?: string;
        };
        Update: {
          base_price_incl_vat?: number;
          eta_days_max?: number | null;
          eta_days_min?: number | null;
          id?: string;
          is_active?: boolean;
          per_item_incl_vat?: number;
          per_kg_incl_vat?: number;
          postal_code_from?: string | null;
          postal_code_to?: string | null;
          province?: string;
          shipping_class?: Database["public"]["Enums"]["shipping_class"];
          updated_at?: string;
        };
        Relationships: [];
      };
      shipping_settings: {
        Row: {
          collection_address: string | null;
          collection_enabled: boolean;
          free_delivery_threshold_incl_vat: number | null;
          free_delivery_with_installation: boolean;
          id: boolean;
          quote_after_order_when_unavailable: boolean;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          collection_address?: string | null;
          collection_enabled?: boolean;
          free_delivery_threshold_incl_vat?: number | null;
          free_delivery_with_installation?: boolean;
          id?: boolean;
          quote_after_order_when_unavailable?: boolean;
          updated_at?: string;
        };
        Update: {
          collection_address?: string | null;
          collection_enabled?: boolean;
          free_delivery_threshold_incl_vat?: number | null;
          free_delivery_with_installation?: boolean;
          id?: boolean;
          quote_after_order_when_unavailable?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      stock_reservations: {
        Row: {
          created_at: string;
          expires_at: string;
          id: string;
          order_id: string;
          product_id: string;
          quantity: number;
          status: Database["public"]["Enums"]["reservation_status"];
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          expires_at: string;
          id?: string;
          order_id: string;
          product_id: string;
          quantity: number;
          status?: Database["public"]["Enums"]["reservation_status"];
        };
        Update: {
          created_at?: string;
          expires_at?: string;
          id?: string;
          order_id?: string;
          product_id?: string;
          quantity?: number;
          status?: Database["public"]["Enums"]["reservation_status"];
        };
        Relationships: [
          {
            foreignKeyName: "stock_reservations_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_reservations_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      technician_availability: {
        Row: {
          created_at: string;
          ends_at: string;
          id: string;
          starts_at: string;
          technician_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          ends_at: string;
          id?: string;
          starts_at: string;
          technician_id: string;
        };
        Update: {
          created_at?: string;
          ends_at?: string;
          id?: string;
          starts_at?: string;
          technician_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "technician_availability_technician_id_fkey";
            columns: ["technician_id"];
            isOneToOne: false;
            referencedRelation: "technicians";
            referencedColumns: ["id"];
          },
        ];
      };
      technicians: {
        Row: {
          created_at: string;
          display_name: string;
          id: string;
          is_active: boolean;
          phone: string | null;
          profile_id: string | null;
          registration_number: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          display_name: string;
          id?: string;
          is_active?: boolean;
          phone?: string | null;
          profile_id?: string | null;
          registration_number?: string | null;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          id?: string;
          is_active?: boolean;
          phone?: string | null;
          profile_id?: string | null;
          registration_number?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "technicians_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      warranty_claims: {
        Row: {
          created_at: string;
          fault_description: string;
          id: string;
          order_id: string | null;
          order_item_id: string | null;
          photo_paths: string[];
          resolution_notes: string | null;
          serial_number: string | null;
          status: Database["public"]["Enums"]["warranty_status"];
          updated_at: string;
          user_id: string | null;
          within_cpa_six_months: boolean;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          fault_description: string;
          id?: string;
          order_id?: string | null;
          order_item_id?: string | null;
          photo_paths?: string[];
          resolution_notes?: string | null;
          serial_number?: string | null;
          status?: Database["public"]["Enums"]["warranty_status"];
          updated_at?: string;
          user_id?: string | null;
          within_cpa_six_months?: boolean;
        };
        Update: {
          created_at?: string;
          fault_description?: string;
          id?: string;
          order_id?: string | null;
          order_item_id?: string | null;
          photo_paths?: string[];
          resolution_notes?: string | null;
          serial_number?: string | null;
          status?: Database["public"]["Enums"]["warranty_status"];
          updated_at?: string;
          user_id?: string | null;
          within_cpa_six_months?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "warranty_claims_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "warranty_claims_order_item_id_fkey";
            columns: ["order_item_id"];
            isOneToOne: false;
            referencedRelation: "order_items";
            referencedColumns: ["id"];
          },
        ];
      };
      wishlists: {
        Row: {
          created_at: string;
          id: string;
          product_id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          product_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          product_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wishlists_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      apply_payfast_itn: { Args: { p: Json }; Returns: Json };
      available_stock: {
        Args: { p_product_ids: string[] };
        Returns: {
          allow_backorder: boolean;
          available: number;
          product_id: string;
        }[];
      };
      booked_slot_ids: { Args: { p_from: string; p_to: string }; Returns: string[] };
      cancel_pending_order: { Args: { p_order_id: string }; Returns: Json };
      confirm_order_paid: { Args: { p_order_id: string; p_payment_id: string }; Returns: number };
      create_checkout_order: { Args: { p: Json }; Returns: Json };
      create_quote: { Args: { p: Json }; Returns: Json };
      current_technician_id: { Args: Record<PropertyKey, never>; Returns: string };
      current_user_role: {
        Args: Record<PropertyKey, never>;
        Returns: Database["public"]["Enums"]["user_role"];
      };
      import_catalogue: { Args: { p_payload: Json }; Returns: Json };
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_staff: { Args: Record<PropertyKey, never>; Returns: boolean };
      price_items: {
        Args: { p_items: Json };
        Returns: {
          installation: boolean;
          line_total: number;
          line_vat: number;
          name: string;
          product_id: string;
          quantity: number;
          shipping_class: Database["public"]["Enums"]["shipping_class"];
          sku: string;
          unit_price: number;
        }[];
      };
      refresh_incomplete_fields: {
        Args: { p_product_ids: string[]; p_required: Json };
        Returns: undefined;
      };
      release_expired_reservations: { Args: Record<PropertyKey, never>; Returns: number };
      reserve_order_stock: { Args: { p_minutes?: number; p_order_id: string }; Returns: undefined };
    };
    Enums: {
      compatibility_status: "proposed" | "confirmed" | "incompatible";
      consent_type:
        | "cookies_analytics"
        | "cookies_marketing"
        | "marketing_email"
        | "marketing_whatsapp"
        | "ai_conversation_storage"
        | "terms";
      coupon_type: "percent" | "fixed";
      data_request_status: "received" | "in_progress" | "completed" | "rejected";
      data_request_type: "access" | "export" | "correction" | "deletion";
      delivery_method: "courier" | "own_delivery" | "collection" | "installer_delivery";
      installation_status:
        | "requested"
        | "site_assessment"
        | "scheduled"
        | "in_progress"
        | "completed"
        | "cancelled";
      inventory_reason:
        | "import"
        | "manual_adjustment"
        | "order_paid"
        | "order_cancelled"
        | "return"
        | "stocktake";
      order_status:
        | "pending_payment"
        | "paid"
        | "processing"
        | "ready_for_collection"
        | "shipped"
        | "delivered"
        | "completed"
        | "cancelled"
        | "expired"
        | "refunded"
        | "partially_refunded";
      payment_method: "payfast" | "eft";
      payment_status: "pending" | "verified" | "failed" | "cancelled";
      property_type: "house" | "townhouse" | "apartment" | "farm" | "business" | "other";
      quote_status: "new" | "contacted" | "quoted" | "won" | "lost";
      refund_status: "requested" | "approved" | "processed" | "rejected";
      reservation_status: "active" | "consumed" | "released";
      return_reason: "cooling_off" | "defective" | "wrong_item" | "damaged_in_transit" | "other";
      return_status: "requested" | "approved" | "received" | "refunded" | "rejected";
      review_status: "pending" | "approved" | "rejected";
      roof_type:
        | "ibr"
        | "corrugated"
        | "tile"
        | "clip_lock"
        | "flat_concrete"
        | "ground_mount"
        | "other";
      shipment_status:
        | "pending"
        | "booked"
        | "collected"
        | "in_transit"
        | "out_for_delivery"
        | "delivered"
        | "failed"
        | "cancelled";
      shipping_class: "standard" | "oversized" | "dangerous_goods";
      supply_phase: "single" | "three" | "unknown";
      trade_status: "none" | "pending" | "approved" | "rejected";
      user_role: "customer" | "admin" | "sales" | "technician";
      warranty_status:
        | "submitted"
        | "assessing"
        | "repair"
        | "replace"
        | "refund"
        | "manufacturer_claim"
        | "rejected"
        | "closed";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      compatibility_status: ["proposed", "confirmed", "incompatible"],
      consent_type: [
        "cookies_analytics",
        "cookies_marketing",
        "marketing_email",
        "marketing_whatsapp",
        "ai_conversation_storage",
        "terms",
      ],
      coupon_type: ["percent", "fixed"],
      data_request_status: ["received", "in_progress", "completed", "rejected"],
      data_request_type: ["access", "export", "correction", "deletion"],
      delivery_method: ["courier", "own_delivery", "collection", "installer_delivery"],
      installation_status: [
        "requested",
        "site_assessment",
        "scheduled",
        "in_progress",
        "completed",
        "cancelled",
      ],
      inventory_reason: [
        "import",
        "manual_adjustment",
        "order_paid",
        "order_cancelled",
        "return",
        "stocktake",
      ],
      order_status: [
        "pending_payment",
        "paid",
        "processing",
        "ready_for_collection",
        "shipped",
        "delivered",
        "completed",
        "cancelled",
        "expired",
        "refunded",
        "partially_refunded",
      ],
      payment_method: ["payfast", "eft"],
      payment_status: ["pending", "verified", "failed", "cancelled"],
      property_type: ["house", "townhouse", "apartment", "farm", "business", "other"],
      quote_status: ["new", "contacted", "quoted", "won", "lost"],
      refund_status: ["requested", "approved", "processed", "rejected"],
      reservation_status: ["active", "consumed", "released"],
      return_reason: ["cooling_off", "defective", "wrong_item", "damaged_in_transit", "other"],
      return_status: ["requested", "approved", "received", "refunded", "rejected"],
      review_status: ["pending", "approved", "rejected"],
      roof_type: [
        "ibr",
        "corrugated",
        "tile",
        "clip_lock",
        "flat_concrete",
        "ground_mount",
        "other",
      ],
      shipment_status: [
        "pending",
        "booked",
        "collected",
        "in_transit",
        "out_for_delivery",
        "delivered",
        "failed",
        "cancelled",
      ],
      shipping_class: ["standard", "oversized", "dangerous_goods"],
      supply_phase: ["single", "three", "unknown"],
      trade_status: ["none", "pending", "approved", "rejected"],
      user_role: ["customer", "admin", "sales", "technician"],
      warranty_status: [
        "submitted",
        "assessing",
        "repair",
        "replace",
        "refund",
        "manufacturer_claim",
        "rejected",
        "closed",
      ],
    },
  },
} as const;
