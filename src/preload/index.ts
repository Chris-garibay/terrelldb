import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  getConnections: () => ipcRenderer.invoke('connections:get'),
  saveConnections: (connections: any[]) => ipcRenderer.invoke('connections:save', connections),
  testConnection: (connection: any) => ipcRenderer.invoke('connection:test', connection),
  getSchema: (connection: any) => ipcRenderer.invoke('schema:get', connection),
  runQuery: (connection: any, query: string) => ipcRenderer.invoke('query:run', connection, query),
  pickImportFiles: () => ipcRenderer.invoke('import:pickFiles'),
  runImport: (connection: any, database: string, files: any[]) =>
    ipcRenderer.invoke('import:run', connection, database, files)
})
