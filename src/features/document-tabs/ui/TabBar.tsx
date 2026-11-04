import clsx from 'clsx'
import { Network, X } from 'lucide-react'
import { GRAPH_TAB_ID, useTabStore } from '../model/tabStore'

export function TabBar() {
  const { documentTabs, activeTabId, activateTab, closeDocument } = useTabStore()

  return (
    <div role="tablist" className="flex h-10 items-end gap-1 border-b border-slate-200 px-2">
      <button
        role="tab"
        aria-selected={activeTabId === GRAPH_TAB_ID}
        onClick={() => activateTab(GRAPH_TAB_ID)}
        className={tabClass(activeTabId === GRAPH_TAB_ID)}
      >
        <Network className="size-4" aria-hidden />
        그래프
      </button>
      {documentTabs.map((tab) => (
        <div
          key={tab.documentId}
          role="tab"
          aria-selected={activeTabId === tab.documentId}
          className={tabClass(activeTabId === tab.documentId)}
        >
          <button className="max-w-40 truncate" onClick={() => activateTab(tab.documentId)}>
            {tab.title}
          </button>
          <button
            aria-label={`${tab.title} 닫기`}
            onClick={() => closeDocument(tab.documentId)}
            className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </div>
      ))}
    </div>
  )
}

function tabClass(active: boolean) {
  return clsx(
    'flex h-9 items-center gap-1.5 rounded-t-md border border-b-0 px-3 text-sm',
    active
      ? 'border-slate-200 bg-white font-medium text-slate-900'
      : 'border-transparent text-slate-500 hover:text-slate-800',
  )
}
