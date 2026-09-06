import type { Repo } from '../../../../../../shared/repo-types'
import type { WorktreeLineage } from '../../../../../../shared/worktree/lineage-types'
import type { WorkspaceStatusDefinition, Worktree } from '../../../../../../shared/worktree/types'
import { getWorktreeExecutionHostId } from '../../../../../../shared/execution-host'
import type { ExecutionHostId } from '../../../../../../shared/execution-host'
import type React from 'react'
import { getWorkspaceStatus, getWorkspaceStatusVisualMeta } from '../../workspace-status'
import { PINNED_GROUP_KEY, PINNED_GROUP_META, getPinnedStatusGroupKey } from './group-keys'
import {
  appendWorktreeRows,
  buildFolderWorkspaceRow,
  buildImportedWorktreesCardRow
} from './row-builders'
import {
  compareFolderWorkspacesForDisplay,
  type RenderableFolderWorkspace
} from './folder-workspace-lanes'
import type { NoticeHostContext } from './host-labels'
import type { ImportedWorktreesCardCandidate, Row } from './row-types'

/**
 * The Pinned section's rows.
 *
 * Split out of row-builders to keep that file under the line cap; pinned
 * emission has its own ordering and imported-fallback placement rules.
 */
export function emitPinnedGroup(
  pinnedSectionWorktrees: Worktree[],
  repoMap: Map<string, Repo>,
  defaultHostId: ExecutionHostId,
  collapsedGroups: Set<string>,
  renderedNaturalAnchorRepoIds: ReadonlySet<string>,
  importedWorktreesByRepo: ReadonlyMap<string, ImportedWorktreesCardCandidate>,
  allowImportedFallback: boolean,
  result: Row[],
  lineageById: Record<string, WorktreeLineage>,
  worktreeMap: Map<string, Worktree>,
  nestLineage: boolean,
  cyclicLineageIds: ReadonlySet<string>,
  noticeHostContextLabelByRepoId?: ReadonlyMap<string, NoticeHostContext>,
  workspaceStatuses: readonly WorkspaceStatusDefinition[] = [],
  groupPinnedByStatus = false,
  pinnedFolderWorkspaces: readonly RenderableFolderWorkspace[] = []
): void {
  if (pinnedSectionWorktrees.length === 0 && pinnedFolderWorkspaces.length === 0) {
    return
  }
  const pinnedRepoOrder = getPinnedRepoOrder(pinnedSectionWorktrees)
  const firstItemIndex = result.length
  const lanes =
    groupPinnedByStatus && workspaceStatuses.length > 0
      ? buildPinnedStatusLanes(pinnedSectionWorktrees, pinnedFolderWorkspaces, workspaceStatuses)
      : [
          {
            key: PINNED_GROUP_KEY,
            meta: PINNED_GROUP_META,
            worktrees: pinnedSectionWorktrees,
            folderWorkspaces: [...pinnedFolderWorkspaces]
          }
        ]

  for (const lane of lanes) {
    result.push({
      type: 'header',
      key: lane.key,
      label: lane.meta.label,
      count: lane.worktrees.length + lane.folderWorkspaces.length,
      tone: lane.meta.tone,
      icon: lane.meta.icon,
      ...getPinnedHostFacts(lane.worktrees, repoMap, defaultHostId),
      worktreeIds: lane.worktrees.map((worktree) => worktree.id)
    })
    if (collapsedGroups.has(lane.key)) {
      continue
    }
    // Why folder workspaces first: mirrors how a project group orders its own
    // rows, so the pinned lane does not invent a second convention.
    for (const pair of [...lane.folderWorkspaces].sort((left, right) =>
      compareFolderWorkspacesForDisplay(left.folderWorkspace, right.folderWorkspace)
    )) {
      result.push(buildFolderWorkspaceRow(pair, 0))
    }
    // Item rows keep the single pinned section key: drag, reveal and the
    // "natural row" bookkeeping all scope on it, and a lane is presentation.
    appendWorktreeRows(result, lane.worktrees, repoMap, lineageById, worktreeMap, {
      nestLineage,
      collapsedGroups,
      groupDepth: 0,
      sectionKey: PINNED_GROUP_KEY,
      cyclicLineageIds
    })
  }
  if (!allowImportedFallback) {
    return
  }
  if (lanes.every((lane) => collapsedGroups.has(lane.key))) {
    for (const repoId of pinnedRepoOrder) {
      const candidate = importedWorktreesByRepo.get(repoId)
      if (candidate && !renderedNaturalAnchorRepoIds.has(repoId)) {
        result.push(
          buildImportedWorktreesCardRow(
            candidate,
            'pinned-fallback',
            noticeHostContextLabelByRepoId?.get(repoId)
          )
        )
      }
    }
    return
  }
  // Why: imported fallback sits after the last row of that repo; splice from the
  // end so earlier inserts do not shift later targets.
  const lastResultIndexByRepoId = new Map<string, number>()
  for (let index = firstItemIndex; index < result.length; index++) {
    const row = result[index]
    if (row?.type === 'item') {
      lastResultIndexByRepoId.set(row.worktree.repoId, index)
    }
  }
  const inserts = [...lastResultIndexByRepoId.entries()].sort((left, right) => right[1] - left[1])
  for (const [repoId, index] of inserts) {
    const candidate = importedWorktreesByRepo.get(repoId)
    if (candidate && !renderedNaturalAnchorRepoIds.has(repoId)) {
      result.splice(
        index + 1,
        0,
        buildImportedWorktreesCardRow(
          candidate,
          'pinned-fallback',
          noticeHostContextLabelByRepoId?.get(repoId)
        )
      )
    }
  }
}

