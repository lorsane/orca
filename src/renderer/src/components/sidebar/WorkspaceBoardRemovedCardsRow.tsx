import React from 'react'
import { Columns3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/store'
import { translate } from '@/i18n/i18n'

/** Escape hatch for per-row board overrides. Renders nothing until the user
 *  has actually moved a card off (or forced one onto) the board. */
export default function WorkspaceBoardRemovedCardsRow(): React.JSX.Element | null {
  const excluded = useAppStore((s) => s.boardExcludedWorkspaceIdentities)
  const included = useAppStore((s) => s.boardIncludedWorkspaceIdentities)
  const resetWorkspaceBoardMembership = useAppStore((s) => s.resetWorkspaceBoardMembership)
  const overrideCount = excluded.length + included.length

  if (overrideCount === 0) {
    return null
  }
  return (
    <div className="flex items-center justify-between gap-2 px-2 py-1.5">
      <span className="inline-flex items-center gap-2 text-[12px] font-medium text-foreground">
        <Columns3 className="size-3.5 text-muted-foreground" />
        {translate(
          'auto.components.sidebar.WorkspaceBoardRemovedCardsRow.label',
          'Card overrides: {{value0}}',
          { value0: overrideCount }
        )}
      </span>
      <Button type="button" variant="ghost" size="xs" onClick={resetWorkspaceBoardMembership}>
        {translate('auto.components.sidebar.WorkspaceBoardRemovedCardsRow.reset', 'Reset')}
      </Button>
    </div>
  )
}
