import type * as Monaco from 'monaco-editor'
import type { SchemaResult } from './types'

const SQL_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET',
  'DELETE', 'CREATE', 'DROP', 'ALTER', 'TABLE', 'INDEX', 'VIEW', 'DATABASE',
  'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'FULL', 'CROSS', 'ON',
  'GROUP', 'BY', 'ORDER', 'HAVING', 'LIMIT', 'OFFSET', 'DISTINCT',
  'AND', 'OR', 'NOT', 'IN', 'EXISTS', 'BETWEEN', 'LIKE', 'ILIKE', 'IS', 'NULL',
  'AS', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'UNION', 'ALL',
  'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'COALESCE', 'NULLIF', 'CAST',
  'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'UNIQUE', 'DEFAULT', 'NOT NULL',
  'RETURNING', 'WITH', 'RECURSIVE', 'EXPLAIN', 'ANALYZE', 'VACUUM', 'TRUNCATE'
]

const MONGO_METHODS = [
  'find', 'findOne', 'insertOne', 'insertMany', 'updateOne', 'updateMany',
  'deleteOne', 'deleteMany', 'aggregate', 'countDocuments', 'distinct',
  'findOneAndUpdate', 'findOneAndDelete', 'bulkWrite', 'createIndex',
  'dropCollection', 'toArray', 'limit', 'skip', 'sort', 'project'
]

const MONGO_OPERATORS = [
  '$eq', '$ne', '$gt', '$gte', '$lt', '$lte', '$in', '$nin',
  '$and', '$or', '$nor', '$not', '$exists', '$type', '$regex',
  '$set', '$unset', '$push', '$pull', '$inc', '$mul', '$rename',
  '$match', '$group', '$sort', '$project', '$limit', '$skip', '$lookup',
  '$unwind', '$count', '$sum', '$avg', '$min', '$max', '$first', '$last'
]

export function registerCompletions(
  monaco: typeof Monaco,
  schema: SchemaResult,
  type: 'postgres' | 'mongodb'
): Monaco.IDisposable[] {
  const disposables: Monaco.IDisposable[] = []

  if (type === 'postgres' && schema.tables) {
    const tables = schema.tables
    const tableNames = Object.keys(tables)

    // SQL keyword completions
    disposables.push(
      monaco.languages.registerCompletionItemProvider('sql', {
        provideCompletionItems(model, position) {
          const word = model.getWordUntilPosition(position)
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn
          }

          const keywords = SQL_KEYWORDS.map((kw) => ({
            label: kw,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: kw,
            range
          }))

          const tableItems = tableNames.map((t) => ({
            label: t,
            kind: monaco.languages.CompletionItemKind.Class,
            insertText: `"${t}"`,
            detail: 'table',
            range
          }))

          // Column completions for all tables
          const columnItems = tableNames.flatMap((t) =>
            (tables[t] || []).map((col) => ({
              label: col.name,
              kind: monaco.languages.CompletionItemKind.Field,
              insertText: col.name,
              detail: `${t}.${col.name} (${col.type})`,
              range
            }))
          )

          return { suggestions: [...keywords, ...tableItems, ...columnItems] }
        }
      })
    )
  }

  if (type === 'mongodb' && schema.collections) {
    const collections = schema.collections
    const collectionNames = Object.keys(collections)

    disposables.push(
      monaco.languages.registerCompletionItemProvider('javascript', {
        triggerCharacters: ['.', "'", '"'],
        provideCompletionItems(model, position) {
          const word = model.getWordUntilPosition(position)
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn
          }

          const methodItems = MONGO_METHODS.map((m) => ({
            label: m,
            kind: monaco.languages.CompletionItemKind.Method,
            insertText: m,
            detail: 'MongoDB method',
            range
          }))

          const operatorItems = MONGO_OPERATORS.map((op) => ({
            label: op,
            kind: monaco.languages.CompletionItemKind.Operator,
            insertText: `'${op}'`,
            detail: 'MongoDB operator',
            range
          }))

          const collectionItems = collectionNames.map((c) => ({
            label: c,
            kind: monaco.languages.CompletionItemKind.Class,
            insertText: `'${c}'`,
            detail: 'collection',
            range
          }))

          const fieldItems = collectionNames.flatMap((c) =>
            (collections[c] || []).map((field) => ({
              label: field,
              kind: monaco.languages.CompletionItemKind.Field,
              insertText: field,
              detail: `${c} field`,
              range
            }))
          )

          return { suggestions: [...methodItems, ...operatorItems, ...collectionItems, ...fieldItems] }
        }
      })
    )
  }

  return disposables
}
