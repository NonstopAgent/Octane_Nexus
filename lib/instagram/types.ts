export type InstagramPostStatus =
  | 'draft'
  | 'scheduled'
  | 'posted'

export type PostMediaType =
  | 'image'
  | 'video'
  | 'carousel'

export interface InstagramPost {
  id: string
  user_id: string
  media_type: PostMediaType
  media_urls: string[]
  caption: string | null
  hashtags: string[] | null
  quality_score: number | null
  score_breakdown: {
    caption: number
    hashtags: number
    media: number
    timing?: number
  } | null
  status: InstagramPostStatus
  scheduled_at: string | null
  posted_at: string | null
  metrics: {
    likes?: number
    comments?: number
    reach?: number
    saves?: number
  } | null
  content_post_id: string | null
  created_at: string
  updated_at: string
}

export interface QualityScore {
  overall: number
  breakdown: {
    caption: number
    hashtags: number
    media: number
    timing?: number
  }
  suggestions: string[]
}
