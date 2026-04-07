'use client';

import { useState, useEffect, useCallback } from 'react';
import { Youtube, Loader2, CheckCircle2, RefreshCw, Unlink } from 'lucide-react';
import { toast } from 'sonner';

type Connection = {
  provider: string;
  provider_display_name: string | null;
  provider_username: string | null;
  metadata: Record<string, unknown>;
  last_synced_at: string | null;
  created_at: string;
};

export default function YouTubeConnection({ onImported }: { onImported?: () => void }) {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const loadConnection = useCallback(async () => {
    try {
      const res = await fetch('/api/connections', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const yt = (data.connections || []).find(
          (c: Connection) => c.provider === 'youtube'
        );
        setConnection(yt || null);
      }
    } catch {
      setConnection(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConnection();

    // Handle OAuth redirect flags (?youtube=connected or ?youtube=error)
    const params = new URLSearchParams(window.location.search);
    const status = params.get('youtube');
    if (status === 'connected') {
      toast.success('YouTube connected! Importing your videos...');
      // Auto-import after successful connect
      handleImport();
    } else if (status === 'error') {
      const reason = params.get('reason') || 'unknown';
      toast.error(`YouTube connection failed: ${reason}`);
    }
    if (status) {
      // Clean the URL
      const url = new URL(window.location.href);
      url.searchParams.delete('youtube');
      url.searchParams.delete('reason');
      window.history.replaceState({}, '', url.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadConnection]);

  async function handleImport() {
    setImporting(true);
    try {
      const res = await fetch('/api/youtube/import', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Import failed');
      }
      if (data.imported > 0) {
        toast.success(`Imported ${data.imported} videos into your memory`);
      } else if (data.skipped > 0) {
        toast.info(`All ${data.total} videos already in memory`);
      } else {
        toast.info('No videos found on this channel');
      }
      await loadConnection();
      onImported?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm('Disconnect YouTube? Your imported videos will remain in memory.')) return;
    setDisconnecting(true);
    try {
      const res = await fetch('/api/youtube/disconnect', {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Disconnect failed');
      toast.success('YouTube disconnected');
      setConnection(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Disconnect failed');
    } finally {
      setDisconnecting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
        <span className="text-sm text-slate-500">Checking connections…</span>
      </div>
    );
  }

  if (!connection) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-400">
            <Youtube className="h-5 w-5" />
          </div>
          <div className="flex-1 space-y-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Connect YouTube</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Import your videos with view counts so Nexus can reference your actual top performers when giving advice.
              </p>
            </div>
            <a
              href="/api/auth/youtube/start"
              className="inline-flex items-center gap-2 rounded-full border-2 border-red-500 bg-red-500 px-4 py-1.5 text-xs font-semibold text-white transition hover:border-red-400 hover:bg-red-400"
            >
              <Youtube className="h-4 w-4" />
              Connect YouTube
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Connected state
  const meta = (connection.metadata || {}) as { subscriber_count?: number };
  const lastSynced = connection.last_synced_at
    ? new Date(connection.last_synced_at).toLocaleDateString()
    : 'never';

  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-400">
          <Youtube className="h-5 w-5" />
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-100">
                {connection.provider_display_name || 'YouTube'}
              </h3>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {meta.subscriber_count
                ? `${meta.subscriber_count.toLocaleString()} subscribers · `
                : ''}
              Last sync: {lastSynced}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleImport}
              disabled={importing}
              className="inline-flex items-center gap-2 rounded-full border border-amber-500/60 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold text-amber-300 transition hover:border-amber-400 hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {importing ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Importing…</>
              ) : (
                <><RefreshCw className="h-3.5 w-3.5" /> Sync videos</>
              )}
            </button>
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-4 py-1.5 text-xs font-semibold text-slate-400 transition hover:border-rose-500/60 hover:text-rose-300 disabled:opacity-50"
            >
              <Unlink className="h-3.5 w-3.5" />
              Disconnect
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
