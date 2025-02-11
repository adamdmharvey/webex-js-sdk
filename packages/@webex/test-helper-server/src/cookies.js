/*!
 * Copyright (c) 2015-2020 Cisco Systems, Inc. See LICENSE file.
 */


const cookieParser = require(`cookie-parser`);
const express = require(`express`);

/* eslint new-cap: [0] */
const router = express.Router();

// Enable cookies
// --------------

router.use(cookieParser());

router.get(`/set`, (req, res) => {
  res.status(200).cookie(`oreo`, `double stuf`).send().end();
});

router.get(`/expect`, (req, res) => {
  if (req.cookies.oreo === `double stuf`) {
    res.status(200).send().end();
  }
  else {
    res.status(403).send().end();
  }
});

module.exports = router;
