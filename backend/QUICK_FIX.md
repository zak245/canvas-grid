# Quick Fix for Grid ID Issue

## The Problem

You're using **in-memory MongoDB**, which means:
- Data resets when server restarts
- Each process (server, seed, list-grids) has its own database
- They don't share data!

## Solution 1: Re-seed and Copy ID (Simplest)

### Step 1: Stop the backend server
In the backend terminal, press `Ctrl+C`

### Step 2: Run seed to get a Grid ID
```bash
cd backend
npm run seed
```

**Important:** Copy the Grid ID from the output!
Example: `Grid ID: 67434d8a5f2c1b3a4e789012`

### Step 3: Update frontend
Edit `src/App.tsx` line 15:
```typescript
const GRID_ID = '67434d8a5f2c1b3a4e789012'; // Paste your Grid ID here
```

### Step 4: Start backend server again
```bash
npm run dev
```

### Step 5: Refresh your browser
The grid should load!

---

## Solution 2: Use Persistent MongoDB (Better)

### Option A: Install MongoDB locally

1. Install MongoDB:
```bash
# macOS
brew install mongodb-community

# Start MongoDB
brew services start mongodb-community
```

2. Update `backend/.env`:
```bash
MONGODB_URI=mongodb://localhost:27017/canvas-grid
```

3. Restart backend and seed:
```bash
# Terminal 1: Backend
npm run dev

# Terminal 2: Seed
npm run seed
```

Now data persists across restarts!

### Option B: Use MongoDB Atlas (Cloud)

1. Create free account at mongodb.com/atlas
2. Create a cluster
3. Get connection string
4. Update `backend/.env`:
```bash
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/canvas-grid
```

---

## Solution 3: Quick Test (Right Now)

Want to test immediately without restarting backend?

### Create grid via API:

```bash
# In a new terminal:
curl -X POST http://localhost:3001/api/v1/grids \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Grid",
    "columns": [
      {"id": "col_1", "title": "Name", "width": 200, "type": "text", "visible": true, "position": 0}
    ],
    "totalRows": 0
  }'
```

This will return a Grid ID. Copy it and update your frontend!

---

## Current Grid ID

Your frontend is trying to use: `6923a449fefe5f075de40383`

But this Grid ID doesn't exist in the current database because:
- Backend restarted (in-memory DB was wiped)
- OR seed was run in a different process

---

## Recommended: Quick Fix Right Now

**Easiest path:**

1. Keep backend running
2. Create a grid manually:

```bash
curl -X POST http://localhost:3001/api/v1/grids \
  -H "Content-Type: application/json" \
  -d @backend/seed-grid.json
```

Let me create that file for you...

