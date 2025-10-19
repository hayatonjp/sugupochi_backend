import { Hono } from 'hono'
import { cors } from 'hono/cors'
import polls from './polls'

type Env = {
  DB: D1Database
  FRONTEND_URL: string
}

const app = new Hono<{ Bindings: Env }>()

app.use('/api/*', cors({
  origin: 'http://localhost:5173',
}))

app.route('/api/polls', polls)

export default app
