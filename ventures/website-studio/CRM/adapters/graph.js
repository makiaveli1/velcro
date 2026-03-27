function logStub(methodName) {
  console.log(`[graph adapter] ${methodName} called, but Microsoft Graph is not integrated yet.`);
}

async function getContacts(token) {
  logStub('getContacts');
  return [];
}

async function getCalendarEvents(token, since) {
  logStub('getCalendarEvents');
  return [];
}

async function getMessages(token, since) {
  logStub('getMessages');
  return [];
}

async function getThread(token, threadId) {
  logStub('getThread');
  return null;
}

module.exports = {
  getContacts,
  getCalendarEvents,
  getMessages,
  getThread,
};
