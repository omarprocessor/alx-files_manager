import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import { ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import mime from 'mime-types';

const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';

class FilesController {
  static async postUpload(req, res) {
    const token = req.header('X-Token');
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const user = await dbClient.db.collection('users').findOne({ _id: ObjectId(userId) });
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { name, type, parentId = 0, isPublic = false, data } = req.body;
    if (!name) return res.status(400).json({ error: 'Missing name' });
    if (!type || !['folder', 'file', 'image'].includes(type)) return res.status(400).json({ error: 'Missing type' });
    if (type !== 'folder' && !data) return res.status(400).json({ error: 'Missing data' });
    let parentFile = null;
    if (parentId !== 0) {
      parentFile = await dbClient.db.collection('files').findOne({ _id: ObjectId(parentId) });
      if (!parentFile) return res.status(400).json({ error: 'Parent not found' });
      if (parentFile.type !== 'folder') return res.status(400).json({ error: 'Parent is not a folder' });
    }
    const fileDoc = {
      userId: user._id,
      name,
      type,
      isPublic,
      parentId: parentId === 0 ? 0 : ObjectId(parentId),
    };
    if (type === 'folder') {
      const result = await dbClient.db.collection('files').insertOne(fileDoc);
      return res.status(201).json({ id: result.insertedId, userId: user._id, name, type, isPublic, parentId });
    }
    if (!fs.existsSync(FOLDER_PATH)) fs.mkdirSync(FOLDER_PATH, { recursive: true });
    const localPath = path.join(FOLDER_PATH, uuidv4());
    fs.writeFileSync(localPath, Buffer.from(data, 'base64'));
    fileDoc.localPath = localPath;
    const result = await dbClient.db.collection('files').insertOne(fileDoc);
    return res.status(201).json({ id: result.insertedId, userId: user._id, name, type, isPublic, parentId });
  }

  static async getShow(req, res) {
    const token = req.header('X-Token');
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const file = await dbClient.db.collection('files').findOne({ _id: ObjectId(req.params.id), userId: ObjectId(userId) });
    if (!file) return res.status(404).json({ error: 'Not found' });
    return res.status(200).json({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId,
    });
  }

  static async getIndex(req, res) {
    const token = req.header('X-Token');
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const parentId = req.query.parentId || 0;
    const page = parseInt(req.query.page, 10) || 0;
    const match = { userId: ObjectId(userId), parentId: parentId === 0 ? 0 : ObjectId(parentId) };
    const files = await dbClient.db.collection('files')
      .aggregate([
        { $match: match },
        { $skip: page * 20 },
        { $limit: 20 },
      ]).toArray();
    const result = files.map((file) => ({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId,
    }));
    return res.status(200).json(result);
  }

  static async putPublish(req, res) {
    const token = req.header('X-Token');
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const file = await dbClient.db.collection('files').findOne({ _id: ObjectId(req.params.id), userId: ObjectId(userId) });
    if (!file) return res.status(404).json({ error: 'Not found' });
    await dbClient.db.collection('files').updateOne({ _id: ObjectId(req.params.id) }, { $set: { isPublic: true } });
    return res.status(200).json({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: true,
      parentId: file.parentId,
    });
  }

  static async putUnpublish(req, res) {
    const token = req.header('X-Token');
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const file = await dbClient.db.collection('files').findOne({ _id: ObjectId(req.params.id), userId: ObjectId(userId) });
    if (!file) return res.status(404).json({ error: 'Not found' });
    await dbClient.db.collection('files').updateOne({ _id: ObjectId(req.params.id) }, { $set: { isPublic: false } });
    return res.status(200).json({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: false,
      parentId: file.parentId,
    });
  }

  static async getFile(req, res) {
    const { id } = req.params;
    const size = req.query.size;
    const file = await dbClient.db.collection('files').findOne({ _id: ObjectId(id) });
    if (!file) return res.status(404).json({ error: 'Not found' });
    if (!file.isPublic) {
      const token = req.header('X-Token');
      const userId = await redisClient.get(`auth_${token}`);
      if (!userId || file.userId.toString() !== userId) return res.status(404).json({ error: 'Not found' });
    }
    if (file.type === 'folder') return res.status(400).json({ error: "A folder doesn't have content" });
    let filePath = file.localPath;
    if (size && ['500', '250', '100'].includes(size)) filePath = `${file.localPath}_${size}`;
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' });
    const mimeType = mime.lookup(file.name) || 'application/octet-stream';
    res.setHeader('Content-Type', mimeType);
    return res.status(200).send(fs.readFileSync(filePath));
  }
}

export default FilesController; 