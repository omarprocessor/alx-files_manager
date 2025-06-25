import { expect } from 'chai';
import request from 'request';
import sinon from 'sinon';
import dbClient from '../../utils/db';
import redisClient from '../../utils/redis';
import { ObjectId } from 'mongodb';

const baseURL = 'http://localhost:5000';

describe('AuthController', () => {
  let dbStub;
  let redisStub;
  let collectionStub;

  beforeEach(() => {
    // Create stubs
    collectionStub = {
      findOne: sinon.stub(),
    };

    dbStub = {
      db: {
        collection: sinon.stub().returns(collectionStub),
      },
    };

    redisStub = {
      get: sinon.stub(),
      set: sinon.stub(),
      del: sinon.stub(),
    };

    // Stub the clients
    sinon.stub(dbClient, 'db').value(dbStub.db);
    sinon.stub(redisClient, 'get').callsFake(redisStub.get);
    sinon.stub(redisClient, 'set').callsFake(redisStub.set);
    sinon.stub(redisClient, 'del').callsFake(redisStub.del);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('GET /connect', () => {
    it('should authenticate user and return token with valid credentials', (done) => {
      const email = 'test@example.com';
      const password = 'password123';
      const userId = new ObjectId();
      const user = {
        _id: userId,
        email,
        password: '40bd001563085fc35165329ea1ff5c5ecbdbbeef', // sha1 of password123
      };

      const authHeader = `Basic ${Buffer.from(`${email}:${password}`).toString('base64')}`;

      collectionStub.findOne.resolves(user);
      redisStub.set.resolves('OK');

      request.get({
        url: `${baseURL}/connect`,
        headers: { Authorization: authHeader },
      }, (error, response, body) => {
        expect(error).to.be.null;
        expect(response.statusCode).to.equal(200);
        
        const data = JSON.parse(body);
        expect(data).to.have.property('token');
        expect(data.token).to.be.a('string');
        expect(data.token.length).to.be.greaterThan(0);
        done();
      });
    });

    it('should return 401 when no Authorization header is provided', (done) => {
      request.get(`${baseURL}/connect`, (error, response, body) => {
        expect(error).to.be.null;
        expect(response.statusCode).to.equal(401);
        expect(body).to.have.property('error', 'Unauthorized');
        done();
      });
    });

    it('should return 401 when Authorization header is not Basic', (done) => {
      request.get({
        url: `${baseURL}/connect`,
        headers: { Authorization: 'Bearer token' },
      }, (error, response, body) => {
        expect(error).to.be.null;
        expect(response.statusCode).to.equal(401);
        expect(body).to.have.property('error', 'Unauthorized');
        done();
      });
    });

    it('should return 401 when credentials are invalid', (done) => {
      const email = 'test@example.com';
      const password = 'wrongpassword';
      const authHeader = `Basic ${Buffer.from(`${email}:${password}`).toString('base64')}`;

      collectionStub.findOne.resolves(null);

      request.get({
        url: `${baseURL}/connect`,
        headers: { Authorization: authHeader },
      }, (error, response, body) => {
        expect(error).to.be.null;
        expect(response.statusCode).to.equal(401);
        expect(body).to.have.property('error', 'Unauthorized');
        done();
      });
    });

    it('should return 401 when email or password is missing in credentials', (done) => {
      const authHeader = `Basic ${Buffer.from('test@example.com').toString('base64')}`;

      request.get({
        url: `${baseURL}/connect`,
        headers: { Authorization: authHeader },
      }, (error, response, body) => {
        expect(error).to.be.null;
        expect(response.statusCode).to.equal(401);
        expect(body).to.have.property('error', 'Unauthorized');
        done();
      });
    });
  });

  describe('GET /disconnect', () => {
    it('should disconnect user and return 204 with valid token', (done) => {
      const token = 'valid-token';
      const userId = new ObjectId();

      redisStub.get.resolves(userId.toString());
      redisStub.del.resolves(1);

      request.get({
        url: `${baseURL}/disconnect`,
        headers: { 'X-Token': token },
      }, (error, response, body) => {
        expect(error).to.be.null;
        expect(response.statusCode).to.equal(204);
        expect(body).to.be.empty;
        done();
      });
    });

    it('should return 401 when no token is provided', (done) => {
      request.get(`${baseURL}/disconnect`, (error, response, body) => {
        expect(error).to.be.null;
        expect(response.statusCode).to.equal(401);
        expect(body).to.have.property('error', 'Unauthorized');
        done();
      });
    });

    it('should return 401 when token is invalid', (done) => {
      const token = 'invalid-token';

      redisStub.get.resolves(null);

      request.get({
        url: `${baseURL}/disconnect`,
        headers: { 'X-Token': token },
      }, (error, response, body) => {
        expect(error).to.be.null;
        expect(response.statusCode).to.equal(401);
        expect(body).to.have.property('error', 'Unauthorized');
        done();
      });
    });
  });
}); 