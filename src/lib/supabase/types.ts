// Supabase Database Types
// Generated from schema-hybrid.sql - run `supabase gen types typescript --local > types.ts` to regenerate

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Profiles (extends auth.users)
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          display_name: string | null
          avatar_url: string | null
          preferences: Json
          subscription_mode: 'credits' | 'byok'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          display_name?: string | null
          avatar_url?: string | null
          preferences?: Json
          subscription_mode?: 'credits' | 'byok'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          display_name?: string | null
          avatar_url?: string | null
          preferences?: Json
          subscription_mode?: 'credits' | 'byok'
          created_at?: string
          updated_at?: string
        }
      }
      user_api_keys: {
        Row: {
          id: string
          user_id: string
          provider: 'openai' | 'anthropic' | 'google' | 'deepseek' | 'openrouter'
          encrypted_key: string
          key_name: string | null
          is_active: boolean
          last_used_at: string | null
          rate_limit_per_minute: number
          last_validated_at: string | null
          is_valid: boolean
          validation_error: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          provider: 'openai' | 'anthropic' | 'google' | 'deepseek' | 'openrouter'
          encrypted_key: string
          key_name?: string | null
          is_active?: boolean
          last_used_at?: string | null
          rate_limit_per_minute?: number
          last_validated_at?: string | null
          is_valid?: boolean
          validation_error?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          provider?: 'openai' | 'anthropic' | 'google' | 'deepseek' | 'openrouter'
          encrypted_key?: string
          key_name?: string | null
          is_active?: boolean
          last_used_at?: string | null
          rate_limit_per_minute?: number
          last_validated_at?: string | null
          is_valid?: boolean
          validation_error?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      subscription_tiers: {
        Row: {
          id: string
          name: string
          description: string | null
          monthly_credits: number
          price_pence_monthly: number
          currency: string
          is_active: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          id: string
          name: string
          description?: string | null
          monthly_credits: number
          price_pence_monthly: number
          currency?: string
          is_active?: boolean
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          monthly_credits?: number
          price_pence_monthly?: number
          currency?: string
          is_active?: boolean
          sort_order?: number
          created_at?: string
        }
      }
      user_subscriptions: {
        Row: {
          id: string
          user_id: string
          tier_id: string
          status: 'active' | 'cancelled' | 'past_due' | 'paused' | 'trial'
          subscription_mode: 'credits' | 'byok'
          credits_balance: number
          credits_this_cycle: number
          trial_ends_at: string | null
          current_cycle_start: string
          current_cycle_end: string
          cancelled_at: string | null
          stripe_subscription_id: string | null
          stripe_customer_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tier_id?: string
          status?: 'active' | 'cancelled' | 'past_due' | 'paused' | 'trial'
          subscription_mode?: 'credits' | 'byok'
          credits_balance?: number
          credits_this_cycle?: number
          trial_ends_at?: string | null
          current_cycle_start?: string
          current_cycle_end?: string
          cancelled_at?: string | null
          stripe_subscription_id?: string | null
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          tier_id?: string
          status?: 'active' | 'cancelled' | 'past_due' | 'paused' | 'trial'
          subscription_mode?: 'credits' | 'byok'
          credits_balance?: number
          credits_this_cycle?: number
          trial_ends_at?: string | null
          current_cycle_start?: string
          current_cycle_end?: string
          cancelled_at?: string | null
          stripe_subscription_id?: string | null
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      credit_packages: {
        Row: {
          id: string
          name: string
          description: string | null
          credits_amount: number
          price_pence: number
          currency: string
          is_active: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          credits_amount: number
          price_pence: number
          currency?: string
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          credits_amount?: number
          price_pence?: number
          currency?: string
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      credit_transactions: {
        Row: {
          id: string
          user_id: string
          type: 'purchase' | 'subscription' | 'bonus' | 'refund' | 'usage' | 'expiration' | 'adjustment'
          amount: number
          balance_after: number
          description: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'purchase' | 'subscription' | 'bonus' | 'refund' | 'usage' | 'expiration' | 'adjustment'
          amount: number
          balance_after: number
          description?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'purchase' | 'subscription' | 'bonus' | 'refund' | 'usage' | 'expiration' | 'adjustment'
          amount?: number
          balance_after?: number
          description?: string | null
          metadata?: Json | null
          created_at?: string
        }
      }
      ai_usage: {
        Row: {
          id: string
          user_id: string
          provider: 'openai' | 'anthropic' | 'google' | 'deepseek' | 'openrouter' | 'byok'
          model: string
          input_tokens: number
          output_tokens: number
          credits_deducted: number
          cost_pence: number
          is_byok: boolean
          chat_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          provider: 'openai' | 'anthropic' | 'google' | 'deepseek' | 'openrouter' | 'byok'
          model: string
          input_tokens?: number
          output_tokens?: number
          credits_deducted?: number
          cost_pence?: number
          is_byok?: boolean
          chat_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          provider?: 'openai' | 'anthropic' | 'google' | 'deepseek' | 'openrouter' | 'byok'
          model?: string
          input_tokens?: number
          output_tokens?: number
          credits_deducted?: number
          cost_pence?: number
          is_byok?: boolean
          chat_id?: string | null
          created_at?: string
        }
      }
      model_rates: {
        Row: {
          id: string
          provider: string
          model_id: string
          credits_per_1k_input: number
          credits_per_1k_output: number
          is_active: boolean
        }
        Insert: {
          id?: string
          provider: string
          model_id: string
          credits_per_1k_input?: number
          credits_per_1k_output?: number
          is_active?: boolean
        }
        Update: {
          id?: string
          provider?: string
          model_id?: string
          credits_per_1k_input?: number
          credits_per_1k_output?: number
          is_active?: boolean
        }
      }
      payments: {
        Row: {
          id: string
          user_id: string
          provider: 'revolut' | 'stripe' | 'manual' | 'free'
          amount_pence: number
          currency: string
          status: 'pending' | 'completed' | 'failed' | 'refunded'
          credits_granted: number
          revolut_order_id: string | null
          revolut_payment_id: string | null
          stripe_payment_intent_id: string | null
          description: string | null
          metadata: Json | null
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          provider?: 'revolut' | 'stripe' | 'manual' | 'free'
          amount_pence: number
          currency?: string
          status?: 'pending' | 'completed' | 'failed' | 'refunded'
          credits_granted?: number
          revolut_order_id?: string | null
          revolut_payment_id?: string | null
          stripe_payment_intent_id?: string | null
          description?: string | null
          metadata?: Json | null
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          provider?: 'revolut' | 'stripe' | 'manual' | 'free'
          amount_pence?: number
          currency?: string
          status?: 'pending' | 'completed' | 'failed' | 'refunded'
          credits_granted?: number
          revolut_order_id?: string | null
          revolut_payment_id?: string | null
          stripe_payment_intent_id?: string | null
          description?: string | null
          metadata?: Json | null
          created_at?: string
          completed_at?: string | null
        }
      }
      agent_profiles: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          avatar: string | null
          color: string | null
          system_prompt: string
          provider: 'openai' | 'anthropic' | 'minimax' | 'google' | 'deepseek' | 'openrouter' | 'byok'
          model: string
          temperature: number
          max_tokens: number
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          avatar?: string | null
          color?: string | null
          system_prompt: string
          provider: 'openai' | 'anthropic' | 'minimax' | 'google' | 'deepseek' | 'openrouter' | 'byok'
          model: string
          temperature?: number
          max_tokens?: number
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          avatar?: string | null
          color?: string | null
          system_prompt?: string
          provider?: 'openai' | 'anthropic' | 'minimax' | 'google' | 'deepseek' | 'openrouter' | 'byok'
          model?: string
          temperature?: number
          max_tokens?: number
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      folders: {
        Row: {
          id: string
          user_id: string
          name: string
          icon: string
          color: string
          parent_id: string | null
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          icon?: string
          color?: string
          parent_id?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          icon?: string
          color?: string
          parent_id?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      chats: {
        Row: {
          id: string
          user_id: string
          title: string
          agent_id: string | null
          provider: 'openai' | 'anthropic' | 'minimax' | 'google' | 'deepseek' | 'openrouter' | 'byok' | null
          model: string | null
          folder_id: string | null
          tags: string[]
          pinned: boolean
          is_archived: boolean
          last_message_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          agent_id?: string | null
          provider?: 'openai' | 'anthropic' | 'minimax' | 'google' | 'deepseek' | 'openrouter' | 'byok' | null
          model?: string | null
          folder_id?: string | null
          tags?: string[]
          pinned?: boolean
          is_archived?: boolean
          last_message_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          agent_id?: string | null
          provider?: 'openai' | 'anthropic' | 'minimax' | 'google' | 'deepseek' | 'openrouter' | 'byok' | null
          model?: string | null
          folder_id?: string | null
          tags?: string[]
          pinned?: boolean
          is_archived?: boolean
          last_message_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          chat_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          provider: 'openai' | 'anthropic' | 'minimax' | 'google' | 'deepseek' | 'openrouter' | 'byok' | null
          model: string | null
          token_count: number | null
          created_at: string
        }
        Insert: {
          id?: string
          chat_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          provider?: 'openai' | 'anthropic' | 'minimax' | 'google' | 'deepseek' | 'openrouter' | 'byok' | null
          model?: string | null
          token_count?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          chat_id?: string
          role?: 'user' | 'assistant' | 'system'
          content?: string
          provider?: 'openai' | 'anthropic' | 'minimax' | 'google' | 'deepseek' | 'openrouter' | 'byok' | null
          model?: string | null
          token_count?: number | null
          created_at?: string
        }
      }
      subtasks: {
        Row: {
          id: string
          chat_id: string
          parent_message_id: string | null
          user_id: string
          title: string
          description: string | null
          status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          priority: 'low' | 'medium' | 'high'
          linked_context: string[]
          due_date: string | null
          created_at: string
          updated_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          chat_id: string
          parent_message_id?: string | null
          user_id: string
          title: string
          description?: string | null
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          priority?: 'low' | 'medium' | 'high'
          linked_context?: string[]
          due_date?: string | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          chat_id?: string
          parent_message_id?: string | null
          user_id?: string
          title?: string
          description?: string | null
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          priority?: 'low' | 'medium' | 'high'
          linked_context?: string[]
          due_date?: string | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
      }
      chat_shares: {
        Row: {
          id: string
          chat_id: string
          share_token: string
          is_public: boolean
          allow_edit: boolean
          expires_at: string | null
          view_count: number
          created_at: string
        }
        Insert: {
          id?: string
          chat_id: string
          share_token?: string
          is_public?: boolean
          allow_edit?: boolean
          expires_at?: string | null
          view_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          chat_id?: string
          share_token?: string
          is_public?: boolean
          allow_edit?: boolean
          expires_at?: string | null
          view_count?: number
          created_at?: string
        }
      }
      // GitHub integration tables (from schema-github.sql)
      github_connections: {
        Row: {
          id: string
          user_id: string
          github_user_id: number
          github_username: string
          github_avatar_url: string | null
          access_token: string
          scope: string
          is_active: boolean
          token_expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          github_user_id: number
          github_username: string
          github_avatar_url?: string | null
          access_token: string
          scope: string
          is_active?: boolean
          token_expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          github_user_id?: number
          github_username?: string
          github_avatar_url?: string | null
          access_token?: string
          scope?: string
          is_active?: boolean
          token_expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      github_repos: {
        Row: {
          id: string
          connection_id: string
          repo_id: number
          repo_name: string
          repo_full_name: string
          repo_description: string | null
          repo_url: string
          default_branch: string
          is_private: boolean
          language: string | null
          last_synced_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          connection_id: string
          repo_id: number
          repo_name: string
          repo_full_name: string
          repo_description?: string | null
          repo_url: string
          default_branch: string
          is_private: boolean
          language?: string | null
          last_synced_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          connection_id?: string
          repo_id?: number
          repo_name?: string
          repo_full_name?: string
          repo_description?: string | null
          repo_url?: string
          default_branch?: string
          is_private?: boolean
          language?: string | null
          last_synced_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      github_repo_files: {
        Row: {
          id: string
          repo_id: number
          path: string
          sha: string
          size: number
          type: 'file' | 'dir'
          content: string | null
          encoding: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          repo_id: number
          path: string
          sha: string
          size: number
          type: 'file' | 'dir'
          content?: string | null
          encoding?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          repo_id?: number
          path?: string
          sha?: string
          size?: number
          type?: 'file' | 'dir'
          content?: string | null
          encoding?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      github_search_history: {
        Row: {
          id: string
          user_id: string
          query: string
          result_count: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          query: string
          result_count: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          query?: string
          result_count?: number
          created_at?: string
        }
      }
      // Extended GitHub tables (from schema-github-extended.sql)
      github_issues: {
        Row: {
          id: string
          repo_id: number
          issue_number: number
          title: string
          body: string | null
          state: 'open' | 'closed'
          user_id: string | null
          labels: string[]
          assignees: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          repo_id: number
          issue_number: number
          title: string
          body?: string | null
          state?: 'open' | 'closed'
          user_id?: string | null
          labels?: string[]
          assignees?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          repo_id?: number
          issue_number?: number
          title?: string
          body?: string | null
          state?: 'open' | 'closed'
          user_id?: string | null
          labels?: string[]
          assignees?: string[]
          created_at?: string
          updated_at?: string
        }
      }
      github_pull_requests: {
        Row: {
          id: string
          repo_id: number
          pr_number: number
          title: string
          body: string | null
          state: 'open' | 'closed' | 'merged'
          user_id: string | null
          head_branch: string
          base_branch: string
          draft: boolean
          merged_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          repo_id: number
          pr_number: number
          title: string
          body?: string | null
          state?: 'open' | 'closed' | 'merged'
          user_id?: string | null
          head_branch: string
          base_branch: string
          draft?: boolean
          merged_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          repo_id?: number
          pr_number?: number
          title?: string
          body?: string | null
          state?: 'open' | 'closed' | 'merged'
          user_id?: string | null
          head_branch?: string
          base_branch?: string
          draft?: boolean
          merged_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      github_comments: {
        Row: {
          id: string
          user_id: string
          github_user_id: number | null
          username: string | null
          body: string
          parent_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          github_user_id?: number | null
          username?: string | null
          body: string
          parent_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          github_user_id?: number | null
          username?: string | null
          body?: string
          parent_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      github_workflows: {
        Row: {
          id: string
          repo_id: number
          workflow_id: number
          name: string
          path: string
          state: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          repo_id: number
          workflow_id: number
          name: string
          path: string
          state?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          repo_id?: number
          workflow_id?: number
          name?: string
          path?: string
          state?: string
          created_at?: string
          updated_at?: string
        }
      }
      github_workflow_runs: {
        Row: {
          id: string
          workflow_id: number
          run_id: number
          status: string
          conclusion: string | null
          branch: string
          event: string
          actor: string | null
          run_started_at: string
          run_completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workflow_id: number
          run_id: number
          status: string
          conclusion?: string | null
          branch: string
          event: string
          actor?: string | null
          run_started_at?: string
          run_completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workflow_id?: number
          run_id?: number
          status?: string
          conclusion?: string | null
          branch?: string
          event?: string
          actor?: string | null
          run_started_at?: string
          run_completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      github_branches: {
        Row: {
          id: string
          repo_id: number
          name: string
          sha: string
          is_default: boolean
          protected: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          repo_id: number
          name: string
          sha: string
          is_default?: boolean
          protected?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          repo_id?: number
          name?: string
          sha?: string
          is_default?: boolean
          protected?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      github_pending_changes: {
        Row: {
          id: string
          user_id: string
          connection_id: string
          repo_id: string
          branch_name: string
          file_path: string
          action: string
          original_sha: string | null
          new_sha: string | null
          change_summary: string | null
          diff_content: string | null
          status: 'pending' | 'approved' | 'rejected'
          approved_by: string | null
          approved_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          connection_id: string
          repo_id: string
          branch_name: string
          file_path: string
          action: string
          original_sha?: string | null
          new_sha?: string | null
          change_summary?: string | null
          diff_content?: string | null
          status?: 'pending' | 'approved' | 'rejected'
          approved_by?: string | null
          approved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          connection_id?: string
          repo_id?: string
          branch_name?: string
          file_path?: string
          action?: string
          original_sha?: string | null
          new_sha?: string | null
          change_summary?: string | null
          diff_content?: string | null
          status?: 'pending' | 'approved' | 'rejected'
          approved_by?: string | null
          approved_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

// Helper type for Supabase client
export type SupabaseClient = import('@supabase/supabase-js').SupabaseClient<Database>
