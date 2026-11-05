import clsx from 'clsx'
import { Network, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { GRAPH_TAB_ID, useTabStore } from '../model/tabStore'

/**
 * 그래프 탭과 문서 탭 목록. 노트북처럼 좁은 화면에서 탭이 넘치면 가로로 스크롤하고,
 * 그래프 탭은 왼쪽에 고정해 언제든 돌아갈 수 있게 합니다. 새로 열거나 고른 탭은 보이는 위치로 스크롤합니다.
 */
export function TabBar() {
  const { documentTabs, activeTabId, activateTab, closeDocument } = useTabStore()
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')
      ?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
  }, [activeTabId, documentTabs.length])

  return (
    <div
      ref={listRef}
      role="tablist"
      // scroll-pl: 고정된 그래프 탭 폭만큼 비워 두어, 스크롤한 문서 탭이 그 밑에 가려지지 않게 합니다.
      className="flex h-[52px] shrink-0 scroll-pl-28 items-stretch overflow-x-auto overflow-y-hidden bg-surface-sunken [scrollbar-width:thin]"
    >
      <button
        role="tab"
        aria-selected={activeTabId === GRAPH_TAB_ID}
        onClick={() => activateTab(GRAPH_TAB_ID)}
        className={clsx(
          tabClass(activeTabId === GRAPH_TAB_ID),
          'sticky left-0 z-10 shrink-0 whitespace-nowrap',
          activeTabId !== GRAPH_TAB_ID && 'bg-surface-sunken',
        )}
      >
        <Network className="size-4" aria-hidden />
        그래프
      </button>
      {documentTabs.map((tab) => (
        <div
          key={tab.documentId}
          role="tab"
          aria-selected={activeTabId === tab.documentId}
          className={clsx(
            tabClass(activeTabId === tab.documentId),
            'shrink-0 gap-1 pr-2 pl-[18px]',
          )}
        >
          <span className="size-[7px] shrink-0 rounded-full bg-ink-muted" aria-hidden />
          <button
            className="max-w-40 truncate"
            title={tab.title}
            onClick={() => activateTab(tab.documentId)}
          >
            {tab.title}
          </button>
          <button
            aria-label={`${tab.title} 닫기`}
            onClick={() => closeDocument(tab.documentId)}
            className="flex size-8 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-white/10 hover:text-ink"
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
