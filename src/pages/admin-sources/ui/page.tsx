import { useQuery } from '@tanstack/react-query'
import { sourceApi } from '@/entities/source'
import { Header } from '@/widgets/header'

// TODO: features/connect-source 로 Notion/Obsidian/로컬 연결 폼 추가
export function AdminSourcesPage() {
  const { data = [] } = useQuery({ queryKey: ['sources'], queryFn: sourceApi.list })
  return (
    <>
      <Header />
      <main>
        <h1>문서 소스 연동</h1>
        <ul>{data.map((s) => <li key={s.id}>{s.kind} · {s.name}</li>)}</ul>
      </main>
    </>
  )
}
