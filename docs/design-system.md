# Pasito Design System

Source: Paper file `01KT2XMDXT6NRBQXE4VZK82DQJ`, artboard `Design System - Dashboard`.
Copied from `pasito-dashboard` (`docs/dashboard-design-system.md`) on 2026-07-10.

In this repo the system lives in:

- Tokens: `app/globals.css` (shadcn semantic tokens `--primary`, `--background`, etc. + bloque `.pasito-dashboard` con los tokens `--dashboard-*`).
- Components: `components/ui/*` (shadcn base-nova sobre `@base-ui/react`).
- Helper: `lib/utils.ts` (`cn`), `hooks/use-mobile.ts`, `components/theme-provider.tsx`.
- Config shadcn CLI: `components.json` (para agregar componentes nuevos: `npx shadcn add <componente>`).

Las páginas de marketing existentes (`/`, `/embajadores`, etc.) siguen usando Paytone One + Poppins y sus estilos propios; los tokens conviven sin pisarlos. El fondo/tipografía global del `body` no cambió.

## Principle

One card, one task. The main datum appears first and the action stays visible.

If a card does not help the merchant decide or act, remove it.

## Tokens

### Color

| Token | Value | Use |
| --- | --- | --- |
| `--dashboard-page` | `#F6F7F4` | Dashboard page background |
| `--dashboard-surface` | `#FFFFFF` | Cards, panels, sidebar |
| `--dashboard-surface-soft` | `#F2F6F1` | Active nav, success surface, soft green blocks |
| `--dashboard-surface-muted` | `#F8FAF8` | Secondary surfaces |
| `--dashboard-text` | `#171D1A` | Primary text |
| `--dashboard-text-muted` | `#5F6761` | Body/helper text |
| `--dashboard-text-subtle` | `#66706B` | Labels and low-priority text |
| `--dashboard-border` | `#DDE6DF` | Card/control borders |
| `--dashboard-border-soft` | `#E8EDE9` | Internal separators |
| `--dashboard-brand` | `#0B6B43` | Primary actions, active data |
| `--dashboard-warning` | `#C49A2D` | Attention states |
| `--dashboard-critical` | `#B14D3B` | Real problem states |

### Type

Dashboard UI uses `system-ui` instead of brand display fonts.

| Role | Size / line | Weight |
| --- | --- | --- |
| Page title | `28px / 34px` | `800` |
| Section title | `20px / 24px` | `700` |
| Card title | `16px / 20px` | `700` |
| Body/helper | `14px / 18px` | `500` |
| Control label | `13px / 16px` | `600-700` |

Letter spacing is `0`. Avoid decorative display type inside operational screens.

### Layout

| Token | Value |
| --- | --- |
| Sidebar width | `236px` |
| Partner main width | `1120px` |
| Wide admin main width | `1344px` |
| Desktop page padding | `42px` |
| Section gap | `18px` |
| Card gap | `14px` |
| Control radius | `7px` |
| Card radius | `8px` |
| Button height | `38px` |
| Work row height | `64px` |

## Components

### Page Shell

Use the dashboard layout with a fixed white sidebar, subtle border, page background `#F6F7F4`, and one constrained main column.

Partner pages default to `1120px`. Admin pages may use `1344px` only when tables or operational scans need the width.

### Header

Headers are not hero cards. Use title, helper copy, and visible actions on the same row when possible.

### Cards

Cards are small and task-focused. Prefer 3-4 cards per row. Avoid full-width cards unless the content is a list or table.

### KPI

Only show metrics when they change what the merchant should do today. Use a strong number, a small label, and an optional status pill.

### Work Rows

Rows are `64px` tall, with fixed lanes for status, content, and action. Actions stay on the right.

### Reward Cards

Rewards use vertical cards:

- Top: image/emoji, title, price, pasitos, active state.
- Middle: daily stock as the primary number.
- Availability: day chips.
- Footer: where it applies and stock action.

Do not put educational explainer blocks above active rewards unless the merchant is empty/new.

## Application Rules

1. If a block does not enable action, remove it.
2. Use color only when it communicates priority or state.
3. Keep stock and availability visible on reward cards.
4. Prefer direct actions over explanatory copy.
5. Avoid nested cards and large decorative hero sections in dashboard views.
