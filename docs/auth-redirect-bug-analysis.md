# Authentication Redirect Bug Analysis

## Issue Summary
Login succeeds and session is created, but redirect to dashboard does not occur. User stays on auth page with session info displayed.

## Root Cause: Infinite Re-render Loop

### Console Error
```
Warning: Maximum update depth exceeded. This can happen when a component calls setState inside useEffect,
but useEffect either doesn't have a dependency array, or one of the dependencies changes on every render.
at AuthPageV2
```

### Problem Location
File: `/src/interfaceAdapters/pages/entitle/AuthPageV2.tsx`

The component has multiple useEffect hooks that are causing infinite re-renders:

1. **Lines 39-51**: Syncs `globalSession` to `presenter.actions.setSession`
2. **Lines 55-72**: Redirect logic based on `presenter.viewModel.session`
3. **Lines 77-90**: Session cache invalidation and refetch

### The Vicious Cycle

```
globalSession changes
  ↓
useEffect (lines 39-51) calls presenter.actions.setSession()
  ↓
presenter.viewModel.session changes
  ↓
useEffect (lines 77-90) calls invalidateSessionCache() + refetchSession()
  ↓
globalSession changes again
  ↓
LOOP REPEATS INFINITELY
```

## Why Redirect Fails

The `router.replace()` call in lines 55-72 never executes properly because:
1. React stops executing after hitting maximum update depth
2. The component is constantly re-rendering before redirect can complete
3. The browser's navigation is blocked by the render cycle

## Evidence from Browser Test

1. ✅ Login API call succeeds
2. ✅ Session data is received (User ID: 1969c187-bd05-4353-a40f-27d578022586, Role: NEW_HIRE)
3. ✅ Session info displays on screen
4. ❌ URL remains `http://localhost:3000/` instead of `/student/dashboard`
5. ❌ Console shows 50+ "Maximum update depth exceeded" errors

## Solution Strategy (IMPLEMENTED)

### ✅ Solution: Remove Bi-directional Sync (CHOSEN)

The root cause was a **circular dependency** between `globalSession` and `presenter.viewModel.session`:

1. `globalSession` changed → triggered useEffect → called `presenter.actions.setSession()`
2. `presenter.viewModel.session` changed → triggered useEffect → called `invalidateSessionCache()` + `refetchSession()`
3. `refetchSession()` updated `globalSession` → BACK TO STEP 1 (INFINITE LOOP)

**Fix Applied:**

1. **Removed** globalSession → presenter synchronization (lines 39-60)
   - Presenter is initialized with `initialSession` prop
   - No need for continuous sync

2. **Fixed** useAuthPresenterV2's `initialSession` useEffect
   - Changed from watching `initialSession` to mount-only execution
   - Prevents re-initialization on every render

3. **Simplified** session refetch logic
   - Only triggers when `presenter.viewModel.session.userId` changes
   - Uses stable userId comparison instead of object comparison

**Benefits:**
- Single source of truth (presenter manages its own session)
- No circular dependencies
- Predictable state updates
- Redirect logic can execute without interruption

## Test Results

**Browser:** Chrome DevTools
**Test Account:** newhire@mail.com / 11111111
**Expected:** Redirect to `/student/dashboard`
**Actual:** Stays on `/` with infinite re-renders
**Status:** Header shows "認証確認中…" (Authenticating...) indefinitely

## Next Steps

1. Fix the infinite loop in AuthPageV2.tsx
2. Ensure `presenter.actions` has stable references (useMemo/useCallback)
3. Remove unnecessary session synchronization
4. Test redirect functionality
5. Update E2E tests to handle the fixed behavior
