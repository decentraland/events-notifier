import { Lifecycle } from '@well-known-components/interfaces'
import { AppComponents, GlobalContext, TestComponents } from './types'

// this function wires the business logic (adapters & controllers) with the components (ports)
export async function main(program: Lifecycle.EntryPointParameters<AppComponents | TestComponents>) {
  const { components, startComponents } = program
  const _: GlobalContext = {
    components
  }

  // start ports: db, listeners, synchronizations, etc
  await startComponents()
}
