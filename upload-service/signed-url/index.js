'use strict';

const AWS = require('aws-sdk');
const uuidV4 = require('uuid/v4');
const { insertSession } = require('../lib/database');

const s3 = new AWS.S3();

const createResponse = (error, data) => {
  const statusCode = error ? 500 : 200;
  const body = error || data;
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: JSON.stringify(body),
  };
};

module.exports.handler =
  (event, context, callback) => {
    const file = event.queryStringParameters.file;
    const session = uuidV4();
    const filename = `videos/${session}/${file}`;

    return insertSession({ id: session, status: 0 })
      .then(() => {
        s3.getSignedUrl('putObject', {
          Bucket: process.env.SOURCE_BUCKET,
          Key: filename,
        }, (err, url) =>
          callback(null, createResponse(err, { url, session })));
      })
  };
