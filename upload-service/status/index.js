'use strict';

const { parseS3SNSEvent } = require('../../shared/helpers');
const { insertSession } = require('../lib/database');

const AWS = require('aws-sdk');

const s3 = new AWS.S3();

module.exports.handler = (event, context, callback) => {
  const {
    bucket,
    key,
    id,
  } = parseS3SNSEvent(event);

  s3.getObject({
    Bucket: bucket,
    Key: key,
  }).promise()
    .then((data) => insertSession({ id, status: 1, data }))
    .then(() => callback(null, 'ok'));
};
