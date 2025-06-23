import dbClient from './utils/db';
import { ObjectId } from 'mongodb';
import Bull from 'bull';
import imageThumbnail from 'image-thumbnail';
import fs from 'fs';
import path from 'path';

const fileQueue = new Bull('fileQueue');
const userQueue = new Bull('userQueue');

fileQueue.process(async (job, done) => {
  const { fileId, userId } = job.data;
  if (!fileId) return done(new Error('Missing fileId'));
  if (!userId) return done(new Error('Missing userId'));
  const file = await dbClient.db.collection('files').findOne({ _id: ObjectId(fileId), userId: ObjectId(userId) });
  if (!file) return done(new Error('File not found'));
  const sizes = [500, 250, 100];
  for (const size of sizes) {
    try {
      const thumbnail = await imageThumbnail(file.localPath, { width: size });
      fs.writeFileSync(`${file.localPath}_${size}`, thumbnail);
    } catch (err) {
      return done(err);
    }
  }
  done();
});

userQueue.process(async (job, done) => {
  const { userId } = job.data;
  if (!userId) return done(new Error('Missing userId'));
  const user = await dbClient.db.collection('users').findOne({ _id: ObjectId(userId) });
  if (!user) return done(new Error('User not found'));
  console.log(`Welcome ${user.email}!`);
  done();
}); 