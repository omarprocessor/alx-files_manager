import { expect } from 'chai';
import request from 'request';
import sinon from 'sinon';
import dbClient from '../../utils/db';
import redisClient from '../../utils/redis';
import { ObjectId } from 'mongodb';

const baseURL = 'http://localhost:5000';

describe('UsersController', () => {
  let dbStub;
  let redisStub;
  let collectionStub;

  beforeEach(() => {
    // Create stubs
    collectionStub = {
      findOne: sinon.stub(),
      insertOne: sinon.stub(),
    };

    dbStub = {
      db: {
        collection: sinon.stub().returns(collectionStub),
      },
    };

    redisStub = {
      get: sinon.stub(),
    };

    // Stub the clients
    sinon.stub(dbClient, 'db').value(dbStub.db);
    sinon.stub(redisClient, 'get').callsFake(redisStub.get);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('POST /users', () => {
    it('should create a new user successfully', (done) => {
      const email = 'test@example.com';
      const password = 'password123';
      const userId = new ObjectId();

      collectionStub.findOne.resolves(null); // User doesn't exist
      collectionStub.insertOne.resolves({ insertedId: userId });

      const userData = { email, password };

      request.post({
        url: `${baseURL}/users`,
        json: userData,
      }, (error, response, body) => {
        expect(error).to.be.null;
        expect(response.statusCode).to.equal(201);
        expect(body).to.have.property('id', userId.toString());
        expect(body).to.have.property('email', email);
        done();
      });
    });

    it('should return 400 when email is missing', (done) => {
      const userData = { password: 'password123' };

      request.post({
        url: `${baseURL}/users`,
        json: userData,
      }, (error, response, body) => {
        expect(error).to.be.null;
        expect(response.statusCode).to.equal(400);
        expect(body).to.have.property('error', 'Missing email');
        done();
      });
    });

    it('should return 400 when password is missing', (done) => {
      const userData = { email: 'test@example.com' };

      request.post({
        url: `${baseURL}/users`,
        json: userData,
      }, (error, response, body) => {
        expect(error).to.be.null;
        expect(response.statusCode).to.equal(400);
        expect(body).to.have.property('error', 'Missing password');
        done();
      });
    });

    it('should return 400 when user already exists', (done) => {
      const email = 'test@example.com';
      const password = 'password123';

      collectionStub.findOne.resolves({ email, password: 'hashedpassword' });

      const userData = { email, password };

      request.post({
        url: `${baseURL}/users`,
        json: userData,
      }, (error, response, body) => {
        expect(error).to.be.null;
        expect(response.statusCode).to.equal(400);
        expect(body).to.have.property('error', 'Already exist');
        done();
      });
    });
  });

  describe('GET /users/me', () => {
    it('should return user data when valid token is provided', (done) => {
      const token = 'valid-token';
      const userId = new ObjectId();
      const user = {
        _id: userId,
        email: 'test@example.com',
        password: 'hashedpassword',
      };

      redisStub.get.resolves(userId.toString());
      collectionStub.findOne.resolves(user);

      request.get({
        url: `${baseURL}/users/me`,
        headers: { 'X-Token': token },
      }, (error, response, body) => {
        expect(error).to.be.null;
        expect(response.statusCode).to.equal(200);
        
        const data = JSON.parse(body);
        expect(data).to.have.property('id', userId.toString());
        expect(data).to.have.property('email', user.email);
        done();
      });
    });

    it('should return 401 when no token is provided', (done) => {
      request.get(`${baseURL}/users/me`, (error, response, body) => {
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
        url: `${baseURL}/users/me`,
        headers: { 'X-Token': token },
      }, (error, response, body) => {
        expect(error).to.be.null;
        expect(response.statusCode).to.equal(401);
        expect(body).to.have.property('error', 'Unauthorized');
        done();
      });
    });

    it('should return 401 when user not found in database', (done) => {
      const token = 'valid-token';
      const userId = new ObjectId();

      redisStub.get.resolves(userId.toString());
      collectionStub.findOne.resolves(null);

      request.get({
        url: `${baseURL}/users/me`,
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