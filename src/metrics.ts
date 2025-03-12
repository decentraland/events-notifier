import { metricDeclarations as logMetricDeclarations } from '@well-known-components/logger'
import { validateMetricsDeclaration } from '@well-known-components/metrics'
import { metricDeclarations as pgMetricDeclarations } from '@well-known-components/pg-component'
import { metricDeclarations as theGraphMetricDeclarations } from '@well-known-components/thegraph-component'
import { getDefaultHttpMetrics } from '@well-known-components/http-server'
import { IMetricsComponent } from '@well-known-components/interfaces'

export const metricDeclarations = {
  ...getDefaultHttpMetrics(),
  ...logMetricDeclarations,
  ...pgMetricDeclarations,
  ...theGraphMetricDeclarations,
  explorer_segment_event_delay_in_seconds: {
    type: IMetricsComponent.GaugeType,
    help: 'Delay between segment event and explorer event',
    labelNames: ['event_type']
  },
  segment_webhook_event_delay_in_seconds: {
    type: IMetricsComponent.GaugeType,
    help: 'Delay between segment webhook event and explorer event',
    labelNames: ['event_type']
  },
  handled_explorer_events_count: {
    type: IMetricsComponent.CounterType,
    help: 'Number of explorer events',
    labelNames: ['event_type']
  }
}

// type assertions
validateMetricsDeclaration(metricDeclarations)
