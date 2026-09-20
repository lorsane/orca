// Build this fork for the host architecture only and install it over the copy in
// /Applications.
//
// Why not `build:mac`: that packages BOTH architectures and writes four archives
// (two DMGs, two zips) on every run. A local install needs one app bundle for
// this machine — the archives exist to hand a build to someone else, and the zip
// exists for an updater this fork has disabled.
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, readdirSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'

const APPLICATIONS_DIR = '/Applications'
const QUIT_TIMEOUT_MS = 20_000
const QUIT_POLL_MS = 500

function run(command, args, extraEnv = {}) {
  execFileSync(command, args, { stdio: 'inherit', env: { ...process.env, ...extraEnv } })
}

function pnpm(...args) {
  run(process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', args)
}

/** The packaged bundle, found rather than named, so the fork can be renamed freely. */
function findBuiltApp(outDir) {
  if (!existsSync(outDir)) {
    throw new Error(`Packaging produced no output directory: ${outDir}`)
  }
  const apps = readdirSync(outDir).filter((entry) => entry.endsWith('.app'))
  if (apps.length !== 1) {
    throw new Error(`Expected exactly one .app in ${outDir}, found ${apps.length}`)
  }
  return join(outDir, apps[0])
}

function readBundleName(appPath) {
  const result = spawnSync(
    'defaults',
    ['read', join(appPath, 'Contents', 'Info.plist'), 'CFBundleName'],
    { encoding: 'utf8' }
  )
  return result.status === 0 ? result.stdout.trim() : null
}

function isRunning(appPath) {
  return spawnSync('pgrep', ['-f', join(appPath, 'Contents', 'MacOS')]).status === 0
}

async function quitInstalledApp(installedPath, bundleName) {
  if (!isRunning(installedPath)) {
    return
  }
  console.log(`[install:local] asking ${bundleName} to quit…`)
  spawnSync('osascript', ['-e', `quit app "${bundleName}"`])
  const deadline = Date.now() + QUIT_TIMEOUT_MS
  while (Date.now() < deadline) {
    if (!isRunning(installedPath)) {
      return
    }
    await new Promise((done) => setTimeout(done, QUIT_POLL_MS))
  }
  throw new Error(
    `${bundleName} is still running. Quit it (⌘Q) and run this again — replacing a running app corrupts it.`
  )
}

/**
 * Why the name check: the caller deletes a directory under /Applications. It
 * must refuse to touch anything that is not the bundle we just built — an
 * official Orca install above all.
 *
 * An absent installed name means nothing is there to replace.
 */
export function assertReplaceableBundleName(installedName, expectedBundleName, installedPath) {
  if (installedName === null || installedName === undefined) {
    return
  }
  if (installedName !== expectedBundleName) {
    throw new Error(
      `${installedPath} reports CFBundleName "${installedName}", not "${expectedBundleName}". Refusing to replace it.`
    )
  }
}

async function main() {
  if (process.platform !== 'darwin') {
    throw new Error('install:local packages a macOS bundle; run it on macOS.')
  }
  const arch = process.arch === 'x64' ? 'x64' : 'arm64'
  const outDir = resolve('dist', arch === 'x64' ? 'mac' : 'mac-arm64')

  pnpm('run', 'build:desktop')
  pnpm('run', 'build:computer-macos')
  pnpm('run', 'build:keyboard-layout-macos')
  pnpm('run', 'build:notification-status-macos')
  pnpm('run', 'ensure:electron-runtime')

  const commit = execFileSync('git', ['rev-parse', '--short=12', 'HEAD'], {
    encoding: 'utf8'
  }).trim()
  // `--dir` stops after the app bundle: no DMG, no zip, no blockmap.
  run(
    process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
    [
      'exec',
      'electron-builder',
      '--config',
      'config/electron-builder.config.cjs',
      '--mac',
      `--${arch}`,
      '--dir'
    ],
    {
      ORCA_BUILD_COMMIT: commit,
      ORCA_LOCAL_BUILD_VERSION: `${process.env.npm_package_version ?? '0.0.0'}-local.${Date.now()}.${commit}`
    }
  )

  const builtApp = findBuiltApp(outDir)
  const bundleName = readBundleName(builtApp)
  if (!bundleName) {
    throw new Error(`Could not read CFBundleName from ${builtApp}`)
  }
  const installedPath = join(APPLICATIONS_DIR, `${bundleName}.app`)

  assertReplaceableBundleName(
    existsSync(installedPath) ? readBundleName(installedPath) : null,
    bundleName,
    installedPath
  )
  await quitInstalledApp(installedPath, bundleName)

  console.log(`[install:local] installing ${bundleName} → ${installedPath}`)
  rmSync(installedPath, { recursive: true, force: true })
  // ditto preserves the signature's extended attributes; cp -R does not always.
  run('ditto', [builtApp, installedPath])

  run('open', ['-a', installedPath])
  console.log(`[install:local] ${bundleName} installed and relaunched (${commit})`)
}

// Why guarded: the module is imported by its test, which must not install anything.
if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  await main()
}
