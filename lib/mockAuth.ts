// Mock authentication for localhost development
// This allows testing without Supabase Auth

const MOCK_USER_COOKIE = 'octane_mock_user';
const MOCK_SESSION_COOKIE = 'octane_mock_session';

export type MockUser = {
  id: string;
  email: string;
  has_purchased_package: boolean;
  purchased_package_type: 'vault' | 'sniper';
  founder_license: boolean;
};

// Check if we're on localhost
export function isLocalhost(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
}

// Set mock user cookie
export function setMockUser(user: MockUser): void {
  if (!isLocalhost()) return;
  
  const userData = {
    ...user,
    created_at: new Date().toISOString(),
  };
  
  document.cookie = `${MOCK_USER_COOKIE}=${JSON.stringify(userData)}; path=/; max-age=86400`; // 24 hours
  document.cookie = `${MOCK_SESSION_COOKIE}=mock_session_${Date.now()}; path=/; max-age=86400`;
}

// Get mock user from cookie
export function getMockUser(): MockUser | null {
  if (!isLocalhost()) return null;
  
  const cookies = document.cookie.split(';');
  const userCookie = cookies.find(c => c.trim().startsWith(`${MOCK_USER_COOKIE}=`));
  
  if (!userCookie) return null;
  
  try {
    const userData = JSON.parse(userCookie.split('=')[1]);
    return userData as MockUser;
  } catch {
    return null;
  }
}

// Clear mock user
export function clearMockUser(): void {
  if (!isLocalhost()) return;
  
  document.cookie = `${MOCK_USER_COOKIE}=; path=/; max-age=0`;
  document.cookie = `${MOCK_SESSION_COOKIE}=; path=/; max-age=0`;
}

// Check if mock session exists
export function hasMockSession(): boolean {
  if (!isLocalhost()) return false;
  
  const cookies = document.cookie.split(';');
  return cookies.some(c => c.trim().startsWith(`${MOCK_SESSION_COOKIE}=`));
}

// Create default mock user with vault access
export function createMockUser(): MockUser {
  return {
    id: 'dev_admin',
    email: 'admin@octanenexus.com',
    has_purchased_package: true,
    purchased_package_type: 'vault',
    founder_license: true,
  };
}
