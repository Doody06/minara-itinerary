

## Animated Loading Screen for Itinerary Generation

Replace the static "Creating Your Itinerary" popup with a full-screen animated loading experience that cycles through progress steps.

### What Changes

**New component: `src/components/GeneratingOverlay.tsx`**
- Full-screen overlay (replaces the small card popup)
- Array of ~8 themed progress steps that rotate every 3-4 seconds:
  1. "Searching halal-certified restaurants..."
  2. "Locating nearby mosques & prayer rooms..."
  3. "Finding prayer-friendly routes..."
  4. "Checking halal hotel options..."
  5. "Discovering top attractions..."
  6. "Optimizing your daily schedule..."
  7. "Verifying halal compliance scores..."
  8. "Finalizing your personalized itinerary..."
- Each step shows with a fade-in transition, an icon (utensils, mosque, map, hotel, camera, clock, shield-check, sparkles), and a progress bar that fills gradually
- Elapsed time indicator so users know it's still working
- Uses existing Tailwind animations (`animate-fade-in`, `animate-pulse`)

**Edit: `src/pages/PlanPage.tsx`**
- Replace the inline loading overlay (lines 310-328) with `<GeneratingOverlay />` component

### Design
- Centered layout with a large animated icon for the current step
- Step text fades in/out as it cycles
- Smooth progress bar underneath
- Subtle "This may take up to a minute" note
- Consistent with existing design tokens (primary color, font-display, rounded corners)

