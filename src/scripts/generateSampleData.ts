import { generateEventLog } from '../utils/dataGenerator';

// Generate small dataset (200 cases)
const smallDataset = generateEventLog({
  totalCases: 200,
  seed: 12345
});

// Generate medium dataset (2000 cases)
const mediumDataset = generateEventLog({
  totalCases: 2000,
  seed: 54321
});

// Export to console as JSON for manual saving
console.log('=== SMALL DATASET (200 cases) ===');
console.log(JSON.stringify(smallDataset, null, 2));

console.log('\n\n=== MEDIUM DATASET (2000 cases) ===');
console.log(JSON.stringify(mediumDataset, null, 2));