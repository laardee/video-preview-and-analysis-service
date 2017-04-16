'use strict';

const spawnPromise = (spawnProcess) => new Promise((resolve, reject) => {
  spawnProcess.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
  });

  spawnProcess.stderr.on('data', (data) => {
    console.log(`stderr: ${data}`);
  });

  spawnProcess.on('close', (code) => {
    console.log(`child process exited with code ${code}`);
    if (code === 0) {
      return resolve();
    }
    return reject(code);
  });
});

const pad = (number, size) => {
  let result = `${number}`;
  while (result.length < size) result = `0${result}`;
  return result;
};

const ffmpeg = () => process.env.FFMPEG || './ffmpeg/ffmpeg'; // defaults to included ffmpeg binary;

module.exports = {
  spawnPromise,
  pad,
  ffmpeg,
};
