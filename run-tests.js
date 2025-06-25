#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Test configuration
const testConfig = {
  timeout: 10000,
  reporter: 'spec',
  require: ['@babel/register'],
  extension: ['test.js'],
  recursive: true,
};

// Build mocha arguments
const mochaArgs = [
  '--timeout', testConfig.timeout,
  '--reporter', testConfig.reporter,
  '--require', testConfig.require.join(','),
  '--extension', testConfig.extension.join(','),
  '--recursive',
  'tests/**/*.test.js'
];

// Run tests
const mocha = spawn('./node_modules/.bin/mocha', mochaArgs, {
  stdio: 'inherit',
  shell: true,
});

mocha.on('close', (code) => {
  process.exit(code);
});

mocha.on('error', (error) => {
  console.error('Error running tests:', error);
  process.exit(1);
}); 