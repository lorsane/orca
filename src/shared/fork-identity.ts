/**
 * Identity of this fork's install.
 *
 * The app name and the userData directory are forked so this build can be
 * installed and run alongside an official Orca. The bundle id deliberately is
 * not: TCC grants, the keychain "Safe Storage" item, the macOS press-and-hold
 * default and the notification-settings deep link are all keyed on it, and
 * forking it would mean re-granting every permission for no gain.
 *
 * Keep in sync with `forkProductName` / `forkDataDirName` in
 * config/electron-builder.config.cjs — fork-identity.test.ts fails if they drift.
 */
export const FORK_PRODUCT_NAME = 'Orca Multi'

/**
 * Electron derives userData from the packaged package.json `name`, which the
 * builder overrides to this. Code that resolves userData WITHOUT Electron — the
 * bundled CLI, and hook commands that run outside the app — must use this or it
 * will read and write the official install's state.
 */
export const FORK_USER_DATA_DIR_NAME = 'orca-multi'
