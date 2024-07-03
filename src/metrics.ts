import { metricDeclarations as logMetricDeclarations } from '@well-known-components/logger'
import { validateMetricsDeclaration } from '@well-known-components/metrics'

export const metricDeclarations = {
  ...logMetricDeclarations
}

// type assertions
validateMetricsDeclaration(metricDeclarations)
