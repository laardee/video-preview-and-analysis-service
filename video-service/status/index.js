'use strict';

const AWS = require('aws-sdk');

const {
  getStatus,
  getLabels,
} = require('../lib/database');

const config = {
  region: AWS.config.region || process.env.SERVERLESS_REGION || 'us-east-1',
};

const s3 = new AWS.S3(config);

module.exports.handler = (event, context, callback) => {
  console.log(JSON.stringify(event, null, 2));
  const { id } = JSON.parse(event.Records[0].Sns.Message);
  const promises = [getStatus(id), getLabels(id)];
  const metadataKey = `${id}/metadata.json`;
  return Promise.all(promises)
    .then(([statusItem, labelItems]) => {
      // save only if no labels yet in status

      const status = statusItem.Item;
      const labels = labelItems.Items;
      const allLabels = labels.reduce((result, item) => {
        item.labels.forEach((label) => {
          // if (result.indexOf(label)) {
          result.push(label);
          // }
        });
        return result;
      }, []);
      console.log('status', JSON.stringify(status));
      console.log('labels', JSON.stringify(labels));
      console.log('all labels', JSON.stringify(allLabels));
      return { url: status.signedUrl, labels: allLabels };
    })
    .then((payload) => s3.putObject({
      Bucket: process.env.RENDER_BUCKET,
      Key: metadataKey,
      ContentType: 'application/json',
      Body: JSON.stringify(payload),
    }).promise())
    .then(() => callback(null, 'ok'));
};
