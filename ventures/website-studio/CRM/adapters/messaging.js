function logStub(methodName) {
  console.log(`[messaging adapter] ${methodName} called, but messaging is not integrated yet.`);
}

async function sendAlert(channel, message) {
  logStub('sendAlert');
  return {
    ok: true,
    queued: false,
    channel,
    message,
    reason: 'Messaging adapter stub only',
  };
}

async function sendDigest(digestData) {
  logStub('sendDigest');
  return {
    ok: true,
    queued: false,
    digestData,
    reason: 'Messaging adapter stub only',
  };
}

module.exports = {
  sendAlert,
  sendDigest,
};
