const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: {
    type: String,
    required: true
  },
  issues: [{
    type: Schema.Types.ObjectId,
    ref: 'Issue',
  }],
  organization: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model('User', userSchema);
