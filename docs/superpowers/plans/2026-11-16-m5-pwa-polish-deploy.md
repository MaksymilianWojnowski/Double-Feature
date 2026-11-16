# Milestone 5: PWA, Polish, Deploy — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Installable on the phone's home screen, legally attributed (TMDB and JustWatch), accessible, fast (Lighthouse 90+ on performance and accessibility, mobile), and ready to deploy on Vercel.

**Architecture:**
- **Icons:** generated at build time by Next metadata routes (`icon.tsx` with `generateImageMetadata` for 192/512, `apple-icon.tsx`) with `ImageResponse`. No binary assets in the repo.
- **Manifest:** `app/manifest.ts`.
- **No service worker:** offline wasn't asked for, and neither iOS nor current Chrome needs one to install.

**Spec:** `docs/superpowers/specs/2026-11-15-double-feature-design.md` (requirements: `docs/brief.md`)

## Tasks
- [ ] **PWA:**
  - Manifest: standalone, black theme, icons 192/512 + maskable.
  - Apple icon 180.
  - `appleWebApp` metadata (capable, black-translucent status bar).
  - Drop the scaffold favicon.
- [ ] **About (`/about`, public):**
  - TMDB logo (hotlinked from TMDB's logo page) and the exact notice "This product uses the TMDB API but is not endorsed or certified by TMDB."
  - The JustWatch credit.
  - Linked from login and from Pair.
- [ ] **Accessibility:**
  - `faint` raised to 4.5:1 on black.
  - Text and icons on the orange accent turn black (white on systemOrange is 2.1:1).
  - The deck gets an `sr-only` h1.
- [ ] **Performance:** backdrop posters at w185 with `fetchPriority="low"`.
- [ ] **Errors:** `app/error.tsx` shows a friendly glass card with Try again.
- [ ] **Lighthouse:** run on a production build (`/login`, `/about`), mobile, and fix anything under 90.
- [ ] **README:** installing on iPhone/Android, the full migration list, and a deploy checklist.
