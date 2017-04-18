'use strict';

const AWS = require('aws-sdk');

const config = {
  region: AWS.config.region || process.env.SERVERLESS_REGION || 'us-east-1',
};

const dynamodb = new AWS.DynamoDB.DocumentClient(config);

/**
 * Gets session by session id
 * @param id
 */
const getSession = (id) =>
  dynamodb.get({
    TableName: process.env.SESSION_TABLE_NAME,
    Key: {
      id,
    },
  }).promise();

/**
 * Inserts session
 * @param data
 */
const insertSession = (data) =>
  dynamodb.put({
    TableName: process.env.SESSION_TABLE_NAME,
    Item: data,
  }).promise();

module.exports = {
  getSession,
  insertSession,
};
