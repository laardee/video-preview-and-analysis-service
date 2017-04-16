'use strict';

const AWS = require('aws-sdk');

const config = {
  region: AWS.config.region || process.env.SERVERLESS_REGION || 'us-east-1',
};

const dynamodb = new AWS.DynamoDB.DocumentClient(config);

const getSession = (id) =>
  dynamodb.get({
    TableName: process.env.SESSION_TABLE_NAME,
    Key: {
      id,
    },
  }).promise();

const insertSession = (data) =>
  dynamodb.put({
    TableName: process.env.SESSION_TABLE_NAME,
    Item: data,
  }).promise();

module.exports = {
  getSession,
  insertSession,
};
