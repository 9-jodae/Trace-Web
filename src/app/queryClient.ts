import { QueryClient } from '@tanstack/react-query'
import { ApiRequestError } from '@/global/api/client'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // 4xx는 다시 시도해도 결과가 같으므로 재시도하지 않습니다.
      retry: (failureCount, error) =>
        !(error instanceof ApiRequestError && error.status < 500) && failureCount < 2,
    },
  },
})
