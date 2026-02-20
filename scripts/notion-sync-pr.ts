/**
 * Optional Notion sync: update a Notion backlog page from GitHub PR events.
 * Reads GITHUB_EVENT_PATH, extracts Notion Task URL from PR body, updates PR Link and Status.
 * Safe: skips if fork or secrets missing; never throws (logs and exits 0).
 * Node 20 compatible; run with: npx tsx scripts/notion-sync-pr.ts
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const GITHUB_EVENT_PATH = process.env.GITHUB_EVENT_PATH;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY;
const GITHUB_EVENT_NAME = process.env.GITHUB_EVENT_NAME;
const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID; // optional if deriving from page

function log(msg: string): void {
  console.log(`[notion-sync] ${msg}`);
}

function extractNotionPageIdFromUrl(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  // Match notion.so or notion.site URLs; page ID is usually the last path segment (32 hex chars, optional dashes)
  const match = trimmed.match(/notion\.(?:so|site)\/[^\s?#]+-([a-f0-9]{32})/i)
    || trimmed.match(/notion\.(?:so|site)\/([a-f0-9]{32})/i);
  if (match) return match[1];
  // With dashes: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  const match2 = trimmed.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
  if (match2) return match2[1].replace(/-/g, '');
  return null;
}

function extractNotionTaskUrlFromBody(body: string | null): string | null {
  if (!body || typeof body !== 'string') return null;
  // Look for a line like "**Notion Task URL:** https://notion.so/..."
  const m = body.match(/\*\*Notion Task URL:\*\*\s*(https?:\/\/[^\s)]+)/i)
    || body.match(/Notion Task URL[:\s]+(https?:\/\/[^\s)]+)/i)
    || body.match(/(https?:\/\/[^\s]*notion\.(?:so|site)\/[^\s)]+)/i);
  return m ? m[1].trim() : null;
}

async function updateNotionPage(
  pageId: string,
  prUrl: string,
  status: string,
  token: string
): Promise<void> {
  const id = pageId.length === 32 ? `${pageId.slice(0, 8)}-${pageId.slice(8, 12)}-${pageId.slice(12, 16)}-${pageId.slice(16, 20)}-${pageId.slice(20, 32)}` : pageId;
  const res = await fetch(`https://api.notion.com/v1/pages/${id}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28',
    },
    body: JSON.stringify({
      properties: {
        'PR Link': { url: prUrl },
        Status: { select: { name: status } },
      },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Notion API ${res.status}: ${text}`);
  }
}

async function main(): Promise<void> {
  if (!GITHUB_EVENT_PATH || !GITHUB_REPOSITORY) {
    log('Skipping Notion sync: GITHUB_EVENT_PATH or GITHUB_REPOSITORY missing');
    process.exit(0);
  }
  if (GITHUB_EVENT_NAME !== 'pull_request') {
    log('Skipping Notion sync: not a pull_request event');
    process.exit(0);
  }
  if (!NOTION_TOKEN || NOTION_TOKEN.trim() === '') {
    log('Skipping Notion sync: NOTION_TOKEN not set');
    process.exit(0);
  }

  let payload: { pull_request?: { body?: string; html_url?: string; merged?: boolean }; repository?: { full_name?: string }; action?: string };
  try {
    const raw = readFileSync(resolve(GITHUB_EVENT_PATH), 'utf8');
    payload = JSON.parse(raw) as typeof payload;
  } catch (e) {
    log('Skipping Notion sync: could not read event payload');
    process.exit(0);
  }

  const pr = payload.pull_request as { html_url?: string; body?: string; merged?: boolean; head?: { repo?: { full_name?: string } }; base?: { repo?: { full_name?: string } } } | undefined;
  const action = payload.action;

  if (!pr?.html_url) {
    log('Skipping Notion sync: PR missing in payload');
    process.exit(0);
  }

  // Skip if from fork (head repo !== base repo)
  const headRepo = pr.head?.repo?.full_name;
  const baseRepo = pr.base?.repo?.full_name;
  if (headRepo && baseRepo && headRepo !== baseRepo) {
    log('Skipping Notion sync: PR is from a fork');
    process.exit(0);
  }

  const notionUrl = extractNotionTaskUrlFromBody(pr.body ?? null);
  if (!notionUrl) {
    log('Skipping Notion sync: no Notion Task URL found in PR body');
    process.exit(0);
  }

  const pageId = extractNotionPageIdFromUrl(notionUrl);
  if (!pageId) {
    log('Skipping Notion sync: could not extract Notion page ID from URL');
    process.exit(0);
  }

  let status: string;
  if (action === 'closed') {
    status = pr.merged ? 'Done' : 'Blocked';
  } else if (action === 'opened' || action === 'edited' || action === 'synchronize' || action === 'ready_for_review') {
    status = 'In Progress';
  } else {
    log(`Skipping Notion sync: unhandled action ${action}`);
    process.exit(0);
  }

  try {
    await updateNotionPage(pageId, pr.html_url, status, NOTION_TOKEN!);
    log(`Updated Notion page ${pageId}: PR Link + Status = ${status}`);
  } catch (e) {
    console.warn('[notion-sync] Notion update failed (CI continues):', e instanceof Error ? e.message : e);
    process.exit(0);
  }
  process.exit(0);
}

main();
