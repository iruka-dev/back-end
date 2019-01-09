const express = require('express');
const octokit = require('@octokit/rest');


const User = require('./user.model');
const Organization = require('../organization/organization.model');
const Issue = require('../issue/issue.model');


const router = express.Router(); // eslint-disable-line new-cap

router.route('/users');

// POST: Update all of the users in the database
router.post('/', (req, res) => {
  // Get request for all stargazers of Ikura repo
  const getStargazers = octokit.activity.listStargazersForRepo.endpoint.merge({
    owner: 'ikura-dev',
    repo: 'ikura'
  });

  // Paginates, returning all stargazers instead of a page
  octokit.paginate(getStargazers)
    .then((stargazers) => {
      // Iterate over all stargazers
      stargazers.forEach((stargazer) => {
        const username = stargazer.login;
        octokit.users.getByUsername({
          username
        })
          .then((user) => {
            let organizationName = user.company;
            // Remove @ from beginning of string if present
            if (organizationName.charAt(0) === '@') {
              organizationName = organizationName.substr(1);
            }
            const newUser = new User({
              username,
              issues: []
            });

            Organization.find({
              name: organizationName
            })
              .then((org) => {
                newUser.organization = org.id;
              }).catch(err => console.error(err));

            const getRepos = octokit.repos.listForUser({
              username
            });

            octokit.paginate(getRepos)
              .then((repos) => {
                repos.forEach((repo) => {
                  const getIssues = octokit.issues.listForRepo({
                    owner: username,
                    repo: repo.name,
                  });

                  octokit.repos.listLanguages({
                    owner: username,
                    repo: repo.name
                  }).then(result =>
                    Object.keys(result)
                  ).then((languages) => {
                    octokit.paginate(getIssues)
                      .then((issues) => {
                        issues.forEach((issue) => {
                          const labeles = issue.labels.map(a => a.name);
                          const newIssue = new Issue({
                            title: issue.title,
                            lables: labeles,
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
