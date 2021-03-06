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
router.post('/', (req, res) => {
  // Remove existing data
  mongoose.connection.db.dropDatabase();
  // Get request for all stargazers of Ikura repo
  const getStargazers = octokit.activity.listStargazersForRepo.endpoint.merge({
    owner: 'iruka-dev',
    repo: 'iruka',
  });

  // Paginates, returning all stargazers instead of a page
  octokit.paginate(getStargazers)
    .then((stargazers) => {
      // Iterate over all stargazers
      stargazers.forEach((stargazer) => {
        const username = stargazer.login;
        // Fetch a single user
        octokit.users.getByUsername({
          username,
        })
          .then((data) => {
            // Grab that users organization
            let organizationName = data.data.company;
            // If the user doesn't have an organization stop
            if (!organizationName) {
              return;
            }
            // Remove whitespace
            organizationName = organizationName.toLowerCase().replace(/\s/g, '');
            // Remove @ from beginning of string if present
            if (organizationName.charAt(0) === '@') {
              organizationName = organizationName.substr(1);
            }
            // Create user object
            const newUser = new User({
              username,
              issues: [],
              organization: organizationName,
            });


            const getRepos = octokit.repos.listForUser.endpoint.merge({
              username
            });

            // Grab the user's repos
            octokit.paginate(getRepos)
              .then((repos) => {
                repos.forEach((repo) => {
                  const getIssues = octokit.issues.listForRepo.endpoint.merge({
                    owner: username,
                    repo: repo.name,
                  });
                  // Grab the repo's languages
                  octokit.repos.listLanguages({
                    owner: username,
                    repo: repo.name
                  }).then((result) => {
                    const languageObj = result.data;
                    return Object.keys(languageObj);
                  }).then((languages) => {
                    // Grab the repo's issues
                    octokit.paginate(getIssues)
                      .then((issues) => {
                        issues.forEach((issue) => {
                          // Take the label names
                          const labels = issue.labels.map(a => a.name);
                          // Create an issue
                          const newIssue = new Issue({
                            title: issue.title,
                            labels,
                            link: issue.html_url,
                            language: languages,
                          });

                          // Store the issue save promise in a list
                          newIssue.save()
                            .then((savedIssue) => {
                              // Insert the saved issue into the issues of the new user
                              newUser.issues.unshift(savedIssue);
                              newUser.save().then(() => {
                              }).catch((err) => {
                                console.error(err);
                                console.error('Could not save user:', newUser);
                              });
                            }).catch(err => console.error(err));
                        });
                      }).catch(err => console.error(err));
                  }).catch(err => console.error(err));
                });
              }).catch(err => console.error(err));
          }).catch(err => console.error(err));
      });
      console.log('Refetched user data');
      res.status(200).send();
    }).catch(err => console.error(err));
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
