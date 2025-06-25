import { expect } from 'chai';
import request from 'request';
import sinon from 'sinon';
import dbClient from '../../utils/db';
import redisClient from '../../utils/redis';

const baseURL = 'http://localhost:5000';

describe('AppController', () => {
  let dbStub;
  let redisStub;

  beforeEach(() => {
    // Stub database and Redis clients
    dbStub = {
      nbUsers: sinon.stub(),
      nbFiles: sinon.stub(),
      isAlive: sinon.stub(),
    };
    redisStub = {
      isAlive: sinon.stub(),
    };

    sinon.stub(dbClient, 'nbUsers').callsFake(dbStub.nbUsers);
    sinon.stub(dbClient, 'nbFiles').callsFake(dbStub.nbFiles);
    sinon.stub(dbClient, 'isAlive').callsFake(dbStub.isAlive);
    sinon.stub(redisClient, 'isAlive').callsFake(redisStub.isAlive);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('GET /status', () => {
    it('should return status of Redis and DB when both are alive', (done) => {
      dbStub.isAlive.returns(true);
      redisStub.isAlive.returns(true);

      request.get(`${baseURL}/status`, (error, response, body) => {
        expect(error).to.be.null;
        expect(response.statusCode).to.equal(200);
        
        const data = JSON.parse(body);
        expect(data).to.have.property('redis', true);
        expect(data).to.have.property('db', true);
        done();
      });
    });

    it('should return status when Redis is down', (done) => {
      dbStub.isAlive.returns(true);
      redisStub.isAlive.returns(false);

      request.get(`${baseURL}/status`, (error, response, body) => {
        expect(error).to.be.null;
        expect(response.statusCode).to.equal(200);
        
        const data = JSON.parse(body);
        expect(data).to.have.property('redis', false);
        expect(data).to.have.property('db', true);
        done();
      });
    });

    it('should return status when DB is down', (done) => {
      dbStub.isAlive.returns(false);
      redisStub.isAlive.returns(true);

      request.get(`${baseURL}/status`, (error, response, body) => {
        expect(error).to.be.null;
        expect(response.statusCode).to.equal(200);
        
        const data = JSON.parse(body);
        expect(data).to.have.property('redis', true);
        expect(data).to.have.property('db', false);
        done();
      });
    });
  });

  describe('GET /stats', () => {
    it('should return correct user and file counts', (done) => {
      const userCount = 5;
      const fileCount = 10;
      
      dbStub.nbUsers.resolves(userCount);
      dbStub.nbFiles.resolves(fileCount);

      request.get(`${baseURL}/stats`, (error, response, body) => {
        expect(error).to.be.null;
        expect(response.statusCode).to.equal(200);
        
        const data = JSON.parse(body);
        expect(data).to.have.property('users', userCount);
        expect(data).to.have.property('files', fileCount);
        done();
      });
    });

    it('should return zero counts when database is empty', (done) => {
      dbStub.nbUsers.resolves(0);
      dbStub.nbFiles.resolves(0);

      request.get(`${baseURL}/stats`, (error, response, body) => {
        expect(error).to.be.null;
        expect(response.statusCode).to.equal(200);
        
        const data = JSON.parse(body);
        expect(data).to.have.property('users', 0);
        expect(data).to.have.property('files', 0);
        done();
      });
    });

    it('should handle database errors gracefully', (done) => {
      const error = new Error('Database error');
      dbStub.nbUsers.rejects(error);

      request.get(`${baseURL}/stats`, (error, response, body) => {
        // The endpoint should handle the error and still return a response
        expect(response.statusCode).to.equal(200);
        done();
      });
    });
  });
}); 