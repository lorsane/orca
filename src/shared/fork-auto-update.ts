/**
 * This fork never updates itself.
 *
 * The packaged update feed points at the upstream repository, so an enabled
 * updater would download an upstream release and replace this build — silently
 * removing every fork change. Rebuilding from source is the only upgrade path
 * here, and merging upstream is a deliberate git operation, not a background one.
 *
 * Kept as a constant rather than a setting: a preference can be flipped by a
 * synced UI state or a paired client, and the failure mode is losing the app.
 */
export const FORK_AUTO_UPDATE_DISABLED = true
