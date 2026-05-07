import { Client } from 'pg'

interface ConnectionConfig {
  host: string
  port: number
  user: string
  password: string
  database: string
}

function makeClient(conn: ConnectionConfig) {
  return new Client({
    host: conn.host,
    port: conn.port,
    user: conn.user,
    password: conn.password,
    database: conn.database,
    connectionTimeoutMillis: 5000
  })
}

export async function testPostgresConnection(conn: ConnectionConfig) {
  const client = makeClient(conn)
  try {
    await client.connect()
    await client.query('SELECT 1')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  } finally {
    await client.end().catch(() => {})
  }
}

export async function getPostgresSchema(conn: ConnectionConfig) {
  const client = makeClient(conn)
  try {
    await client.connect()
    const res = await client.query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `)
    const tables: Record<string, { name: string; type: string }[]> = {}
    for (const row of res.rows) {
      if (!tables[row.table_name]) tables[row.table_name] = []
      tables[row.table_name].push({ name: row.column_name, type: row.data_type })
    }
    return { success: true, tables }
  } catch (err: any) {
    return { success: false, error: err.message }
  } finally {
    await client.end().catch(() => {})
  }
}

export async function runPostgresQuery(conn: ConnectionConfig, query: string) {
  const client = makeClient(conn)
  try {
    await client.connect()
    const start = Date.now()
    const res = await client.query(query)
    const duration = Date.now() - start
    return {
      success: true,
      rows: res.rows,
      fields: res.fields?.map((f) => f.name) ?? [],
      rowCount: res.rowCount ?? res.rows.length,
      duration
    }
  } catch (err: any) {
    return { success: false, error: err.message }
  } finally {
    await client.end().catch(() => {})
  }
}
