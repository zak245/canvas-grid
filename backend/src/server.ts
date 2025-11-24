import express from 'express';
import cors from 'cors';
import { connectDatabase } from './db.js';
import router from './routes.js';
import { Grid } from './models.js';
import { seed } from './seed.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/v1', router);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Start server
async function start() {
  try {
    // Connect to database
    await connectDatabase();

    // Auto-seed if empty (ensures demo works out of the box on deployment)
    try {
      const gridCount = await Grid.countDocuments();
      if (gridCount === 0) {
        console.log('📉 No grids found. Auto-seeding default data...');
        // Use the default ID expected by the frontend
        await seed('6923deb29159ecd511020001');
      }
    } catch (err) {
      console.error('⚠️ Auto-seed check failed:', err);
    }

    // Start server
    app.listen(PORT, () => {
      console.log('');
      console.log('🚀 Canvas Backend Server');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📡 Server running on http://localhost:${PORT}`);
      console.log(`🏥 Health check: http://localhost:${PORT}/health`);
      console.log(`📚 API base: http://localhost:${PORT}/api/v1`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
      console.log('💡 Tip: Run "npm run seed" in a new terminal to populate demo data');
      console.log('');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});

start();

