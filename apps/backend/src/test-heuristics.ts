import { AIService } from './services/ai.service';
import { CSVRow } from './types';

const testRows: CSVRow[] = [
  // 1. Valid row
  {
    'Lead Name': 'John Doe',
    'Email Address': 'john.doe@example.com',
    'Phone': '+919876543210',
    'Created At': '2026-05-13 14:20:48',
    'Company': 'GrowEasy',
    'City': 'Mumbai',
    'Status': 'GOOD_LEAD_FOLLOW_UP',
    'Source': 'leads_on_demand'
  },
  // 2. Row with multiple emails/phones
  {
    'name': 'Sarah Johnson',
    'email': 'sarah@example.com, secondary@example.com',
    'mobile': '+11234567890; +19876543210',
    'status': 'won'
  },
  // 3. Invalid row (missing email & phone) - should be skipped
  {
    'name': 'No Contact User',
    'city': 'Delhi'
  }
];

console.log('--- RUNNING HEURISTICS MAPPING TEST ---');
const result = AIService.mapHeuristic(testRows);

console.log('SUCCESSFUL RECORDS:', JSON.stringify(result.successful, null, 2));
console.log('SKIPPED RECORDS:', JSON.stringify(result.skipped, null, 2));

if (result.successful.length === 2 && result.skipped.length === 1) {
  console.log('✅ TEST PASSED: Successfully mapped 2 leads and skipped 1 lead.');
} else {
  console.error('❌ TEST FAILED: Unexpected count of mapped/skipped rows.');
  process.exit(1);
}

// Test status conversion
const statusTest1 = (AIService as any).parseStatus('won');
if (statusTest1 === 'SALE_DONE') {
  console.log('✅ TEST PASSED: Status conversion "won" -> "SALE_DONE"');
} else {
  console.error('❌ TEST FAILED: Status conversion was:', statusTest1);
}

// Test source conversion
const sourceTest1 = (AIService as any).parseSource('meridian tower');
if (sourceTest1 === 'meridian_tower') {
  console.log('✅ TEST PASSED: Source conversion "meridian tower" -> "meridian_tower"');
} else {
  console.error('❌ TEST FAILED: Source conversion was:', sourceTest1);
}
