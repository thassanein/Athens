'use strict';

require('dotenv').config();

const createApp = require('./app');

const app = createApp();
const port = Number(process.env.PORT || 3000);

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Athens Command Center running on http://localhost:${port}`);
});
