'use client';

import { UserCircle, CreditCard } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-50">Account Settings</h1>
        <p className="text-sm text-slate-400 mt-1">Manage your account and subscription</p>
      </div>

      {/* Profile Section */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <UserCircle className="h-5 w-5 text-amber-400" />
          </div>
          <h2 className="text-xl font-semibold text-slate-50">Profile</h2>
        </div>
        <div className="space-y-4">
          <div className="h-32 rounded-xl border border-slate-800 bg-slate-900/50 flex items-center justify-center">
            <p className="text-sm text-slate-400">Profile settings coming soon</p>
          </div>
        </div>
      </div>

      {/* Subscription Section */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-blue-400" />
          </div>
          <h2 className="text-xl font-semibold text-slate-50">Subscription</h2>
        </div>
        <div className="space-y-4">
          <div className="h-32 rounded-xl border border-slate-800 bg-slate-900/50 flex items-center justify-center">
            <p className="text-sm text-slate-400">Subscription management coming soon</p>
          </div>
        </div>
      </div>
    </div>
  );
}
