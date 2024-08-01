import { NotAuthorizedError } from '@dcl/platform-server-commons'
import { IHttpServerComponent, ILoggerComponent } from '@well-known-components/interfaces'
import crypto from 'crypto'

export function authMiddleware(authSecret: string, logs: ILoggerComponent) {
  const logger = logs.getLogger('auth-middleware')
  if (!authSecret) {
    throw new Error('Bearer token middleware requires a secret')
  }

  return async function (
    ctx: IHttpServerComponent.DefaultContext<any>,
    next: () => Promise<IHttpServerComponent.IResponse>
  ): Promise<IHttpServerComponent.IResponse> {
    const signature = ctx.request.headers.get('x-signature')
    logger.info('Received request', { signature })
    if (!signature) {
      throw new NotAuthorizedError('Authorization header is missing')
    }

    const body = await ctx.request.json()

    const digest = crypto
      .createHmac('sha1', authSecret)
      .update(Buffer.from(JSON.stringify(body), 'utf-8'))
      .digest('hex')

    logger.info('Received request', { body, result: signature !== digest ? 'invalid' : 'valid' })
    if (signature !== digest) {
      throw new NotAuthorizedError('Invalid signature')
    }

    ctx.state = {
      ...ctx.state,
      consumedBody: body
    }

    return await next()
  }
}
