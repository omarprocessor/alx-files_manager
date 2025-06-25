# Files Manager Tests

This directory contains comprehensive tests for the Files Manager API.

## Test Structure

### Client Tests
- `redisClient.test.js` - Tests for Redis client utility
- `dbClient.test.js` - Tests for MongoDB client utility

### Endpoint Tests
- `endpoints/AppController.test.js` - Tests for status and stats endpoints
- `endpoints/UsersController.test.js` - Tests for user management endpoints
- `endpoints/AuthController.test.js` - Tests for authentication endpoints
- `endpoints/FilesController.test.js` - Tests for file management endpoints

### Test Utilities
- `helpers/testUtils.js` - Common test utilities and mock data generators
- `.mocharc.js` - Mocha test runner configuration

## Running Tests

### Prerequisites
Make sure you have the following services running:
- MongoDB server
- Redis server
- Node.js application server

### Run All Tests
```bash
npm test
```

### Run Specific Test Files
```bash
# Run only client tests
npm test tests/redisClient.test.js tests/dbClient.test.js

# Run only endpoint tests
npm test tests/endpoints/

# Run specific controller tests
npm test tests/endpoints/AppController.test.js
```

## Test Coverage

The tests cover the following endpoints:

### AppController
- `GET /status` - Check Redis and DB connection status
- `GET /stats` - Get user and file counts

### UsersController
- `POST /users` - Create new user
- `GET /users/me` - Get current user information

### AuthController
- `GET /connect` - Authenticate user with Basic auth
- `GET /disconnect` - Logout user

### FilesController
- `POST /files` - Upload/create file or folder
- `GET /files/:id` - Get specific file information
- `GET /files` - List files with pagination
- `PUT /files/:id/publish` - Publish a file
- `PUT /files/:id/unpublish` - Unpublish a file
- `GET /files/:id/data` - Get file content

## Test Features

### Mocking
- Database operations are mocked using Sinon stubs
- Redis operations are mocked using Sinon stubs
- File system operations are mocked for file tests

### Authentication Testing
- Tests cover both authenticated and unauthenticated requests
- Token validation is tested thoroughly
- Basic authentication flow is tested

### Error Handling
- Tests cover various error scenarios
- HTTP status codes are verified
- Error messages are validated

### Data Validation
- Input validation is tested
- Required fields are checked
- Data format validation is included 