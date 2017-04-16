'use strict';

const fetch = require('node-fetch');
const querystring = require('querystring');

const snsQueue = require('../../shared/snsQueue');
const { insertSession } = require('../lib/database');
const uuid = require('uuid');

function sendGif(recipientId, { gif }) {
  const message = {
    attachment: {
      type: 'image',
      payload: {
        url: gif,
      },
    },
  };

  const qs = querystring.stringify({ access_token: process.env.FACEBOOK_BOT_PAGE_ACCESS_TOKEN });
  return fetch(`https://graph.facebook.com/v2.6/me/messages?${qs}`,
    {
      method: 'POST',
      body: JSON.stringify({
        recipient: { id: recipientId },
        message,
      }),
      headers: {
        'content-type': 'application/json',
      },
    });
}

const sendMessage = (recipientId, result) => {
  const message = { text: result.text };

  if (result.quickreplies) {
    Object.assign(message, {
      quick_replies:
        result.quickreplies.map(x =>
          ({ title: x, content_type: 'text', payload: 'empty' })),
    });
  }

  const qs = querystring.stringify({ access_token: process.env.FACEBOOK_BOT_PAGE_ACCESS_TOKEN });

  return fetch(`https://graph.facebook.com/v2.6/me/messages?${qs}`,
    {
      method: 'POST',
      body: JSON.stringify({
        recipient: { id: recipientId },
        message,
      }),
      headers: {
        'content-type': 'application/json',
      },
    });
};

const receiveEntries = (entries) => {
  const messages = entries.reduce((entriesResult, entry) => {
    entriesResult.push(entry.messaging.reduce((messagingResult, message) => {
      if (message.sender && message.sender.id && message.message) {
        if (message.message.text) {
          messagingResult.push(sendMessage(message.sender.id, {
            text: 'Please send a video!',
          }));
        } else if (message.message.attachments && message.message.attachments[0].type === 'video') {
          const topicName = [
            'video-render-topic',
            process.env.SERVERLESS_STAGE,
          ].join('-');

          const id = uuid.v4();
          const url = message.message.attachments[0].payload.url;

          const notification = { id, url };
          const session = Object.assign({}, notification, { sender: message.sender.id });

          messagingResult.push(sendMessage(message.sender.id, {
            text: `Your video will be processed in no time! ${String.fromCodePoint(0x23F3)}`,
          }));

          messagingResult.push(snsQueue.sendMessage(topicName, {
            message: notification,
          }).then(() =>
            insertSession(session)));
        } else if (message.message.attachments) {
          messagingResult.push(sendMessage(message.sender.id, {
            text: `Couldn't identify the file as video. ${String.fromCodePoint(0x1F614)}`,
          }));
        }
      }

      return messagingResult;
    }, []));
    return entriesResult;
  }, [])
    .reduce((flattenResult, message) =>
      flattenResult.concat(message), []);

  return Promise.all(messages);
};

module.exports = {
  sendMessage,
  sendGif,
  receiveEntries,
};
