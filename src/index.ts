import { Hono } from 'hono'
import { cors } from 'hono/cors'
import polls from './polls'

type Env = {
  DB: D1Database
  FRONTEND_URL: string
}

const app = new Hono<{ Bindings: Env }>()

app.use('/api/*', async (c, next) => {
  const corsMiddleware = cors({
    origin: (origin, c) => c.env.FRONTEND_URL, // 関数にすることで c.env にアクセス可能
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
  return corsMiddleware(c, next)
})

app.route('/api/polls', polls)

export default app
