import { redirect } from 'next/navigation';

/**
 * Memory moved into Settings.
 *
 * It stopped being a place you go: capture happens automatically during
 * chat, and the only thing left to do here — review and delete what was
 * remembered — belongs with the other account controls.
 *
 * Kept as a redirect rather than deleted so old links, bookmarks and any
 * in-app references still land somewhere sensible instead of 404ing.
 */
export default function MemoryPage() {
  redirect('/dashboard/settings');
}
