/**
 * Client-side creator data store for demo mode.
 * When content_posts table doesn't exist or API returns empty, UI can use this.
 */

export type StoredPost = {
  id: string;
  user_id: string;
  status: string;
  idea_title?: string;
  script?: string;
  hook?: string;
  beats?: string;
  cta?: string;
  caption?: string;
  hashtags?: string;
  final_video_url?: string;
  background_video_url?: string;
  style_token_id?: string;
  source_url?: string;
  scheduled_at?: string;
  created_at: string;
  updated_at?: string;
};

const STORAGE_KEY = 'octane_creator_posts';

export function getStoredPosts(): StoredPost[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function setStoredPosts(posts: StoredPost[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  } catch {
    // ignore
  }
}

export function addStoredPost(post: Omit<StoredPost, 'id' | 'created_at' | 'updated_at'>): StoredPost {
  const posts = getStoredPosts();
  const id = `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const now = new Date().toISOString();
  const newPost: StoredPost = {
    ...post,
    id,
    created_at: now,
    updated_at: now,
  };
  posts.unshift(newPost);
  setStoredPosts(posts);
  return newPost;
}

export function updateStoredPost(id: string, updates: Partial<StoredPost>): StoredPost | null {
  const posts = getStoredPosts();
  const idx = posts.findIndex((p) => p.id === id);
  if (idx < 0) return null;
  const updated = { ...posts[idx], ...updates, updated_at: new Date().toISOString() };
  posts[idx] = updated;
  setStoredPosts(posts);
  return updated;
}

export function getStoredPost(id: string): StoredPost | null {
  return getStoredPosts().find((p) => p.id === id) ?? null;
}
