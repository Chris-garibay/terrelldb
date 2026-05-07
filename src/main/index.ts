import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import Store from 'electron-store'
import { runPostgresQuery, testPostgresConnection, getPostgresSchema } from './postgres'
import { runMongoQuery, testMongoConnection, getMongoSchema, parseImportFiles, importCollections } from './mongo'

const store = new Store()

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#1a1a1a'
  })

  win.on('ready-to-show', () => win.show())
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.dbstudio')
  app.on('browser-window-created', (_, window) => optimizer.watchWindowShortcuts(window))
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// --- Connection storage ---

ipcMain.handle('connections:get', () => {
  return store.get('connections', [])
})

ipcMain.handle('connections:save', (_, connections) => {
  store.set('connections', connections)
})

// --- Test connection ---

ipcMain.handle('connection:test', async (_, connection) => {
  if (connection.type === 'postgres') return testPostgresConnection(connection)
  if (connection.type === 'mongodb') return testMongoConnection(connection)
  return { success: false, error: 'Unknown connection type' }
})

// --- Schema browsing ---

ipcMain.handle('schema:get', async (_, connection) => {
  if (connection.type === 'postgres') return getPostgresSchema(connection)
  if (connection.type === 'mongodb') return getMongoSchema(connection)
  return { success: false, error: 'Unknown connection type' }
})

// --- Query execution ---

ipcMain.handle('query:run', async (_, connection, query) => {
  if (connection.type === 'postgres') return runPostgresQuery(connection, query)
  if (connection.type === 'mongodb') return runMongoQuery(connection, query)
  return { success: false, error: 'Unknown connection type' }
})

// --- Import ---

ipcMain.handle('import:pickFiles', async () => {
  const win = BrowserWindow.getFocusedWindow()
  if (!win) return { canceled: true, files: [] }
  const result = await dialog.showOpenDialog(win, {
    title: 'Select JSON or ZIP files to import',
    filters: [
      { name: 'Supported Files', extensions: ['json', 'zip'] },
      { name: 'JSON', extensions: ['json'] },
      { name: 'ZIP', extensions: ['zip'] }
    ],
    properties: ['openFile', 'multiSelections']
  })
  if (result.canceled || result.filePaths.length === 0) return { canceled: true, files: [] }
  const files = parseImportFiles(result.filePaths)
  return { canceled: false, files }
})

ipcMain.handle('import:run', async (_, connection, database, files) => {
  return importCollections(connection, database, files)
})
