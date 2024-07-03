import { createDotEnvConfigComponent } from '@well-known-components/env-config-provider'
import { createMetricsComponent } from '@well-known-components/metrics'
import { createLogComponent } from '@well-known-components/logger'
import { metricDeclarations } from './metrics'
import { AppComponents } from './types'

// Initialize all the components of the app
export async function initComponents(): Promise<AppComponents> {
  const config = await createDotEnvConfigComponent({ path: ['.env.default', '.env.local', '.env'] })
  const logs = await createLogComponent({ config })

  const logger = logs.getLogger('components')
  const commitHash = (await config.getString('COMMIT_HASH')) || 'unknown'
  logger.info(`Initializing components. Version: ${commitHash}`)

  const metrics = await createMetricsComponent(metricDeclarations, { config })

  return {
    config,
    logs,
    metrics
  }
}
