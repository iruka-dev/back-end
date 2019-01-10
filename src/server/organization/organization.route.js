const express = require('express');

const User = require('../user/user.model');

const router = express.Router(); // eslint-disable-line new-cap

router.route('/organizations');

router.get('/:organization', (req, res) => {
  let organization = req.params.organization.toLowerCase().replace(/\s/g, '');
  // Remove @ from beginning of string if present
  if (organization.charAt(0) === '@') {
    organization = organization.substr(1);
  }
  const issues = [];
  User.find({
    organization,
  })
    .populate('issues')
    .then((users) => {
      if (users) {
        users.forEach((user) => {
          issues.concat(user.issues);
        });
      }
    }).catch(err => console.error(err));
  res.status(200).json(issues);
});
