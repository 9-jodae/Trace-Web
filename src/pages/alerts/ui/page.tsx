import { useQuery } from '@tanstack/react-query'
import { alertApi } from '@/entities/alert'
import { Header } from '@/widgets/header'

export function AlertsPage() {
  const { data = [] } = useQuery({ queryKey: ['alerts'], queryFn: alertApi.list })
  return (
    <>
      <Header />
      <main>
        <ul>{data.map((a) => <li key={a.id}>[{a.risk}] {a.affectedDocumentTitle} — {a.reason}</li>)}</ul>
      </main>
    </>
  )
}
