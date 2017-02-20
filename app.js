var express = require('express');
var bodyParser = require('body-parser');
var errorHandler = require('errorhandler');
var logger = require('morgan');
var stylus = require('stylus');

var ejs = require('ejs');
var emojiRegex = require('emoji-regex')();
var execFile = require('child_process').execFile;
var fs = require('fs');
var request = require('request');
var uuid = require('uuid');

var config = require('./config');
var fontMap = require('./lib/font');
var fontspecScriptMap = require('./lib/fontspec_script');
var latexTemplate = fs.readFileSync(__dirname + '/lib/latex.ejs', 'utf8');
var notoFontMap = require('./lib/noto');
var roman = require('./lib/roman');
var script = require('./lib/script');

var rtlScript = {};
require('./lib/rtl').forEach(function (sc) {
  rtlScript[sc] = true;
});

var latexCommands = ['footnotesize','huge','HUGE','large','Large','LARGE','newline','normalsize','scriptsize','small','tiny'];
var latexCommandsArg = ['textbf','textit','textsc','textsl','textsubscript','textsuperscript','textup','underline'];
var latexCommandsRegex = RegExp('^(.*?)(\\\\(?:' + latexCommands.join('|') + ')\\{\\})(.*?)$');
var latexCommandsArgRegex = RegExp('^(.*?)(\\\\(?:' + latexCommandsArg.join('|') + '))(\\{.+\\}.*)$');
// captures: (1) text before command; (2) command (including backslash) before arg; (3) rest of string

var paramDefaults = {
  linewidth:      '0.3pt',
  treesep:        '4ex',
  levelsep:       '2cm',
  LFTwidth:       '15ex',
  LFTsep:         '4pt',
  style:          'nonflat',
  centerlabels:   0,
  orient:         'D',
  font:           'noto_sans',
  ligatures_rare: 0,
  ligatures_hist: 0,
  arabic:         'noto_naskh',
  cjk:            'noto_sc',
  greek:          'noop',
  hebrew:         'noto_hebrew',
  syriac:         'syriac_estrangela',
};

var paramValidate = {
  style:  /^(?:flat|nonflat)$/,
  centerlabels: /^1$/,
  orient: /^[DURL]$/,
  font:   /^(?:arial|bookman|cardo|charis|charter|cm|courier|courier_new|helvetica|junicode|noto_(?:sans|serif|mono)|palatino|schoolbook|times|times_mac)$/,
  ligatures_rare: /^1$/,
  ligatures_hist: /^1$/,
  arabic: /^(?:amiri|arefruqaa|hussaini_nastaleeq|noop|(?:noto_kufi|noto_naskh|noto_nastaliq))$/,
  cjk:    /^(?:adobe_kaiti|babelstone|noop|noto_(?:sc|tc|jp|kr)|stkaiti)$/,
  greek:  /^(?:alfios|didot|neohellenic|noop|noto_(?:sans|serif)|porson|times)$/,
  hebrew: /^(?:cardo|david|ezra|mekorot_(?:rashi|vilna)|noop|noto_hebrew)$/,
  syriac: /^(?:noop|syriac_(?:eastern|estrangela|western))$/,
};

['linewidth','treesep','levelsep','LFTwidth','LFTsep'].forEach(function (p) {
  paramValidate[p] = /^(?:\d+(?:\.\d+)?|\.\d+)(?:in|mm|cm|pt|em|ex|pc|bp|dd|cc|sp)$/;
});

var paramScriptMap = {
  arabic: ['Arabic'],
  cjk:    ['Bopomofo','Han','Hangul','Hiragana','Katakana'],
  greek:  ['Greek'],
  hebrew: ['Hebrew'],
  syriac: ['Syriac'],
};

var orientToRefpoint = { D: 't', R: 'l', L: 'r', U: 'b' };

var treeDir = config.treeDir || __dirname + '/trees';
if (!fs.existsSync(treeDir)) fs.mkdirSync(treeDir);

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(logger('dev'));
app.use(bodyParser.urlencoded({ extended: false }));

app.use(stylus.middleware({
  compile: function(str, path) {
    return stylus(str)
      .set('filename', path)
      .set('include css', true)
      .set('compress', true)
  },
  src: __dirname + '/public'
}));

app.use(express.static(__dirname + '/public'));

if (app.get('env') === 'development')
  app.use(errorHandler({ dumpExceptions: true, showStack: true }));

config.basepath = config.basepath || '/';
app.locals.basepath = config.basepath;

