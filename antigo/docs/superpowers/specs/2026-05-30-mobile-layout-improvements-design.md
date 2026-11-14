# Design Spec: Mobile Layout Improvements

**Date**: 2026-05-30
**Goal**: Resolve mobile styling issues, including horizontal overflow, excessive vertical spacing, clipped buttons, and bottom nav overlap on small screens (Samsung S25).

## Problem Analysis

1. **Incorrect CSS Ordering**: Desktop styles for Supabase, Gemini configs, Credit Cards, and Pending cards are defined at the bottom of `style.css` (lines 1369 to end). Because they are defined *after* the responsive media queries (`@media (max-width: 768px)`), their desktop styles override the mobile rules.
2. **Stretched Viewport**: The credit card form (`.add-card-form`) has `grid-template-columns: repeat(auto-fit, minmax(130px, 1fr))`. Since it does not wrap properly on mobile, it expands the page width to at least 780px, introducing a horizontal scrollbar. This horizontal expansion stretches all 100% width components (like the header), pushing buttons off-screen.
3. **Excessive Vertical Spacings**:
   - Spacing between summary cards is 24px (`gap: 1.5rem`).
   - Cards are stacked vertically, taking up almost the whole screen height.
   - Internal padding of panels and cards is `1.75rem` (28px).
4. **Bottom Nav Bar Cover**: Content at the very bottom is obscured by the fixed bottom navigation bar (`.mobile-nav`) because the main content bottom padding is only 80px, which is too small when accounting for safe area insets on modern mobile screens.

## Proposed Changes

### [MODIFY] [style.css](file:///c:/Users/User/Meu Drive/ANTIGRAVITY/MONEYACKER/style.css)

#### 1. CSS Structure Reorganization
- Extract all new desktop CSS components from line 1369 to the end of the file.
- Insert these rules right before line 1053 (which starts `/* 12. Responsividade (Telas Menores) */`). This ensures the responsive media queries override the desktop rules as expected.

#### 2. Layout Overrides for Mobile (under `@media (max-width: 768px)`)
- **Main Content Margin & Spacing**:
  - Update `.main-content` padding to `1rem 1rem 120px 1rem` to add safe-area clearance at the bottom and reduce side margins.
- **Compact Summary Cards**:
  - Set `.summary-cards` to a 2-column grid: `grid-template-columns: repeat(2, 1fr)` with a small `gap: 0.75rem` and `margin-bottom: 1.25rem`.
  - Set `.summary-card:last-child` (Saldo Atual) to `grid-column: span 2` to span across the bottom.
  - Decrease `.summary-card` padding to `1rem` and border-radius to `12px`.
  - Shrink `.card-header` margin to `0.5rem`.
  - Resize `.card-icon-container` to `32px` and `.card-icon` to `16px`.
  - Set `.card-label` to `font-size: 0.75rem` and `.card-amount` to `font-size: 1.35rem`.
- **Panel & Grid Spacings**:
  - Override `.panel` padding to `1rem` and set `gap: 1rem`.
  - Override `.panel-header` padding to `0.75rem`.
  - Set `.dashboard-grid` gap to `1rem` or `1.25rem`.
- **Supabase & Gemini Form Rows**:
  - Set `.supabase-form-row` to `flex-direction: column` and `gap: 0.75rem`.
  - Set `.supabase-form-row .form-group` to `flex: 1 1 auto; width: 100%;`.
  - Set `.supabase-status-row` to `flex-direction: column; align-items: stretch; gap: 0.75rem; padding: 0.75rem 1rem;`.
  - Set `.supabase-buttons` to `flex-direction: column; width: 100%; gap: 0.5rem;`.
  - Set `.supabase-buttons button` to `width: 100%`.
- **Category List Mobile Improvements**:
  - Set `.categories-list` to `grid-template-columns: repeat(2, 1fr)` and `gap: 0.5rem`.
  - Decrease `.category-config-item` padding to `0.5rem 0.75rem` and font-size to `0.85rem` to make them compact and fit side-by-side.

## Verification Plan

### Verification Steps
1. Parse the updated `style.css` using static analysis or verify there are no broken brace styles.
2. Confirm the page doesn't have any horizontal scrollbar on mobile viewports.
3. Test using a local web server (if possible) or review line-by-line that the classes map correctly.
