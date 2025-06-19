"use strict";
// Test dotenv loading
console.log('=== Testing dotenv loading ===');
console.log('Before dotenv:');
console.log('ENVIRONMENT:', process.env.ENVIRONMENT);
console.log('BACKEND:', process.env.BACKEND);
require('dotenv').config({ path: '../.env' });
console.log('\nAfter dotenv:');
console.log('ENVIRONMENT:', process.env.ENVIRONMENT);
console.log('BACKEND:', process.env.BACKEND);
console.log('\nCurrent working directory:', process.cwd());
console.log('__dirname:', __dirname);
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '../.env');
console.log('\n.env file path:', envPath);
console.log('.env file exists:', fs.existsSync(envPath));
if (fs.existsSync(envPath)) {
    console.log('.env file content:');
    console.log(fs.readFileSync(envPath, 'utf8'));
}
//# sourceMappingURL=test-env.js.map