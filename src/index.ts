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
    origin: c.env.FRONTEND_URL,
  })
  return corsMiddleware(c, next)
})

app.route('/api/polls', polls)

export default app
