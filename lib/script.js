var deepEqual = require('deep-equal');
var emojiRegex = require('emoji-regex')();
var fs = require('fs');
var ucs2 = require('punycode').ucs2;

var unicode = 'unicode-9.0.0';
var scripts = {};

fs.readdirSync(__dirname + '/../node_modules/'+unicode+'/Script_Extensions').forEach(function (script) {
  scripts[script] = require(unicode+'/Script_Extensions/'+script+'/regex');
});

function split(str) {
  var codepoints = ucs2.decode(str);

  var chunks = [];
  var strChunk = '';
  var lastMatches;

  for (var i = 0; i < codepoints.length; i++) {
    var char = ucs2.encode([codepoints[i]]);
    var matches = detectChar(char);
    var commonInherited = matches.some(function (item) { return item === 'Common' || item === 'Inherited' });

    // Emoji font doesn't have punctuation
    if (commonInherited && deepEqual(lastMatches, ['Emoji'], { strict: true })) {
      matches = ['Latin'];
      commonInherited = false;
    }
    else if (deepEqual(matches, ['Emoji'], { strict: true }) && lastMatches === undefined) {
      pushChunk();
    }

    if (!commonInherited && !deepEqual(matches, lastMatches, { strict: true }))
    {
        if (lastMatches !== undefined) pushChunk();
        lastMatches = matches;
    }

    strChunk += char;
  }

  pushChunk();

  return mergeChunks(chunks);

  function pushChunk() {
    if (strChunk.length) {
      chunks.push([strChunk, lastMatches || ['Latin']]);
      strChunk = '';
    }
  }
}

function detectChar(c) {
  var matches = [];

  if (c.match(emojiRegex)) return ['Emoji'];

  for (var i in scripts) {
    if (c.match(scripts[i])) matches.push(i);
  }

  return matches.sort();
}

function mergeChunks(chunks) {
  var merged = [];
  var lastScript;

  for (var i = 0; i < chunks.length; i++) {
    var txt = chunks[i][0];
    var matches = chunks[i][1];

    if (lastScript !== undefined && matches.some(function (item) { return item === lastScript })) {
      merged[merged.length - 1][0] += txt;
    }
    else if (matches.length > 1 && i+1 < chunks.length && chunks[i+1][1].length === 1 &&
      matches.some(function (item) { return item === chunks[i+1][1][0] }))
    {
      lastScript = chunks[i+1][1][0];
      merged.push([txt, lastScript]);
    }
    else {
      matches = matches.filter(function (item) { return item !== 'Common' && item !== 'Inherited' });
      lastScript = matches[0] || 'Latin';
      merged.push([txt, lastScript]);
    }
  }

  return merged;
}

module.exports = {
    detectChar: detectChar,
    split: split
}
