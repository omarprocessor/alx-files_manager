import { expect } from 'chai';
import request from 'request';
import sinon from 'sinon';
import fs from 'fs';
import path from 'path';
import dbClient from '../../utils/db';
import redisClient from '../../utils/redis';
import { ObjectId } from 'mongodb';

const baseURL = 'http://localhost:5000';

describe('FilesController', () => {
  let dbStub;
  let redisStub;
  let collectionStub;
  let fsStub;

  beforeEach(() => {
    // Create stubs
    collectionStub = {
      findOne: sinon.stub(),
      insertOne: sinon.stub(),
      updateOne: sinon.stub(),
      aggregate: sinon.stub(),
    };

    dbStub = {
      db: {
        collection: sinon.stub().returns(collectionStub),
      },
    };

    redisStub = {
      get: sinon.stub(),
    };

    fsStub = {
      existsSync: sinon.stub(),
      mkdirSync: sinon.stub(),
      writeFileSync: sinon.stub(),
      readFileSync: sinon.stub(),
    };

    // Stub the clients and modules
    sinon.stub(dbClient, 'db').value(dbStub.db);
    sinon.stub(redisClient, 'get').callsFake(redisStub.get);
    sinon.stub(fs, 'existsSync').callsFake(fsStub.existsSync);
    sinon.stub(fs, 'mkdirSync').callsFake(fsStub.mkdirSync);
    sinon.stub(fs, 'writeFileSync').callsFake(fsStub.writeFileSync);
    sinon.stub(fs, 'readFileSync').callsFake(fsStub.readFileSync);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('POST /files', () => {
    const validToken = 'valid-token';
    const userId = new ObjectId();
    const user = { _id: userId, email: 'test@example.com' };

    beforeEach(() => {
      redisStub.get.resolves(userId.toString());
      collectionStub.findOne.withArgs({ _id: ObjectId(userId) }).resolves(user);
    });

    it('should create a folder successfully', (done) => {
      const folderData = {
        name: 'test-folder',
        type: 'folder',
        isPublic: false,
      };
      const folderId = new ObjectId();

      collectionStub.insertOne.resolves({ insertedId: folderId });

      request.post({
        url: `${baseURL}/files`,
        headers: { 'X-Token': validToken },
        json: folderData,
      }, (error, response, body) => {
        expect(error).to.be.null;
        expect(response.statusCode).to.equal(201);
        expect(body).to.have.property('id', folderId.toString());
        expect(body).to.have.property('userId', userId.toString());
        expect(body).to.have.property('name', folderData.name);
        expect(body).to.have.property('type', folderData.type);
        expect(body).to.have.property('isPublic', folderData.isPublic);
        done();
      });
    });

    it('should create a file successfully', (done) => {
      const fileData = {
        name: 'test.txt',
        type: 'file',
        data: Buffer.from('Hello World').toString('base64'),
        isPublic: false,
      };
      const fileId = new ObjectId();

      fsStub.existsSync.returns(false);
      collectionStub.insertOne.resolves({ insertedId: fileId });

      request.post({
        url: `${baseURL}/files`,
        headers: { 'X-Token': validToken },
        json: fileData,
      }, (error, response, body) => {
        expect(error).to.be.null;
        expect(response.statusCode).to.equal(201);
        expect(body).to.have.property('id', fileId.toString());
        expect(body).to.have.property('userId', userId.toString());
        expect(body).to.have.property('name', fileData.name);
        expect(body).to.have.property('type', fileData.type);
        expect(body).to.have.property('isPublic', fileData.isPublic);
        done();
      });
    });

    it('should return 401 when no token is provided', (done) => {
      const fileData = { name: 'test.txt', type: 'file', data: 'data' };

      request.post({
        url: `${baseURL}/files`,
        json: fileData,
      }, (error, response, body) => {
        expect(error).to.be.null;
        expect(response.statusCode).to.equal(401);
        expect(body).to.have.property('error', 'Unauthorized');
        done();
      });
    });

    it('should return 400 when name is missing', (done) => {
      const fileData = { type: 'file', data: 'data' };

      request.post({
        url: `${baseURL}/files`,
        headers: { 'X-Token': validToken },
        json: fileData,
      }, (error, response, body) => {
        expect(error).to.be.null;
        expect(response.statusCode).to.equal(400);
        expect(body).to.have.property('error', 'Missing name');
        done();
      });
    });

    it('should return 400 when type is missing', (done) => {
      const fileData = { name: 'test.txt', data: 'data' };

      request.post({
        url: `${baseURL}/files`,
        headers: { 'X-Token': validToken },
        json: fileData,
      }, (error, response, body) => {
        expect(error).to.be.null;
        expect(response.statusCode).to.equal(400);
        expect(body).to.have.property('error', 'Missing type');
        done();
      });
    });

    it('should return 400 when data is missing for non-folder type', (done) => {
      const fileData = { name: 'test.txt', type: 'file' };

      request.post({
        url: `${baseURL}/files`,
        headers: { 'X-Token': validToken },
        json: fileData,
      }, (error, response, body) => {
        expect(error).to.be.null;
        expect(response.statusCode).to.equal(400);
        expect(body).to.have.property('error', 'Missing data');
        done();
      });
    });
  });

  describe('GET /files/:id', () => {
    const validToken = 'valid-token';
    const userId = new ObjectId();
    const fileId = new ObjectId();

    beforeEach(() => {
      redisStub.get.resolves(userId.toString());
    });

    it('should return file data when file exists and user owns it', (done) => {
      const file = {
        _id: fileId,
        userId,
        name: 'test.txt',
        type: 'file',
        isPublic: false,
        parentId: 0,
      };

      collectionStub.findOne.resolves(file);

      request.get({
        url: `${baseURL}/files/${fileId}`,
        headers: { 'X-Token': validToken },
      }, (error, response, body) => {
        expect(error).to.be.null;
        expect(response.statusCode).to.equal(200);
        
        const data = JSON.parse(body);
        expect(data).to.have.property('id', fileId.toString());
        expect(data).to.have.property('userId', userId.toString());
        expect(data).to.have.property('name', file.name);
        expect(data).to.have.property('type', file.type);
        expect(data).to.have.property('isPublic', file.isPublic);
        done();
      });
    });

    it('should return 401 when no token is provided', (done) => {
      request.get(`${baseURL}/files/${fileId}`, (error, response, body) => {
        expect(error).to.be.null;
        expect(response.statusCode).to.equal(401);
        expect(body).to.have.property('error', 'Unauthorized');
        done();
      });
    });

    it('should return 404 when file does not exist', (done) => {
      collectionStub.findOne.resolves(null);

      request.get({
        url: `${baseURL}/files/${fileId}`,
        headers: { 'X-Token': validToken },
      }, (error, response, body) => {
        expect(error).to.be.null;
        expect(response.statusCode).to.equal(404);
        expect(body).to.have.property('error', 'Not found');
        done();
      });
    });
  });

  describe('GET /files', () => {
    const validToken = 'valid-token';
    const userId = new ObjectId();

    beforeEach(() => {
      redisStub.get.resolves(userId.toString());
    });

    it('should return files list with pagination', (done) => {
      const files = [
        {
          _id: new ObjectId(),
          userId,
          name: 'file1.txt',
          type: 'file',
          isPublic: false,
          parentId: 0,
        },
        {
          _id: new ObjectId(),
          userId,
          name: 'file2.txt',
          type: 'file',
          isPublic: true,
          parentId: 0,
        },
      ];

      const aggregateStub = {
        toArray: sinon.stub().resolves(files),
      };
      collectionStub.aggregate.returns(aggregateStub);

      request.get({
        url: `${baseURL}/files?page=0`,
        headers: { 'X-Token': validToken },
      }, (error, response, body) => {
        expect(error).to.be.null;
        expect(response.statusCode).to.equal(200);
        
        const data = JSON.parse(body);
        expect(data).to.be.an('array');
        expect(data).to.have.length(2);
        expect(data[0]).to.have.property('id');
        expect(data[0]).to.have.property('userId', userId.toString());
        expect(data[0]).to.have.property('name', 'file1.txt');
        done();
      });
    });

    it('should return 401 when no token is provided', (done) => {
      request.get(`${baseURL}/files`, (error, response, body) => {
        expect(error).to.be.null;
        expect(response.statusCode).to.equal(401);
        expect(body).to.have.property('error', 'Unauthorized');
        done();
      });
    });
  });

  describe('PUT /files/:id/publish', () => {
    const validToken = 'valid-token';
    const userId = new ObjectId();
    const fileId = new ObjectId();

    beforeEach(() => {
      redisStub.get.resolves(userId.toString());
    });

    it('should publish file successfully', (done) => {
      const file = {
        _id: fileId,
        userId,
        name: 'test.txt',
        type: 'file',
        isPublic: false,
        parentId: 0,
      };

      collectionStub.findOne.resolves(file);
      collectionStub.updateOne.resolves({ modifiedCount: 1 });

      request.put({
        url: `${baseURL}/files/${fileId}/publish`,
        headers: { 'X-Token': validToken },
      }, (error, response, body) => {
        expect(error).to.be.null;
        expect(response.statusCode).to.equal(200);
        
        const data = JSON.parse(body);
        expect(data).to.have.property('id', fileId.toString());
        expect(data).to.have.property('userId', userId.toString());
        expect(data).to.have.property('name', file.name);
        expect(data).to.have.property('type', file.type);
        expect(data).to.have.property('isPublic', true);
        done();
      });
    });

    it('should return 401 when no token is provided', (done) => {
      request.put(`${baseURL}/files/${fileId}/publish`, (error, response, body) => {
        expect(error).to.be.null;
        expect(response.statusCode).to.equal(401);
        expect(body).to.have.property('error', 'Unauthorized');
        done();
      });
    });

    it('should return 404 when file does not exist', (done) => {
      collectionStub.findOne.resolves(null);

      request.put({
        url: `${baseURL}/files/${fileId}/publish`,
        headers: { 'X-Token': validToken },
      }, (error, response, body) => {
        expect(error).to.be.null;
        expect(response.statusCode).to.equal(404);
        expect(body).to.have.property('error', 'Not found');
        done();
      });
    });
  });

  describe('PUT /files/:id/unpublish', () => {
    const validToken = 'valid-token';
    const userId = new ObjectId();
    const fileId = new ObjectId();

    beforeEach(() => {
      redisStub.get.resolves(userId.toString());
    });

    it('should unpublish file successfully', (done) => {
      const file = {
        _id: fileId,
        userId,
        name: 'test.txt',
        type: 'file',
        isPublic: true,
        parentId: 0,
      };

      collectionStub.findOne.resolves(file);
      collectionStub.updateOne.resolves({ modifiedCount: 1 });

      request.put({
        url: `${baseURL}/files/${fileId}/unpublish`,
        headers: { 'X-Token': validToken },
      }, (error, response, body) => {
        expect(error).to.be.null;
        expect(response.statusCode).to.equal(200);
        
        const data = JSON.parse(body);
        expect(data).to.have.property('id', fileId.toString());
        expect(data).to.have.property('userId', userId.toString());
        expect(data).to.have.property('name', file.name);
        expect(data).to.have.property('type', file.type);
        expect(data).to.have.property('isPublic', false);
        done();
      });
    });

    it('should return 401 when no token is provided', (done) => {
      request.put(`${baseURL}/files/${fileId}/unpublish`, (error, response, body) => {
        expect(error).to.be.null;
        expect(response.statusCode).to.equal(401);
        expect(body).to.have.property('error', 'Unauthorized');
        done();
      });
    });

    it('should return 404 when file does not exist', (done) => {
      collectionStub.findOne.resolves(null);

      request.put({
        url: `${baseURL}/files/${fileId}/unpublish`,
        headers: { 'X-Token': validToken },
      }, (error, response, body) => {
        expect(error).to.be.null;
        expect(response.statusCode).to.equal(404);
        expect(body).to.have.property('error', 'Not found');
        done();
      });
    });
  });

  describe('GET /files/:id/data', () => {
    const fileId = new ObjectId();
    const userId = new ObjectId();

    it('should return file data for public file', (done) => {
      const file = {
        _id: fileId,
        userId,
        name: 'test.txt',
        type: 'file',
        isPublic: true,
        localPath: '/tmp/test.txt',
      };

      const fileContent = 'Hello World';

      collectionStub.findOne.resolves(file);
      fsStub.existsSync.returns(true);
      fsStub.readFileSync.returns(fileContent);

      request.get(`${baseURL}/files/${fileId}/data`, (error, response, body) => {
        expect(error).to.be.null;
        expect(response.statusCode).to.equal(200);
        expect(body).to.equal(fileContent);
        expect(response.headers['content-type']).to.equal('text/plain');
        done();
      });
    });

    it('should return file data for private file with valid token', (done) => {
      const file = {
        _id: fileId,
        userId,
        name: 'test.txt',
        type: 'file',
        isPublic: false,
        localPath: '/tmp/test.txt',
      };

      const fileContent = 'Hello World';

      redisStub.get.resolves(userId.toString());
      collectionStub.findOne.resolves(file);
      fsStub.existsSync.returns(true);
      fsStub.readFileSync.returns(fileContent);

      request.get({
        url: `${baseURL}/files/${fileId}/data`,
        headers: { 'X-Token': 'valid-token' },
      }, (error, response, body) => {
        expect(error).to.be.null;
        expect(response.statusCode).to.equal(200);
        expect(body).to.equal(fileContent);
        done();
      });
    });

    it('should return 404 when file does not exist', (done) => {
      collectionStub.findOne.resolves(null);

      request.get(`${baseURL}/files/${fileId}/data`, (error, response, body) => {
        expect(error).to.be.null;
        expect(response.statusCode).to.equal(404);
        expect(body).to.have.property('error', 'Not found');
        done();
      });
    });

    it('should return 404 when private file accessed without token', (done) => {
      const file = {
        _id: fileId,
        userId,
        name: 'test.txt',
        type: 'file',
        isPublic: false,
        localPath: '/tmp/test.txt',
      };

      collectionStub.findOne.resolves(file);

      request.get(`${baseURL}/files/${fileId}/data`, (error, response, body) => {
        expect(error).to.be.null;
        expect(response.statusCode).to.equal(404);
        expect(body).to.have.property('error', 'Not found');
        done();
      });
    });

    it('should return 400 when trying to access folder data', (done) => {
      const file = {
        _id: fileId,
        userId,
        name: 'test-folder',
        type: 'folder',
        isPublic: true,
      };

      collectionStub.findOne.resolves(file);

      request.get(`${baseURL}/files/${fileId}/data`, (error, response, body) => {
        expect(error).to.be.null;
        expect(response.statusCode).to.equal(400);
        expect(body).to.have.property('error', "A folder doesn't have content");
        done();
      });
    });

    it('should return 404 when file does not exist on disk', (done) => {
      const file = {
        _id: fileId,
        userId,
        name: 'test.txt',
        type: 'file',
        isPublic: true,
        localPath: '/tmp/test.txt',
      };

      collectionStub.findOne.resolves(file);
      fsStub.existsSync.returns(false);

      request.get(`${baseURL}/files/${fileId}/data`, (error, response, body) => {
        expect(error).to.be.null;
        expect(response.statusCode).to.equal(404);
        expect(body).to.have.property('error', 'Not found');
        done();
      });
    });
  });
}); 