app.get('/', index);
app.post('/tex', makeLatex, returnInfo);
app.post('/pdf', makeLatex, makeFile('pdf'), returnInfo);
app.post('/png', makeLatex, makeFile('png'), returnInfo);
app.get('/tex/:id/:name', getFile('tex','text/plain'));
app.get('/pdf/:id/:name', getFile('pdf','application/pdf'));
app.get('/png/:id', getFile('png','image/png'));
app.get('/multitree/:id', multitree);
app.get('/multitree/:id/:subgroup', multitree);

var proxyApp;

if (config.basepath !== '/') {
  proxyApp = express();
  proxyApp.use(config.basepath, app);
}
else proxyApp = app;

config.port = config.port || 3001;
proxyApp.listen(config.port, function () {
  console.log("Express server listening on port %d in %s mode", config.port, app.settings.env);
});

function index(req, res, next) {
  res.render('index');
}

function makeLatex(req, res, next) {
  var p = req.body;

  for (var i in p) p[i] = p[i].trim();
  for (var i in paramValidate) {
    if (p[i] === undefined || !p[i].match(paramValidate[i])) p[i] = paramDefaults[i];
  }

  p.json = JSON.stringify(p, Object.keys(p).sort());

  p.emoji = req.emoji = p.tree.match(emojiRegex) ? 1 : 0;
  p.font = fontMap[p.font];
  p.nodecmd = p.centerlabels ? 'TR' : 'Tr';
  p.refpoint = orientToRefpoint[p.orient];
  p.roman = function(dec) { return roman(dec).toLowerCase() };

  p.fontspecMap = {};
  ['arabic','cjk','greek','hebrew','syriac'].forEach(function (param) {
    if (p[param] !== 'noop') {
      var font = fontMap[p[param]];
      paramScriptMap[param].forEach(function (sc) {
        p.fontspecMap[sc] = font;
      });
    }
  });

  p.ligatures = [];
  if (p.ligatures_rare) p.ligatures.push('Rare');
  if (p.ligatures_hist) p.ligatures.push('Historic');
  p.ligatures = p.ligatures.length ? p.ligatures.join(',') : null;

  p.tree = p.tree.split(/\r\n/);
  p.tree.splice(1000);
  p.tree = parseTree(p.tree)[0];
  p.pstTree = function() { return pstNode(p, p.tree, 0).replace(/^\n/,'') };

  req.file = uuid.v4();
  req.treeName = getTreeName(p.tree.value);

  fs.writeFile(treeDir+'/'+req.file+'.tex', ejs.render(latexTemplate, p), 'utf8', next);
}

function returnInfo(req, res, next) {
  res.json({ id: req.file, name: req.treeName });
}

function multitree(req, res, next) {
  if (!req.params.id.match(/^\d+$/)) return res.sendStatus(409);

  request({
    url: 'http://new.multitree.org/static/data/trees/json/'+req.params.id+'.json',
    json: true,
    gzip: true,
  }, function (err, multitreeRes, data) {
    if (err) return res.sendStatus(409);

    res.contentType('text/plain');

    try {
      var tree = req.params.subgroup !== undefined
        ? findMultitreeNode(data, req.params.subgroup)
        : data;

      if (tree) {
        var dialect = req.query.dialect === '1' ? true : false;
        res.send(multitreeToLatreex(tree, dialect));
      }
      else res.send('ENOENT');
    } catch (e) {
      if (e === 'ELIMIT') res.send(e);
      else res.sendStatus(409);
    }

  });
}

function findMultitreeNode(data, subgroup) {
  var queue = [data];

  var attr;
  if (subgroup.match(/^[a-z]{4}$/)) {
    attr = 'codes';
  } else {
    attr = 'name';
    subgroup = subgroup.toLowerCase();
  }

  while (queue.length) {
    var node = queue.shift();
    if (node[attr].toLowerCase() === subgroup) return node;

    if (node.children) queue.push.apply(queue, node.children);
  }

  return null;
}

function multitreeToLatreex(data, dialect) {
  var output = '';
  var lines = 0;

  _extract(data, 0);

  return output;

  function _extract(data, level) {
    if (!dialect && data.nodetype === 'Dialect') return;

    for (var i = level; i > 0; i--) output += '-';
    output += data.name + '\n';
    lines++;

    if (lines > 1000) throw 'ELIMIT';

    if (data.children) {
      data.children.forEach(function (child) {
        _extract(child, level+1);
      });
    }
  }
}

function makeFile(ext) {
  return function(req, res, next) {
    execFile(__dirname+'/script/make'+ext+'.sh', [treeDir,req.file,req.emoji,__dirname],
    function (code) {
      if (code) return res.sendStatus(409);
      next();
    });
  }
}

function getFile(ext, mime) {
  return function(req, res, next) {
    var id = req.params.id;
    if (!id) return res.sendStatus(409);
    fs.readFile(treeDir+'/'+id+'.'+ext, function (err, data) {
      if (err) return res.sendStatus(409);
      res.attachment();
      res.contentType(mime);
      res.send(data);
    });
  }
}

