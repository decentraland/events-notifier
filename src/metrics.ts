import { metricDeclarations as logMetricDeclarations } from '@well-known-components/logger'
import { validateMetricsDeclaration } from '@well-known-components/metrics'
import { metricDeclarations as pgMetricDeclarations } from '@well-known-components/pg-component'
import { metricDeclarations as theGraphMetricDeclarations } from '@well-known-components/thegraph-component'
import { getDefaultHttpMetrics } from '@well-known-components/http-server'

export const metricDeclarations = {
  ...getDefaultHttpMetrics(),
  ...logMetricDeclarations,
  ...pgMetricDeclarations,
  ...theGraphMetricDeclarations
}

// type assertions
validateMetricsDeclaration(metricDeclarations)
