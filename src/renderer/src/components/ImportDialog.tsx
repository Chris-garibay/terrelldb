import { useState } from 'react'
import { Connection, ImportFile } from '../lib/types'

interface Props {
  connection: Connection
  onClose: () => void
  onImported: () => void
}

export default function ImportDialog({ connection, onClose, onImported }: Props) {
  const [files, setFiles] = useState<ImportFile[]>([])
  const [database, setDatabase] = useState(connection.database)
  const [status, setStatus] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [picked, setPicked] = useState(false)

  async function handlePick() {
    setStatus('')
    const result = await window.api.pickImportFiles()
    if (result.canceled || result.files.length === 0) return
    setFiles(result.files)
    setPicked(true)
  }

  function updateCollectionName(index: number, name: string) {
    setFiles((prev) => prev.map((f, i) => i === index ? { ...f, collection: name } : f))
  }

  async function handleImport() {
    if (!files.length || !database.trim()) return
    setLoading(true)
    setStatus('')
    const result = await window.api.runImport(connection, database, files)
    setLoading(false)
    if (result.success) {
      setStatus(`✓ Imported ${result.imported} documents across ${files.length} collection${files.length !== 1 ? 's' : ''}`)
      onImported()
    } else {
      setStatus(`✗ ${result.error}`)
    }
  }

  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={header}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>Import JSON / ZIP</span>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14, flex: 1, overflowY: 'auto' }}>
          {/* Database */}
          <div>
            <div style={label}>Target Database</div>
            <input
              style={input}
              value={database}
              onChange={(e) => setDatabase(e.target.value)}
              placeholder="database name"
            />
          </div>

          {/* File picker */}
          <button onClick={handlePick} style={pickBtn}>
            {picked ? '↺ Change Files' : '+ Pick JSON or ZIP Files'}
          </button>

          {/* Preview table */}
          {files.length > 0 && (
            <div>
              <div style={label}>Collections to import — edit names if needed</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {files.map((f, i) => (
                  <div key={i} style={fileRow}>
                    <input
                      style={{ ...input, flex: 1 }}
                      value={f.collection}
                      onChange={(e) => updateCollectionName(i, e.target.value)}
                    />
                    <span style={{ fontSize: 12, color: '#666', whiteSpace: 'nowrap' }}>
                      {f.docs.length.toLocaleString()} docs
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status */}
          {status && (
            <div style={{
              fontSize: 13,
              color: status.startsWith('✓') ? '#57ab5a' : '#e06c75',
              padding: '8px 10px',
              background: '#1e1e1e',
              borderRadius: 5
            }}>
              {status}
            </div>
          )}
        </div>

        <div style={footer}>
          <button onClick={onClose} style={secondaryBtn}>Cancel</button>
          <button
            onClick={handleImport}
            disabled={!files.length || !database.trim() || loading}
            style={{ ...primaryBtn, opacity: !files.length || loading ? 0.5 : 1 }}
          >
            {loading ? 'Importing...' : `Import${files.length ? ` (${files.length} collection${files.length !== 1 ? 's' : ''})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}

const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }
const modal: React.CSSProperties = { background: '#222', border: '1px solid #333', borderRadius: 10, width: 480, maxHeight: 540, display: 'flex', flexDirection: 'column', overflow: 'hidden' }
const header: React.CSSProperties = { padding: '12px 16px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
const footer: React.CSSProperties = { padding: '12px 16px', borderTop: '1px solid #333', display: 'flex', justifyContent: 'flex-end', gap: 10 }
const label: React.CSSProperties = { fontSize: 11, color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }
const input: React.CSSProperties = { background: '#2a2a2a', border: '1px solid #3a3a3a', borderRadius: 5, padding: '6px 8px', color: '#e0e0e0', fontSize: 13, width: '100%' }
const pickBtn: React.CSSProperties = { background: '#2a2a2a', border: '1px dashed #444', borderRadius: 6, color: '#aaa', padding: '10px', fontSize: 13, textAlign: 'center' }
const fileRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10 }
const primaryBtn: React.CSSProperties = { background: '#4d9ef7', color: '#fff', padding: '7px 16px', borderRadius: 6, fontSize: 13, border: 'none' }
const secondaryBtn: React.CSSProperties = { background: '#2d2d2d', color: '#ccc', padding: '7px 12px', borderRadius: 6, fontSize: 13, border: 'none' }
const closeBtn: React.CSSProperties = { background: 'transparent', color: '#888', fontSize: 16, padding: 2, border: 'none' }
