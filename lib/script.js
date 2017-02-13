var deepEqual = require('deep-equal');
var fs = require('fs');
var ucs2 = require('punycode').ucs2;

var unicode = 'unicode-9.0.0';
var scripts = {};

fs.readdirSync(__dirname + '/../node_modules/'+unicode+'/Script_Extensions').forEach(function (script) {
  scripts[script] = require(unicode+'/Script_Extensions/'+script+'/regex');
});

//console.log(split('વિકિપીડિયા વિષયે વાતચીત કરવા।'));
console.log(split('બુલેટિન બોર્ડ। પરિયોજનાઓ। સ્રોત અને વિકિપીડિયાનાં બહોળા કાર્યક્ષેત્રને આવરી લેતી પ્રવૃત્તિઓ॥'));

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
      chunks.push([strChunk, lastMatches || ['Latin']]);
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
  console.log(chunks);
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
