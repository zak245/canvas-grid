import express, { Request, Response } from 'express';
import { nanoid } from 'nanoid';
import { Grid, Row, EnrichmentJob } from './models.js';
import * as enrichment from './mock-enrichment.js';

const router = express.Router();

// ==================== GRID MANAGEMENT ====================

// POST /grids - Create a new grid
router.post('/grids', async (req: Request, res: Response) => {
  try {
    const { name, columns, settings } = req.body;

    const grid = new Grid({
      name: name || 'Untitled Grid',
      columns: columns || [],
      totalRows: 0,
      settings: settings || { defaultRowHeight: 32 },
    });

    await grid.save();

    res.json({
      id: grid._id.toString(),
      name: grid.name,
      columns: grid.columns,
      totalRows: grid.totalRows,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== GRID DATA ENDPOINTS ====================

// GET /grids/:gridId/data - Fetch grid data with pagination
router.get('/grids/:gridId/data', async (req: Request, res: Response) => {
  try {
    const { gridId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 100;
    const skip = (page - 1) * pageSize;

    const grid = await Grid.findById(gridId);
    if (!grid) {
      return res.status(404).json({ error: 'Grid not found' });
    }

    // Fetch rows with pagination
    const rows = await Row.find({ gridId })
      .sort({ position: 1 })
      .skip(skip)
      .limit(pageSize)
      .lean();

    // Transform rows to match frontend format
    const transformedRows = rows.map((row) => ({
      id: row.rowId,
      cells: row.cells, // Keep as plain object - frontend will convert to Map
    }));

    res.json({
      columns: grid.columns,
      rows: transformedRows,
      totalRows: grid.totalRows,
      page,
      pageSize,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ROW OPERATIONS ====================

// POST /grids/:gridId/rows - Add a new row
router.post('/grids/:gridId/rows', async (req: Request, res: Response) => {
  try {
    const { gridId } = req.params;
    const { cells, position } = req.body;

    const grid = await Grid.findById(gridId);
    if (!grid) {
      return res.status(404).json({ error: 'Grid not found' });
    }

    // Generate unique row ID
    const rowId = `row_${nanoid(10)}`;

    // Determine position
    const rowPosition = position !== undefined ? position : grid.totalRows;

    // Create row
    const row = new Row({
      gridId,
      rowId,
      position: rowPosition,
      cells: cells || {},
      metadata: {
        createdAt: new Date(),
      },
    });

    await row.save();

    // Update grid total rows
    grid.totalRows += 1;
    await grid.save();

    res.json({
      id: rowId,
      cells: cells || {},
      position: rowPosition,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /grids/:gridId/rows/:rowId - Update a row
router.put('/grids/:gridId/rows/:rowId', async (req: Request, res: Response) => {
  try {
    const { gridId, rowId } = req.params;
    const { cells } = req.body;

    const row = await Row.findOne({ gridId, rowId });
    if (!row) {
      return res.status(404).json({ error: 'Row not found' });
    }

    // Merge cells
    row.cells = { ...row.cells, ...cells };
    row.metadata = row.metadata || {};
    row.metadata.updatedAt = new Date();

    await row.save();

    res.json({
      id: rowId,
      cells: row.cells,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /grids/:gridId/rows/:rowId - Delete a row
router.delete('/grids/:gridId/rows/:rowId', async (req: Request, res: Response) => {
  try {
    const { gridId, rowId } = req.params;

    const row = await Row.findOneAndDelete({ gridId, rowId });
    if (!row) {
      return res.status(404).json({ error: 'Row not found' });
    }

    // Update grid total rows
    await Grid.findByIdAndUpdate(gridId, { $inc: { totalRows: -1 } });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /grids/:gridId/rows/bulk-update - Bulk update rows
router.post('/grids/:gridId/rows/bulk-update', async (req: Request, res: Response) => {
  try {
    const { gridId } = req.params;
    const { updates } = req.body; // [{ rowId, cells }, ...]

    const results = [];
    for (const update of updates) {
      const row = await Row.findOne({ gridId, rowId: update.rowId });
      if (row) {
        // Handle both Map and plain object cases
        if (row.cells instanceof Map) {
          Object.entries(update.cells).forEach(([key, value]) => {
            row.cells.set(key, value);
          });
        } else {
          const cellsObj = row.cells ? Object.fromEntries(Object.entries(row.cells)) : {};
          Object.assign(cellsObj, update.cells);
          row.cells = cellsObj as any;
        }
        
        // Update metadata
        if (row.metadata instanceof Map) {
          row.metadata.set('updatedAt', new Date().toISOString());
        } else {
          const metadataObj = row.metadata ? Object.fromEntries(Object.entries(row.metadata)) : {};
          metadataObj.updatedAt = new Date().toISOString();
          row.metadata = metadataObj as any;
        }
        
        // Mark as modified
        row.markModified('cells');
        row.markModified('metadata');
        
        await row.save();
        
        const cellsResult = row.cells instanceof Map ? Object.fromEntries(row.cells) : row.cells;
        results.push({ id: row.rowId, cells: cellsResult });
      }
    }

    res.json({ results });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /grids/:gridId/rows/bulk-delete - Bulk delete rows
router.post('/grids/:gridId/rows/bulk-delete', async (req: Request, res: Response) => {
  try {
    const { gridId } = req.params;
    const { rowIds } = req.body; // [rowId1, rowId2, ...]

    const result = await Row.deleteMany({ gridId, rowId: { $in: rowIds } });

    // Update grid total rows
    await Grid.findByIdAndUpdate(gridId, { $inc: { totalRows: -result.deletedCount } });

    res.json({ deletedCount: result.deletedCount });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== COLUMN OPERATIONS ====================

// POST /grids/:gridId/columns - Add a column
router.post('/grids/:gridId/columns', async (req: Request, res: Response) => {
  try {
    const { gridId } = req.params;
    const column = req.body;

    const grid = await Grid.findById(gridId);
    if (!grid) {
      return res.status(404).json({ error: 'Grid not found' });
    }

    // Add column
    column.position = grid.columns.length;
    grid.columns.push(column);
    await grid.save();

    res.json(column);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /grids/:gridId/columns/:columnId - Update a column
router.put('/grids/:gridId/columns/:columnId', async (req: Request, res: Response) => {
  try {
    const { gridId, columnId } = req.params;
    const changes = req.body;

    const grid = await Grid.findById(gridId);
    if (!grid) {
      return res.status(404).json({ error: 'Grid not found' });
    }

    const column = grid.columns.find((c) => c.id === columnId);
    if (!column) {
      return res.status(404).json({ error: 'Column not found' });
    }

    // Update column
    Object.assign(column, changes);
    await grid.save();

    res.json(column);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /grids/:gridId/columns/:columnId - Delete a column
router.delete('/grids/:gridId/columns/:columnId', async (req: Request, res: Response) => {
  try {
    const { gridId, columnId } = req.params;

    const grid = await Grid.findById(gridId);
    if (!grid) {
      return res.status(404).json({ error: 'Grid not found' });
    }

    // Remove column
    grid.columns = grid.columns.filter((c) => c.id !== columnId);
    await grid.save();

    // Remove column data from all rows
    await Row.updateMany(
      { gridId },
      { $unset: { [`cells.${columnId}`]: '' } }
    );

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /grids/:gridId/columns/reorder - Reorder columns
router.post('/grids/:gridId/columns/reorder', async (req: Request, res: Response) => {
  try {
    const { gridId } = req.params;
    const { order } = req.body; // [col1, col2, col3, ...]

    const grid = await Grid.findById(gridId);
    if (!grid) {
      return res.status(404).json({ error: 'Grid not found' });
    }

    // Reorder columns based on order array
    const reorderedColumns = order.map((colId: string, index: number) => {
      const col = grid.columns.find((c) => c.id === colId);
      if (col) {
        col.position = index;
        return col;
      }
    }).filter(Boolean);

    grid.columns = reorderedColumns as any;
    await grid.save();

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== CELL OPERATIONS ====================

// PUT /grids/:gridId/cells - Update a single cell
router.put('/grids/:gridId/cells', async (req: Request, res: Response) => {
  try {
    const { gridId } = req.params;
    const { rowId, columnId, value } = req.body;

    const row = await Row.findOne({ gridId, rowId });
    if (!row) {
      return res.status(404).json({ error: 'Row not found' });
    }

    // Handle both Map and plain object cases
    if (row.cells instanceof Map) {
      row.cells.set(columnId, value);
    } else {
      // Convert to object, update, and reassign
      const cellsObj = row.cells ? Object.fromEntries(Object.entries(row.cells)) : {};
      cellsObj[columnId] = value;
      row.cells = cellsObj as any;
    }
    
    // Update metadata
    if (row.metadata instanceof Map) {
      row.metadata.set('updatedAt', new Date().toISOString());
    } else {
      const metadataObj = row.metadata ? Object.fromEntries(Object.entries(row.metadata)) : {};
      metadataObj.updatedAt = new Date().toISOString();
      row.metadata = metadataObj as any;
    }
    
    // Explicitly mark as modified to ensure Mongoose saves the change
    row.markModified('cells');
    row.markModified('metadata');
    
    await row.save();

    console.log(`✅ Updated cell ${columnId} for row ${rowId} in grid ${gridId} with value:`, value);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Cell update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /grids/:gridId/cells/bulk-update - Bulk update cells
router.post('/grids/:gridId/cells/bulk-update', async (req: Request, res: Response) => {
  try {
    const { gridId } = req.params;
    const { updates } = req.body; // [{ rowId, columnId, value }, ...]

    for (const update of updates) {
      await Row.updateOne(
        { gridId, rowId: update.rowId },
        { 
          $set: { 
            [`cells.${update.columnId}`]: update.value,
            'metadata.updatedAt': new Date(),
          }
        }
      );
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ENRICHMENT ENDPOINTS ====================

// POST /enrich/find-email - Find work email
router.post('/enrich/find-email', async (req: Request, res: Response) => {
  try {
    const { gridId, rowIds, firstName, lastName, company, domain, targetColumn } = req.body;

    // Create job
    const job = new EnrichmentJob({
      gridId,
      rowIds,
      operation: 'find_email',
      config: { firstName, lastName, company, domain, targetColumn },
      status: 'pending',
      progress: { total: rowIds.length, completed: 0, failed: 0, percentage: 0 },
      results: [],
    });

    await job.save();

    // Process in background (simplified - no real queue for POC)
    processEnrichmentJob(job._id.toString(), 'email');

    res.json({
      jobId: job._id.toString(),
      status: 'processing',
      message: `Finding emails for ${rowIds.length} contacts...`,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /enrich/company-details - Enrich company
router.post('/enrich/company-details', async (req: Request, res: Response) => {
  try {
    const { gridId, rowIds, domain, company, outputs } = req.body;

    const job = new EnrichmentJob({
      gridId,
      rowIds,
      operation: 'company_details',
      config: { domain, company, outputs },
      status: 'pending',
      progress: { total: rowIds.length, completed: 0, failed: 0, percentage: 0 },
      results: [],
    });

    await job.save();

    processEnrichmentJob(job._id.toString(), 'company');

    res.json({
      jobId: job._id.toString(),
      status: 'processing',
      message: `Enriching ${rowIds.length} companies...`,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /enrich/person-details - Enrich person details
router.post('/enrich/person-details', async (req: Request, res: Response) => {
  try {
    const { gridId, rowIds, email, firstName, lastName, outputs } = req.body;

    const job = new EnrichmentJob({
      gridId,
      rowIds,
      operation: 'person_details',
      config: { email, firstName, lastName, outputs },
      status: 'pending',
      progress: { total: rowIds.length, completed: 0, failed: 0, percentage: 0 },
      results: [],
    });

    await job.save();

    processEnrichmentJob(job._id.toString(), 'person');

    res.json({
      jobId: job._id.toString(),
      status: 'processing',
      message: `Enriching ${rowIds.length} people...`,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /enrich/ai-research - AI research
router.post('/enrich/ai-research', async (req: Request, res: Response) => {
  try {
    const { gridId, rowIds, prompt, context, targetColumn } = req.body;

    const job = new EnrichmentJob({
      gridId,
      rowIds,
      operation: 'ai_research',
      config: { prompt, context, targetColumn },
      status: 'pending',
      progress: { total: rowIds.length, completed: 0, failed: 0, percentage: 0 },
      results: [],
    });

    await job.save();

    processEnrichmentJob(job._id.toString(), 'ai_research');

    res.json({
      jobId: job._id.toString(),
      status: 'processing',
      message: `AI researching ${rowIds.length} items...`,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /jobs/:jobId - Get job status
router.get('/jobs/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;

    const job = await EnrichmentJob.findById(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({
      id: job._id.toString(),
      operation: job.operation,
      status: job.status,
      progress: job.progress,
      results: job.results,
      error: job.error,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== BACKGROUND JOB PROCESSOR ====================

async function processEnrichmentJob(jobId: string, type: string) {
  // Run in background (no await)
  setTimeout(async () => {
    try {
      const job = await EnrichmentJob.findById(jobId);
      if (!job) return;

      job.status = 'processing';
      await job.save();

      const results = [];

      for (const rowId of job.rowIds) {
        try {
          // Get row data
          const row = await Row.findOne({ gridId: job.gridId, rowId });
          if (!row) {
            results.push({ rowId, success: false, error: 'Row not found' });
            job.progress.failed += 1;
            continue;
          }

          let enrichedData: any = {};

          // Call appropriate enrichment function
          if (type === 'email') {
            const { firstName, lastName, company, domain, targetColumn } = job.config;
            const firstNameVal = row.cells[firstName];
            const lastNameVal = row.cells[lastName];
            const companyVal = row.cells[company];
            const domainVal = row.cells[domain];

            const result = await enrichment.findEmail({
              firstName: firstNameVal,
              lastName: lastNameVal,
              company: companyVal,
              domain: domainVal,
            });

            enrichedData = { [targetColumn]: result.email };
          } else if (type === 'company') {
            const { domain, company, outputs } = job.config;
            const domainVal = row.cells[domain];
            const companyVal = row.cells[company];

            const result = await enrichment.enrichCompanyDetails({
              domain: domainVal,
              company: companyVal,
            });

            enrichedData = {};
            if (outputs.industry) enrichedData[outputs.industry] = result.industry;
            if (outputs.size) enrichedData[outputs.size] = result.size;
            if (outputs.revenue) enrichedData[outputs.revenue] = result.revenue;
            if (outputs.description) enrichedData[outputs.description] = result.description;
            if (outputs.founded) enrichedData[outputs.founded] = result.founded;
            if (outputs.location) enrichedData[outputs.location] = result.location;
          } else if (type === 'person') {
            const { email, firstName, lastName, outputs } = job.config;
            const emailVal = row.cells[email];
            const firstNameVal = row.cells[firstName];
            const lastNameVal = row.cells[lastName];

            const result = await enrichment.enrichPersonDetails({
              email: emailVal,
              firstName: firstNameVal,
              lastName: lastNameVal,
            });

            enrichedData = {};
            if (outputs.title) enrichedData[outputs.title] = result.title;
            if (outputs.linkedin) enrichedData[outputs.linkedin] = result.linkedin;
            if (outputs.location) enrichedData[outputs.location] = result.location;
            if (outputs.seniority) enrichedData[outputs.seniority] = result.seniority;
            if (outputs.department) enrichedData[outputs.department] = result.department;
          } else if (type === 'ai_research') {
            const { prompt, context, targetColumn } = job.config;
            const contextData: Record<string, any> = {};
            for (const key of context) {
              contextData[key] = row.cells[key];
            }

            const result = await enrichment.aiResearch({ prompt, context: contextData });
            enrichedData = { [targetColumn]: result.result };
          }

          // Update row with enriched data
          row.cells = { ...row.cells, ...enrichedData };
          row.metadata = row.metadata || {};
          row.metadata.updatedAt = new Date();
          await row.save();

          results.push({ rowId, success: true, data: enrichedData });
          job.progress.completed += 1;
        } catch (error: any) {
          results.push({ rowId, success: false, error: error.message });
          job.progress.failed += 1;
        }

        // Update progress
        job.progress.percentage = Math.round((job.progress.completed / job.progress.total) * 100);
        await job.save();
      }

      // Mark job as completed
      job.status = 'completed';
      job.results = results;
      job.completedAt = new Date();
      await job.save();
    } catch (error) {
      console.error('Job processing error:', error);
      const job = await EnrichmentJob.findById(jobId);
      if (job) {
        job.status = 'failed';
        job.error = (error as Error).message;
        await job.save();
      }
    }
  }, 100); // Start processing after 100ms
}

export default router;

