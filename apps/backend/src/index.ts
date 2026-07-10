import express from 'express';
import cors from 'cors';
import multer from 'multer';
import csvParser from 'csv-parser';
import { Readable } from 'stream';
import dotenv from 'dotenv';
import { AIService } from './services/ai.service';
import { CSVRow } from './types';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Configure CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Set up Multer for handling file uploads (in-memory)
const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed.'));
    }
  }
});

/**
 * Health check endpoint.
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

/**
 * Endpoint 1: Upload CSV and return raw parsed rows for Preview (Step 2).
 */
app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const results: CSVRow[] = [];
  const bufferStream = new Readable();
  bufferStream.push(req.file.buffer);
  bufferStream.push(null);

  bufferStream
    .pipe(csvParser())
    .on('data', (data) => {
      // Normalize column headers to clean whitespaces
      const cleanData: CSVRow = {};
      for (const [key, val] of Object.entries(data)) {
        cleanData[key.trim()] = (val as string).trim();
      }
      results.push(cleanData);
    })
    .on('end', () => {
      res.json({
        filename: req.file?.originalname,
        totalRows: results.length,
        rows: results
      });
    })
    .on('error', (err) => {
      console.error('CSV Parsing error:', err);
      res.status(500).json({ error: 'Failed to parse CSV file.' });
    });
});

/**
 * Endpoint 2: Process the confirmed rows with AI Mapping (Step 4).
 */
app.post('/api/process', async (req, res) => {
  const { rows } = req.body;

  if (!rows || !Array.isArray(rows)) {
    return res.status(400).json({ error: 'Missing or invalid CSV rows to process.' });
  }

  if (rows.length === 0) {
    return res.json({
      successful: [],
      skipped: [],
      metrics: {
        totalRows: 0,
        successfulCount: 0,
        skippedCount: 0,
        processingTimeMs: 0
      }
    });
  }

  const startTime = Date.now();

  try {
    // Process mapping in parallel/batches
    const result = await AIService.mapWithAI(rows);
    const duration = Date.now() - startTime;

    res.json({
      successful: result.successful,
      skipped: result.skipped,
      metrics: {
        totalRows: rows.length,
        successfulCount: result.successful.length,
        skippedCount: result.skipped.length,
        processingTimeMs: duration
      }
    });
  } catch (err: any) {
    console.error('AI Extraction Error:', err);
    res.status(500).json({ error: err.message || 'AI processing encountered an error.' });
  }
});

/**
 * Endpoint 3: Direct export to download files via Content-Disposition attachment.
 */
app.post('/api/export', (req, res) => {
  try {
    let records: any[];
    let format: 'csv' | 'json';

    // Support both JSON body and form-encoded payload
    if (req.body.records) {
      records = req.body.records;
      format = req.body.format || 'csv';
    } else if (req.body.payload) {
      const parsed = JSON.parse(req.body.payload);
      records = parsed.records;
      format = parsed.format || 'csv';
    } else {
      return res.status(400).send('Missing export data.');
    }

    if (!records || !Array.isArray(records)) {
      return res.status(400).send('Invalid records data.');
    }

    const dateStr = new Date().toISOString().slice(0, 10);

    if (format === 'csv') {
      if (records.length === 0) {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="crm_leads_${dateStr}.csv"`);
        return res.send('');
      }

      const headers = Object.keys(records[0]);
      const csvRows = [];
      csvRows.push(headers.join(','));

      for (const row of records) {
        const values = headers.map(header => {
          const val = row[header] ?? '';
          const escaped = ('' + val).replace(/"/g, '""');
          return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
      }

      const csvContent = '\uFEFF' + csvRows.join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="crm_leads_${dateStr}.csv"`);
      return res.send(csvContent);
    } else {
      const jsonStr = JSON.stringify(records, null, 2);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="crm_leads_${dateStr}.json"`);
      return res.send(jsonStr);
    }
  } catch (err: any) {
    console.error('Export Error:', err);
    return res.status(500).send('Export processing failed.');
  }
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global Error Handler:', err);
  res.status(400).json({ error: err.message || 'An unexpected error occurred.' });
});

app.listen(PORT, () => {
  console.log(`Backend server running at http://localhost:${PORT}`);
});
