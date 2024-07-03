import type {
  // IBaseComponent,
  IConfigComponent,
  IHttpServerComponent,
  ILoggerComponent,
  IMetricsComponent
} from '@well-known-components/interfaces'

import { metricDeclarations } from './metrics'

export type GlobalContext = {
  components: BaseComponents
}

// components used in every environment
export type BaseComponents = {
  config: IConfigComponent
  logs: ILoggerComponent
  metrics: IMetricsComponent<keyof typeof metricDeclarations>
}

// components used in runtime
export type AppComponents = BaseComponents & {
  // Runtime dependencies
}
// components used in tests
export type TestComponents = BaseComponents & {
  // A fetch component that only hits the test server
}

// this type simplifies the typings of http handlers
export type HandlerContextWithPath<
  ComponentNames extends keyof AppComponents,
  Path extends string = any
> = IHttpServerComponent.PathAwareContext<
  IHttpServerComponent.DefaultContext<{
    components: Pick<AppComponents, ComponentNames>
  }>,
  Path
>
