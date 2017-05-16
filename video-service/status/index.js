'use strict';

const AWS = require('aws-sdk');

const {
  getStatus,
  getLabels,
  updateStatus,
  getOpenStatuses,
} = require('../lib/database');

const { parseSNSEvent } = require('../../shared/helpers');

const config = {
  region: AWS.config.region || process.env.SERVERLESS_REGION || 'us-east-1',
};

const s3 = new AWS.S3(config);

/**
 * Checks if labels are saved
 * @param labels
 */
const checkIfLabelsExists = (labels) =>
  labels.reduce((result, label) => {
    if (Object.keys(label).indexOf('labels') === -1) {
      return false;
    }
    return result;
  }, true);

/**
 * Saves metadata json to S3 Bucket
 * @param session
 */
const saveMetadata = (session) =>
  getLabels(session.id)
    .then(({ Items: labels }) => {
      if (session.status === 0
        && session.gif
        && session.captures === 1
        && checkIfLabelsExists(labels)) {
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

        return updateStatus({ id: session.id, status: 1 })
          .then(() => ({
            id: session.id,
            video: session.video,
            gif: session.gif,
            labels,
            allLabels,
          }));
      }

      console.log(`session ${session.id} not ready yet`);
      return null;
    })
    .then((payload) => {
      if (payload) {
        return s3.putObject({
          Bucket: process.env.RENDER_BUCKET,
          Key: `${payload.id}/metadata.json`,
          ContentType: 'application/json',
          Body: JSON.stringify(payload),
        }).promise();
      }

      return null;
    });

/**
 * Handles status events
 * @param event
 * @param context
 * @param callback
 * @returns {Promise.<TResult>}
 */
module.exports.handler = (event, context, callback) => {
  console.log(JSON.stringify(event, null, 2));
  if (event.Records && event.Records[0].Sns) {
    // SNS Triggered
    const { id } = parseSNSEvent(event);
    return getStatus(id)
      .then(({ Item: session }) => saveMetadata(session))
      .then(() => callback(null, 'ok'));
  }

  // Scheduled
  return getOpenStatuses()
    .then(({ Items }) =>
      Promise.all(Items.map(saveMetadata)))
    .then(() => callback(null, 'ok'));
};

