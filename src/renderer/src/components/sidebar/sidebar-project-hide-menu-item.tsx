import React from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useAppStore } from '@/store'
import { translate } from '@/i18n/i18n'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'

/** Hide/unhide a whole project (repo or project group) from the sidebar.
 *  Shared by both header menus so the two cannot drift. */
export function SidebarProjectHideMenuItem({
  projectId
}: {
  /** Repo id or project-group id. */
  projectId: string
}): React.JSX.Element {
  const isHidden = useAppStore((s) => s.hiddenSidebarProjectIds.includes(projectId))
  const setSidebarProjectHidden = useAppStore((s) => s.setSidebarProjectHidden)
  return (
    <DropdownMenuItem onSelect={() => setSidebarProjectHidden(projectId, !isHidden)}>
      {isHidden ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
      {isHidden
        ? translate('auto.components.sidebar.SidebarProjectHideMenuItem.unhide', 'Unhide project')
        : translate(
            'auto.components.sidebar.SidebarProjectHideMenuItem.hide',
            'Hide project from sidebar'
          )}
    </DropdownMenuItem>
  )
}
