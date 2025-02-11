# @webex/common-evented

[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)

> Class property decorator the adds change events to properties

- [@webex/common-evented](#webexcommon-evented)
  - [Install](#install)
  - [Usage](#usage)
  - [Maintainers](#maintainers)
  - [Contribute](#contribute)
  - [License](#license)

## Install

```bash
npm install --save @webex/common-evented
```

## Usage

```js

const evented = require(`@webex/common-evented`);
const Events = require(`ampersand-events`);

class X extends Events {
  @evented
  prop = null
}

const x = new X();
x.on(`change:prop`, () => {
  console.log(x.prop)
  // => 6
});
x.prop = 6;
```

## Maintainers

This package is maintained by [Cisco Webex for Developers](https://developer.webex.com/).

## Contribute

Pull requests welcome. Please see [CONTRIBUTING.md](https://github.com/webex/webex-js-sdk/blob/master/CONTRIBUTING.md) for more details.

## License

© 2016-2020 Cisco and/or its affiliates. All Rights Reserved.
