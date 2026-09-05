import type { Tab } from './tab-types'
import type { WorkspaceStatus, Worktree } from './worktree/types'

/**
 * Board cards for the tabs inside a workspace.
 *
 * Why a synthetic Worktree and not a new card type: the board is typed on
 * Worktree end to end — grouping, drag, area selection, virtualization, search.
 * Folder workspaces already ride the same trick (`folderWorkspaceToWorktree`),
 * so tabs follow the established seam instead of forking the board model.
 */
const TAB_BOARD_CARD_PREFIX = 'tab:'

/** A workspace only expands once it holds more than one tab; a single-tab
 *  workspace has nothing to disambiguate and keeps its own card. */
export const MIN_TABS_FOR_BOARD_EXPANSION = 2

export function tabBoardCardId(tabId: string): string {
  return `${TAB_BOARD_CARD_PREFIX}${tabId}`
}

export function parseTabBoardCardId(cardId: string): string | null {
  if (!cardId.startsWith(TAB_BOARD_CARD_PREFIX)) {
    return null
  }
  const tabId = cardId.slice(TAB_BOARD_CARD_PREFIX.length)
  return tabId.length > 0 ? tabId : null
}

export function getTabBoardCardLabel(tab: Tab): string {
  const label = tab.customLabel?.trim() || tab.generatedLabel?.trim() || tab.label.trim()
  return label.length > 0 ? label : tab.contentType
}

export function buildTabBoardCard(
  owner: Worktree,
  tab: Tab,
  status: WorkspaceStatus | undefined
): Worktree {
  return {
    ...owner,
    id: tabBoardCardId(tab.id),
    hostId: tab.executionHostId ?? owner.hostId,
    displayName: getTabBoardCardLabel(tab),
    // Why the tab's own focus time: card recency must track the tab the user
    // worked in, not the workspace's newest tab.
    lastActivityAt: tab.lastFocusedAt ?? tab.createdAt ?? owner.lastActivityAt,
    sortOrder: tab.sortOrder,
    manualOrder: undefined,
    workspaceStatus: status ?? owner.workspaceStatus,
    // A tab is never independently pinned or unread: those belong to the workspace.
    isPinned: false,
    isUnread: false
  }
}

/**
 * Replaces every multi-tab workspace with one card per tab. Workspaces with
 * fewer tabs pass through untouched, so an empty or single-tab workspace never
 * disappears from the board.
 */
export function expandWorkspaceBoardTabCards(args: {
  worktrees: readonly Worktree[]
  tabsByWorkspaceId: Readonly<Record<string, readonly Tab[]>>
  tabStatusByTabId: Readonly<Record<string, WorkspaceStatus>>
}): Worktree[] {
  const cards: Worktree[] = []
  for (const worktree of args.worktrees) {
    const tabs = args.tabsByWorkspaceId[worktree.id] ?? []
    if (tabs.length < MIN_TABS_FOR_BOARD_EXPANSION) {
      cards.push(worktree)
      continue
    }
    for (const tab of [...tabs].sort((a, b) => a.sortOrder - b.sortOrder)) {
      cards.push(buildTabBoardCard(worktree, tab, args.tabStatusByTabId[tab.id]))
    }
  }
  return cards
}
