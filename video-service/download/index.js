'use strict';

const AWS = require('aws-sdk');
const fetch = require('node-fetch');
const fs = require('fs-extra');
const url = require('url');
const path = require('path');
const BbPromise = require('bluebird');
// const { createStatus } = require('../lib/database');

const s3 = new AWS.S3();

const writeFile = BbPromise.promisify(fs.writeFile);
const ensureDir = BbPromise.promisify(fs.ensureDir);

module.exports.handler = (event, context, callback) => {
  if (event.Records && event.Records[0].Sns) {
    const notification = event.Records[0].Sns;
    const message = JSON.parse(notification.Message);

    const { base } = path.parse(url.parse(message.url).pathname);
    const directory = path.join('/', 'tmp', 'videos', message.id);
    const file = path.join(directory, base);
    const key = `videos/${message.id}/${base}`;

    return ensureDir(directory)
      .then(() => fetch(message.url))
      .then((res) => res.buffer())
      .then((buffer) =>
        writeFile(file, buffer))
      // pass buffer forward?
      .then(() =>
        s3.putObject({
          Bucket: process.env.DOWNLOAD_BUCKET,
          Key: key,
          Body: fs.readFileSync(file),
          ContentType: 'video/mp4',
        }).promise())
      // .then(() =>
      //   createStatus({ id: message.id, video: key }))
      .then(() => callback(null, 'ok'));
  }

  return callback('Not SNS');
};
