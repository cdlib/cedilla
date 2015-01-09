var Notifier = function(config) {
  this._config = config;
};

// ------------------------------------------------------------------------------------------------
Notifier.prototype.sendMessage = function(message, callback) {
  var https = require('https'), payload;

  try {
    var target = this._config.webhook_url;
    payload = JSON.stringify({"channel": this._config.channel,
      "icon_emoji": this._config.icon,
      "username": this._config.username,
      "unfurl_links": 1,
      "text": message});

    var destination = url.parse(target),
            options = {hostname: destination.hostname,
              port: destination.port,
              path: destination.path,
              method: 'POST',
              headers: {'Content-Type': 'text/html',
                'Content-Length': Buffer.byteLength(payload)}};

    var request = https.request(options, function(response) {
      var out = '';

      // ---------------------------------------------------
      response.on('data', function(chunk) {
        out += chunk;
      });

      // ---------------------------------------------------
      response.on('end', function() {
        if (response.statusCode === 200) {
          callback('Unable to post the message to Slack! Got an HTTP ' + response.statusCode);

        } else {
          callback('');
        }

      });

      response.on('error', function(err) {
        console.log(err);
      });
    });

    request.on('error', function(err) {
      callback('Unable to post message to Slack: ' + err.message);
    });

    request.setTimeout(1000, function() {
      request.abort();
      callback('Request to Slack timed out!');
    });

    request.write(payload);
    request.end();

  } catch (e) {
    callback('Error connecting to Slack: ' + e.message);
  }
};

module.exports = Notifier;
