import clsx from 'clsx'
import { Network, X } from 'lucide-react'
import { GRAPH_TAB_ID, useTabStore } from '../model/tabStore'

export function TabBar() {
  const { documentTabs, activeTabId, activateTab, closeDocument } = useTabStore()

  return (
    <div role="tablist" className="flex h-[52px] shrink-0 items-stretch bg-surface-sunken">
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
          className={clsx(tabClass(activeTabId === tab.documentId), 'gap-1 pr-2 pl-[18px]')}
        >
          <span className="size-[7px] shrink-0 rounded-full bg-ink-muted" aria-hidden />
          <button className="max-w-40 truncate" onClick={() => activateTab(tab.documentId)}>
            {tab.title}
          </button>
          <button
            aria-label={`${tab.title} 닫기`}
            onClick={() => closeDocument(tab.documentId)}
            className="flex size-8 items-center justify-center rounded-md text-ink-muted hover:bg-white/10 hover:text-ink"
          >
            <X className="size-3" aria-hidden />
          </button>
        </div>
      ))}
    </div>
  )
}

function tabClass(active: boolean) {
  return clsx(
    'flex items-center gap-2 border-r border-border-dark px-[22px] text-sm',
    active ? 'bg-surface font-semibold text-ink' : 'text-ink-muted hover:text-ink-dim',
  )
}
