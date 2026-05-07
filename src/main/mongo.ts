import { MongoClient } from 'mongodb'
import AdmZip from 'adm-zip'
import { readFileSync } from 'fs'
import { basename, extname } from 'path'

interface MongoConfig {
  host: string
  port: number
  user?: string
  password?: string
  database: string
  connectionString?: string
}

function getUri(conn: MongoConfig): string {
  if (conn.connectionString) return conn.connectionString
  if (conn.user && conn.password) {
    return `mongodb://${conn.user}:${conn.password}@${conn.host}:${conn.port}/${conn.database}`
  }
  return `mongodb://${conn.host}:${conn.port}/${conn.database}`
}

function getDb(conn: MongoConfig) {
  // For srv URIs the database is embedded in the string; for manual it's conn.database
  return conn.database || 'test'
}

export async function testMongoConnection(conn: MongoConfig) {
  const client = new MongoClient(getUri(conn), { serverSelectionTimeoutMS: 8000 })
  try {
    await client.connect()
    await client.db(getDb(conn)).command({ ping: 1 })
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  } finally {
    await client.close().catch(() => {})
  }
}

export async function getMongoSchema(conn: MongoConfig) {
  const client = new MongoClient(getUri(conn), { serverSelectionTimeoutMS: 8000 })
  try {
    await client.connect()
    const db = client.db(getDb(conn))
    const collectionInfos = await db.listCollections().toArray()
    const collections: Record<string, string[]> = {}
    for (const info of collectionInfos) {
      const sample = await db.collection(info.name).findOne({})
      collections[info.name] = sample ? Object.keys(sample) : []
    }
    return { success: true, collections }
  } catch (err: any) {
    return { success: false, error: err.message }
  } finally {
    await client.close().catch(() => {})
  }
}

export async function runMongoQuery(conn: MongoConfig, query: string) {
  const client = new MongoClient(getUri(conn), { serverSelectionTimeoutMS: 8000 })
  try {
    await client.connect()
    const rawDb = client.db(getDb(conn))

    // Proxy so shell-style db.collectionName.method() works
    const db = new Proxy(rawDb, {
      get(target: any, prop: string) {
        if (typeof prop === 'string' && prop !== 'then' && typeof target[prop] === 'undefined') {
          return target.collection(prop)
        }
        const val = target[prop]
        return typeof val === 'function' ? val.bind(target) : val
      }
    })

    const fn = new Function('db', `return (async () => { ${normalizeQuery(query)} })()`)
    const start = Date.now()
    const result = await fn(db)
    const duration = Date.now() - start

    let rows: any[] = []
    if (Array.isArray(result)) {
      rows = result
    } else if (result !== null && result !== undefined) {
      rows = [result]
    }

    const serialized = JSON.parse(JSON.stringify(rows, (_key, val) =>
      typeof val === 'bigint' ? val.toString() : val
    ))

    return {
      success: true,
      rows: serialized,
      fields: serialized.length > 0 ? Object.keys(serialized[0]) : [],
      rowCount: serialized.length,
      duration
    }
  } catch (err: any) {
    return { success: false, error: err.message }
  } finally {
    await client.close().catch(() => {})
  }
}

export interface ImportFile {
  collection: string
  docs: any[]
}

export function parseImportFiles(filePaths: string[]): ImportFile[] {
  const results: ImportFile[] = []
  for (const filePath of filePaths) {
    const ext = extname(filePath).toLowerCase()
    if (ext === '.zip') {
      const zip = new AdmZip(filePath)
      for (const entry of zip.getEntries()) {
        if (extname(entry.entryName).toLowerCase() !== '.json') continue
        const name = basename(entry.entryName, '.json')
        const docs = parseJsonDocs(entry.getData().toString('utf8'))
        if (docs) results.push({ collection: name, docs })
      }
    } else if (ext === '.json') {
      const docs = parseJsonDocs(readFileSync(filePath, 'utf8'))
      if (docs) results.push({ collection: basename(filePath, '.json'), docs })
    }
  }
  return results
}

// Converts shell-style queries to awaitable JS:
// db.orders.find({})  →  return await db.orders.find({}).toArray()
// db.orders.findOne({}) → return await db.orders.findOne({})
// db.orders.aggregate([]) → return await db.orders.aggregate([]).toArray()
function normalizeQuery(query: string): string {
  const trimmed = query.trim()
  // Already has explicit return — pass through as-is
  if (trimmed.startsWith('return ') || trimmed.includes('\nreturn ')) return trimmed

  // Matches both:
  //   db.orders.aggregate([...])          — shell shorthand
  //   db.collection('orders').aggregate([...]) — explicit collection() call
  const cursorMethods = 'find|aggregate|distinct'
  const scalarMethods = 'findOne|countDocuments|insertOne|insertMany|updateOne|updateMany|deleteOne|deleteMany'
  const allMethods = `${cursorMethods}|${scalarMethods}`

  const shorthand   = new RegExp(`^db\\.\\w+\\.(${allMethods})\\s*\\(`)
  const explicitCol = new RegExp(`^db\\.collection\\(\\s*['"\`]\\w+['"\`]\\s*\\)\\.(${allMethods})\\s*\\(`)

  const isCursor  = new RegExp(`^db\\.(\\w+|collection\\(\\s*['"\`]\\w+['"\`]\\s*\\))\\.(${cursorMethods})\\s*\\(`)
  const isScalar  = new RegExp(`^db\\.(\\w+|collection\\(\\s*['"\`]\\w+['"\`]\\s*\\))\\.(${scalarMethods})\\s*\\(`)

  if (!shorthand.test(trimmed) && !explicitCol.test(trimmed)) return trimmed

  if (isScalar.test(trimmed)) return `return await (${trimmed})`
  if (isCursor.test(trimmed)) return `return await (${trimmed}).toArray()`

  return trimmed
}

function parseJsonDocs(raw: string): any[] | null {
  // Try standard JSON array / single object first
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : [parsed]
  } catch {
    // Fall back to NDJSON (one JSON object per line)
    try {
      const docs = raw
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0)
        .map(l => JSON.parse(l))
      return docs.length > 0 ? docs : null
    } catch {
      return null
    }
  }
}

export async function importCollections(
  conn: MongoConfig,
  database: string,
  files: ImportFile[]
): Promise<{ success: boolean; imported: number; error?: string }> {
  const client = new MongoClient(getUri(conn), { serverSelectionTimeoutMS: 8000 })
  try {
    await client.connect()
    const db = client.db(database)
    let imported = 0
    for (const { collection, docs } of files) {
      if (docs.length === 0) continue
      // ordered: false continues on duplicate key errors instead of stopping
      const result = await db.collection(collection).insertMany(docs, { ordered: false }).catch((err: any) => {
        // E11000 = duplicate key — return partial result
        if (err.code === 11000 && err.result) return err.result
        throw err
      })
      imported += result.insertedCount ?? docs.length
    }
    return { success: true, imported }
  } catch (err: any) {
    return { success: false, imported: 0, error: err.message }
  } finally {
    await client.close().catch(() => {})
  }
}
