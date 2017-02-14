var express = require('express');
var bodyParser = require('body-parser');
var errorHandler = require('errorhandler');
var logger = require('morgan');
var stylus = require('stylus');

var ejs = require('ejs');
var execFile = require('child_process').execFile;
var fs = require('fs');
var uuid = require('uuid');

var config = require('./config');
var fontMap = require('./lib/font');
var fontspecScriptMap = require('./lib/fontspec_script');
var latexTemplate = fs.readFileSync(__dirname + '/lib/latex.ejs', 'utf8');
var notoFontMap = require('./lib/noto');
var rtl = {};
var script = require('./lib/script');

require('./lib/rtl').forEach(function (sc) {
    rtl[sc] = true;
});

var paramDefaults = {
    linewidth:  '0.3pt',
    treesep:    '4ex',
    levelsep:   '2cm',
    LFTwidth:   '15ex',
    LFTsep:     '4pt',
    orient:     'D',
    style:      'nonflat',
    font:       'noto_sans',
    arabic:     'noto_naskh',
    cjk:        'noto_sc',
    greek:      'noop',
    hebrew:     'noto_hebrew',
    syriac:     'syriac_estrangela',
};

var paramValidate = {
    orient: /^(?:D|U|R|L)$/,
    style:  /^(?:flat|nonflat)$/,
    font:   /^(?:arial|bookman|charis|charter|cm|courier|courier_new|helvetica|junicode|noto_(?:sans|serif|mono)|palatino|schoolbook|times|times_mac)$/,
    arabic: /^amiri|arefruqaa|hussaini_nastaleeq|noop|(?:noto_kufi|noto_naskh|noto_nastaliq)$/,
    cjk:    /^adobe_kaiti|babelstone|noop|noto_(?:sc|tc|jp|kr)|stkaiti$/,
    greek:  /^(?:alfios|didot|neohellenic|noop|noto_(?:sans|serif)|porson)|times$/,
    hebrew: /^(?:david|ezra|mekorot_(?:rashi|vilna)|noop|noto_hebrew)$/,
    syriac: /^noop|syriac_(?:eastern|estrangela|western)$/,
};

['linewidth','treesep','levelsep','LFTwidth','LFTsep'].forEach(function (p) {
    paramValidate[p] = /^(?:[0-9]+)?\.?[0-9]+(?:in|mm|cm|pt|em|ex|pc|bp|dd|cc|sp)$/;
});

var paramScriptMap = {
    arabic: ['Arabic'],
    cjk:    ['Bopomofo','Han','Hangul','Hiragana','Katakana'],
    greek:  ['Greek'],
    hebrew: ['Hebrew'],
    syriac: ['Syriac'],
};

var orientToRefpoint = {
    D: 't',
    R: 'l',
    L: 'r',
    U: 'b'
};

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

    p.font = fontMap[p.font];

    p.fontspecMap = { Emoji:  'Noto Emoji' };

    ['arabic','cjk','greek','hebrew','syriac'].forEach(function (param) {
        if (p[param] !== 'noop') {
            var font = fontMap[p[param]];
            paramScriptMap[param].forEach(function (sc) {
                p.fontspecMap[sc] = font;
            });
        }
    });

    p.refpoint = orientToRefpoint[p.orient];
    p.tree = parseTree(p.tree.split(/\r\n/))[0];
    p.pstTree = function() { return pstNode(p, p.tree, 0).replace(/^\n/,'') };
    p.roman = function(dec) { return roman(dec).toLowerCase() };

    req.file = uuid.v4();
    req.treeName = getTreeName(p.tree.value);

    fs.writeFile(treeDir+'/'+req.file+'.tex', ejs.render(latexTemplate, p), 'utf8', next);
}

function returnInfo(req, res, next) {
    res.json({ id: req.file, name: req.treeName });
}

function makeFile(ext) {
    return function(req, res, next) {
        execFile(__dirname + '/script/make'+ext+'.sh', [treeDir,req.file], function (code) {
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
        var captures = lines[i].match(/^(-*)\s*(.+)$/);
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
            + '{'+p.refpoint+'}{'+nodeLabel(captures[2], p)+'}';
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

function nodeLabel(txt, p) {
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

            if (fontspecScriptMap[chunkScript])
                str += '[Script='+fontspecScriptMap[chunkScript]+']';

            lastFont = font;
            lastScript = chunkScript;
        }

        str += rtl[chunkScript]
            ? '\\RL{'+escapeLatex(chunk[0])+'}'
            : escapeLatex(chunk[0]);
    });

    return str;
}

function escapeLatex(txt) {
    return txt
        .replace(/\\/g,'\\textbackslash{}')
        .replace(/~/g,'\\textasciitilde{}')
        .replace(/[&$%#]/g,'\\$1')
        .replace(/\*([^*]+)\*/g, '\\textbf{$1}')
        .replace(/_([^_]+)_/g, '\\textit{$1}');
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

var D = [1,5,10,50,100,500,1000];
var R = ['I','V','X','L','C','D','M'];

function roman(dec) {
  var r = '', d = dec;
  for (var i = 6; i >= 0; i--) {
    while (d >= D[i]) {d -= D[i]; r += R[i];}
    if (i > 0 && d >= D[i]-D[i-2+i%2]) {d -= D[i]-D[i-2+i%2]; r += R[i-2+i%2]+R[i];}
  }
  return r;
}
