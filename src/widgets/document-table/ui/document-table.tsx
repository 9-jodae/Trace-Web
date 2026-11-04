import { useQuery, useQueryClient } from '@tanstack/react-query'
import { documentApi, DocumentStatusBadge } from '@/entities/document'
import { UploadButton } from '@/features/upload-document'
import { deleteDocument } from '@/features/delete-document'

export function DocumentTable() {
  const qc = useQueryClient()
  const { data = [] } = useQuery({
    queryKey: ['documents'],
    queryFn: documentApi.list,
    refetchInterval: (q) => (q.state.data?.some((d) => d.status === 'processing' || d.status === 'pending') ? 2000 : false),
  })
  return (
    <section>
      <UploadButton />
      <table>
        <tbody>
          {data.map((d) => (
            <tr key={d.id}>
              <td>{d.title}</td>
              <td>v{d.currentVersion}</td>
              <td><DocumentStatusBadge status={d.status} /></td>
              <td>
                <button type="button" onClick={async () => {
                  await deleteDocument(d.id)
                  qc.invalidateQueries({ queryKey: ['documents'] })
                }}>삭제</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
