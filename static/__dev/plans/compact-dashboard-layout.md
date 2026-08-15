---
created: 2026-04-11T16:34:45.861Z
updated: 2026-04-11T16:34:45.861Z
---

# Compact Dashboard Layout

## Summary
Make the dashboard fit on one screen by reducing the chart height and tightening spacing throughout. The chart's y-axis height is the primary culprit.

## Files to Modify

### `components/RateChart.module.css`
- Remove `min-height: 600px` from `.chartCard` (or reduce to ~auto)
- Reduce `.chartWrapper` min-height from `350px` to `250px`
- Reduce padding/gaps in the chart card

### `pages/_index.module.css`
- Change container from `min-height: 100vh` to `height: 100vh` with `overflow: hidden` (or `auto` as fallback)
- Reduce gap from `var(--spacing-6)` to `var(--spacing-3)` or `var(--spacing-4)`
- Reduce card padding from `var(--spacing-5)` to `var(--spacing-3)`
- Reduce `.rateDisplay` padding
- Make the overall layout fill exactly 100vh without scrolling

## Files to Create
None.

## Approach
1. Update `RateChart.module.css` to significantly reduce the chart height
2. Update `_index.module.css` to tighten spacing and constrain to viewport height
3. The grid layout should use `height: 100%` properly so left and right columns fill available space without overflowing

## Risks & Considerations
- Need to ensure the chart is still readable at the reduced height
- Mobile view may still need scrolling — focus on desktop (1024px+) fitting on one screen
- The forecast panel (shown below the chart in forecast mode) will naturally require scrolling — that's acceptable since it's optional extra content
