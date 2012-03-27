var express = require('express'),
    stylus = require('stylus'),
    ejs = require('ejs'),
    fs = require('fs'),
    execFile = require('child_process').execFile,
    uuid = require('node-uuid');

var latexTemplate = fs.readFileSync('latex.ejs', 'utf8');
var treeDir = 'trees';

var app = module.exports = express.createServer();

app.configure(function(){
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.set('view options', { layout: false });
    
    app.use(express.bodyParser());
    app.use(express.methodOverride());

    app.use(express.logger(':remote-addr - [:date] ":method :url" :status'));

    app.use(stylus.middleware({
        compile: function(str, path) {
            return stylus(str)
                .set('filename', path)
                .set('include css', true)
                .set('compress', true)
        },
        src: __dirname + '/public'
    }));

    app.use(app.router);
    app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
    app.use(express.errorHandler());
});

app.get('/', index);
app.post('/tex', makeLatex, returnName);
app.post('/pdf', makeLatex, makeFile('pdf'), returnName);
app.post('/png', makeLatex, makeFile('png'), returnName);
app.get('/tex/:name', getFile('tex','text/plain',true));
app.get('/pdf/:name', getFile('pdf','application/pdf',true));
app.get('/png/:name', getFile('png','image/png',false));

app.listen(3001);
console.log("Express server listening on port %d in %s mode", 3001, app.settings.env);

var paramDefaults = {
    linewidth: '0.3pt',
    treesep: '5ex',
    levelsep: '2cm',
    LFTwidth: '15ex',
    LFTsep: '4pt',
    orient: 'D',
    font: 'sf',
    style: 'nonflat'
};

var paramValidate = {
    orient: /^(D|U|R|L)$/,
    font: /^(rm|sf|tt)$/,
    style: /^(flat|nonflat)$/
};

var orientToRefpoint = {
    D: 't',
    R: 'l',
    L: 'r',
    U: 'b'
};

function index(req, res, next) {
    res.render('index');
}

function makeLatex(req, res, next) {
    var p = req.body;
    
    for (var i in p) p[i] = p[i].trim();
    for (var i in paramValidate) {
        if (p[i] !== undefined && !p[i].match(paramValidate[i])) delete p[i];
    }
    for (var i in paramDefaults) {
        if (!p[i]) p[i] = paramDefaults[i];
    }
    p.refpoint = orientToRefpoint[p.orient];    
    
    p.tree = parseTree(p.tree.split(/\r\n/))[0];
    p.pstTree = function() { return pstNode(p, p.tree, 0).replace(/^\n/,'') };
    p.roman = function(dec) { return roman(dec).toLowerCase() };
    
    req.file = uuid.v4();
    fs.writeFile(treeDir+'/'+req.file+'.tex', ejs.render(latexTemplate, p), 'utf8', next);
}

function returnName(req, res, next) {
    res.json({ name: req.file });
}

function makeFile(ext) {
    return function(req, res, next) {
        execFile('./make'+ext+'.sh', [treeDir,req.file], function (code) {
            if (code) return res.send(409);
            next();
        });
    }
}

function getFile(ext, mime, attach) {
    return function(req, res, next) {
        var name = req.params.name;
        if (!name) return res.send(409);
        fs.readFile(treeDir+'/'+name+'.'+ext, function (err, data) {
           if (err) return res.send(409);
           res.contentType(mime);
           if (attach) res.attachment(name + '.' + ext);            
           res.send(data);
        });
    }
}

function parseTree(lines, lineNum, depth) {
    var tree = [];
    lineNum = lineNum || 0;
    
    for (var i = lineNum, l = lines.length; i < l; i++) {
        var captures = /^(-*)\s*(.+)$/.exec(lines[i]);
        if (!captures) continue; // blank or malformed line

        var newDepth = captures[1].length,
            value = captures[2];
        
        if (depth === undefined) depth = newDepth; // set starting depth if we weren't given one

        if (newDepth < depth) break;
        else if (newDepth === depth) tree.push({ value: value, children: [], height: 1 });
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
    var captures = /^(\.?)(.*?)(~?)(\^*)$/.exec(escapeLatex(treeNode.value));
    
    if (captures[1] != '' || captures[2] == '') {
        node = "\\Tn";
        afternode = "\\Tp";
    } else {
        node = captures[3] != '' ? "\\LFTr{"+p.refpoint+"}{"+captures[2]+"}" : "\\LFTw{"+p.refpoint+"}{"+captures[2]+"}";
        afternode = "\\Tp[edge=none]";
    }
    
    str += "\n";
    var i = depth;
    while (i--) str += "  ";
    
    var skip = 0;
    if (p.style === 'flat') {
        skip = p.tree.height - depth - treeNode.height;
        if (captures[4]) skip -= captures[4].length;
        if (skip < 0) skip = 0;
    }
    
    if (skip > 0) str += "\\skiplevels{" + skip*2 + "} ";
    
    var childNum = treeNode.children.length;
    if (childNum > 0) {
        str += "\\pstree{"+node+"}{\\pstree{"+afternode+"}{%";
        for (i = 0; i < childNum; i++) str += pstNode(p, treeNode.children[i], depth+skip+1);
        str += "}}";
    }
    else str += node;
    
    if (skip > 0) str += " \\endskiplevels";
    
    return str;
}

function escapeLatex(txt) {
    return txt.replace(/([&$%#_])/g, "\\$1");
}

var D = [1,5,10,50,100,500,1000], 
    R = ['I','V','X','L','C','D','M'];

function roman(dec) {
  var r = '', d = dec;
  for (var i = 6; i >= 0; i--) {
    while (d >= D[i]) {d -= D[i]; r += R[i];}
    if (i > 0 && d >= D[i]-D[i-2+i%2]) {d -= D[i]-D[i-2+i%2]; r += R[i-2+i%2]+R[i];}
  }
  return r;
}
