module.exports = {
  require: ['@babel/register'],
  timeout: 10000,
  reporter: 'spec',
  ui: 'bdd',
  colors: true,
  recursive: true,
  extension: ['test.js'],
  spec: 'tests/**/*.test.js',
}; 