import { useState, useEffect } from 'react'
import { Connection, QueryResult, SchemaResult } from './lib/types'
import ConnectionManager from './components/ConnectionManager'
import Sidebar from './components/Sidebar'
import QueryEditor from './components/QueryEditor'
import ResultsPanel from './components/ResultsPanel'
import ImportDialog from './components/ImportDialog'

export default function App() {
  const [connections, setConnections] = useState<Connection[]>([])
  const [activeConnection, setActiveConnection] = useState<Connection | null>(null)
  const [schema, setSchema] = useState<SchemaResult | null>(null)
  const [showManager, setShowManager] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<QueryResult | null>(null)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    window.api.getConnections().then((conns) => {
      setConnections(conns)
      if (conns.length > 0) setActiveConnection(conns[0])
    })
  }, [])

  useEffect(() => {
    if (!activeConnection) { setSchema(null); return }
    window.api.getSchema(activeConnection).then(setSchema)
  }, [activeConnection])

  function handleSaveConnections(updated: Connection[]) {
    setConnections(updated)
    window.api.saveConnections(updated)
    if (activeConnection && !updated.find((c) => c.id === activeConnection.id)) {
      setActiveConnection(updated[0] ?? null)
    }
  }

  async function handleRun() {
    if (!activeConnection || !query.trim()) return
    setRunning(true)
    setResult(null)
    const res = await window.api.runQuery(activeConnection, query)
    setResult(res)
    setRunning(false)
  }

  return (
    <div style={appShell}>
      {/* Titlebar */}
      <div style={titlebar}>
        <div style={{ width: 72 }} />
        <span style={{ fontSize: 13, color: '#888', fontWeight: 500 }}>DBStudio</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          <select
            style={connSelect}
            value={activeConnection?.id ?? ''}
            onChange={(e) => {
              const conn = connections.find((c) => c.id === e.target.value) ?? null
              setActiveConnection(conn)
              setResult(null)
              setQuery('')
            }}
          >
            {connections.length === 0 && <option value="">No connections</option>}
            {connections.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button onClick={() => setShowManager(true)} style={manageBtn}>
            Manage Connections
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={body}>
        <Sidebar
          connection={activeConnection}
          schema={schema}
          onTableClick={(q) => { setQuery(q); setResult(null) }}
          onImport={() => setShowImport(true)}
        />

        <div style={main}>
          <div style={{ flex: '0 0 45%', borderBottom: '1px solid #2d2d2d', overflow: 'hidden' }}>
            <QueryEditor
              value={query}
              onChange={setQuery}
              onRun={handleRun}
              connection={activeConnection}
              schema={schema}
              running={running}
            />
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <ResultsPanel result={result} running={running} />
          </div>
        </div>
      </div>

      {showManager && (
        <ConnectionManager
          connections={connections}
          onSave={handleSaveConnections}
          onClose={() => setShowManager(false)}
        />
      )}

      {showImport && activeConnection && (
        <ImportDialog
          connection={activeConnection}
          onClose={() => setShowImport(false)}
          onImported={() => {
            setShowImport(false)
            window.api.getSchema(activeConnection).then(setSchema)
          }}
        />
      )}
    </div>
  )
}

const appShell: React.CSSProperties = { height: '100vh', display: 'flex', flexDirection: 'column', background: '#1a1a1a' }
const titlebar: React.CSSProperties = { height: 40, display: 'flex', alignItems: 'center', padding: '0 12px', borderBottom: '1px solid #2d2d2d', WebkitAppRegion: 'drag' as any, gap: 12, flexShrink: 0 }
const body: React.CSSProperties = { flex: 1, display: 'flex', overflow: 'hidden' }
const main: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }
const connSelect: React.CSSProperties = { background: '#2a2a2a', border: '1px solid #3a3a3a', color: '#ccc', padding: '4px 8px', borderRadius: 5, fontSize: 13, WebkitAppRegion: 'no-drag' as any }
const manageBtn: React.CSSProperties = { background: '#2a2a2a', border: '1px solid #3a3a3a', color: '#ccc', padding: '4px 10px', borderRadius: 5, fontSize: 12, WebkitAppRegion: 'no-drag' as any }
