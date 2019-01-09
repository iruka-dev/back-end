const express = require('express');
const thingRoutes = require('./server/thing/thing.route');
// const userRoutes = require('./server/user/user.route');
const router = express.Router(); // eslint-disable-line new-cap

// #TODO: Change to your model.
// router.use('/users', userRoutes);

router.use('/things', thingRoutes);

module.exports = router;
