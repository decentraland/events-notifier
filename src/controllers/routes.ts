import { Router } from '@well-known-components/http-server'
import { bearerTokenMiddleware, errorHandler } from '@dcl/platform-server-commons'
import { GlobalContext } from '../types'
import { setCursorHandler } from './handlers/set-cursor'

// We return the entire router because it will be easier to test than a whole server
export async function setupRouter({ components }: GlobalContext): Promise<Router<GlobalContext>> {
  const router = new Router<GlobalContext>()

  const { config } = components

  const signingKey = await config.getString('SIGNING_KEY')
  const isProdEnvironment = (await config.getString('NETWORK'))?.toLocaleLowerCase() === 'mainnet'
  if (signingKey && !isProdEnvironment) {
    router.post('/producers/:producer/set-since', bearerTokenMiddleware(signingKey), setCursorHandler)
  }

  router.use(errorHandler)

  return router
}
