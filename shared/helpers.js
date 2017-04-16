'use strict';

const path = require('path');

const parseS3Event = (event) => {
  const { bucket, object } = event;
  const { base, dir, name } = path.parse(object.key);
  const id =
    dir.match(/[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89aAbB][a-f0-9]{3}-[a-f0-9]{12}/)[0];

  return {
    id,
    bucket: bucket.name,
    key: object.key,
    base,
    dir,
    name,
  }
};

module.exports = {
  parseS3Event,
};
