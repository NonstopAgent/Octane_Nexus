'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AlertTriangle, Info } from 'lucide-react';
import { hasStoredKey, KEYS_CHANGED_EVENT } from '@/lib/apiKeys';

const SETTINGS_DEVELOPER_HREF = '/dashboard/settings?tab=developer';

export default function SystemStatusBanner() {
  // API key warnings are now only visible in Settings > Developer tab
  // Hiding them from the main dashboard to avoid confusing non-developer users
  return null;
}
