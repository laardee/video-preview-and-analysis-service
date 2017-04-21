'use strict';

const { parseS3SNSEvent } = require('../../shared/helpers');
const { updateSession } = require('../lib/database');
const AWS = require('aws-sdk');

const s3 = new AWS.S3();

/**
 * Handles processing status
 * @param event
 * @param context
 * @param callback
 * @returns {*}
 */
module.exports.handler = (event, context, callback) => {
  const {
    bucket,
    key,
    id,
    error,
  } = parseS3SNSEvent(event);

  if (!error) {
    return s3.getObject({
      Bucket: bucket,
      Key: key,
    }).promise()
      .then((data) => updateSession({ id, status: 1, data }))
      .then(() => callback(null, 'ok'));
  }

  return updateSession({ id, status: 1, error })
    .then(() => callback(error.description));
};
