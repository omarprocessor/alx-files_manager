import { expect } from 'chai';
import sinon from 'sinon';
import dbClient from '../utils/db';

describe('DBClient', () => {
  let dbStub;
  let collectionStub;

  beforeEach(() => {
    // Create stubs for database operations
    collectionStub = {
      countDocuments: sinon.stub(),
      findOne: sinon.stub(),
      insertOne: sinon.stub(),
      updateOne: sinon.stub(),
      aggregate: sinon.stub(),
    };

    dbStub = {
      collection: sinon.stub().returns(collectionStub),
    };

    // Replace the actual database with our stub
    sinon.stub(dbClient, 'db').value(dbStub);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('isAlive', () => {
    it('should return true when database is connected', () => {
      dbClient.db = dbStub;
      expect(dbClient.isAlive()).to.be.true;
    });

    it('should return false when database is not connected', () => {
      dbClient.db = null;
      expect(dbClient.isAlive()).to.be.false;
    });
  });

  describe('nbUsers', () => {
    it('should return number of users when database is connected', async () => {
      const expectedCount = 5;
      collectionStub.countDocuments.resolves(expectedCount);

      const result = await dbClient.nbUsers();
      expect(result).to.equal(expectedCount);
      expect(dbStub.collection.calledWith('users')).to.be.true;
      expect(collectionStub.countDocuments.called).to.be.true;
    });

    it('should return 0 when database is not connected', async () => {
      dbClient.db = null;

      const result = await dbClient.nbUsers();
      expect(result).to.equal(0);
    });

    it('should handle database errors gracefully', async () => {
      const error = new Error('Database error');
      collectionStub.countDocuments.rejects(error);

      try {
        await dbClient.nbUsers();
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.equal(error);
      }
    });
  });

  describe('nbFiles', () => {
    it('should return number of files when database is connected', async () => {
      const expectedCount = 10;
      collectionStub.countDocuments.resolves(expectedCount);

      const result = await dbClient.nbFiles();
      expect(result).to.equal(expectedCount);
      expect(dbStub.collection.calledWith('files')).to.be.true;
      expect(collectionStub.countDocuments.called).to.be.true;
    });

    it('should return 0 when database is not connected', async () => {
      dbClient.db = null;

      const result = await dbClient.nbFiles();
      expect(result).to.equal(0);
    });

    it('should handle database errors gracefully', async () => {
      const error = new Error('Database error');
      collectionStub.countDocuments.rejects(error);

      try {
        await dbClient.nbFiles();
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.equal(error);
      }
    });
  });
}); 