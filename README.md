# DBStudio

A simple, local database IDE for PostgreSQL and MongoDB. No AI. No cloud. Runs entirely on your machine.

## Features

- PostgreSQL & MongoDB support
- Schema browser with table & collection explorer
- Monaco editor — same engine as VS Code
- SQL squiggle errors & schema-aware completions
- Shell-style MongoDB query syntax (`db.orders.find({})`)
- Import JSON / ZIP files directly into MongoDB
- Completely offline — no data leaves your machine

## Download

Go to the [Releases](https://github.com/Chris-garibay/terrelldb/releases/latest) page and download for your platform.

## Installation

### macOS

1. Download the `.dmg` file for your chip:
   - **Apple Silicon (M1/M2/M3):** `DBStudio-mac-arm64.dmg`
   - **Intel:** `DBStudio-mac-x64.dmg`
2. Open the `.dmg` and drag DBStudio to your Applications folder.
3. **First launch:** Do NOT double-click. Instead:
   - Right-click (or Control-click) the app
   - Select **Open**
   - Click **Open Anyway** in the dialog
   - macOS remembers this and you can open it normally from then on.

> This is required because the app is not signed with an Apple Developer certificate. It is safe to open.

### Windows

1. Download `DBStudio-windows-setup.exe`
2. Run the installer
3. If Windows SmartScreen appears, click **More info → Run anyway**

## Connecting to a Database

### PostgreSQL
- Host: `localhost`, Port: `5432`
- Enter your username, password, and database name

### MongoDB (local)
- Host: `localhost`, Port: `27017`
- Leave user/password blank for a fresh local install

### MongoDB Atlas
- Use the **Connection String** mode in the connection form
- Paste your full `mongodb+srv://...` URI

## Importing Data

For MongoDB, click **⬆ Import JSON / ZIP** in the sidebar to import `.json` or `.zip` files directly into a local database. Supports both JSON arrays and NDJSON formats.

## Running Queries

**PostgreSQL:** Standard SQL

**MongoDB:** Shell-style syntax works directly:
```
db.orders.find({ status: "Shipped" })

db.orders.aggregate([
  { "$match": { "status": "Shipped" } },
  { "$project": { "orderdate": 1 } }
])
```
