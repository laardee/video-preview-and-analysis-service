'use strict';

const AWS = require('aws-sdk');

const config = {
  region: AWS.config.region || process.env.SERVERLESS_REGION || 'us-east-1',
};

const dynamodb = new AWS.DynamoDB.DocumentClient(config);

/**
 * Inserts labels
 * @param data
 */
const insertLabels = (data) => {
  const params =
    Object.assign(
      { TableName: process.env.LABELS_TABLE_NAME },
      { Item: data });
  return dynamodb.put(params).promise();
};

/**
 * Updates labels
 * @param data
 */
const updateLabels = (data) => {
  const updateData = Object.keys(data).reduce((result, item) => {
    const ExpressionAttributeNames = Object.assign({}, result.ExpressionAttributeNames);
    const ExpressionAttributeValues = Object.assign({}, result.ExpressionAttributeValues);
    if (item !== 'id' && item !== 'frame') {
      const updateExpressionAttributeName = {};
      const attributeName = `#${item}`;
      updateExpressionAttributeName[attributeName] = item;
      Object.assign(ExpressionAttributeNames, updateExpressionAttributeName);

      const updateExpressionAttributeValue = {};
      const attributeValueName = `:${item}`;
      updateExpressionAttributeValue[attributeValueName] = data[item];
      Object.assign(ExpressionAttributeValues, updateExpressionAttributeValue);

      result.UpdateExpression.push(`${attributeName} = ${attributeValueName}`);
    }
    return Object.assign({}, result, { ExpressionAttributeNames }, { ExpressionAttributeValues });
  }, {
    ExpressionAttributeNames: {},
    ExpressionAttributeValues: {},
    UpdateExpression: [],
  });

  const params = Object.assign({
    TableName: process.env.LABELS_TABLE_NAME,
    Key: {
      id: data.id,
      frame: data.frame,
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

/**
 * Returns labels
 * @param id
 */
const getLabels = (id) =>
  dynamodb.scan({
    TableName: process.env.LABELS_TABLE_NAME,
    ProjectionExpression: '#id, #frame, #time, #labels',
    FilterExpression: '#id = :id',
    ExpressionAttributeNames: {
      '#id': 'id',
      '#frame': 'frame',
      '#time': 'time',
      '#labels': 'labels',
    },
    ExpressionAttributeValues: {
      ':id': id,
    },
  }).promise();

/**
 * Creates session
 * @param data
 */
const createStatus = (data) => {
  const params =
    Object.assign(
      { TableName: process.env.SESSION_TABLE_NAME },
      { Item: Object.assign({ status: 0 }, data) });
  return dynamodb.put(params).promise();
};

/**
 * Returns open sessions
 */
const getOpenStatuses = () =>
  dynamodb.scan({
    TableName: process.env.SESSION_TABLE_NAME,
    ProjectionExpression: '#id, #status, #video, #gif, #captures',
    FilterExpression: '#status = :status AND #captures = :captures AND attribute_exists(#gif) ',
    ExpressionAttributeNames: {
      '#id': 'id',
      '#status': 'status',
      '#video': 'video',
      '#gif': 'gif',
      '#captures': 'captures',
    },
    ExpressionAttributeValues: {
      ':status': 0,
      ':captures': 1,
    },
  }).promise();

/**
 * Updates session
 * @param data
 */
const updateStatus = (data) => {
  const updateData = Object.keys(data).reduce((result, item) => {
    const ExpressionAttributeNames = Object.assign({}, result.ExpressionAttributeNames);
    const ExpressionAttributeValues = Object.assign({}, result.ExpressionAttributeValues);
    if (item !== 'id') {
      const updateExpressionAttributeName = {};
      const attributeName = `#${item}`;
      updateExpressionAttributeName[attributeName] = item;
      Object.assign(ExpressionAttributeNames, updateExpressionAttributeName);

      const updateExpressionAttributeValue = {};
      const attributeValueName = `:${item}`;
      updateExpressionAttributeValue[attributeValueName] = data[item];
      Object.assign(ExpressionAttributeValues, updateExpressionAttributeValue);

      result.UpdateExpression.push(`${attributeName} = ${attributeValueName}`);
    }
    return Object.assign({}, result, { ExpressionAttributeNames }, { ExpressionAttributeValues });
  }, {
    ExpressionAttributeNames: {},
    ExpressionAttributeValues: {},
    UpdateExpression: [],
  });

  const params = Object.assign({
    TableName: process.env.SESSION_TABLE_NAME,
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

/**
 * Gets session by session id
 * @param id
 */
const getStatus = (id) =>
  dynamodb.get({
    TableName: process.env.SESSION_TABLE_NAME,
    Key: {
      id,
    },
  }).promise();

module.exports = {
  createStatus,
  updateStatus,
  getOpenStatuses,
  getStatus,
  insertLabels,
  updateLabels,
  getLabels,
};
