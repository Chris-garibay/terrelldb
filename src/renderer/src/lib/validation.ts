import type * as Monaco from 'monaco-editor'
import { Parser } from 'node-sql-parser'

const parser = new Parser()

export function validateSQL(monaco: typeof Monaco, model: Monaco.editor.ITextModel, sql: string) {
  if (!sql.trim()) {
    monaco.editor.setModelMarkers(model, 'sql-lint', [])
    return
  }

  try {
    parser.parse(sql, { database: 'PostgresQL' })
    monaco.editor.setModelMarkers(model, 'sql-lint', [])
  } catch (err: any) {
    const loc = err.location
    const startLine = loc?.start?.line ?? 1
    const startCol = loc?.start?.column ?? 1
    const endLine = loc?.end?.line ?? startLine
    // highlight to end of line if no end column
    const endCol = loc?.end?.column ?? model.getLineMaxColumn(endLine)

    monaco.editor.setModelMarkers(model, 'sql-lint', [
      {
        severity: monaco.MarkerSeverity.Error,
        message: cleanMessage(err.message),
        startLineNumber: startLine,
        startColumn: startCol,
        endLineNumber: endLine,
        endColumn: endCol
      }
    ])
  }
}

export function clearMarkers(monaco: typeof Monaco, model: Monaco.editor.ITextModel) {
  monaco.editor.setModelMarkers(model, 'sql-lint', [])
}

// node-sql-parser errors include a large expected token list — trim it
function cleanMessage(msg: string): string {
  const cut = msg.indexOf('\nExpected')
  return cut !== -1 ? msg.slice(0, cut) : msg
}
