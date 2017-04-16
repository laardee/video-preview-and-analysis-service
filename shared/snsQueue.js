'use strict';

const AWS = require('aws-sdk');

const sns = new AWS.SNS();

/**
 * Gets topic arn
 * @param topicName
 */
const getTopicArn = (topicName) =>
  sns.listTopics().promise()
    .then((data) => {
      const arnRe = new RegExp(`arn:.+:${topicName}`);
      const topics = data.Topics || [];
      const matchedTopicArns =
        topics
          .reduce((result, topic) => {
            if (topic.TopicArn.match(arnRe)) {
              result.push(topic.TopicArn);
            }
            return result;
          }, []);

      if (matchedTopicArns.length > 0) {
        return matchedTopicArns[0];
      }

      return Promise.reject(`TOPIC_NOT_FOUND: ${topicName}`);
    });

/**
 * Sends notification
 * @param topicName
 * @param message
 * @param attributes
 * @param subject
 */
const sendMessage = (topicName, { message, attributes, subject }) =>
  new Promise((resolve, reject) => {
    getTopicArn(topicName)
      .then((topicArn) => {
        Object.assign(message, {
          stage: process.env.SERVERLESS_STAGE,
        });
        const snsNotification = {
          Message: JSON.stringify(message),
          TopicArn: topicArn,
        };

        if (attributes) {
          snsNotification.MessageAttributes = attributes;
        }

        snsNotification.Subject = subject || 'NOTIFICATION';

        if (process.env.SILENT) {
          return resolve(snsNotification);
        }

        return sns.publish(snsNotification, (err, data) => {
          if (err) {
            return reject(err);
          }

          snsNotification.messageId = data.MessageId;
          return resolve(snsNotification);
        });
      })
      .catch(error => reject(error));
  });

/**
 * Retrieve event (SNS)
 * @param event
 * @returns {Promise.<TResult>}
 */
const getMessage = (event) =>
  new Promise((resolve, reject) => {
    const record = event.Records ? event.Records[0] : null;
    if (record && record.Sns) {
      return resolve(
        JSON.parse(record.Sns.Message)
      );
    }

    return reject('No event');
  });

module.exports = {
  sendMessage,
  getMessage,
};
