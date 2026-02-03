// Central dotenv loader for Node scripts and libraries
try {
  // prefer dotenv from project
  const dotenv = require('dotenv');
  const path = require('path');
  // load .env file located at repository root if present
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
} catch (e) {
  // ignore if dotenv not available in runtime
}

module.exports = {};
