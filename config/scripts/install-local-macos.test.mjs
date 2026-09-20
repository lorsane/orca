import { describe, expect, it } from 'vitest'
import { assertReplaceableBundleName } from './install-local-macos.mjs'

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
