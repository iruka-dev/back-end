const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const organizationSchema = new Schema({
  users: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }]
});

module.exports = mongoose.model('Organization', organizationSchema);
