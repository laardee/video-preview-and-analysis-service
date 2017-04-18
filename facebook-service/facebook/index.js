'use strict';

const verify = require('./verify');
const message = require('./message');
const { getSession } = require('../lib/database');
const { parseS3Event } = require('../../shared/helpers');
const AWS = require('aws-sdk');

const s3 = new AWS.S3();

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
  console.log(JSON.stringify(event, null, 2))
  if (event.httpMethod === 'GET') {
    return callback(null, verify(event));
  } else if (event.httpMethod === 'POST') {
    return message.receiveEntries(JSON.parse(event.body).entry || [])
      .then(() => callback(null, {
        statusCode: 200,
        body: JSON.stringify({ status: 'ok' }),
      }))
      .catch((error) => callback(null, {
        statusCode: 500,
        body: JSON.stringify({ error }),
      }));
  } else if (event.Records && event.Records[0] && event.Records[0].Sns) {
    const snsMessage = JSON.parse(event.Records[0].Sns.Message);
    const {
      id,
      bucket,
      key,
    } = parseS3Event(snsMessage.Records[0].s3);

    return s3.getObject({
      Bucket: bucket,
      Key: key,
    }).promise()
      .then((metadataObject) => {
        const metadata = JSON.parse(metadataObject.Body.toString());
        return getSession(id)
          .then(({ Item }) => {
            const { sender } = Item;
            return getSignedUrl(metadata.gif)
              .then(signedUrl =>
                message.sendGif(sender, { gif: signedUrl }))
              .then(() => {
                const text =
                  metadata.labels
                    .map((label) => label.Name)
                    .join(', ');
                return message.sendMessage(sender, { text });
              });
          });
      })
      .then(() => callback(null, 'ok'));
  }

  return callback(null,
    { statusCode: 404, body: JSON.stringify({ error: 'Invalid request.' }) });
};
