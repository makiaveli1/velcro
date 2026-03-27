function logStub(methodName) {
  console.log(`[embeddings adapter] ${methodName} called, but embeddings are not integrated yet.`);
}

function embed(text) {
  logStub('embed');
  return [];
}

function search(queryEmbedding, records = [], topK = 5) {
  logStub('search');
  return records.slice(0, topK).map((record, index) => ({
    rank: index + 1,
    score: 0,
    record,
  }));
}

module.exports = {
  embed,
  search,
};
