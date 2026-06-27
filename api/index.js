'use strict';

// Vercel serverless entry point. Vercel turns this file into a function and
// (via vercel.json rewrites) routes every request to it. The same Express app
// is used for `npm start` locally — see src/server.js.
const createApp = require('../src/app');

module.exports = createApp();
