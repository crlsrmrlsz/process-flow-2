import fs from 'fs';
import path from 'path';
import { generateEventLog } from './src/utils/dataGenerator.js';

// Generate fixed dataset with 3875 samples
const config = {
  totalCases: 3875,
  seed: 42 // Fixed seed for reproducible results
};

console.log('Generating fixed dataset with 3875 samples...');
const eventLog = generateEventLog(config);

console.log(`Generated ${eventLog.events.length} events for ${eventLog.metadata.total_cases} cases`);

// Write to fixed location
const outputPath = './src/data/fixed-dataset.json';
const outputDir = path.dirname(outputPath);

// Ensure directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(outputPath, JSON.stringify(eventLog, null, 2));
console.log(`Fixed dataset saved to ${outputPath}`);