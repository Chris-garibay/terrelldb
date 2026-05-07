import { useState, useEffect } from 'react'
import { Connection, SchemaResult } from '../lib/types'

interface Props {
  connection: Connection | null
  schema: SchemaResult | null
  onTableClick: (query: string) => void
  onImport?: () => void
}

export default function Sidebar({ connection, schema, onTableClick, onImport }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => { setExpanded(new Set()) }, [connection])

  function toggle(name: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  function handleTableClick(name: string) {
    if (!connection) return
    if (connection.type === 'postgres') {
      onTableClick(`SELECT * FROM "${name}" LIMIT 100;`)
    } else {
      onTableClick(`return await db.collection('${name}').find({}).limit(100).toArray()`)
    }
  }

  const loading = connection && !schema
  const items = schema?.tables
    ? Object.entries(schema.tables)
    : schema?.collections
    ? Object.entries(schema.collections)
    : []

  return (
    <div style={sidebar}>
      <div style={sidebarHeader}>
        {connection ? (
          <>
            <span style={{ fontSize: 11, color: connection.type === 'postgres' ? '#4d9ef7' : '#57ab5a', fontWeight: 600 }}>
              {connection.type === 'postgres' ? 'POSTGRESQL' : 'MONGODB'}
            </span>
            <span style={{ fontSize: 12, color: '#ccc', marginTop: 2 }}>{connection.name}</span>
            <span style={{ fontSize: 11, color: '#666' }}>{connection.database}</span>
            {connection.type === 'mongodb' && onImport && (
              <button onClick={onImport} style={importBtn}>⬆ Import JSON / ZIP</button>
            )}
          </>
        ) : (
          <span style={{ fontSize: 12, color: '#555' }}>No connection selected</span>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {loading && <div style={{ padding: '12px 16px', fontSize: 12, color: '#666' }}>Loading schema...</div>}

        {schema && !schema.success && (
          <div style={{ padding: '12px 16px', fontSize: 12, color: '#e06c75' }}>{schema.error}</div>
        )}

        {items.map(([name, cols]) => (
          <div key={name}>
            <div onClick={() => toggle(name)} style={tableRow}>
              <span style={{ color: '#888', fontSize: 11, marginRight: 6 }}>{expanded.has(name) ? '▾' : '▸'}</span>
              <span
                style={{ flex: 1, fontSize: 13, cursor: 'pointer' }}
                onDoubleClick={() => handleTableClick(name)}
                title="Double-click to query"
              >
                {name}
              </span>
            </div>
            {expanded.has(name) && Array.isArray(cols) && (
              <div>
                {cols.map((col: any) => (
                  <div key={typeof col === 'string' ? col : col.name} style={colRow}>
                    <span style={{ color: '#aaa', fontSize: 12 }}>{typeof col === 'string' ? col : col.name}</span>
                    {col.type && <span style={{ color: '#555', fontSize: 11, marginLeft: 'auto' }}>{col.type}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

const importBtn: React.CSSProperties = { marginTop: 6, background: '#2a2a2a', border: '1px solid #3a3a3a', color: '#aaa', padding: '4px 8px', borderRadius: 5, fontSize: 11, cursor: 'pointer', textAlign: 'left' }
const sidebar: React.CSSProperties = { width: 220, minWidth: 180, background: '#1e1e1e', borderRight: '1px solid #2d2d2d', display: 'flex', flexDirection: 'column', overflow: 'hidden' }
const sidebarHeader: React.CSSProperties = { padding: '12px 14px', borderBottom: '1px solid #2d2d2d', display: 'flex', flexDirection: 'column', gap: 2, minHeight: 64 }
const tableRow: React.CSSProperties = { display: 'flex', alignItems: 'center', padding: '5px 14px', cursor: 'pointer', userSelect: 'none' }
const colRow: React.CSSProperties = { display: 'flex', alignItems: 'center', padding: '3px 14px 3px 32px' }
