export interface Connection {
  id: string
  name: string
  type: 'postgres' | 'mongodb'
  host: string
  port: number
  user: string
  password: string
  database: string
  connectionString?: string  // if set, used directly (e.g. mongodb+srv://...)
}

export interface QueryResult {
  success: boolean
  rows?: any[]
  fields?: string[]
  rowCount?: number
  duration?: number
  error?: string
}

export interface SchemaResult {
  success: boolean
  tables?: Record<string, { name: string; type: string }[]>
  collections?: Record<string, string[]>
  error?: string
}

export interface ImportFile {
  collection: string
  docs: any[]
}

export interface ImportResult {
  canceled: boolean
  files: ImportFile[]
}

declare global {
  interface Window {
    api: {
      getConnections: () => Promise<Connection[]>
      saveConnections: (connections: Connection[]) => Promise<void>
      testConnection: (connection: Connection) => Promise<{ success: boolean; error?: string }>
      getSchema: (connection: Connection) => Promise<SchemaResult>
      runQuery: (connection: Connection, query: string) => Promise<QueryResult>
      pickImportFiles: () => Promise<ImportResult>
      runImport: (connection: Connection, database: string, files: ImportFile[]) => Promise<{ success: boolean; imported: number; error?: string }>
    }
  }
}
