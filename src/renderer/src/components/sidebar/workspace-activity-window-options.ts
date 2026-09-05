import { translate } from '@/i18n/i18n'
import type { WorkspaceActivityWindow } from '../../../../shared/workspace-activity-window'

export const WORKSPACE_ACTIVITY_WINDOW_OPTIONS = [
  {
    id: 'all',
    get label() {
      return translate('auto.components.sidebar.WorkspaceActivityWindowFilterRow.any', 'Any')
    }
  },
  {
    id: 'today',
    get label() {
      return translate('auto.components.sidebar.WorkspaceActivityWindowFilterRow.today', 'Today')
    }
  },
  {
    id: 'today-yesterday',
    get label() {
      return translate(
        'auto.components.sidebar.WorkspaceActivityWindowFilterRow.todayYesterday',
        '+ Yesterday'
      )
    }
  }
] as const satisfies readonly { id: WorkspaceActivityWindow; label: string }[]
