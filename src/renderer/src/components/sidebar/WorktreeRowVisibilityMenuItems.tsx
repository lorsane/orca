import React from 'react'
import { Columns3, Eye, EyeOff } from 'lucide-react'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { translate } from '@/i18n/i18n'
import type { Worktree } from '../../../../shared/worktree/types'
import { useWorktreeRowHideAction } from './use-worktree-row-hide-action'
import { useWorkspaceBoardMembershipAction } from './use-workspace-board-membership-action'

/** Where a workspace row is allowed to appear: the sidebar list and the board
 *  are independent opt-outs, so removing a card from one keeps the other. */
export function WorktreeRowVisibilityMenuItems({
  worktree,
  contextWorktrees,
  disabled
}: {
  worktree: Worktree
  contextWorktrees: readonly Worktree[]
  disabled?: boolean
}): React.JSX.Element {
  const { isHidden, toggleHidden } = useWorktreeRowHideAction(worktree, contextWorktrees)
  const { isExcludedFromBoard, toggleBoardMembership } = useWorkspaceBoardMembershipAction(
    worktree,
    contextWorktrees
  )
  return (
    <>
      <DropdownMenuItem onSelect={toggleHidden} disabled={disabled}>
        {isHidden ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
        {isHidden
          ? translate('auto.components.sidebar.WorktreeContextMenu.unhideRow', 'Unhide')
          : translate('auto.components.sidebar.WorktreeContextMenu.hideRow', 'Hide from sidebar')}
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={toggleBoardMembership} disabled={disabled}>
        <Columns3 className="size-3.5" />
        {isExcludedFromBoard
          ? translate('auto.components.sidebar.WorktreeContextMenu.showOnBoard', 'Show on board')
          : translate(
              'auto.components.sidebar.WorktreeContextMenu.hideFromBoard',
              'Hide from board'
            )}
      </DropdownMenuItem>
    </>
  )
}
