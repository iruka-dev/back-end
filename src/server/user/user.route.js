const express = require('express');
const octokit = require('@octokit/rest')();
const mongoose = require('mongoose');

const config = require('../../config/config');


const User = require('./user.model');
const Issue = require('../issue/issue.model');


const router = express.Router(); // eslint-disable-line new-cap

octokit.authenticate({
  type: 'oauth',
  key: config.github.id,
  secret: config.github.secret,
});

router.route('/users');

// POST: Update all of the users in the database
router.post('/', async (req, res)  =>  {
  // Remove existing data
  mongoose.connection.db.dropDatabase();
  // Send request to GitHub graphql servers
  try {
    const data = await graphql(
      `
      {
        repository(owner: "iruka-dev", name: "iruka") {
          stargazers(first: 50) {
            nodes {
              login
              company
              repositories(last: 10) {
                nodes {
                  name
                  languages(first: 3) {
                    nodes {
                      name
                    }
                  }
                  issues(last: 10) {
                    nodes {
                      title,
                      labels(first: 2) {
                        nodes {
                          name
                          url
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
      `, {
        headers: {
          authorization: ``
        }
      }
    )
    
    // Iterate over all stargazers
    data.repository.stargazers.nodes.forEach((stargazer) => {
      // Generate a new user in database
      const newUser = new User({
        username: stargazer.login,
        issues: [],
        organization: stargazer,
      });
      // Iterate over all repos for said stargazer
      stargazer.repositories.nodes.forEach((repo) => {
        // Iterate over all issues for said repository
        repo.issues.nodes.forEach((issue) => {
          // Generate new issue
          const newIssue = new Issue({
            title: issue.title,
            labels: issue.labels.nodes.map(issue => issue.name),
            link: issue.url,
            language: repo.languages.nodes.map(language => language.name),
          });
          // Save the issue into database
          const savedIssue = await newIssue.save();
          // Add the issue to the new user
          newUser.issues.unshift(savedIssue);
        })
        // Save the new user to the database
        newUser.save();
      })
    })
    console.log('Refetched user data');
  } catch(err) {
    console.error(err);
  }
      res.status(200).send();
});

// GET: Returns all the users
router.get('/', (req, res) => {
  User.find({})
    .then((users) => {
      res.status(200).json(users);
    }).catch((err) => {
      console.error(err);
      res.status(400);
    });
});

module.exports = router;
