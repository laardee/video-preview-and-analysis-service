'use strict';

const AWS = require('aws-sdk');
const path = require('path');
const snsQueue = require('../../shared/snsQueue');

const { insertLabels } = require('../lib/database');

const rekognition = new AWS.Rekognition();

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
      .then(data =>
        insertLabels(Object.assign({ id, frame: base }, { labels: data.Labels })))
      .then(() =>
        snsQueue.sendMessage(process.env.STATUS_TOPIC, { message: { id } }))
      .then(() => callback(null));
  };
