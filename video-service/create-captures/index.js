'use strict';

const AWS = require('aws-sdk');
const fs = require('fs-extra');
const BbPromise = require('bluebird');
const spawn = require('child_process').spawn;
const path = require('path');

const { insertLabels } = require('../lib/database');
const { parseS3Event } = require('../../shared/helpers');

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

const createCaptures = (input, output) =>
  spawnPromise(
    spawn(
      ffmpeg(),
      (`-skip_frame nokey -i ${input} -vsync 0 -r 30 -vf scale=320:-1 ${output}`).split(' ')));

const saveCapture = ({ bucket, id, base, directory, frame }) =>
  s3.putObject({
    Bucket: bucket,
    Key: `captures/${id}/${base}`,
    Body: fs.readFileSync(path.join(directory, frame)),
    ContentType: 'image/png',
  })
    .promise();

module.exports.handler = (event, context, callback) => {
  const message = JSON.parse(event.Records[0].Sns.Message);
  const {
    id,
    bucket,
    key,
    base,
    name,
  } = parseS3Event(message.Records[0].s3);

  const directory = path.join('/', 'tmp', 'capture', id);

  const input = path.join(directory, base);
  const output = path.join(directory, `${name}-%04d.png`);
  return ensureDir(directory)
    .then(() =>
      s3.getObject({
        Bucket: bucket,
        Key: key,
      }).promise())
    .then(({ Body }) => writeFile(input, Body))
    .then(() => remove(output))
    .then(() => createCaptures(input, output))
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
    .then(() => callback(null, 'ok'));
};
