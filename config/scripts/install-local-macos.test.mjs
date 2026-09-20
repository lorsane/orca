import { describe, expect, it } from 'vitest'
import {
  assertReplaceableBundleName,
  findNvmNodeAtLeast,
  readRequiredNodeMajor
} from './install-local-macos.mjs'

/**
 * The installer deletes a directory under /Applications. This guard is the only
 * thing standing between a rename typo and someone's official Orca install.
 */
describe('assertReplaceableBundleName', () => {
  it('allows replacing a bundle that is the one we built', () => {
    expect(() =>
      assertReplaceableBundleName('Orca Multi', 'Orca Multi', '/Applications/Orca Multi.app')
    ).not.toThrow()
  })

  it('allows installing when nothing is there yet', () => {
    expect(() =>
      assertReplaceableBundleName(null, 'Orca Multi', '/Applications/Orca Multi.app')
    ).not.toThrow()
  })

  it('refuses to replace a different app, naming both sides', () => {
    expect(() =>
      assertReplaceableBundleName('Orca', 'Orca Multi', '/Applications/Orca.app')
    ).toThrow(/reports CFBundleName "Orca", not "Orca Multi"/)
  })

  it('refuses an unreadable bundle rather than assuming it is ours', () => {
    expect(() =>
      assertReplaceableBundleName('', 'Orca Multi', '/Applications/Orca Multi.app')
    ).toThrow()
  })
})

describe('readRequiredNodeMajor', () => {
  it('reads the major the repo pins', () => {
    expect(readRequiredNodeMajor('{"engines":{"node":"24"}}')).toBe(24)
    expect(readRequiredNodeMajor('{"engines":{"node":">=24.1.0"}}')).toBe(24)
  })

  it('refuses a package.json that pins nothing usable', () => {
    expect(() => readRequiredNodeMajor('{}')).toThrow(/engines.node/)
  })
})

describe('findNvmNodeAtLeast', () => {
  // Why it matters: the build imports .ts and relies on native type stripping,
  // so an older default Node dies inside build:relay with an error that names a
  // file extension and says nothing about the Node version.
  it('picks the newest install that satisfies the requirement', () => {
    expect(findNvmNodeAtLeast(24, ['v20.11.0', 'v24.16.0', 'v22.14.0', 'v25.0.0'])).toBe('v25.0.0')
  })

  it('returns null when every install is too old', () => {
    expect(findNvmNodeAtLeast(24, ['v20.11.0', 'v22.14.0'])).toBeNull()
  })

  it('ignores directory names that are not versions', () => {
    expect(findNvmNodeAtLeast(24, ['lts', 'v24.16.0'])).toBe('v24.16.0')
  })
})
