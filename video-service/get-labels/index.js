'use strict';

const AWS = require('aws-sdk');
const path = require('path');

const { updateLabels } = require('../lib/database');

const rekognition = new AWS.Rekognition();

/**
 * Handles label request to Amazon Rekognition
 * @param event
 * @param context
 * @param callback
 * @returns {Promise.<TResult>}
 */
module.exports.handler =
  (event, context, callback) => {
    const message = JSON.parse(event.Records[0].Sns.Message);
    const { bucket, object } = message.Records[0].s3;
    const { base, dir } = path.parse(object.key);
    const id = dir.replace(/captures\//, '');

    const params = {
      Image: {
        S3Object: {
          Bucket: bucket.name,
          Name: object.key,
        },
      },
      MaxLabels: 100,
      MinConfidence: 50,
    };

    return rekognition.detectLabels(params).promise()
      .then(data => {
        const labels = data.Labels || [];
        return updateLabels(Object.assign({ id, frame: base }, { labels }));
      })
      .then(() => callback(null))
      .catch((error) => {
        console.log(JSON.stringify(error));
        callback(error);
      });
  };
