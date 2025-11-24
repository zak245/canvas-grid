import mongoose, { Schema, Document } from 'mongoose';

// ==================== GRID MODEL ====================

export interface IColumn {
  id: string;
  title: string;
  width: number;
  type: 'text' | 'number' | 'date' | 'boolean' | 'email' | 'url' | 'ai';
  format?: Record<string, any>;
  visible: boolean;
  position: number;
  aiConfig?: {
    prompt: string;
    model: string;
  };
}

export interface IGrid extends Document {
  name: string;
  columns: IColumn[];
  totalRows: number;
  settings: {
    defaultRowHeight: number;
    sorting?: {
      columnId: string;
      direction: 'asc' | 'desc';
    };
    filtering?: any[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const ColumnSchema = new Schema<IColumn>({
  id: { type: String, required: true },
  title: { type: String, required: true },
  width: { type: Number, required: true },
  type: { type: String, required: true },
  format: { type: Schema.Types.Mixed },
  visible: { type: Boolean, default: true },
  position: { type: Number, required: true },
  aiConfig: {
    prompt: String,
    model: String,
  },
}, { _id: false });

const GridSchema = new Schema<IGrid>({
  name: { type: String, required: true },
  columns: [ColumnSchema],
  totalRows: { type: Number, default: 0 },
  settings: {
    defaultRowHeight: { type: Number, default: 32 },
    sorting: {
      columnId: String,
      direction: { type: String, enum: ['asc', 'desc'] },
    },
    filtering: [Schema.Types.Mixed],
  },
}, { timestamps: true });

export const Grid = mongoose.model<IGrid>('Grid', GridSchema);

// ==================== ROW MODEL ====================

export interface IRow extends Document {
  gridId: mongoose.Types.ObjectId;
  rowId: string; // Client-side ID for consistency
  position: number;
  cells: Record<string, any>; // Flexible! Can be anything
  metadata?: {
    createdAt?: Date;
    updatedAt?: Date;
    createdBy?: string;
    tags?: string[];
    notes?: string;
  };
}

const RowSchema = new Schema<IRow>({
  gridId: { type: Schema.Types.ObjectId, ref: 'Grid', required: true, index: true },
  rowId: { type: String, required: true, unique: true },
  position: { type: Number, required: true },
  cells: { type: Schema.Types.Mixed, default: {} }, // THE KEY: Flexible storage
  metadata: {
    createdAt: Date,
    updatedAt: Date,
    createdBy: String,
    tags: [String],
    notes: String,
  },
}, { timestamps: true });

// Index for efficient queries
RowSchema.index({ gridId: 1, position: 1 });

export const Row = mongoose.model<IRow>('Row', RowSchema);

// ==================== ENRICHMENT JOB MODEL ====================

export interface IEnrichmentJob extends Document {
  gridId: mongoose.Types.ObjectId;
  rowIds: string[];
  operation: string;
  config: {
    sourceColumns?: Record<string, string>;
    targetColumn?: string;
    targetColumns?: Record<string, string>;
    provider?: string;
    prompt?: string;
    [key: string]: any;
  };
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: {
    total: number;
    completed: number;
    failed: number;
    percentage: number;
  };
  results: Array<{
    rowId: string;
    success: boolean;
    data?: any;
    error?: string;
  }>;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

const EnrichmentJobSchema = new Schema<IEnrichmentJob>({
  gridId: { type: Schema.Types.ObjectId, ref: 'Grid', required: true, index: true },
  rowIds: [{ type: String, required: true }],
  operation: { type: String, required: true },
  config: { type: Schema.Types.Mixed, required: true },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
    index: true,
  },
  progress: {
    total: { type: Number, default: 0 },
    completed: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
  },
  results: [{
    rowId: String,
    success: Boolean,
    data: Schema.Types.Mixed,
    error: String,
  }],
  error: String,
  completedAt: Date,
}, { timestamps: true });

export const EnrichmentJob = mongoose.model<IEnrichmentJob>('EnrichmentJob', EnrichmentJobSchema);

