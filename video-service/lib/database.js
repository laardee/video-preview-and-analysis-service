'use strict';

const AWS = require('aws-sdk');

const config = {
  region: AWS.config.region || process.env.SERVERLESS_REGION || 'us-east-1',
};

const dynamodb = new AWS.DynamoDB.DocumentClient(config);

const insertLabels = (data) => {
  const params =
    Object.assign(
      { TableName: process.env.LABELS_TABLE_NAME },
      { Item: data });
  return dynamodb.put(params).promise();
};

const createStatus = (data) => {
  const params =
    Object.assign(
      { TableName: process.env.STATUS_TABLE_NAME },
      { Item: Object.assign({ status: 0 }, data) });
  return dynamodb.put(params).promise();
};

const updateStatus = (data) => {
  const updateData = Object.keys(data).reduce((result, item) => {
    if (item !== 'id') {
      const updateExpressionAttributeName = {};
      const attributeName = `#${item}`;
      updateExpressionAttributeName[attributeName] = item;
      result.ExpressionAttributeNames =     // eslint-disable-line no-param-reassign
        Object.assign({}, result.ExpressionAttributeNames, updateExpressionAttributeName);

      const updateExpressionAttributeValue = {};
      const attributeValueName = `:${item}`;
      updateExpressionAttributeValue[attributeValueName] = data[item];
      result.ExpressionAttributeValues =     // eslint-disable-line no-param-reassign
        Object.assign({}, result.ExpressionAttributeValues, updateExpressionAttributeValue);

      result.UpdateExpression.push(`${attributeName} = ${attributeValueName}`);
    }
    return result;
  }, {
    ExpressionAttributeNames: {},
    ExpressionAttributeValues: {},
    UpdateExpression: [],
  });

  const params = Object.assign({
    TableName: process.env.STATUS_TABLE_NAME,
    Key: {
      id: data.id,
    },
    ReturnValues: 'ALL_NEW',
  }, {
    ExpressionAttributeNames: updateData.ExpressionAttributeNames,
    ExpressionAttributeValues: updateData.ExpressionAttributeValues,
    UpdateExpression: `set ${updateData.UpdateExpression.join(', ')}`,
  });

  console.log('update', JSON.stringify(params));
  return dynamodb.update(params).promise();
};

const getStatus = (id) =>
  dynamodb.get({
    TableName: process.env.STATUS_TABLE_NAME,
    Key: {
      id,
    },
  }).promise();

const getLabels = (id) =>
  dynamodb.scan({
    TableName: process.env.LABELS_TABLE_NAME,
    ProjectionExpression: '#id, #frame, #labels',
    FilterExpression: '#id = :id',
    ExpressionAttributeNames: {
      '#id': 'id',
      '#frame': 'frame',
      '#labels': 'labels',
    },
    ExpressionAttributeValues: {
      ':id': id,
    },
  }).promise();

module.exports = {
  createStatus,
  updateStatus,
  insertLabels,
  getStatus,
  getLabels,
};
