import { useEffect, useRef } from 'react'
import Editor, { useMonaco } from '@monaco-editor/react'
import type * as MonacoType from 'monaco-editor'
import { Connection, SchemaResult } from '../lib/types'
import { registerCompletions } from '../lib/completions'
import { validateSQL, clearMarkers } from '../lib/validation'

interface Props {
  value: string
  onChange: (val: string) => void
  onRun: () => void
  connection: Connection | null
  schema: SchemaResult | null
  running: boolean
}

export default function QueryEditor({ value, onChange, onRun, connection, schema, running }: Props) {
  const monaco = useMonaco()
  const editorRef = useRef<MonacoType.editor.IStandaloneCodeEditor | null>(null)
  const disposables = useRef<MonacoType.IDisposable[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const language = connection?.type === 'mongodb' ? 'javascript' : 'sql'

  // Register schema completions when connection or schema changes
  useEffect(() => {
    disposables.current.forEach((d) => d.dispose())
    disposables.current = []
    if (!monaco || !schema || !connection) return
    disposables.current = registerCompletions(monaco, schema, connection.type)
    return () => {
      disposables.current.forEach((d) => d.dispose())
      disposables.current = []
    }
  }, [monaco, schema, connection])

  // Validate SQL on every change (debounced 400ms)
  useEffect(() => {
    if (!monaco || !editorRef.current || connection?.type !== 'postgres') return
    const model = editorRef.current.getModel()
    if (!model) return

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      validateSQL(monaco, model, value)
    }, 400)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [value, monaco, connection])

  // Clear markers when switching away from postgres
  useEffect(() => {
    if (!monaco || !editorRef.current || connection?.type === 'postgres') return
    const model = editorRef.current.getModel()
    if (model) clearMarkers(monaco, model)
  }, [connection, monaco])

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      onRun()
    }
  }

  return (
    <div style={wrapper} onKeyDown={handleKeyDown}>
      <div style={toolbar}>
        <span style={{ fontSize: 12, color: '#666' }}>
          {connection?.type === 'mongodb'
            ? 'MongoDB — e.g. db.orders.find({})  or  db.orders.aggregate([...])'
            : 'PostgreSQL — SQL'}
        </span>
        <button
          onClick={onRun}
          disabled={!connection || running}
          style={{ ...runBtn, opacity: !connection || running ? 0.5 : 1 }}
        >
          {running ? 'Running...' : '▶ Run'} <span style={{ color: '#aef', fontSize: 11 }}>⌘↵</span>
        </button>
      </div>
      <div style={{ flex: 1 }}>
        <Editor
          height="100%"
          language={language}
          value={value}
          onChange={(v) => onChange(v ?? '')}
          theme="vs-dark"
          onMount={(editor, monacoInstance) => {
            editorRef.current = editor
            // Suppress "db is not defined" — db is injected at runtime, not visible to the type checker
            monacoInstance.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
              noSemanticValidation: true,
              noSyntaxValidation: false
            })
          }}
          options={{
            fontSize: 13,
            minimap: { enabled: false },
            lineNumbers: 'on',
            wordWrap: 'on',
            scrollBeyondLastLine: false,
            renderLineHighlight: 'line',
            suggestOnTriggerCharacters: true,
            quickSuggestions: { other: true, comments: false, strings: false },
            parameterHints: { enabled: false },
            hover: { enabled: true },
            codeLens: false,
            inlineSuggest: { enabled: false },
            padding: { top: 8, bottom: 8 }
          }}
        />
      </div>
    </div>
  )
}

const wrapper: React.CSSProperties = { display: 'flex', flexDirection: 'column', height: '100%' }
const toolbar: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', background: '#1e1e1e', borderBottom: '1px solid #2d2d2d' }
const runBtn: React.CSSProperties = { background: '#4d9ef7', color: '#fff', padding: '5px 14px', borderRadius: 5, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }
