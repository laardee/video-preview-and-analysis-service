'use strict';

const AWS = require('aws-sdk');

const {
  getStatus,
  getLabels,
  updateStatus,
} = require('../lib/database');

const config = {
  region: AWS.config.region || process.env.SERVERLESS_REGION || 'us-east-1',
};

const s3 = new AWS.S3(config);

const checkIfLabelsExists = (labels) => {
  let exists = true;
  labels.forEach((label) => {
    if (!label.labels) {
      exists = false;
    }
  });
  return exists;
};


module.exports.handler = (event, context, callback) => {
  console.log(JSON.stringify(event, null, 2));
  const { id } = JSON.parse(event.Records[0].Sns.Message);
  const promises = [getStatus(id), getLabels(id)];
  const metadataKey = `${id}/metadata.json`;

  return Promise.all(promises)
    .then(([statusItem, labelItems]) => {
      const status = statusItem.Item;
      const labels = labelItems.Items;

      if (status.status === 0 && status.gif && status.captures === 1 && checkIfLabelsExists(labels)) {
        const allLabels = labels.reduce((result, labelsObject) => {
          labelsObject.labels.forEach((label) => {
            const existingLabel = result.filter((l) => l.Name === label.Name)[0];
            if (existingLabel) {
              if (existingLabel.Confidence < label.Confidence) {
                // Mutates :grin:
                existingLabel.Confidence = label.Confidence;
              }
            } else {
              result.push(label);
            }
          });

          return result;
        }, [])
          .sort((a, b) => b.Confidence - a.Confidence);

        console.log('status', JSON.stringify(status));
        console.log('labels', JSON.stringify(labels));
        console.log('all labels', JSON.stringify(allLabels));

        return updateStatus({ id: status.id, status: 1 })
          .then(() => ({
            video: status.video,
            gif: status.gif,
            labels: allLabels,
          }));
      }

      return null;
    })
    .then((payload) => {
      if (payload) {
        return s3.putObject({
          Bucket: process.env.RENDER_BUCKET,
          Key: metadataKey,
          ContentType: 'application/json',
          Body: JSON.stringify(payload),
        }).promise();
      }

      return null;
    })
    .then(() => callback(null, 'ok'));
};
