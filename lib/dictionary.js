const _ = require('lodash');
const fs = require('fs');

var phrases = fs.readFileSync('lib/words.txt', 'utf-8')
    .split('\n')
    .map(w => _.replace(w, '\r', ''))
    .filter(Boolean);

// TODO: Check all phrases are valid characters!

const byLength = _.groupBy(phrases, l => l.length)

module.exports = {byLength}
