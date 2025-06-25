import { expect } from 'chai';
import sinon from 'sinon';
import redisClient from '../utils/redis';

describe('RedisClient', () => {
  let redisStub;

  beforeEach(() => {
    // Stub the Redis client methods
    redisStub = {
      on: sinon.stub(),
      get: sinon.stub(),
      set: sinon.stub(),
      del: sinon.stub(),
    };
    
    // Replace the actual Redis client with our stub
    sinon.stub(redisClient, 'client').value(redisStub);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('isAlive', () => {
    it('should return true when Redis is connected', () => {
      redisClient.isConnected = true;
      expect(redisClient.isAlive()).to.be.true;
    });

    it('should return false when Redis is not connected', () => {
      redisClient.isConnected = false;
      expect(redisClient.isAlive()).to.be.false;
    });
  });

  describe('get', () => {
    it('should resolve with value when Redis get succeeds', async () => {
      const expectedValue = 'test-value';
      redisStub.get.yields(null, expectedValue);

      const result = await redisClient.get('test-key');
      expect(result).to.equal(expectedValue);
      expect(redisStub.get.calledWith('test-key')).to.be.true;
    });

    it('should reject when Redis get fails', async () => {
      const error = new Error('Redis error');
      redisStub.get.yields(error, null);

      try {
        await redisClient.get('test-key');
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.equal(error);
      }
    });
  });

  describe('set', () => {
    it('should resolve when Redis set succeeds', async () => {
      redisStub.set.yields(null, 'OK');

      const result = await redisClient.set('test-key', 'test-value', 3600);
      expect(result).to.equal('OK');
      expect(redisStub.set.calledWith('test-key', 'test-value', 'EX', 3600)).to.be.true;
    });

    it('should reject when Redis set fails', async () => {
      const error = new Error('Redis error');
      redisStub.set.yields(error, null);

      try {
        await redisClient.set('test-key', 'test-value', 3600);
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.equal(error);
      }
    });
  });

  describe('del', () => {
    it('should resolve when Redis del succeeds', async () => {
      redisStub.del.yields(null, 1);

      const result = await redisClient.del('test-key');
      expect(result).to.equal(1);
      expect(redisStub.del.calledWith('test-key')).to.be.true;
    });

    it('should reject when Redis del fails', async () => {
      const error = new Error('Redis error');
      redisStub.del.yields(error, null);

      try {
        await redisClient.del('test-key');
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.equal(error);
      }
    });
  });
}); 