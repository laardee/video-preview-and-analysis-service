'use strict';

// change the API endpoint!
const api = 'https://randomchars.execute-api.us-east-1.amazonaws.com/dev';

const displayStatus =
  (text) =>
    $('#status').html(text);

const uploadFile = ({ url, session, file }) =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () =>
      fetch(url, {
        method: 'PUT',
        mode: 'cors',
        headers: {
          'content-length': file.size,
        },
        body: reader.result,
      })
        .then(() => resolve(session));
    reader.readAsArrayBuffer(file);
  });

const getSessionId = () => {
  if (Object.keys(localStorage).indexOf('video-session') > -1) {
    return JSON.parse(localStorage.getItem('video-session')).id;
  }

  return null;
};

const refreshContent = () => {
  if (getSessionId()) {
    const {
      id,
      gifUrl,
      videoUrl,
      message,
      status,
      labels,
    } = JSON.parse(localStorage.getItem('video-session'));

    if (status === -1) {
      displayStatus('Failed to process video');
    } else {
      displayStatus(`${message} [${id}]`);
    }

    if (status === 1) {
      $('#video-container').attr('src', videoUrl);
      $('#preview-container').attr('src', gifUrl);
      const labelsList =
        labels.map(label => `<li>${label.Name} [${label.Confidence}]</li>`).join('');
      $('#labels-container').html(labelsList);
    } else {
      $('#video-container').attr('src', '');
      $('#preview-container').attr('src', '');
      $('#labels-container').html('');
    }
  }
};

const insertSessionToLocalStorage = (data) => {
  if (data) {
    localStorage.setItem('video-session', JSON.stringify(data));
    refreshContent();
  }

  return data;
};

const refreshMetadata = (session) =>
  getMetadata(session) // eslint-disable-line  no-use-before-define
    .then(insertSessionToLocalStorage)
    .catch(() => displayStatus('Choose video to upload.'));

const getMetadata = (session) => {
  if (session) {
    return fetch(`${api}/metadata/${session}`)
      .then(response => response.json())
      .then((data) => {
        if (data.status === 0) {
          setTimeout(() => {
            const id = getSessionId();
            if (id) {
              refreshMetadata(session);
            }
          }, 5000);
        }
        return data;
      });
  }

  return Promise.reject('no session');
};

$(() => {
  refreshMetadata(getSessionId());

  $('body').on('click', 'button.refresh', (event) => {
    const id = $(event.target).attr('id');
    getMetadata(id)
      .then(insertSessionToLocalStorage)
      .then(refreshContent);
  });

  $('#upload-video #video').change(() => {
    const file = $('#upload-video #video')[0].files[0];
    displayStatus(`Press Submit to upload ${file.name}`);
    localStorage.setItem('video-session', JSON.stringify({}));
  });

  $('#upload-video')
    .on('submit', (event) => {
      event.preventDefault();
      const file = $('#upload-video #video')[0].files[0];
      fetch(`${api}/signed-url?file=${file.name}`)
        .then((response) => response.json())
        .then((data) => {
          insertSessionToLocalStorage({ id: data.session, message: 'Uploading' });
          return data;
        })
        .then(({ url, session }) => uploadFile({ url, session, file }))
        .then(refreshMetadata)
        .then(console.log);
    });
});

