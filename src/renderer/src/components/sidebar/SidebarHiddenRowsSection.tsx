import React from 'react'
import { EyeOff } from 'lucide-react'
import { useAppStore } from '@/store'
import { translate } from '@/i18n/i18n'
import { FilterToggleRow } from './FilterToggleRow'

/** Reveal/restore controls for rows the user hid. Renders nothing until
 *  something is hidden, so the menus stay short in the common case. */
export const SidebarHiddenRowsSection = React.memo(function SidebarHiddenRowsSection() {
  const hiddenWorkspaceIdentities = useAppStore((s) => s.hiddenWorkspaceIdentities)
  const hiddenSidebarProjectIds = useAppStore((s) => s.hiddenSidebarProjectIds)
  const showHiddenSidebarRows = useAppStore((s) => s.showHiddenSidebarRows)
  const setShowHiddenSidebarRows = useAppStore((s) => s.setShowHiddenSidebarRows)
  const unhideAllSidebarRows = useAppStore((s) => s.unhideAllSidebarRows)
  const hiddenCount = hiddenWorkspaceIdentities.length + hiddenSidebarProjectIds.length

  if (hiddenCount === 0) {
    return null
  }
  return (
    <>
      <FilterToggleRow
        icon={<EyeOff className="size-3.5" />}
        label={translate(
          'auto.components.sidebar.SidebarHiddenRowsSection.showHidden',
          'Show hidden'
        )}
        ariaLabel={translate(
          'auto.components.sidebar.SidebarHiddenRowsSection.showHiddenAria',
          'Reveal rows you hid from the sidebar so they can be unhidden'
        )}
        shortcutLabel={String(hiddenCount)}
        checked={showHiddenSidebarRows}
        onChange={setShowHiddenSidebarRows}
      />
      <button
        type="button"
        onClick={unhideAllSidebarRows}
        className="flex w-full items-center rounded-[5px] py-1.5 pl-7 pr-2 text-[12px] font-medium text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        {translate('auto.components.sidebar.SidebarHiddenRowsSection.unhideAll', 'Unhide all')}
      </button>
    </>
  )
})
