import React from 'react'
import { useAppStore } from '@/store'
import { translate } from '@/i18n/i18n'
import { SettingsSwitch } from '../settings/SettingsFormControls'

const LABEL_KEY = 'auto.components.sidebar.WorkspaceBoardTabCardsToggle.label'
const LABEL_TEXT = 'One card per tab'

/** Whether a multi-tab workspace shows as one card or as one card per tab. */
export default function WorkspaceBoardTabCardsToggle(): React.JSX.Element {
  const boardExpandsWorkspaceTabs = useAppStore((s) => s.boardExpandsWorkspaceTabs)
  const setBoardExpandsWorkspaceTabs = useAppStore((s) => s.setBoardExpandsWorkspaceTabs)
  return (
    <div className="px-1 pb-2">
      <div className="flex items-start justify-between gap-3 rounded-md px-1.5 py-1.5 hover:bg-worktree-sidebar-accent/70">
        <span className="min-w-0 space-y-0.5">
          <span className="block text-[12px] font-medium leading-4 text-foreground">
            {translate(LABEL_KEY, LABEL_TEXT)}
          </span>
          <span className="block text-[11px] leading-4 text-muted-foreground">
            {translate(
              'auto.components.sidebar.WorkspaceBoardTabCardsToggle.description',
              'A workspace with more than one tab becomes one card per tab, each with its own board status.'
            )}
          </span>
        </span>
        <SettingsSwitch
          checked={boardExpandsWorkspaceTabs}
          onChange={() => setBoardExpandsWorkspaceTabs(!boardExpandsWorkspaceTabs)}
          ariaLabel={translate(LABEL_KEY, LABEL_TEXT)}
        />
      </div>
    </div>
  )
}
