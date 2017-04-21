'use strict';

const AWS = require('aws-sdk');
const fs = require('fs-extra');
const BbPromise = require('bluebird');
const spawn = require('child_process').spawn;
const path = require('path');
const { insertLabels, updateStatus } = require('../lib/database');
const { parseSNSEvent } = require('../../shared/helpers');
const { getDuration } = require('../lib');

const config = {
  region: AWS.config.region || process.env.SERVERLESS_REGION || 'eu-west-1',
};

const s3 = new AWS.S3(config);
const ensureDir = BbPromise.promisify(fs.ensureDir);
const writeFile = BbPromise.promisify(fs.writeFile);
const remove = BbPromise.promisify(fs.remove);
const readDir = BbPromise.promisify(fs.readdir);

const {
  spawnPromise,
  ffmpeg,
} = require('../lib/spawn');

/**
 * Extract key frame captures
 * @param input
 * @param output
 * @param duration
 * @returns {*}
 */
const createCaptures = ({ input, output, duration }) => {
  const maxDuration =
    process.env.VIDEO_MAX_DURATION && process.env.VIDEO_MAX_DURATION > 0
      ? process.env.VIDEO_MAX_DURATION
      : duration;

  return spawnPromise(
    spawn(
      ffmpeg(),
      (`-t ${maxDuration} -skip_frame nokey -i ${input} -vsync 0 -r 30 -vf scale=640:-1 ${output}`).split(' '))); // eslint-disable-line max-len
};

/**
 * Saves capture to S3 Bucket
 * @param bucket
 * @param id
 * @param base
 * @param directory
 * @param frame
 */
const saveCapture = ({ bucket, id, base, directory, frame }) =>
  s3.putObject({
    Bucket: bucket,
    Key: `captures/${id}/${base}`,
    Body: fs.readFileSync(path.join(directory, frame)),
    ContentType: 'image/png',
  })
    .promise();

/**
 * Handles captures
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

  const directory = path.join('/', 'tmp', 'capture', id);

  const input = path.join(directory, base);
  const output = path.join(directory, `${name}-%04d.png`);
  return updateStatus({ id, captures: 0 })
    .then(() => ensureDir(directory))
    .then(() =>
      s3.getObject({
        Bucket: bucket,
        Key: key,
      }).promise())
    .then(({ Body }) => writeFile(input, Body))
    .then(() => remove(output))
    .then(() => getDuration(input))
    .then(duration => createCaptures({ input, output, duration }))
    .then(() => readDir(directory))
    .then((files) => {
      const promises =
        files.filter((file) =>
        path.parse(file).ext === '.png')
          .map((frame) =>
            saveCapture({
              bucket,
              base: path.parse(frame).base,
              id,
              directory,
              frame,
            }).then(() => insertLabels({ id, frame })));
      return Promise.all(promises);
    })
    .then(() => updateStatus({ id, captures: 1 }))
    .then(() => callback(null, 'ok'));
};
