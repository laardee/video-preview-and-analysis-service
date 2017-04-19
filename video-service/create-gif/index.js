'use strict';

const AWS = require('aws-sdk');
const fs = require('fs-extra');
const BbPromise = require('bluebird');
const spawn = require('child_process').spawn;
const moment = require('moment');
const exec = require('child_process').exec;

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
  ffprobe,
} = require('../lib/spawn');

const probeVideo = (input) => new Promise((resolve) => {
  const cmd = `${ffprobe()} -v quiet -print_format json -show_format "${input}"`;
  exec(cmd, (error, stdout, stderr) => {
    resolve(JSON.parse(stdout));
  });
});

const createGif = ({ input, output, directory, duration }) => {
  const frames = 10;
  const fps = frames / duration;
  const command = `-i ${input} -vf scale=320:-1:flags=lanczos,fps=${fps} ${path.join(directory, '%06d.png')}`;
  console.log(command);
  return spawnPromise(spawn(ffmpeg(), (command).split(' ')))
    .then(() =>
      spawnPromise(spawn(ffmpeg(), (`-i ${path.join(directory, '%06d.png')} -vf setpts=6*PTS ${output}`).split(' '))))
};

  // 10 seconds from start
  //spawnPromise(spawn(ffmpeg(), (`-t 10 -i ${input} -vf scale=320:-1 ${output}`).split(' ')));
  // -i ${file} -vf setpts=4*PTS ${path.join(directory, `preview-${session}.gif`)}

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
    .then(() => probeVideo(input))
    .then((data) => {
      console.log(JSON.stringify(data, null, 2));
      if (Object.keys(data).length === 0 && data.constructor === Object) {
        return Promise.reject('Failed to read video properties');
      }

      return parseFloat(data.format.duration);
    })
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
    .then(() =>
      snsQueue.sendMessage(process.env.STATUS_TOPIC, { message: { id } }))
    .then(() => callback(null, 'ok'));
};
