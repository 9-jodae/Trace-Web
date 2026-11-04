import { useMutation, useQueryClient } from '@tanstack/react-query'
import { SUPPORTED_EXTENSIONS } from '@/shared/config'
import { uploadDocument } from '../api/upload'

export function UploadButton() {
  const qc = useQueryClient()
  const { mutate, isPending } = useMutation({
    mutationFn: uploadDocument,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  })
  return (
    <input type="file" disabled={isPending}
      accept={SUPPORTED_EXTENSIONS.map((e) => `.${e}`).join(',')}
      onChange={(e) => e.target.files?.[0] && mutate(e.target.files[0])} />
  )
}
