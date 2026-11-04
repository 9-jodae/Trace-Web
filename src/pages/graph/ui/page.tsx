import { Header } from '@/widgets/header'
import { GraphCanvas } from '@/widgets/graph-canvas'

export function GraphPage() {
  return <><Header /><main><GraphCanvas documentIds={[]} /></main></>
}
