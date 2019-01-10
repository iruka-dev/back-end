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
        octokit.users.getByUsername({
          username,
        })
          .then((data) => {
            let organizationName = data.data.company.toLowerCase().replace(/\s/g, '');
            if (!organizationName) { return; }
            // Remove @ from beginning of string if present
            if (organizationName.charAt(0) === '@') {
              organizationName = organizationName.substr(1);
            }
            const newUser = new User({
              username,
              issues: [],
              organization: organizationName,
            });

            const getRepos = octokit.repos.listForUser.endpoint.merge({
              username
            });


            octokit.paginate(getRepos)
              .then((repos) => {
                repos.forEach((repo) => {
                  const getIssues = octokit.issues.listForRepo.endpoint.merge({
                    owner: username,
                    repo: repo.name,
                  });

                  octokit.repos.listLanguages({
                    owner: username,
                    repo: repo.name
                  }).then((result) => {
                    const languageObj = result.data;
                    return Object.keys(languageObj);
                  }).then((languages) => {
                    octokit.paginate(getIssues)
                      .then((issues) => {
                        issues.forEach((issue) => {
                          const labels = issue.labels.map(a => a.name);
                          const newIssue = new Issue({
                            title: issue.title,
                            labels,
                            link: issue.html_url,
                            language: languages,
                          });

                          newIssue.save()
                            .then((savedIssue) => {
                              newUser.issues.unshift(savedIssue);
                            }).catch(err => console.error(err));
                        });
                        newUser.save();
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
