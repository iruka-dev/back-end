const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const issueSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  language: [{
    type: String,
    required: true,
  }],
  labels: [{
    type: String
  }],
  link: {
    type: String,
    required: true,
  }
});

module.exports = mongoose.model('Issue', issueSchema);
