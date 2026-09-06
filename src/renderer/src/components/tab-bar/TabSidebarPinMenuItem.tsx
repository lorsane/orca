import React from 'react'
import { PanelLeft, PanelLeftClose } from 'lucide-react'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { useAppStore } from '@/store'
import { translate } from '@/i18n/i18n'

/**
 * Pins a tab into the sidebar's Pinned section, where it becomes a card with
 * its own board status.
 *
 * Deliberately distinct from the neighbouring "Pin Tab": that one means
 * "survives close others" and belongs to the tab bar. A tab can want one
 * without the other, so they never share a flag.
 */
export function TabSidebarPinMenuItem({
  unifiedTabId
}: {
  unifiedTabId: string
}): React.JSX.Element {
  // Why defaulted: the tab bar renders under mocked stores where the slice is absent.
  const isPinnedToSidebar = useAppStore(
    (s) => s.sidebarPinnedTabIds?.includes(unifiedTabId) === true
  )
  const setTabSidebarPinned = useAppStore((s) => s.setTabSidebarPinned)
  return (
    <DropdownMenuItem onSelect={() => setTabSidebarPinned(unifiedTabId, !isPinnedToSidebar)}>
      {isPinnedToSidebar ? (
        <PanelLeftClose className="size-3.5 shrink-0" />
      ) : (
        <PanelLeft className="size-3.5 shrink-0" />
      )}
      {isPinnedToSidebar
        ? translate('auto.components.tab.bar.TabSidebarPinMenuItem.unpin', 'Unpin from sidebar')
        : translate('auto.components.tab.bar.TabSidebarPinMenuItem.pin', 'Pin to sidebar')}
    </DropdownMenuItem>
  )
}
