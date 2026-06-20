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
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json | null
          entity: string
          entity_id: string | null
          id: string
          store_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity: string
          entity_id?: string | null
          id?: string
          store_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity?: string
          entity_id?: string | null
          id?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          created_at: string
          id: string
          name: string
          store_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
          store_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_sessions: {
        Row: {
          branch_id: string | null
          card_sales: number
          cash_sales: number
          cashier_id: string
          closed_at: string | null
          counted_cash: number | null
          expected_cash: number | null
          expenses_paid: number
          id: string
          notes: string | null
          opened_at: string
          opening_float: number
          other_sales: number
          status: string
          store_id: string
          total_sales: number
          transfer_sales: number
          variance: number | null
        }
        Insert: {
          branch_id?: string | null
          card_sales?: number
          cash_sales?: number
          cashier_id: string
          closed_at?: string | null
          counted_cash?: number | null
          expected_cash?: number | null
          expenses_paid?: number
          id?: string
          notes?: string | null
          opened_at?: string
          opening_float?: number
          other_sales?: number
          status?: string
          store_id: string
          total_sales?: number
          transfer_sales?: number
          variance?: number | null
        }
        Update: {
          branch_id?: string | null
          card_sales?: number
          cash_sales?: number
          cashier_id?: string
          closed_at?: string | null
          counted_cash?: number | null
          expected_cash?: number | null
          expenses_paid?: number
          id?: string
          notes?: string | null
          opened_at?: string
          opening_float?: number
          other_sales?: number
          status?: string
          store_id?: string
          total_sales?: number
          transfer_sales?: number
          variance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_sessions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_sessions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_sales: {
        Row: {
          added_by: string | null
          amount_paid: number
          balance: number
          branch_id: string | null
          buyer_name: string
          buyer_phone: string | null
          created_at: string
          customer_id: string | null
          due_date: string | null
          id: string
          inventory_id: string | null
          price: number
          quantity: number
          status: Database["public"]["Enums"]["credit_status"]
          store_id: string
          total: number
          updated_at: string
        }
        Insert: {
          added_by?: string | null
          amount_paid?: number
          balance: number
          branch_id?: string | null
          buyer_name: string
          buyer_phone?: string | null
          created_at?: string
          customer_id?: string | null
          due_date?: string | null
          id?: string
          inventory_id?: string | null
          price: number
          quantity: number
          status?: Database["public"]["Enums"]["credit_status"]
          store_id: string
          total: number
          updated_at?: string
        }
        Update: {
          added_by?: string | null
          amount_paid?: number
          balance?: number
          branch_id?: string | null
          buyer_name?: string
          buyer_phone?: string | null
          created_at?: string
          customer_id?: string | null
          due_date?: string | null
          id?: string
          inventory_id?: string | null
          price?: number
          quantity?: number
          status?: Database["public"]["Enums"]["credit_status"]
          store_id?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_sales_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_sales_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_sales_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          outstanding_balance: number
          phone: string | null
          store_id: string
          total_spent: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          outstanding_balance?: number
          phone?: string | null
          store_id: string
          total_spent?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          outstanding_balance?: number
          phone?: string | null
          store_id?: string
          total_spent?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      damages: {
        Row: {
          branch_id: string | null
          category: string
          cost_loss: number
          created_at: string
          id: string
          inventory_id: string | null
          name: string
          quantity: number
          reason: string
          reported_by: string | null
          store_id: string
        }
        Insert: {
          branch_id?: string | null
          category?: string
          cost_loss?: number
          created_at?: string
          id?: string
          inventory_id?: string | null
          name: string
          quantity: number
          reason: string
          reported_by?: string | null
          store_id: string
        }
        Update: {
          branch_id?: string | null
          category?: string
          cost_loss?: number
          created_at?: string
          id?: string
          inventory_id?: string | null
          name?: string
          quantity?: number
          reason?: string
          reported_by?: string | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "damages_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "damages_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "damages_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          added_by: string | null
          amount: number
          branch_id: string | null
          category: string
          created_at: string
          description: string | null
          expense_date: string
          id: string
          paid_via: string
          receipt_url: string | null
          store_id: string
          updated_at: string
        }
        Insert: {
          added_by?: string | null
          amount: number
          branch_id?: string | null
          category: string
          created_at?: string
          description?: string | null
          expense_date?: string
          id?: string
          paid_via?: string
          receipt_url?: string | null
          store_id: string
          updated_at?: string
        }
        Update: {
          added_by?: string | null
          amount?: number
          branch_id?: string | null
          category?: string
          created_at?: string
          description?: string | null
          expense_date?: string
          id?: string
          paid_via?: string
          receipt_url?: string | null
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      inventories: {
        Row: {
          added_by: string | null
          barcode: string | null
          branch_id: string | null
          category: string
          created_at: string
          id: string
          name: string
          purchase_price: number
          quantity: number
          reorder_level: number
          selling_price: number
          sku: string | null
          status: Database["public"]["Enums"]["inventory_status"]
          store_id: string
          updated_at: string
        }
        Insert: {
          added_by?: string | null
          barcode?: string | null
          branch_id?: string | null
          category?: string
          created_at?: string
          id?: string
          name: string
          purchase_price?: number
          quantity?: number
          reorder_level?: number
          selling_price?: number
          sku?: string | null
          status?: Database["public"]["Enums"]["inventory_status"]
          store_id: string
          updated_at?: string
        }
        Update: {
          added_by?: string | null
          barcode?: string | null
          branch_id?: string | null
          category?: string
          created_at?: string
          id?: string
          name?: string
          purchase_price?: number
          quantity?: number
          reorder_level?: number
          selling_price?: number
          sku?: string | null
          status?: Database["public"]["Enums"]["inventory_status"]
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventories_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventories_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          link: string | null
          read_at: string | null
          store_id: string
          title: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind: string
          link?: string | null
          read_at?: string | null
          store_id: string
          title: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          read_at?: string | null
          store_id?: string
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          branch_id: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          store_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          branch_id?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          branch_id?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          store_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          added_by: string | null
          branch_id: string | null
          cost_amount: number
          created_at: string
          customer_id: string | null
          customer_name: string | null
          id: string
          items: Json
          payment_method: string
          sale_ref: string
          store_id: string
          total_amount: number
        }
        Insert: {
          added_by?: string | null
          branch_id?: string | null
          cost_amount?: number
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          id?: string
          items: Json
          payment_method?: string
          sale_ref: string
          store_id: string
          total_amount: number
        }
        Update: {
          added_by?: string | null
          branch_id?: string | null
          cost_amount?: number
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          id?: string
          items?: Json
          payment_method?: string
          sale_ref?: string
          store_id?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_returns: {
        Row: {
          branch_id: string | null
          created_at: string
          id: string
          inventory_id: string | null
          processed_by: string | null
          quantity: number
          reason: string
          refund_amount: number
          sale_id: string | null
          store_id: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          id?: string
          inventory_id?: string | null
          processed_by?: string | null
          quantity: number
          reason: string
          refund_amount: number
          sale_id?: string | null
          store_id: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          id?: string
          inventory_id?: string | null
          processed_by?: string | null
          quantity?: number
          reason?: string
          refund_amount?: number
          sale_id?: string | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_returns_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_returns_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_returns_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_returns_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_invites: {
        Row: {
          accepted_by: string | null
          branch_id: string | null
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: string
          store_id: string
          updated_at: string
        }
        Insert: {
          accepted_by?: string | null
          branch_id?: string | null
          code: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role: Database["public"]["Enums"]["app_role"]
          status?: string
          store_id: string
          updated_at?: string
        }
        Update: {
          accepted_by?: string | null
          branch_id?: string | null
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_invites_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_invites_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_receipts: {
        Row: {
          branch_id: string | null
          created_at: string
          id: string
          inventory_id: string
          notes: string | null
          quantity: number
          received_by: string | null
          reference: string | null
          store_id: string
          supplier_id: string | null
          total_cost: number
          unit_cost: number
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          id?: string
          inventory_id: string
          notes?: string | null
          quantity: number
          received_by?: string | null
          reference?: string | null
          store_id: string
          supplier_id?: string | null
          total_cost: number
          unit_cost: number
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          id?: string
          inventory_id?: string
          notes?: string | null
          quantity?: number
          received_by?: string | null
          reference?: string | null
          store_id?: string
          supplier_id?: string | null
          total_cost?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_receipts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_receipts_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_receipts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_receipts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transfers: {
        Row: {
          created_at: string
          dest_inventory_id: string | null
          from_branch_id: string
          id: string
          item_name: string
          notes: string | null
          quantity: number
          source_inventory_id: string
          store_id: string
          to_branch_id: string
          transferred_by: string | null
        }
        Insert: {
          created_at?: string
          dest_inventory_id?: string | null
          from_branch_id: string
          id?: string
          item_name: string
          notes?: string | null
          quantity: number
          source_inventory_id: string
          store_id: string
          to_branch_id: string
          transferred_by?: string | null
        }
        Update: {
          created_at?: string
          dest_inventory_id?: string | null
          from_branch_id?: string
          id?: string
          item_name?: string
          notes?: string | null
          quantity?: number
          source_inventory_id?: string
          store_id?: string
          to_branch_id?: string
          transferred_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfers_dest_inventory_id_fkey"
            columns: ["dest_inventory_id"]
            isOneToOne: false
            referencedRelation: "inventories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_from_branch_id_fkey"
            columns: ["from_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_source_inventory_id_fkey"
            columns: ["source_inventory_id"]
            isOneToOne: false
            referencedRelation: "inventories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_to_branch_id_fkey"
            columns: ["to_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          address: string | null
          created_at: string
          currency: string
          id: string
          logo: string | null
          logo_url: string | null
          name: string
          phone: string | null
          receipt_footer: string | null
          subdomain: string | null
          tax_percent: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          currency?: string
          id?: string
          logo?: string | null
          logo_url?: string | null
          name: string
          phone?: string | null
          receipt_footer?: string | null
          subdomain?: string | null
          tax_percent?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          currency?: string
          id?: string
          logo?: string | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          receipt_footer?: string | null
          subdomain?: string | null
          tax_percent?: number
          updated_at?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          address: string | null
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          store_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          store_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          store_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          store_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          store_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invite: { Args: { _code: string }; Returns: string }
      close_cash_session: {
        Args: { _counted_cash: number; _notes: string; _session_id: string }
        Returns: undefined
      }
      create_invite: {
        Args: {
          _branch_id: string
          _email: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: string
      }
      current_store_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_damage: {
        Args: { _inventory_id: string; _quantity: number; _reason: string }
        Returns: string
      }
      open_cash_session: { Args: { _opening_float: number }; Returns: string }
      process_sale_return: {
        Args: {
          _inventory_id: string
          _quantity: number
          _reason: string
          _sale_id?: string
        }
        Returns: string
      }
      record_credit_payment: {
        Args: { _amount: number; _credit_id: string }
        Returns: undefined
      }
      record_credit_sale: {
        Args: {
          _amount_paid: number
          _buyer_name: string
          _buyer_phone: string
          _due_date: string
          _inventory_id: string
          _quantity: number
        }
        Returns: string
      }
      record_expense: {
        Args: {
          _amount: number
          _category: string
          _description: string
          _expense_date: string
          _paid_via: string
        }
        Returns: string
      }
      record_sale: {
        Args: { _customer_name?: string; _items: Json; _payment_method: string }
        Returns: string
      }
      record_stock_receipt: {
        Args: {
          _inventory_id: string
          _notes: string
          _quantity: number
          _reference: string
          _supplier_id: string
          _unit_cost: number
        }
        Returns: string
      }
      transfer_stock: {
        Args: {
          _notes: string
          _quantity: number
          _source_inventory_id: string
          _to_branch_id: string
        }
        Returns: string
      }
      write_audit: {
        Args: {
          _action: string
          _details: Json
          _entity: string
          _entity_id: string
          _store: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "superadmin" | "ceo" | "manager" | "staff"
      credit_status: "PENDING" | "PARTIAL" | "PAID"
      inventory_status: "available" | "low" | "out_of_stock"
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
      app_role: ["superadmin", "ceo", "manager", "staff"],
      credit_status: ["PENDING", "PARTIAL", "PAID"],
      inventory_status: ["available", "low", "out_of_stock"],
    },
  },
} as const
