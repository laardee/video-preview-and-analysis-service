'use strict';

/**
 * Verifies Messenger Token
 * @param queryStringParameters
 * @returns {*}
 */
module.exports = ({ queryStringParameters }) => {
  const verifyToken = queryStringParameters['hub.verify_token'];
  const challenge = queryStringParameters['hub.challenge'];

  const headers = {
    'Content-Type': 'text/html',
  };

  if (verifyToken === process.env.FACEBOOK_BOT_VERIFY_TOKEN) {
    return Object.assign({
      statusCode: 200,
      body: challenge,
    }, { headers });
  }

  return Object.assign({
    statusCode: 403,
    body: 'Invalid Token',
  }, { headers });
};
