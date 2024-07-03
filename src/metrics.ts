import { metricDeclarations as logMetricDeclarations } from '@well-known-components/logger'
import { validateMetricsDeclaration } from '@well-known-components/metrics'
import { metricDeclarations as pgMetricDeclarations } from '@well-known-components/pg-component'
import { metricDeclarations as theGraphMetricDeclarations } from '@well-known-components/thegraph-component'

export const metricDeclarations = {
  ...logMetricDeclarations,
  ...pgMetricDeclarations,
  ...theGraphMetricDeclarations
}

// type assertions
validateMetricsDeclaration(metricDeclarations)
