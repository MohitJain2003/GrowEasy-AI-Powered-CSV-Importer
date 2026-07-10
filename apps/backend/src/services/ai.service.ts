import { GoogleGenerativeAI } from '@google/generative-ai';
import { CSVRow, CRMRecord, CRMStatus, DataSource } from '../types';

export class AIService {
  private static disabledProviders = new Set<string>();

  private static parseStatus(statusStr: string): CRMStatus {
    const s = statusStr?.toUpperCase().trim();
    if (s?.includes('GOOD') || s?.includes('FOLLOW') || s?.includes('UP')) return 'GOOD_LEAD_FOLLOW_UP';
    if (s?.includes('CONNECT') || s?.includes('NOT')) return 'DID_NOT_CONNECT';
    if (s?.includes('BAD') || s?.includes('JUNK')) return 'BAD_LEAD';
    if (s?.includes('SALE') || s?.includes('DONE') || s?.includes('WON') || s?.includes('CLOSE')) return 'SALE_DONE';
    return 'GOOD_LEAD_FOLLOW_UP'; // default fallback
  }

  private static parseSource(sourceStr: string): DataSource {
    const s = sourceStr?.toLowerCase().trim();
    if (s?.includes('demand')) return 'leads_on_demand';
    if (s?.includes('meridian') || s?.includes('tower')) return 'meridian_tower';
    if (s?.includes('eden') || s?.includes('park')) return 'eden_park';
    if (s?.includes('varah') || s?.includes('swamy')) return 'varah_swamy';
    if (s?.includes('sarjapur') || s?.includes('plots')) return 'sarjapur_plots';
    return ''; // leave blank if no match
  }

  /**
   * Cleans and splits mobile number and country code.
   */
  private static parsePhone(phoneStr: string): { countryCode: string; mobile: string } {
    if (!phoneStr) return { countryCode: '', mobile: '' };
    // Remove non-numeric characters except leading '+'
    const clean = phoneStr.trim().replace(/[^\d+]/g, '');
    if (clean.startsWith('+')) {
      // Common country codes (e.g. +91)
      if (clean.startsWith('+91')) return { countryCode: '+91', mobile: clean.substring(3) };
      if (clean.startsWith('+1')) return { countryCode: '+1', mobile: clean.substring(2) };
      // Generic prefix detection
      return { countryCode: clean.substring(0, 3), mobile: clean.substring(3) };
    }
    if (clean.length === 10) {
      return { countryCode: '+91', mobile: clean }; // Default to India for 10-digit numbers as in PDF example
    }
    if (clean.length > 10) {
      const diff = clean.length - 10;
      return { countryCode: `+${clean.substring(0, diff)}`, mobile: clean.substring(diff) };
    }
    return { countryCode: '', mobile: clean };
  }

  /**
   * Formats a date string into an ISO format that Date() can parse.
   */
  private static parseDate(dateStr: string): string {
    if (!dateStr) return new Date().toISOString();
    try {
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
    } catch {}
    return new Date().toISOString();
  }

