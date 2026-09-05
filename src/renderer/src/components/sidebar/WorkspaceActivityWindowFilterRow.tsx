import React from 'react'
import { CalendarRange } from 'lucide-react'
import { useAppStore } from '@/store'
import { translate } from '@/i18n/i18n'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { WORKSPACE_ACTIVITY_WINDOW_OPTIONS } from './workspace-activity-window-options'
import type { WorkspaceActivityWindow } from '../../../../shared/workspace-activity-window'

/** Recency filter shared by the sidebar filter dropdown and the workspace
 *  options menu, so the two surfaces cannot drift. */
export const WorkspaceActivityWindowFilterRow = React.memo(
  function WorkspaceActivityWindowFilterRow() {
    const workspaceActivityWindow = useAppStore((s) => s.workspaceActivityWindow)
    const setWorkspaceActivityWindow = useAppStore((s) => s.setWorkspaceActivityWindow)

    return (
      <div className="flex flex-col gap-1 px-2 py-1.5">
        <span className="inline-flex items-center gap-2 text-[12px] font-medium text-foreground">
          <CalendarRange className="size-3.5 text-muted-foreground" />
          {translate(
            'auto.components.sidebar.WorkspaceActivityWindowFilterRow.label',
            'Active within'
          )}
        </span>
        <ToggleGroup
          type="single"
          value={workspaceActivityWindow}
          onValueChange={(value) => {
            if (value) {
              setWorkspaceActivityWindow(value as WorkspaceActivityWindow)
            }
          }}
          variant="outline"
          size="sm"
          className="h-6 w-full justify-stretch"
        >
          {WORKSPACE_ACTIVITY_WINDOW_OPTIONS.map((option) => (
            <ToggleGroupItem
              key={option.id}
              value={option.id}
              // Why: matches SidebarGroupByToggle — inside a dropdown menu Radix can
              // focus an item without committing the value change.
              onPointerDownCapture={() => setWorkspaceActivityWindow(option.id)}
              className="h-6 grow basis-0 px-1 text-[10px] data-[state=on]:bg-foreground/10 data-[state=on]:font-semibold data-[state=on]:text-foreground"
            >
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
    )
  }
)
