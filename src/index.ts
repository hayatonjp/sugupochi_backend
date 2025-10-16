import { Hono } from 'hono'
import polls from './polls'

type Env = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Env }>()

app.route('/api/polls', polls)

export default app