  /**
   * Dynamic local heuristic mapping when AI keys are missing.
   * This matches headers using common naming patterns.
   */
  public static mapHeuristic(rows: CSVRow[]): { successful: CRMRecord[]; skipped: { row: CSVRow; reason: string }[] } {
    const successful: CRMRecord[] = [];
    const skipped: { row: CSVRow; reason: string }[] = [];

    for (const row of rows) {
      // Find headers mapping
      let name = '';
      let email = '';
      let phone = '';
      let created_at = '';
      let company = '';
      let city = '';
      let state = '';
      let country = '';
      let lead_owner = '';
      let crm_status: CRMStatus = 'GOOD_LEAD_FOLLOW_UP';
      let crm_note = '';
      let data_source: DataSource = '';
      let possession_time = '';
      let description = '';

      const notesArr: string[] = [];

      for (const [key, val] of Object.entries(row)) {
        const k = key.toLowerCase().trim();
        const v = val?.trim() || '';

        if (!v) continue;

        if (k.includes('name') || k === 'first' || k === 'lead') {
          name = name ? `${name} ${v}` : v;
        } else if (k.includes('email') || k === 'mail') {
          if (!email) {
            email = v;
          } else {
            notesArr.push(`Extra email: ${v}`);
          }
        } else if (k.includes('phone') || k.includes('mobile') || k.includes('contact') || k.includes('number')) {
          if (!phone) {
            phone = v;
          } else {
            notesArr.push(`Extra phone: ${v}`);
          }
        } else if (k.includes('created') || k.includes('date') || k.includes('time')) {
          created_at = v;
        } else if (k.includes('company') || k === 'org' || k === 'firm') {
          company = v;
        } else if (k.includes('city') || k === 'town') {
          city = v;
        } else if (k.includes('state') || k === 'province') {
          state = v;
        } else if (k.includes('country') || k === 'nation') {
          country = v;
        } else if (k.includes('owner') || k.includes('assigned')) {
          lead_owner = v;
        } else if (k.includes('status') || k.includes('lead_status')) {
          crm_status = this.parseStatus(v);
        } else if (k.includes('source') || k.includes('origin')) {
          data_source = this.parseSource(v);
        } else if (k.includes('possession') || k.includes('handover')) {
          possession_time = v;
        } else if (k.includes('desc') || k.includes('about') || k.includes('info')) {
          description = v;
        } else if (k.includes('note') || k.includes('remark') || k.includes('comment')) {
          notesArr.push(v);
        } else {
          notesArr.push(`${key}: ${v}`);
        }
      }

      // Validation rule: Skip if neither email nor mobile is present
      if (!email && !phone) {
        skipped.push({
          row,
          reason: 'Record skipped: contains neither email nor mobile number.'
        });
        continue;
      }

      const { countryCode, mobile } = this.parsePhone(phone);

      successful.push({
        created_at: this.parseDate(created_at),
        name: name || 'Anonymous Lead',
        email,
        country_code: countryCode,
        mobile_without_country_code: mobile,
        company,
        city,
        state,
        country,
        lead_owner: lead_owner || 'Unassigned',
        crm_status,
        crm_note: notesArr.join('; '),
        data_source,
        possession_time,
        description
      });
    }

    return { successful, skipped };
  }

  public static async mapWithAI(rows: CSVRow[]): Promise<{ successful: CRMRecord[]; skipped: { row: CSVRow; reason: string }[] }> {
    this.disabledProviders.clear();
    const BATCH_SIZE = 5; // Safe default batch size to prevent JSON truncation and rate limit exhausts
    const batches: CSVRow[][] = [];
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      batches.push(rows.slice(i, i + BATCH_SIZE));
    }

    const successful: CRMRecord[] = [];
    const skipped: { row: CSVRow; reason: string }[] = [];

