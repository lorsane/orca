import { describe, expect, it } from 'vitest'
import { FORK_USER_DATA_DIR_NAME } from '../../shared/fork-identity'
import { buildCommandCodeManagedScript } from './command-code-managed-script'

/**
 * Command Code strips TOKEN-like env vars before invoking hooks, so the script
 * recovers the endpoint file by scanning known userData directories. This fork
 * writes to its own, and omitting it there means hooks silently fall through to
 * the official install's endpoint — or find nothing at all.
 */
describe('command code managed script endpoint recovery', () => {
  const script = buildCommandCodeManagedScript('posix')

  it('scans the fork userData directory before the official one', () => {
    const forkIndex = script.indexOf(`Application Support/${FORK_USER_DATA_DIR_NAME}/agent-hooks`)
    const officialIndex = script.indexOf('Application Support/orca/agent-hooks')
    expect(forkIndex).toBeGreaterThan(-1)
    expect(officialIndex).toBeGreaterThan(-1)
    expect(forkIndex).toBeLessThan(officialIndex)
  })

  it('leaves XDG_CONFIG_HOME for the shell to expand, not the template literal', () => {
    expect(script).toContain(
      `\${XDG_CONFIG_HOME:-$HOME/.config}/${FORK_USER_DATA_DIR_NAME}/agent-hooks`
    )
    expect(script).not.toContain('undefined/agent-hooks')
  })
})
