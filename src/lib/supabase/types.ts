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
          generator_api_key: string
          github_repo: string | null
          github_branch: string
          blog_output_path: string | null
          blog_framework: 'vanilla-html' | 'nextjs-ts-data' | 'nextjs' | 'astro' | 'none' | null
          blog_html_before: string | null
          blog_html_after: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          domain: string
          api_key?: string
          platform?: 'supabase' | 'wordpress'
          created_at?: string
          generator_api_key?: string
          github_repo?: string | null
          github_branch?: string
          blog_output_path?: string | null
          blog_framework?: 'vanilla-html' | 'nextjs-ts-data' | 'nextjs' | 'astro' | 'none' | null
          blog_html_before?: string | null
          blog_html_after?: string | null
        }
        Update: {
          name?: string
          domain?: string
          platform?: 'supabase' | 'wordpress'
          generator_api_key?: string
          github_repo?: string | null
          github_branch?: string
          blog_output_path?: string | null
          blog_framework?: 'vanilla-html' | 'nextjs-ts-data' | 'nextjs' | 'astro' | 'none' | null
          blog_html_before?: string | null
          blog_html_after?: string | null
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
          seo_title: string | null
          seo_description: string | null
          category: string | null
          author: string | null
          read_time: string | null
          thumb_image_url: string | null
          status: 'draft' | 'published'
          published_at: string | null
          wp_metadata: { category_ids?: number[]; tag_ids?: number[]; wp_post_id?: number; wp_featured_media_id?: number } | null
          created_at: string
          updated_at: string
          source: 'manual' | 'generated'
          raw_html: string | null
          github_sha: string | null
        }
        Insert: {
          id?: string
          site_id: string
          title?: string
          slug?: string
          content?: Json | null
          cover_image?: string | null
          seo_title?: string | null
          seo_description?: string | null
          category?: string | null
          author?: string | null
          read_time?: string | null
          thumb_image_url?: string | null
          status?: 'draft' | 'published'
          published_at?: string | null
          wp_metadata?: { category_ids?: number[]; tag_ids?: number[]; wp_post_id?: number; wp_featured_media_id?: number } | null
          created_at?: string
          updated_at?: string
          source?: 'manual' | 'generated'
          raw_html?: string | null
          github_sha?: string | null
        }
        Update: {
          title?: string
          slug?: string
          content?: Json | null
          cover_image?: string | null
          seo_title?: string | null
          seo_description?: string | null
          category?: string | null
          author?: string | null
          read_time?: string | null
          thumb_image_url?: string | null
          status?: 'draft' | 'published'
          published_at?: string | null
          wp_metadata?: { category_ids?: number[]; tag_ids?: number[]; wp_post_id?: number; wp_featured_media_id?: number } | null
          updated_at?: string
          source?: 'manual' | 'generated'
          raw_html?: string | null
          github_sha?: string | null
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
