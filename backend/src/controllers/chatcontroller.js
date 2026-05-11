// Temporary in-memory storage
let messages = [];

const getMessages = (req, res) => {
  res.json(messages);
};

module.exports = { getMessages };