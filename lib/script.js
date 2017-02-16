var deepEqual = require('deep-equal');
var fs = require('fs');
var ucs2 = require('punycode').ucs2;

var unicode = 'unicode-9.0.0';
var scripts = {};

fs.readdirSync(__dirname+'/../node_modules/'+unicode+'/Script_Extensions').forEach(function (script) {
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

    if (!matches.some(function (item) { return item === 'Common' || item === 'Inherited' })
      && !deepEqual(matches, lastMatches, { strict: true }))
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
      chunks.push([strChunk, lastMatches && lastMatches.length ? lastMatches : ['Latin']]);
      strChunk = '';
    }
  }
}

function detectChar(c) {
  var matches = [];

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

    // stay with previous script, if possible
    if (lastScript !== undefined && matches.some(function (item) { return item === lastScript })) {
      merged[merged.length - 1][0] += txt;
    }
    // use following script, if it overlaps and narrows down our choices
    else if (matches.length > 1 && i+1 < chunks.length && chunks[i+1][1].length === 1
      && matches.some(function (item) { return item === chunks[i+1][1][0] }))
    {
      i++;
      lastScript = chunks[i][1][0];
      merged.push([txt + chunks[i][0], lastScript]);
    }
    // otherwise, use alphabetically first script, falling back to Latin
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
