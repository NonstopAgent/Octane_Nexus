'use client';

import { ExternalLink } from 'lucide-react';

export type CreatorTool = {
  id: string;
  name: string;
  description: string | null;
  url: string | null;
  icon_url: string | null;
  category: string;
  tags: string[];
  is_trending: boolean;
};

type ToolCardProps = {
  tool: CreatorTool;
};

export default function ToolCard({ tool }: ToolCardProps) {
  function handleClick() {

  }

  const href = tool.url || '#';
  const isExternal = href !== '#';

  return (
    <a
      href={href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      onClick={handleClick}
      className="flex-shrink-0 w-80 dashboard-card p-5 space-y-3 hover:-translate-y-0.5 hover:border-amber-500/40 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:ring-offset-2 focus:ring-offset-slate-950 block group"
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-100 group-hover:text-amber-400 transition">
            {tool.name}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 capitalize">{tool.category}</p>
        </div>
        {isExternal && (
          <ExternalLink className="h-4 w-4 text-slate-500 group-hover:text-amber-400 flex-shrink-0" />
        )}
      </div>
      {tool.description && (
        <p className="text-sm text-slate-300 leading-relaxed line-clamp-2">
          {tool.description}
        </p>
      )}
      <span className="inline-flex items-center gap-1 text-sm text-amber-400 group-hover:text-amber-300 transition">
        {isExternal ? 'Visit' : 'Coming soon'}
        <ExternalLink className="h-3 w-3" />
      </span>
    </a>
  );
}
