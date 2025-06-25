import { expect } from 'chai';
import sinon from 'sinon';
import { ObjectId } from 'mongodb';

export const createMockUser = (overrides = {}) => ({
  _id: new ObjectId(),
  email: 'test@example.com',
  password: '40bd001563085fc35165329ea1ff5c5ecbdbbeef', // sha1 of 'password123'
  ...overrides,
});

export const createMockFile = (overrides = {}) => ({
  _id: new ObjectId(),
  userId: new ObjectId(),
  name: 'test.txt',
  type: 'file',
  isPublic: false,
  parentId: 0,
  localPath: '/tmp/test.txt',
  ...overrides,
});

export const createMockFolder = (overrides = {}) => ({
  _id: new ObjectId(),
  userId: new ObjectId(),
  name: 'test-folder',
  type: 'folder',
  isPublic: false,
  parentId: 0,
  ...overrides,
});

export const createAuthHeader = (email, password) => {
  const credentials = Buffer.from(`${email}:${password}`).toString('base64');
  return `Basic ${credentials}`;
};

export const setupDatabaseStubs = () => {
  const collectionStub = {
    findOne: sinon.stub(),
    insertOne: sinon.stub(),
    updateOne: sinon.stub(),
    aggregate: sinon.stub(),
    countDocuments: sinon.stub(),
  };

  const dbStub = {
    db: {
      collection: sinon.stub().returns(collectionStub),
    },
  };

  return { dbStub, collectionStub };
};

export const setupRedisStubs = () => {
  const redisStub = {
    get: sinon.stub(),
    set: sinon.stub(),
    del: sinon.stub(),
    isAlive: sinon.stub(),
  };

  return redisStub;
};

export const expectErrorResponse = (response, statusCode, errorMessage) => {
  expect(response.statusCode).to.equal(statusCode);
  expect(response.body).to.have.property('error', errorMessage);
};

export const expectSuccessResponse = (response, statusCode) => {
  expect(response.statusCode).to.equal(statusCode);
};

export const expectJsonResponse = (response, statusCode) => {
  expectSuccessResponse(response, statusCode);
  expect(response.headers['content-type']).to.include('application/json');
}; 