var XRegExp = require('xregexp');
var ucs2 = require('punycode').ucs2;

var scripts = ['Ahom', 'Anatolian_Hieroglyphs', 'Arabic', 'Armenian', 'Avestan', 'Balinese', 'Bamum', 'Bassa_Vah', 'Batak', 'Bengali', 'Bopomofo', 'Brahmi', 'Braille', 'Buginese', 'Buhid', 'Canadian_Aboriginal', 'Carian', 'Caucasian_Albanian', 'Chakma', 'Cham', 'Cherokee', 'Common', 'Coptic', 'Cuneiform', 'Cypriot', 'Cyrillic', 'Deseret', 'Devanagari', 'Duployan', 'Egyptian_Hieroglyphs', 'Elbasan', 'Ethiopic', 'Georgian', 'Glagolitic', 'Gothic', 'Grantha', 'Greek', 'Gujarati', 'Gurmukhi', 'Han', 'Hangul', 'Hanunoo', 'Hatran', 'Hebrew', 'Hiragana', 'Imperial_Aramaic', 'Inherited', 'Inscriptional_Pahlavi', 'Inscriptional_Parthian', 'Javanese', 'Kaithi', 'Kannada', 'Katakana', 'Kayah_Li', 'Kharoshthi', 'Khmer', 'Khojki', 'Khudawadi', 'Lao', 'Latin', 'Lepcha', 'Limbu', 'Linear_A', 'Linear_B', 'Lisu', 'Lycian', 'Lydian', 'Mahajani', 'Malayalam', 'Mandaic', 'Manichaean', 'Meetei_Mayek', 'Mende_Kikakui', 'Meroitic_Cursive', 'Meroitic_Hieroglyphs', 'Miao', 'Modi', 'Mongolian', 'Mro', 'Multani', 'Myanmar', 'Nabataean', 'New_Tai_Lue', 'Nko', 'Ogham', 'Ol_Chiki', 'Old_Hungarian', 'Old_Italic', 'Old_North_Arabian', 'Old_Permic', 'Old_Persian', 'Old_South_Arabian', 'Old_Turkic', 'Oriya', 'Osmanya', 'Pahawh_Hmong', 'Palmyrene', 'Pau_Cin_Hau', 'Phags_Pa', 'Phoenician', 'Psalter_Pahlavi', 'Rejang', 'Runic', 'Samaritan', 'Saurashtra', 'Sharada', 'Shavian', 'Siddham', 'SignWriting', 'Sinhala', 'Sora_Sompeng', 'Sundanese', 'Syloti_Nagri', 'Syriac', 'Tagalog', 'Tagbanwa', 'Tai_Le', 'Tai_Tham', 'Tai_Viet', 'Takri', 'Tamil', 'Telugu', 'Thaana', 'Thai', 'Tibetan', 'Tifinagh', 'Tirhuta', 'Ugaritic', 'Vai', 'Warang_Citi', 'Yi']
.map(function (s) {
  return s.toLowerCase().replace(/[_-]/g, '')
})
.map(function (s) {
  return {
    name: s,
    regexp: XRegExp('\\p{' + s + '}', 'A')
  };
});

function split(str) {
  var codepoints = ucs2.decode(str);

  var chunks = [];
  var strChunk = '';
  var lastScript;

  for (var i = 0; i < codepoints.length; i++) {
    var char = ucs2.encode([codepoints[i]]);
    var script = detectChar(char);

    if (script !== 'common' && script !== 'inherited' && script !== lastScript) {
        if (lastScript !== undefined) pushChunk();
        lastScript = script;
    }

    strChunk += char;
  }

  pushChunk();

  return chunks;

  function pushChunk() {
    if (strChunk.length) {
      chunks.push([strChunk, lastScript || 'latin']);
      strChunk = '';
    }
  }
}

function detectChar(c) {
  for (var i = 0; i < scripts.length; i++) {
    if (c.match(scripts[i].regexp)) return scripts[i].name;
  }

  return undefined;
}

module.exports = {
    detectChar: detectChar,
    split: split
}
