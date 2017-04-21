'use strict';

const { parseS3SNSEvent } = require('../../shared/helpers');
const { createStatus } = require('../lib/database');
const { sendMessage } = require('../../shared/snsQueue');

/**
 * Handles session creation
 * @param event
 * @param context
 * @param callback
 * @returns {Promise.<TResult>}
 */
module.exports.handler = (event, context, callback) => {
  console.log(JSON.stringify(event, null, 2));

  const {
    id,
    key,
    bucket,
    base,
    name,
  } = parseS3SNSEvent(event);
  return createStatus({ id, video: key })
    .then(() =>
      sendMessage(
        process.env.RENDER_START_TOPIC_NAME,
        { message: { id, key, bucket, base, name } }))
    .then(() => callback(null, 'ok'));
};
