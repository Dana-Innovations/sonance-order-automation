/**
 * HTTP Endpoint Wrapper for Customer Pricing Sync
 *
 * Provides an HTTP API endpoint that can be called by N8N workflows.
 * Use this if N8N needs to trigger the sync via HTTP instead of SSH.
 *
 * Usage:
 *   1. Set SYNC_API_KEY in .env.local
 *   2. Start server: node sync-server.js
 *   3. Trigger sync: POST http://localhost:3000/sync-pricing
 *      Header: X-API-Key: your_api_key
 */

const express = require('express');
const { syncPricing } = require('./sync-customer-pricing');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'order-portal-web', '.env.local') });

const app = express();
const PORT = process.env.SYNC_SERVER_PORT || 3000;
const API_KEY = process.env.SYNC_API_KEY;

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Customer Pricing Sync Server',
    timestamp: new Date().toISOString()
  });
});

// Sync endpoint
app.post('/sync-pricing', async (req, res) => {
  // Validate API key
  const providedKey = req.headers['x-api-key'];

  if (!API_KEY) {
    return res.status(500).json({
      error: 'Server misconfigured',
      message: 'SYNC_API_KEY not set in environment'
    });
  }

  if (providedKey !== API_KEY) {
    console.warn('❌ Unauthorized sync attempt from:', req.ip);
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid API key'
    });
  }

  console.log('🔐 Authorized sync request received from:', req.ip);

  try {
    const results = await syncPricing();

    if (results.success) {
      res.json(results);
    } else {
      res.status(500).json(results);
    }
  } catch (error) {
    console.error('❌ Sync endpoint error:', error);
    res.status(500).json({
      error: 'Sync failed',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Start server
app.listen(PORT, () => {
  console.log('╔═══════════════════════════════════════════╗');
  console.log('║  Customer Pricing Sync Server            ║');
  console.log('╚═══════════════════════════════════════════╝\n');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`🔄 Sync endpoint: http://localhost:${PORT}/sync-pricing`);
  console.log(`🔐 API key required: ${API_KEY ? '✅ Configured' : '❌ NOT SET'}\n`);

  if (!API_KEY) {
    console.warn('⚠️  WARNING: SYNC_API_KEY not set in .env.local');
    console.warn('   All sync requests will be rejected until key is configured.\n');
  }
});