function parseTree(lines, lineNum, depth) {
  var tree = [];
  lineNum = lineNum || 0;

  for (var i = lineNum, l = lines.length; i < l; i++) {
    var captures = lines[i].match(/^(-*)\s*(.+?)\s*$/);
    if (!captures) continue; // blank or malformed line

    var newDepth = captures[1].length;
    if (depth === undefined) depth = newDepth; // set starting depth if we weren't given one

    if (newDepth < depth) break;
    else if (newDepth === depth) tree.push({ value: captures[2], children: [], height: 1 });
    else {
      var subtree = parseTree(lines, i, newDepth);
      var lastNode = tree[tree.length - 1];
      lastNode.children = subtree;
      lastNode.height = Math.max.apply(Math, subtree.map(function (node) { return node.height })) + 1;
      i += subtree.numLines - 1;
    }
  }

  tree.numLines = i - lineNum;
  return tree;
}

function pstNode(p, treeNode, depth) {
  var str = '';
  var node, afternode;
  var captures = treeNode.value.match(/^(\.?)(.*?)(~?)(\^*)$/);

  if (captures[1] !== '' || captures[2] === '') {
    node = '\\Tn';
    afternode = '\\Tp';
  } else {
    node = (captures[3] !== '' ? '\\LFTr' : '\\LFTw')
      + '{'+p.refpoint+'}{'+formatLatex(captures[2], p)+'}';
    afternode = '\\Tp[edge=none]';
  }

  str += '\n';
  var i = depth;
  while (i--) str += '  ';

  var skip = 0;
  if (p.style === 'flat') {
    skip = p.tree.height - depth - treeNode.height;
    if (captures[4]) skip -= captures[4].length;
    if (skip < 0) skip = 0;
  }

  if (skip > 0) str += '\\skiplevels{'+skip*2+'} ';

  if (treeNode.children.length) {
    str += '\\pstree{'+node+'}{\\pstree{'+afternode+'}{%';
    treeNode.children.forEach(function (x) { str += pstNode(p, x, depth+skip+1) });
    str += '}}';
  }
  else str += node;

  if (skip > 0) str += ' \\endskiplevels';

  return str;
}

function formatLatex(txt, p) {
  var captures;

  if (captures = txt.match(latexCommandsRegex))
    return formatLatexText(captures[1], p) + captures[2] + formatLatex(captures[3], p);

  if (captures = txt.match(latexCommandsArgRegex)) {
    var arg = parseLatexCommandArg(captures[3]);
    return arg
      ? formatLatexText(captures[1], p) + captures[2] + '{' + formatLatex(arg[0], p) + '}' + formatLatex(arg[1], p)
      : formatLatexText(captures[1] + captures[2], p) + formatLatex(captures[3], p);
  }

  return formatLatexText(txt, p);
}

function parseLatexCommandArg(txt) {
  var depth = 0;

  for (var i = 0; i < txt.length; i++) {
    if (txt[i] === '{') depth++;
    else if (txt[i] === '}') depth--;

    if (depth === 0) return [txt.substr(1, i-1), txt.substr(i+1)];
  }

  return null;
}

function formatLatexText(txt, p) {
  var str = '';
  var lastFont, lastScript;

  script.split(txt).forEach(function (chunk) {
    var chunkScript = chunk[1];
    var mappedFont;

    if (p.fontspecMap[chunkScript]) mappedFont = p.fontspecMap[chunkScript];
    else if (p.font.match(/^Noto/)) {
      mappedFont = notoFontMap[p.font] && notoFontMap[p.font][chunkScript]
        ? notoFontMap[p.font][chunkScript]
        : notoFontMap.general[chunkScript];
    }

    var font = mappedFont || p.font;

    if (font !== lastFont || chunkScript !== lastScript) {
      str += '\\fontspec{'+font+'}';

      if (fontspecScriptMap[chunkScript]) str += '[Script='+fontspecScriptMap[chunkScript]+']';

      lastFont = font;
      lastScript = chunkScript;
    }

    str += rtlScript[chunkScript]
      ? '\\RL{'+escapeLatex(chunk[0])+'}'
      : escapeLatex(chunk[0]);
  });

  return str;
}

function escapeLatex(txt) {
  return txt
    .replace(/([{}&$%#_])/g,'\\$1')
    .replace(/\\(?![{}&$%#_])/g,'\\textbackslash{}')
    .replace(/~/g,'\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

function getTreeName(txt) {
  txt = txt
    .replace(/~?\^*$/,'')
    .replace(/^\./,'')
    .replace(/[:\\\/]/g,'')
    .trim();

  if (txt === '') txt = 'tree-unnamed';

  return txt;
}
