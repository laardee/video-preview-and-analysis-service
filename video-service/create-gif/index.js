'use strict';

const AWS = require('aws-sdk');
const fs = require('fs-extra');
const BbPromise = require('bluebird');
const spawn = require('child_process').spawn;
const path = require('path');
const { updateStatus } = require('../lib/database');
const { parseSNSEvent } = require('../../shared/helpers');

const config = {
  region: AWS.config.region || process.env.SERVERLESS_REGION || 'us-east-1',
};

const s3 = new AWS.S3(config);
const snsQueue = require('../../shared/snsQueue');

const ensureDir = BbPromise.promisify(fs.ensureDir);
const writeFile = BbPromise.promisify(fs.writeFile);
const remove = BbPromise.promisify(fs.remove);

const {
  spawnPromise,
  ffmpeg,
} = require('../lib/spawn');

const createGif = (input, output) =>
  // 10 seconds from start
  spawnPromise(spawn(ffmpeg(), (`-t 10 -i ${input} -vf scale=320:-1 ${output}`).split(' ')));
  // -i ${file} -vf setpts=4*PTS ${path.join(directory, `preview-${session}.gif`)}

const getSignedUrl = (filename) => new Promise((resolve, reject) => {
  s3.getSignedUrl('getObject', {
    Bucket: process.env.RENDER_BUCKET,
    Key: filename,
    Expires: 3600 * 24,
  }, (error, url) => {
    if (error) {
      console.log(error);
      return reject(error);
    }
    return resolve(url);
  });
});

module.exports.handler = (event, context, callback) => {
  const {
    id,
    key,
    bucket,
    base,
    name,
  } = parseSNSEvent(event);

  const directory = path.join('/', 'tmp', 'gif', id);
  const input = path.join(directory, base);
  const output = path.join(directory, `${name}.gif`);
  const gif = `${id}/${name}.gif`;

  return ensureDir(directory)
    .then(() =>
      s3.getObject({
        Bucket: bucket,
        Key: key,
      }).promise())
    .then(({ Body }) => writeFile(input, Body))
    .then(() => remove(output))
    .then(() => createGif(input, output))
    .then(() =>
      s3.putObject({
        Bucket: process.env.RENDER_BUCKET,
        Key: gif,
        Body: fs.readFileSync(output),
        ContentType: 'image/gif',
      })
        .promise())
    .then(() => getSignedUrl(gif))
    .then((signedUrl) =>
      updateStatus({ id, video: key, gif, signedUrl }))
    .then(() =>
      snsQueue.sendMessage(process.env.STATUS_TOPIC, { message: { id } }))
    .then(() => callback(null, 'ok'));
};
