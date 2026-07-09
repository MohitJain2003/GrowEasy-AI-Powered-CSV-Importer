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
  crm_status: 'GOOD_LEAD_FOLLOW_UP' | 'DID_NOT_CONNECT' | 'BAD_LEAD' | 'SALE_DONE';
  crm_note: string;
  data_source: 'leads_on_demand' | 'meridian_tower' | 'eden_park' | 'varah_swamy' | 'sarjapur_plots' | '';
  possession_time: string;
  description: string;
}

export interface ProcessingResult {
  successful: CRMRecord[];
  skipped: { row: Record<string, string>; reason: string }[];
  metrics: {
    totalRows: number;
    successfulCount: number;
    skippedCount: number;
    processingTimeMs: number;
  };
}

export interface UploadResponse {
  filename: string;
  totalRows: number;
  rows: Record<string, string>[];
}

const BACKEND_URL = '/api/backend';

export async function uploadCSV(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${BACKEND_URL}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to upload CSV file.');
  }

  return response.json();
}

export async function processCSVRows(rows: Record<string, string>[]): Promise<ProcessingResult> {
  const response = await fetch(`${BACKEND_URL}/process`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ rows }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'AI processing failed.');
  }

  return response.json();
}