    console.log(`Starting Resilient AI extraction on ${rows.length} rows in ${batches.length} batches (size 5)...`);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`Processing batch ${i + 1}/${batches.length} containing ${batch.length} rows...`);
      const batchResult = await this.mapBatchWithFallbacks(batch);
      successful.push(...batchResult.successful);
      skipped.push(...batchResult.skipped);
    }

    return { successful, skipped };
  }

  private static async mapBatchWithFallbacks(batch: CSVRow[]): Promise<{ successful: CRMRecord[]; skipped: { row: CSVRow; reason: string }[] }> {
    const result = await this.mapResilientBatch(batch);
    return this.reconcileBatch(batch, result);
  }

  private static async mapResilientBatch(batch: CSVRow[], depth = 0): Promise<{ successful: CRMRecord[]; skipped: { row: CSVRow; reason: string }[] }> {
    if (batch.length === 0) return { successful: [], skipped: [] };

    try {
      const result = await this.executeBatchWithFallbacks(batch);
      if (result.successful.length === 0 && result.skipped.length === 0) {
        throw new Error('AI response returned empty payload.');
      }
      return result;
    } catch (err: any) {
      console.warn(`ResilientBatch: batch of size ${batch.length} failed at depth ${depth}. Error: ${err.message}`);
      
      if (batch.length > 1) {
        const mid = Math.floor(batch.length / 2);
        const left = batch.slice(0, mid);
        const right = batch.slice(mid);
        console.log(`ResilientBatch: Splitting failed batch of ${batch.length} -> Left: ${left.length}, Right: ${right.length}`);

        const leftRes = await this.mapResilientBatch(left, depth + 1);
        const rightRes = await this.mapResilientBatch(right, depth + 1);

        return {
          successful: [...leftRes.successful, ...rightRes.successful],
          skipped: [...leftRes.skipped, ...rightRes.skipped]
        };
      }

      console.warn(`ResilientBatch: Single-record batch failed. Rescuing via heuristics...`);
      return this.mapHeuristic(batch);
    }
  }

  private static async executeBatchWithFallbacks(batch: CSVRow[]): Promise<{ successful: CRMRecord[]; skipped: { row: CSVRow; reason: string }[] }> {
    const geminiKey = !this.disabledProviders.has('gemini') ? process.env.GEMINI_API_KEY : null;
    const groqKey = !this.disabledProviders.has('groq') ? process.env.GROQ_API_KEY : null;
    const sambanovaKey = !this.disabledProviders.has('sambanova') ? process.env.SAMBANOVA_API_KEY : null;
    const cerebrasKey = !this.disabledProviders.has('cerebras') ? process.env.CEREBRAS_API_KEY : null;

    // Check if any keys are present
    if (!geminiKey && !groqKey && !sambanovaKey && !cerebrasKey) {
      console.log('No active AI keys detected for batch, running heuristics...');
      // Simulate slight network processing latency
      await new Promise(resolve => setTimeout(resolve, 800));
      return this.mapHeuristic(batch);
    }

    // 1. Try Groq (Llama-3.1-8b-instant)
    if (groqKey) {
      try {
        return await this.mapWithGroq(batch, groqKey);
      } catch (err: any) {
        console.warn(`Groq failed for batch, trying next fallback. Error: ${err.message}`);
        this.disabledProviders.add('groq'); // Disable for session immediately on first failure

        // Resilient Fail-Fast: If Groq failed due to a network connection timeout or abort,
        // perform a quick internet check to see if the environment is actually offline.
        const errMsg = String(err.message || '').toLowerCase();
        if (errMsg.includes('timed out') || errMsg.includes('fetch failed') || errMsg.includes('aborted') || errMsg.includes('timeout')) {
          try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 1200);
            await fetch('https://www.google.com', { method: 'HEAD', signal: controller.signal });
            clearTimeout(timer);
            console.log('Internet connection is active. Keeping other AI models enabled for best results.');
          } catch (netErr) {
            console.warn('Network is offline. Disabling all other AI models to prevent timeout cascades.');
            this.disabledProviders.add('sambanova');
            this.disabledProviders.add('cerebras');
            this.disabledProviders.add('gemini');
          }
        }
      }
    }

    // 2. Try SambaNova (Meta-Llama-3.1-8B-Instruct)
    if (sambanovaKey) {
      try {
        return await this.mapWithSambaNova(batch, sambanovaKey);
      } catch (err: any) {
        console.warn(`SambaNova failed for batch, trying next fallback. Error: ${err.message}`);
        this.disabledProviders.add('sambanova'); // Disable for session immediately on first failure
      }
    }

    // 3. Try Cerebras (Llama3.1-8b)
    if (cerebrasKey) {
      try {
        return await this.mapWithCerebras(batch, cerebrasKey);
      } catch (err: any) {
        console.warn(`Cerebras failed for batch, trying next fallback. Error: ${err.message}`);
        this.disabledProviders.add('cerebras'); // Disable for session immediately on first failure
      }
    }

    // 4. Try Gemini (Primary fallback)
    if (geminiKey) {
      try {
        return await this.mapWithGemini(batch, geminiKey);
      } catch (err: any) {
        console.warn(`Gemini failed for batch, trying next fallback. Error: ${err.message}`);
        this.disabledProviders.add('gemini'); // Disable for session immediately on first failure
      }
    }

    // 6. Heuristics fallback
    console.warn('All AI API providers failed for batch, falling back to local heuristics.');
    return this.mapHeuristic(batch);
  }

  private static async mapWithGemini(rows: CSVRow[], apiKey: string): Promise<{ successful: CRMRecord[]; skipped: { row: CSVRow; reason: string }[] }> {
    const ai = new GoogleGenerativeAI(apiKey);
    const modelsToTry = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro', 'gemini-1.0-pro'];
    const prompt = this.buildPrompt(rows);

    let lastError: any = null;
    for (const modelName of modelsToTry) {
      try {
        console.log(`Attempting Gemini model: ${modelName}...`);
        const model = ai.getGenerativeModel({ model: modelName });
        // Use a Promise.race to abort hanging Google GenAI calls after 2.5 seconds
        const resultPromise = model.generateContent(prompt);
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Gemini request timed out')), 2500)
        );
        const result = await Promise.race([resultPromise, timeoutPromise]);
        
        const response = await result.response;
        const text = response.text();
        if (text) {
          console.log(`Success with Gemini model: ${modelName}`);
          return this.parseAIResponse(text, rows);
        }
      } catch (err: any) {
        console.warn(`Failed with model ${modelName}: ${err.message}`);
        const errMsg = String(err.message || '').toLowerCase();
        if (errMsg.includes('not found') || errMsg.includes('api key') || errMsg.includes('403') || errMsg.includes('404') || errMsg.includes('invalid')) {
          console.warn(`Gemini returned fatal error. Disabling Gemini for this session.`);
          this.disabledProviders.add('gemini');
          throw err;
        }
        lastError = err;
      }
    }
    throw lastError || new Error('All Gemini models failed to respond.');
  }



  private static async mapWithGroq(rows: CSVRow[], apiKey: string): Promise<{ successful: CRMRecord[]; skipped: { row: CSVRow; reason: string }[] }> {
    console.log('Attempting Groq model: llama-3.1-8b-instant...');
    const response = await this.fetchWithRetry('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'You are an AI data mapper that standardizes raw CSV datasets into a CRM format.'
          },
          {
            role: 'user',
            content: this.buildPrompt(rows)
          }
        ]
      })
    });

    if (!response.ok) {
      if (response.status === 404 || response.status === 410 || response.status === 401 || response.status === 403) {
        console.warn(`Groq returned fatal status ${response.status}. Disabling Groq for this session.`);
        this.disabledProviders.add('groq');
      }
      throw new Error(`Groq API returned status ${response.status}`);
    }

    const data = (await response.json()) as any;
    const text = data.choices[0].message.content;
    console.log('Success with Groq model: llama-3.1-8b-instant');
    return this.parseAIResponse(text, rows);
  }

  private static async mapWithSambaNova(rows: CSVRow[], apiKey: string): Promise<{ successful: CRMRecord[]; skipped: { row: CSVRow; reason: string }[] }> {
    console.log('Attempting SambaNova model: Meta-Llama-3.1-8B-Instruct...');
    const response = await this.fetchWithRetry('https://api.sambanova.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'Meta-Llama-3.1-8B-Instruct',
        messages: [
          {
            role: 'system',
            content: 'You are an AI data mapper that standardizes raw CSV datasets into a CRM format. You MUST respond with a valid JSON object only.'
          },
          {
            role: 'user',
            content: this.buildPrompt(rows)
          }
        ]
      })
    });

    if (!response.ok) {
      if (response.status === 404 || response.status === 410 || response.status === 401 || response.status === 403) {
        console.warn(`SambaNova returned fatal status ${response.status}. Disabling SambaNova for this session.`);
        this.disabledProviders.add('sambanova');
      }
      throw new Error(`SambaNova API returned status ${response.status}`);
    }

    const data = (await response.json()) as any;
    const text = data.choices[0].message.content;
    console.log('Success with SambaNova model: Meta-Llama-3.1-8B-Instruct');
    return this.parseAIResponse(text, rows);
  }

  private static async mapWithCerebras(rows: CSVRow[], apiKey: string): Promise<{ successful: CRMRecord[]; skipped: { row: CSVRow; reason: string }[] }> {
    console.log('Attempting Cerebras model: llama3.1-8b...');
    const response = await this.fetchWithRetry('https://api.cerebras.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama3.1-8b',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'You are an AI data mapper that standardizes raw CSV datasets into a CRM format.'
          },
          {
            role: 'user',
            content: this.buildPrompt(rows)
          }
        ]
      })
    });

    if (!response.ok) {
      if (response.status === 404 || response.status === 410 || response.status === 401 || response.status === 403) {
        console.warn(`Cerebras returned fatal status ${response.status}. Disabling Cerebras for this session.`);
        this.disabledProviders.add('cerebras');
      }
      throw new Error(`Cerebras API returned status ${response.status}`);
    }

    const data = (await response.json()) as any;
    const text = data.choices[0].message.content;
    console.log('Success with Cerebras model: llama3.1-8b');
    return this.parseAIResponse(text, rows);
  }

  private static buildPrompt(rows: CSVRow[]): string {
    return `
You are standardizing raw CSV datasets into a CRM format.

### Target Schema Definition:
Each record should match this JSON format:
{
  "created_at": "ISO 8601 Date string",
  "name": "Full name of the lead",
  "email": "Primary email",
  "country_code": "Phone country code (e.g. +91)",
  "mobile_without_country_code": "Mobile number only (without country code)",
  "company": "Company name",
  "city": "City name",
  "state": "State name",
  "country": "Country name",
  "lead_owner": "Assigned lead owner",
  "crm_status": "CRM Status string",
  "crm_note": "Consolidated notes/remarks",
  "data_source": "Data source code",
  "possession_time": "Property possession time",
  "description": "Additional description"
}

### CRITICAL Business Rules:
1. "crm_status" MUST only be one of:
   - "GOOD_LEAD_FOLLOW_UP"
   - "DID_NOT_CONNECT"
   - "BAD_LEAD"
   - "SALE_DONE"
2. "data_source" MUST only be one of:
   - "leads_on_demand"
   - "meridian_tower"
   - "eden_park"
   - "varah_swamy"
   - "sarjapur_plots"
   (leave empty string if none match confidently)
3. If multiple emails exist: use the first email, and append remaining emails into "crm_note".
4. If multiple mobile numbers exist: use the first mobile, and append remaining mobile numbers into "crm_note".
5. If a record contains NEITHER email NOR mobile number, you MUST SKIP IT (indicate the skip in your response).

### Input CSV Rows to Map:
${JSON.stringify(rows, null, 2)}

### Output Format:
Return a JSON object with two arrays:
{
  "successful": [
     // Array of standard CRM records matching Target Schema
  ],
  "skipped": [
     {
       "row": { ... }, // The original CSV row
       "reason": "Why the row was skipped (e.g. Missing both email and mobile)"
     }
  ]
}
Ensure output is ONLY the raw JSON object. Do not include markdown wraps.
`;
  }

  private static parseAIResponse(text: string, originalRows: CSVRow[]): { successful: CRMRecord[]; skipped: { row: CSVRow; reason: string }[] } {
    try {
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      if (parsed && Array.isArray(parsed.successful)) {
        return {
          successful: parsed.successful.map((item: any) => ({
            created_at: this.parseDate(item.created_at),
            name: item.name || 'Anonymous Lead',
            email: item.email || '',
            country_code: item.country_code || '',
            mobile_without_country_code: item.mobile_without_country_code || '',
            company: item.company || '',
            city: item.city || '',
            state: item.state || '',
            country: item.country || '',
            lead_owner: item.lead_owner || '',
            crm_status: this.parseStatus(item.crm_status),
            crm_note: item.crm_note || '',
            data_source: this.parseSource(item.data_source),
            possession_time: item.possession_time || '',
            description: item.description || ''
          })),
          skipped: parsed.skipped || []
        };
      }
    } catch (e) {
      console.warn('AI output parsing failed, running heuristic parser fallback.');
    }
    return this.mapHeuristic(originalRows);
  }

  private static reconcileBatch(batch: CSVRow[], result: { successful: CRMRecord[]; skipped: { row: CSVRow; reason: string }[] }): { successful: CRMRecord[]; skipped: { row: CSVRow; reason: string }[] } {
    const finalSuccessful = [...result.successful];
    const finalSkipped = [...result.skipped];
    const matchedInputRows = new Set<CSVRow>();

    const sMatch = (a: any, b: any): boolean => {
      if (!a || !b) return false;
      const sa = String(a).toLowerCase().replace(/[^a-z0-9]/g, '');
      const sb = String(b).toLowerCase().replace(/[^a-z0-9]/g, '');
      return sa === sb || sa.includes(sb) || sb.includes(sa);
    };

    // Helper to match skipped rows back to the original CSVRow object
    const findSkippedMatch = (skipRow: any): CSVRow | undefined => {
      if (!skipRow) return undefined;
      // First, try reference equality in case it came from heuristics
      if (batch.includes(skipRow) && !matchedInputRows.has(skipRow)) {
        return skipRow;
      }
      // Otherwise, match by field similarity
      let bestMatch: CSVRow | undefined = undefined;
      let maxMatchCount = -1;
      for (const row of batch) {
        if (matchedInputRows.has(row)) continue;
        let matchCount = 0;
        for (const [k, v] of Object.entries(skipRow)) {
          if (v === undefined || v === null || v === '') continue;
          if (String(row[k] || '').toLowerCase() === String(v).toLowerCase()) {
            matchCount++;
          }
        }
        if (matchCount > maxMatchCount && matchCount > 0) {
          maxMatchCount = matchCount;
          bestMatch = row;
        }
      }
      return bestMatch;
    };

    // Helper to match successful CRM records back to original CSVRow object
    const findSuccessMatch = (succ: CRMRecord): CSVRow | undefined => {
      let bestMatch: CSVRow | undefined = undefined;
      let maxScore = -1;
      for (const row of batch) {
        if (matchedInputRows.has(row)) continue;
        let score = 0;
        const values = Object.values(row).map(v => String(v || '').toLowerCase().replace(/[^a-z0-9]/g, ''));
        
        const cleanEmail = succ.email?.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanMobile = succ.mobile_without_country_code?.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanName = succ.name?.toLowerCase().replace(/[^a-z0-9]/g, '');

        if (cleanEmail && values.some(v => v.includes(cleanEmail) || cleanEmail.includes(v))) {
          score += 10;
        }
        if (cleanMobile && values.some(v => v.includes(cleanMobile) || cleanMobile.includes(v))) {
          score += 10;
        }
        if (cleanName && values.some(v => v.includes(cleanName) || cleanName.includes(v))) {
          score += 5;
        }

        if (score > maxScore && score > 0) {
          maxScore = score;
          bestMatch = row;
        }
      }
      return bestMatch;
    };

    // 1. Match skipped records
    for (const skip of result.skipped) {
      const match = findSkippedMatch(skip.row);
      if (match) {
        matchedInputRows.add(match);
      }
    }

    // 2. Match successful records
    for (const succ of result.successful) {
      const match = findSuccessMatch(succ);
      if (match) {
        matchedInputRows.add(match);
      }
    }

    // 3. Any row in the batch that is NOT matched is missing!
    const missingRows = batch.filter(r => !matchedInputRows.has(r));

    if (missingRows.length > 0) {
      console.log(`Reconciliation: ${missingRows.length} rows dropped by LLM. Rescuing via heuristics...`);
      const heuristicRes = this.mapHeuristic(missingRows);
      finalSuccessful.push(...heuristicRes.successful);
      finalSkipped.push(...heuristicRes.skipped);
    }

    return { successful: finalSuccessful, skipped: finalSkipped };
  }

  private static async fetchWithRetry(url: string, options: RequestInit, retries = 1, delay = 300): Promise<Response> {
    for (let i = 0; i < retries; i++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);

        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (response.status === 429) {
          const sleepTime = delay * Math.pow(2, i) + Math.random() * 200;
          console.warn(`HTTP 429 Rate Limit on ${url}. Backing off for ${Math.round(sleepTime)}ms... (Attempt ${i + 1}/${retries})`);
          await new Promise(resolve => setTimeout(resolve, sleepTime));
          continue;
        }
        return response;
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.warn(`Request to ${url} timed out (exceeded 2500ms).`);
        }
        if (i === retries - 1) throw err;
        const sleepTime = delay * Math.pow(2, i) + Math.random() * 200;
        await new Promise(resolve => setTimeout(resolve, sleepTime));
      }
    }
    throw new Error(`Max retries reached for ${url}`);
  }
}
