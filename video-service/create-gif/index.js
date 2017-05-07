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

const { getDuration } = require('../lib');

/**
 * Creates GIF animation from source video
 * @param input
 * @param output
 * @param directory
 * @param duration
 * @returns {*}
 */
const createGif = ({ input, output, directory, duration }) => {
  const maxDuration =
    process.env.VIDEO_MAX_DURATION && process.env.VIDEO_MAX_DURATION > 0
      ? process.env.VIDEO_MAX_DURATION
      : duration;

  const frames = 10;
  const fps = frames / maxDuration;
  const command = `-t ${maxDuration} -i ${input} -vf scale=320:-1:flags=lanczos,fps=${fps} ${path.join(directory, '%06d.png')}`; // eslint-disable-line max-len
  console.log(command);
  return spawnPromise(spawn(ffmpeg(), (command).split(' ')))
    .then(() =>
      spawnPromise(spawn(ffmpeg(), (`-i ${path.join(directory, '%06d.png')} -vf setpts=50*PTS ${output}`).split(' '))));  // eslint-disable-line max-len
};

/**
 * Handles GIF creation
 * @param event
 * @param context
 * @param callback
 * @returns {Promise.<TResult>}
 */
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
    .then(() => getDuration(input))
    .then(duration => createGif({ input, output, directory, duration }))
    .then(() =>
      s3.putObject({
        Bucket: process.env.RENDER_BUCKET,
        Key: gif,
        Body: fs.readFileSync(output),
        ContentType: 'image/gif',
      })
        .promise())
    .then(() =>
      updateStatus({ id, video: key, gif }))
    .then(() => remove(directory)) // cleanup
    .then(() => callback(null, 'ok'))
    .catch((description) =>
      snsQueue.sendMessage(process.env.RENDER_READY_TOPIC_NAME, { message: { id, error: { description, code: 1 } } }) // eslint-disable-line max-len
        .catch(error => callback(error)));
};
