import { useState } from 'react'
import { Connection } from '../lib/types'

interface Props {
  connections: Connection[]
  onSave: (connections: Connection[]) => void
  onClose: () => void
}

const DEFAULTS = {
  postgres: { host: 'localhost', port: 5432, user: 'postgres', password: '', database: 'postgres' },
  mongodb: { host: 'localhost', port: 27017, user: '', password: '', database: 'test' }
}

export default function ConnectionManager({ connections, onSave, onClose }: Props) {
  const [list, setList] = useState<Connection[]>(connections)
  const [editing, setEditing] = useState<Connection | null>(null)
  const [testStatus, setTestStatus] = useState<string>('')
  const [useConnectionString, setUseConnectionString] = useState(false)

  function newConnection() {
    setEditing({ id: crypto.randomUUID(), name: '', type: 'postgres', ...DEFAULTS.postgres })
    setUseConnectionString(false)
    setTestStatus('')
  }

  function handleTypeChange(type: 'postgres' | 'mongodb') {
    if (!editing) return
    setEditing({ ...editing, type, ...DEFAULTS[type], connectionString: undefined })
    setUseConnectionString(false)
  }

  function handleSelectConnection(c: Connection) {
    setEditing({ ...c })
    setUseConnectionString(!!c.connectionString)
    setTestStatus('')
  }

  async function handleTest() {
    if (!editing) return
    setTestStatus('Testing...')
    const conn = useConnectionString
      ? { ...editing, connectionString: editing.connectionString }
      : { ...editing, connectionString: undefined }
    const res = await window.api.testConnection(conn)
    setTestStatus(res.success ? '✓ Connected' : `✗ ${res.error}`)
  }

  function handleSaveEdit() {
    if (!editing || !editing.name.trim()) return
    const conn = useConnectionString
      ? { ...editing }
      : { ...editing, connectionString: undefined }
    const exists = list.find((c) => c.id === conn.id)
    const updated = exists ? list.map((c) => (c.id === conn.id ? conn : c)) : [...list, conn]
    setList(updated)
    onSave(updated)
    setEditing(null)
    setTestStatus('')
  }

  function handleDelete(id: string) {
    const updated = list.filter((c) => c.id !== id)
    setList(updated)
    onSave(updated)
  }

  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={header}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>Connections</span>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        <div style={{ display: 'flex', gap: 16, flex: 1, overflow: 'hidden' }}>
          {/* List */}
          <div style={listPanel}>
            <button onClick={newConnection} style={addBtn}>+ New Connection</button>
            {list.map((c) => (
              <div
                key={c.id}
                onClick={() => handleSelectConnection(c)}
                style={{ ...connItem, background: editing?.id === c.id ? '#2d2d2d' : 'transparent' }}
              >
                <span style={{ fontSize: 11, color: c.type === 'postgres' ? '#4d9ef7' : '#57ab5a' }}>
                  {c.type === 'postgres' ? 'PG' : 'MG'}
                </span>
                <span style={{ flex: 1, marginLeft: 8, fontSize: 13 }}>{c.name}</span>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(c.id) }} style={deleteBtn}>✕</button>
              </div>
            ))}
          </div>

          {/* Form */}
          {editing && (
            <div style={formPanel}>
              <Field label="Name">
                <input style={input} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="My Database" />
              </Field>
              <Field label="Type">
                <select style={input} value={editing.type} onChange={(e) => handleTypeChange(e.target.value as any)}>
                  <option value="postgres">PostgreSQL</option>
                  <option value="mongodb">MongoDB</option>
                </select>
              </Field>

              {/* MongoDB: toggle between manual fields and connection string */}
              {editing.type === 'mongodb' && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <button
                    onClick={() => setUseConnectionString(false)}
                    style={{ ...toggleBtn, background: !useConnectionString ? '#3a3a3a' : '#2a2a2a', color: !useConnectionString ? '#fff' : '#888' }}
                  >
                    Manual
                  </button>
                  <button
                    onClick={() => setUseConnectionString(true)}
                    style={{ ...toggleBtn, background: useConnectionString ? '#3a3a3a' : '#2a2a2a', color: useConnectionString ? '#fff' : '#888' }}
                  >
                    Connection String
                  </button>
                </div>
              )}

              {useConnectionString && editing.type === 'mongodb' ? (
                <>
                  <Field label="Connection String (mongodb+srv:// or mongodb://)">
                    <input
                      style={input}
                      value={editing.connectionString ?? ''}
                      onChange={(e) => setEditing({ ...editing, connectionString: e.target.value })}
                      placeholder="mongodb+srv://user:password@cluster.mongodb.net/mydb"
                    />
                  </Field>
                  <Field label="Database (overrides URI database if set)">
                    <input style={input} value={editing.database} onChange={(e) => setEditing({ ...editing, database: e.target.value })} placeholder="mydb" />
                  </Field>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <Field label="Host" style={{ flex: 1 }}>
                      <input style={input} value={editing.host} onChange={(e) => setEditing({ ...editing, host: e.target.value })} />
                    </Field>
                    <Field label="Port" style={{ width: 90 }}>
                      <input style={input} type="number" value={editing.port} onChange={(e) => setEditing({ ...editing, port: Number(e.target.value) })} />
                    </Field>
                  </div>
                  <Field label="Database">
                    <input style={input} value={editing.database} onChange={(e) => setEditing({ ...editing, database: e.target.value })} />
                  </Field>
                  <Field label="User">
                    <input style={input} value={editing.user} onChange={(e) => setEditing({ ...editing, user: e.target.value })} />
                  </Field>
                  <Field label="Password">
                    <input style={input} type="password" value={editing.password} onChange={(e) => setEditing({ ...editing, password: e.target.value })} />
                  </Field>
                </>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                <button onClick={handleTest} style={secondaryBtn}>Test Connection</button>
                <button onClick={handleSaveEdit} style={primaryBtn}>Save</button>
                {testStatus && (
                  <span style={{ fontSize: 12, color: testStatus.startsWith('✓') ? '#57ab5a' : testStatus === 'Testing...' ? '#aaa' : '#e06c75' }}>
                    {testStatus}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ marginBottom: 10, ...style }}>
      <div style={{ fontSize: 11, color: '#888', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      {children}
    </div>
  )
}

const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }
const modal: React.CSSProperties = { background: '#222', border: '1px solid #333', borderRadius: 10, width: 680, height: 480, display: 'flex', flexDirection: 'column', overflow: 'hidden' }
const header: React.CSSProperties = { padding: '12px 16px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
const listPanel: React.CSSProperties = { width: 200, borderRight: '1px solid #333', padding: 12, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }
const formPanel: React.CSSProperties = { flex: 1, padding: 16, overflowY: 'auto' }
const connItem: React.CSSProperties = { display: 'flex', alignItems: 'center', padding: '6px 8px', borderRadius: 6, cursor: 'pointer' }
const input: React.CSSProperties = { width: '100%', background: '#2a2a2a', border: '1px solid #3a3a3a', borderRadius: 5, padding: '6px 8px', color: '#e0e0e0', fontSize: 13 }
const addBtn: React.CSSProperties = { background: '#2d2d2d', color: '#aaa', padding: '7px 10px', borderRadius: 6, fontSize: 12, marginBottom: 8, textAlign: 'left' }
const deleteBtn: React.CSSProperties = { background: 'transparent', color: '#555', fontSize: 11, padding: 2, lineHeight: 1 }
const closeBtn: React.CSSProperties = { background: 'transparent', color: '#888', fontSize: 16, padding: 2 }
const primaryBtn: React.CSSProperties = { background: '#4d9ef7', color: '#fff', padding: '7px 16px', borderRadius: 6, fontSize: 13 }
const secondaryBtn: React.CSSProperties = { background: '#2d2d2d', color: '#ccc', padding: '7px 12px', borderRadius: 6, fontSize: 13 }
const toggleBtn: React.CSSProperties = { padding: '5px 12px', borderRadius: 5, fontSize: 12, border: '1px solid #3a3a3a' }
