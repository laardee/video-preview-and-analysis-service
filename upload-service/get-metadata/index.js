'use strict';

const AWS = require('aws-sdk');

const s3 = new AWS.S3();

const { getSession } = require('../lib/database');
const { sendMessage } = require('../../shared/snsQueue');

/**
 * Returns signed URL
 * @param key
 * @param bucket
 */
const getSignedUrl = ({ key, bucket }) => new Promise((resolve, reject) => {
  s3.getSignedUrl('getObject', {
    Bucket: bucket,
    Key: key,
    Expires: 3600 * 24,
  }, (error, url) => {
    if (error) {
      console.log(error);
      return reject(error);
    }
    return resolve(url);
  });
});

/**
 * Handles metadata endpoint
 * @param event
 * @param context
 * @param callback
 * @returns {Promise.<T>}
 */
module.exports.handler = (event, context, callback) => {
  console.log(JSON.stringify(event, null, 2));
  return getSession(event.pathParameters.session)
    .then(({ Item }) => {
      const { id, status } = Item;
      let message;
      let data = {};
      let promises = [];
      switch (status) {
        case 0: {
          message = 'Processing video';
          break;
        }
        case 1: {
          message = 'Video ready';
          data = JSON.parse(Item.data.Body.toString());
          const gifUrl = getSignedUrl({ key: data.gif, bucket: process.env.RENDER_BUCKET });
          const videoUrl = getSignedUrl({ key: data.video, bucket: process.env.SOURCE_BUCKET });
          promises = [gifUrl, videoUrl];
          break;
        }
        case -1: {
          message = 'Error';
          break;
        }
        default: {
          message = 'Invalid status';
        }
      }

      return Promise.all(promises)
        .then(([gifUrl, videoUrl]) => {
          const response = {
            statusCode: typeof status === 'undefined' || status > -1 ? 200 : 400,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Credentials': true,
            },
            body: JSON.stringify({
              id,
              message,
              status,
              gifUrl,
              videoUrl,
              labels: data.labels,
              allLabels: data.allLabels,
            }),
          };

          return callback(null, response);
        })
        .then(() => {
          if (status === 0) {
            return sendMessage(process.env.STATUS_TOPIC_NAME, { message: { id } });
          }

          return null;
        });
    })
    .catch((error) => {
      const response = {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
        },
        body: JSON.stringify({
          message: error,
          status: -1,
          id: event.pathParameters.session,
        }),
      };
      return callback(null, response);
    });
};