type PinnedLane = {
  key: string
  meta: { label: string; tone: string; icon?: React.ComponentType<{ className?: string }> }
  worktrees: Worktree[]
  folderWorkspaces: RenderableFolderWorkspace[]
}

/** One lane per status that actually holds a pinned row, in board order. */
function buildPinnedStatusLanes(
  pinnedSectionWorktrees: readonly Worktree[],
  pinnedFolderWorkspaces: readonly RenderableFolderWorkspace[],
  workspaceStatuses: readonly WorkspaceStatusDefinition[]
): PinnedLane[] {
  const worktreesByStatus = new Map<string, Worktree[]>()
  for (const worktree of pinnedSectionWorktrees) {
    const status = getWorkspaceStatus(worktree, workspaceStatuses)
    const bucket = worktreesByStatus.get(status) ?? []
    bucket.push(worktree)
    worktreesByStatus.set(status, bucket)
  }
  const foldersByStatus = new Map<string, RenderableFolderWorkspace[]>()
  for (const pair of pinnedFolderWorkspaces) {
    const status = getWorkspaceStatus(pair.folderWorkspace, workspaceStatuses)
    const bucket = foldersByStatus.get(status) ?? []
    bucket.push(pair)
    foldersByStatus.set(status, bucket)
  }
  const lanes: PinnedLane[] = []
  for (const status of workspaceStatuses) {
    const worktrees = worktreesByStatus.get(status.id) ?? []
    const folderWorkspaces = foldersByStatus.get(status.id) ?? []
    if (worktrees.length === 0 && folderWorkspaces.length === 0) {
      continue
    }
    const visual = getWorkspaceStatusVisualMeta(status)
    lanes.push({
      key: getPinnedStatusGroupKey(status.id),
      meta: { label: status.label, tone: visual.tone, icon: visual.icon },
      worktrees,
      folderWorkspaces
    })
  }
  return lanes
}

function getPinnedRepoOrder(pinnedSectionWorktrees: readonly Worktree[]): string[] {
  const order: string[] = []
  const seen = new Set<string>()
  for (const worktree of pinnedSectionWorktrees) {
    if (!seen.has(worktree.repoId)) {
      order.push(worktree.repoId)
      seen.add(worktree.repoId)
    }
  }
  return order
}

function getPinnedHostFacts(
  worktrees: readonly Worktree[],
  repoMap: Map<string, Repo>,
  defaultHostId: ExecutionHostId
): {
  hostWorktreeCounts: Map<ExecutionHostId, number>
  hostWorktreeIds: Map<ExecutionHostId, string[]>
} {
  const hostWorktreeCounts = new Map<ExecutionHostId, number>()
  const hostWorktreeIds = new Map<ExecutionHostId, string[]>()
  for (const worktree of worktrees) {
    const hostId = getWorktreeExecutionHostId(worktree, repoMap.get(worktree.repoId), defaultHostId)
    hostWorktreeCounts.set(hostId, (hostWorktreeCounts.get(hostId) ?? 0) + 1)
    const hostIds = hostWorktreeIds.get(hostId) ?? []
    hostIds.push(worktree.id)
    hostWorktreeIds.set(hostId, hostIds)
  }
  return { hostWorktreeCounts, hostWorktreeIds }
}
