export interface CSVRow {
  [key: string]: string;
}

export type CRMStatus = 'GOOD_LEAD_FOLLOW_UP' | 'DID_NOT_CONNECT' | 'BAD_LEAD' | 'SALE_DONE';

export type DataSource = 'leads_on_demand' | 'meridian_tower' | 'eden_park' | 'varah_swamy' | 'sarjapur_plots' | '';

export interface CRMRecord {
  created_at: string;
  name: string;
  email: string;
  country_code: string;
  mobile_without_country_code: string;
  company: string;
  city: string;
  state: string;
  country: string;
  lead_owner: string;
  crm_status: CRMStatus;
  crm_note: string;
  data_source: DataSource;
  possession_time: string;
  description: string;
}

export interface ProcessingResult {
  successful: CRMRecord[];
  skipped: { row: CSVRow; reason: string }[];
  metrics: {
    totalRows: number;
    successfulCount: number;
    skippedCount: number;
    processingTimeMs: number;
  };
}

export interface ProgressUpdate {
  stage: 'parsing' | 'ai_mapping' | 'complete';
  percentage: number;
  processed: number;
  total: number;
}
