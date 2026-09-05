import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { FORK_PRODUCT_NAME, FORK_USER_DATA_DIR_NAME } from './fork-identity'

/**
 * The packager owns the app's real name and userData directory; this module is
 * what non-Electron code (the bundled CLI, offline hook commands) resolves them
 * from. If the two drift, the CLI silently drives the OTHER install.
 */
// Why cwd and not import.meta: this file is also typechecked for the CommonJS
// CLI target, where import.meta is a compile error.
const builderConfig = readFileSync(
  resolve(process.cwd(), 'config/electron-builder.config.cjs'),
  'utf8'
)

function readConfigLiteral(name: string): string {
  const match = builderConfig.match(new RegExp(`const ${name} = '([^']+)'`))
  if (!match?.[1]) {
    throw new Error(`electron-builder.config.cjs no longer defines ${name}`)
  }
  return match[1]
}

describe('fork identity', () => {
  it('matches the product name the packager builds', () => {
    expect(readConfigLiteral('forkProductName')).toBe(FORK_PRODUCT_NAME)
  })

  it('matches the userData directory the packager pins', () => {
    expect(readConfigLiteral('forkDataDirName')).toBe(FORK_USER_DATA_DIR_NAME)
  })

  it('keeps the fork data directory distinct from the official install', () => {
    expect(FORK_USER_DATA_DIR_NAME).not.toBe('orca')
  })
})
