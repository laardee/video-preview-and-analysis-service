'use strict';

const AWS = require('aws-sdk');
const fetch = require('node-fetch');
const url = require('url');
const path = require('path');

const s3 = new AWS.S3();

/**
 * Downloads file from Facebook CDN and puts it to S3 Bucket
 * @param event
 * @param context
 * @param callback
 * @returns {*}
 */
module.exports.handler = (event, context, callback) => {
  if (event.Records && event.Records[0].Sns) {
    const notification = event.Records[0].Sns;
    const message = JSON.parse(notification.Message);

    const { base } = path.parse(url.parse(message.url).pathname);
    const key = `videos/${message.id}/${base}`;

    return fetch(message.url)
      .then(res => res.buffer())
      .then(buffer =>
        s3.putObject({
          Bucket: process.env.SOURCE_BUCKET,
          Key: key,
          Body: buffer,
          ContentType: 'video/mp4',
        }).promise())
      .then(() => callback(null, 'ok'));
  }

  return callback('Not SNS');
};
