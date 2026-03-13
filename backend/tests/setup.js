/**
 * Test Setup
 * Configure environment variables for testing
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Set NODE_ENV to test
process.env.NODE_ENV = 'test';

// Set longer timeout for database operations
jest.setTimeout(30000);
