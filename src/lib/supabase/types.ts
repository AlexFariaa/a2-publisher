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
          platform: 'supabase' | 'wordpress'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          domain: string
          api_key?: string
          platform?: 'supabase' | 'wordpress'
          created_at?: string
        }
        Update: {
          name?: string
          domain?: string
          platform?: 'supabase' | 'wordpress'
        }
      }
      sites_wordpress_credentials: {
        Row: {
          site_id: string
          wp_url: string
          wp_username: string
          wp_application_password: string
        }
        Insert: {
          site_id: string
          wp_url: string
          wp_username: string
          wp_application_password: string
        }
        Update: {
          wp_url?: string
          wp_username?: string
          wp_application_password?: string
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
          wp_metadata: { category_ids?: number[]; tag_ids?: number[]; wp_post_id?: number; wp_featured_media_id?: number } | null
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
          wp_metadata?: { category_ids?: number[]; tag_ids?: number[]; wp_post_id?: number; wp_featured_media_id?: number } | null
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
          wp_metadata?: { category_ids?: number[]; tag_ids?: number[]; wp_post_id?: number; wp_featured_media_id?: number } | null
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
export type SiteWordpressCredential = Database['public']['Tables']['sites_wordpress_credentials']['Row']

export interface WpTaxonomyItem {
  id: number
  name: string
  slug: string
  count: number
}
