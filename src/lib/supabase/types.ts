export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: 'user' | 'admin'
          created_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: 'user' | 'admin'
          created_at?: string
        }
        Update: {
          email?: string
          full_name?: string | null
          role?: 'user' | 'admin'
        }
      }
      sites: {
        Row: {
          id: string
          user_id: string
          name: string
          domain: string
          api_key: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          domain: string
          api_key?: string
          created_at?: string
        }
        Update: {
          name?: string
          domain?: string
        }
      }
      posts: {
        Row: {
          id: string
          site_id: string
          title: string
          slug: string
          content: Json | null
          cover_image: string | null
          seo_description: string | null
          status: 'draft' | 'published'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          site_id: string
          title?: string
          slug?: string
          content?: Json | null
          cover_image?: string | null
          seo_description?: string | null
          status?: 'draft' | 'published'
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          slug?: string
          content?: Json | null
          cover_image?: string | null
          seo_description?: string | null
          status?: 'draft' | 'published'
          updated_at?: string
        }
      }
    }
    Functions: {
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
    }
  }
}

// Tipos derivados para uso na aplicação
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Site = Database['public']['Tables']['sites']['Row']
export type Post = Database['public']['Tables']['posts']['Row']
