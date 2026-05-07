import { QueryResult } from '../lib/types'

interface Props {
  result: QueryResult | null
  running: boolean
}

export default function ResultsPanel({ result, running }: Props) {
  if (running) return <div style={empty}>Running query...</div>
  if (!result) return <div style={empty}>Run a query to see results here. (⌘↵)</div>

  if (!result.success) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ color: '#e06c75', fontSize: 13, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
          {result.error}
        </div>
      </div>
    )
  }

  const { rows = [], fields = [], rowCount = 0, duration = 0 } = result

  return (
    <div style={wrapper}>
      <div style={statusBar}>
        <span style={{ color: '#57ab5a' }}>✓ {rowCount} row{rowCount !== 1 ? 's' : ''}</span>
        <span style={{ color: '#666' }}>{duration}ms</span>
      </div>

      {rows.length === 0 ? (
        <div style={empty}>Query returned no rows.</div>
      ) : (
        <div style={{ flex: 1, overflow: 'auto' }}>
          <table style={table}>
            <thead>
              <tr>
                {fields.map((f) => (
                  <th key={f} style={th}>{f}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : '#1e1e1e' }}>
                  {fields.map((f) => (
                    <td key={f} style={td}>{formatCell(row[f])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function formatCell(val: any): string {
  if (val === null || val === undefined) return 'NULL'
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}

const wrapper: React.CSSProperties = { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }
const statusBar: React.CSSProperties = { padding: '5px 12px', borderBottom: '1px solid #2d2d2d', display: 'flex', gap: 16, fontSize: 12, background: '#1a1a1a' }
const empty: React.CSSProperties = { padding: 20, fontSize: 13, color: '#555', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }
const table: React.CSSProperties = { borderCollapse: 'collapse', width: '100%', fontSize: 13 }
const th: React.CSSProperties = { padding: '7px 12px', textAlign: 'left', borderBottom: '1px solid #2d2d2d', background: '#1e1e1e', color: '#888', fontWeight: 500, whiteSpace: 'nowrap', position: 'sticky', top: 0 }
const td: React.CSSProperties = { padding: '5px 12px', borderBottom: '1px solid #252525', color: '#ccc', whiteSpace: 'nowrap', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }
