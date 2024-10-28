(window["webpackJsonp"] = window["webpackJsonp"] || []).push([["main"],{

/***/ "./node_modules/codemirror/lib/codemirror.js":
/*!***************************************************!*\
  !*** ./node_modules/codemirror/lib/codemirror.js ***!
  \***************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/LICENSE

// This is CodeMirror (https://codemirror.net), a code editor
// implemented in JavaScript on top of the browser's DOM.
//
// You can find some technical background for some of the code below
// at http://marijnhaverbeke.nl/blog/#cm-internals .

(function (global, factory) {
   true ? module.exports = factory() :
  undefined;
}(this, (function () { 'use strict';

  // Kludges for bugs and behavior differences that can't be feature
  // detected are enabled based on userAgent etc sniffing.
  var userAgent = navigator.userAgent;
  var platform = navigator.platform;

  var gecko = /gecko\/\d/i.test(userAgent);
  var ie_upto10 = /MSIE \d/.test(userAgent);
  var ie_11up = /Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(userAgent);
  var edge = /Edge\/(\d+)/.exec(userAgent);
  var ie = ie_upto10 || ie_11up || edge;
  var ie_version = ie && (ie_upto10 ? document.documentMode || 6 : +(edge || ie_11up)[1]);
  var webkit = !edge && /WebKit\//.test(userAgent);
  var qtwebkit = webkit && /Qt\/\d+\.\d+/.test(userAgent);
  var chrome = !edge && /Chrome\//.test(userAgent);
  var presto = /Opera\//.test(userAgent);
  var safari = /Apple Computer/.test(navigator.vendor);
  var mac_geMountainLion = /Mac OS X 1\d\D([8-9]|\d\d)\D/.test(userAgent);
  var phantom = /PhantomJS/.test(userAgent);

  var ios = !edge && /AppleWebKit/.test(userAgent) && /Mobile\/\w+/.test(userAgent);
  var android = /Android/.test(userAgent);
  // This is woefully incomplete. Suggestions for alternative methods welcome.
  var mobile = ios || android || /webOS|BlackBerry|Opera Mini|Opera Mobi|IEMobile/i.test(userAgent);
  var mac = ios || /Mac/.test(platform);
  var chromeOS = /\bCrOS\b/.test(userAgent);
  var windows = /win/i.test(platform);

  var presto_version = presto && userAgent.match(/Version\/(\d*\.\d*)/);
  if (presto_version) { presto_version = Number(presto_version[1]); }
  if (presto_version && presto_version >= 15) { presto = false; webkit = true; }
  // Some browsers use the wrong event properties to signal cmd/ctrl on OS X
  var flipCtrlCmd = mac && (qtwebkit || presto && (presto_version == null || presto_version < 12.11));
  var captureRightClick = gecko || (ie && ie_version >= 9);

  function classTest(cls) { return new RegExp("(^|\\s)" + cls + "(?:$|\\s)\\s*") }

  var rmClass = function(node, cls) {
    var current = node.className;
    var match = classTest(cls).exec(current);
    if (match) {
      var after = current.slice(match.index + match[0].length);
      node.className = current.slice(0, match.index) + (after ? match[1] + after : "");
    }
  };

  function removeChildren(e) {
    for (var count = e.childNodes.length; count > 0; --count)
      { e.removeChild(e.firstChild); }
    return e
  }

  function removeChildrenAndAdd(parent, e) {
    return removeChildren(parent).appendChild(e)
  }

  function elt(tag, content, className, style) {
    var e = document.createElement(tag);
    if (className) { e.className = className; }
    if (style) { e.style.cssText = style; }
    if (typeof content == "string") { e.appendChild(document.createTextNode(content)); }
    else if (content) { for (var i = 0; i < content.length; ++i) { e.appendChild(content[i]); } }
    return e
  }
  // wrapper for elt, which removes the elt from the accessibility tree
  function eltP(tag, content, className, style) {
    var e = elt(tag, content, className, style);
    e.setAttribute("role", "presentation");
    return e
  }

  var range;
  if (document.createRange) { range = function(node, start, end, endNode) {
    var r = document.createRange();
    r.setEnd(endNode || node, end);
    r.setStart(node, start);
    return r
  }; }
  else { range = function(node, start, end) {
    var r = document.body.createTextRange();
    try { r.moveToElementText(node.parentNode); }
    catch(e) { return r }
    r.collapse(true);
    r.moveEnd("character", end);
    r.moveStart("character", start);
    return r
  }; }

  function contains(parent, child) {
    if (child.nodeType == 3) // Android browser always returns false when child is a textnode
      { child = child.parentNode; }
    if (parent.contains)
      { return parent.contains(child) }
    do {
      if (child.nodeType == 11) { child = child.host; }
      if (child == parent) { return true }
    } while (child = child.parentNode)
  }

  function activeElt() {
    // IE and Edge may throw an "Unspecified Error" when accessing document.activeElement.
    // IE < 10 will throw when accessed while the page is loading or in an iframe.
    // IE > 9 and Edge will throw when accessed in an iframe if document.body is unavailable.
    var activeElement;
    try {
      activeElement = document.activeElement;
    } catch(e) {
      activeElement = document.body || null;
    }
    while (activeElement && activeElement.shadowRoot && activeElement.shadowRoot.activeElement)
      { activeElement = activeElement.shadowRoot.activeElement; }
    return activeElement
  }

  function addClass(node, cls) {
    var current = node.className;
    if (!classTest(cls).test(current)) { node.className += (current ? " " : "") + cls; }
  }
  function joinClasses(a, b) {
    var as = a.split(" ");
    for (var i = 0; i < as.length; i++)
      { if (as[i] && !classTest(as[i]).test(b)) { b += " " + as[i]; } }
    return b
  }

  var selectInput = function(node) { node.select(); };
  if (ios) // Mobile Safari apparently has a bug where select() is broken.
    { selectInput = function(node) { node.selectionStart = 0; node.selectionEnd = node.value.length; }; }
  else if (ie) // Suppress mysterious IE10 errors
    { selectInput = function(node) { try { node.select(); } catch(_e) {} }; }

  function bind(f) {
    var args = Array.prototype.slice.call(arguments, 1);
    return function(){return f.apply(null, args)}
  }

  function copyObj(obj, target, overwrite) {
    if (!target) { target = {}; }
    for (var prop in obj)
      { if (obj.hasOwnProperty(prop) && (overwrite !== false || !target.hasOwnProperty(prop)))
        { target[prop] = obj[prop]; } }
    return target
  }

  // Counts the column offset in a string, taking tabs into account.
  // Used mostly to find indentation.
  function countColumn(string, end, tabSize, startIndex, startValue) {
    if (end == null) {
      end = string.search(/[^\s\u00a0]/);
      if (end == -1) { end = string.length; }
    }
    for (var i = startIndex || 0, n = startValue || 0;;) {
      var nextTab = string.indexOf("\t", i);
      if (nextTab < 0 || nextTab >= end)
        { return n + (end - i) }
      n += nextTab - i;
      n += tabSize - (n % tabSize);
      i = nextTab + 1;
    }
  }

  var Delayed = function() {
    this.id = null;
    this.f = null;
    this.time = 0;
    this.handler = bind(this.onTimeout, this);
  };
  Delayed.prototype.onTimeout = function (self) {
    self.id = 0;
    if (self.time <= +new Date) {
      self.f();
    } else {
      setTimeout(self.handler, self.time - +new Date);
    }
  };
  Delayed.prototype.set = function (ms, f) {
    this.f = f;
    var time = +new Date + ms;
    if (!this.id || time < this.time) {
      clearTimeout(this.id);
      this.id = setTimeout(this.handler, ms);
      this.time = time;
    }
  };

  function indexOf(array, elt) {
    for (var i = 0; i < array.length; ++i)
      { if (array[i] == elt) { return i } }
    return -1
  }

  // Number of pixels added to scroller and sizer to hide scrollbar
  var scrollerGap = 30;

  // Returned or thrown by various protocols to signal 'I'm not
  // handling this'.
  var Pass = {toString: function(){return "CodeMirror.Pass"}};

  // Reused option objects for setSelection & friends
  var sel_dontScroll = {scroll: false}, sel_mouse = {origin: "*mouse"}, sel_move = {origin: "+move"};

  // The inverse of countColumn -- find the offset that corresponds to
  // a particular column.
  function findColumn(string, goal, tabSize) {
    for (var pos = 0, col = 0;;) {
      var nextTab = string.indexOf("\t", pos);
      if (nextTab == -1) { nextTab = string.length; }
      var skipped = nextTab - pos;
      if (nextTab == string.length || col + skipped >= goal)
        { return pos + Math.min(skipped, goal - col) }
      col += nextTab - pos;
      col += tabSize - (col % tabSize);
      pos = nextTab + 1;
      if (col >= goal) { return pos }
    }
  }

  var spaceStrs = [""];
  function spaceStr(n) {
    while (spaceStrs.length <= n)
      { spaceStrs.push(lst(spaceStrs) + " "); }
    return spaceStrs[n]
  }

  function lst(arr) { return arr[arr.length-1] }

  function map(array, f) {
    var out = [];
    for (var i = 0; i < array.length; i++) { out[i] = f(array[i], i); }
    return out
  }

  function insertSorted(array, value, score) {
    var pos = 0, priority = score(value);
    while (pos < array.length && score(array[pos]) <= priority) { pos++; }
    array.splice(pos, 0, value);
  }

  function nothing() {}

  function createObj(base, props) {
    var inst;
    if (Object.create) {
      inst = Object.create(base);
    } else {
      nothing.prototype = base;
      inst = new nothing();
    }
    if (props) { copyObj(props, inst); }
    return inst
  }

  var nonASCIISingleCaseWordChar = /[\u00df\u0587\u0590-\u05f4\u0600-\u06ff\u3040-\u309f\u30a0-\u30ff\u3400-\u4db5\u4e00-\u9fcc\uac00-\ud7af]/;
  function isWordCharBasic(ch) {
    return /\w/.test(ch) || ch > "\x80" &&
      (ch.toUpperCase() != ch.toLowerCase() || nonASCIISingleCaseWordChar.test(ch))
  }
  function isWordChar(ch, helper) {
    if (!helper) { return isWordCharBasic(ch) }
    if (helper.source.indexOf("\\w") > -1 && isWordCharBasic(ch)) { return true }
    return helper.test(ch)
  }

  function isEmpty(obj) {
    for (var n in obj) { if (obj.hasOwnProperty(n) && obj[n]) { return false } }
    return true
  }

  // Extending unicode characters. A series of a non-extending char +
  // any number of extending chars is treated as a single unit as far
  // as editing and measuring is concerned. This is not fully correct,
  // since some scripts/fonts/browsers also treat other configurations
  // of code points as a group.
  var extendingChars = /[\u0300-\u036f\u0483-\u0489\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u064b-\u065e\u0670\u06d6-\u06dc\u06de-\u06e4\u06e7\u06e8\u06ea-\u06ed\u0711\u0730-\u074a\u07a6-\u07b0\u07eb-\u07f3\u0816-\u0819\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0900-\u0902\u093c\u0941-\u0948\u094d\u0951-\u0955\u0962\u0963\u0981\u09bc\u09be\u09c1-\u09c4\u09cd\u09d7\u09e2\u09e3\u0a01\u0a02\u0a3c\u0a41\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a70\u0a71\u0a75\u0a81\u0a82\u0abc\u0ac1-\u0ac5\u0ac7\u0ac8\u0acd\u0ae2\u0ae3\u0b01\u0b3c\u0b3e\u0b3f\u0b41-\u0b44\u0b4d\u0b56\u0b57\u0b62\u0b63\u0b82\u0bbe\u0bc0\u0bcd\u0bd7\u0c3e-\u0c40\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c62\u0c63\u0cbc\u0cbf\u0cc2\u0cc6\u0ccc\u0ccd\u0cd5\u0cd6\u0ce2\u0ce3\u0d3e\u0d41-\u0d44\u0d4d\u0d57\u0d62\u0d63\u0dca\u0dcf\u0dd2-\u0dd4\u0dd6\u0ddf\u0e31\u0e34-\u0e3a\u0e47-\u0e4e\u0eb1\u0eb4-\u0eb9\u0ebb\u0ebc\u0ec8-\u0ecd\u0f18\u0f19\u0f35\u0f37\u0f39\u0f71-\u0f7e\u0f80-\u0f84\u0f86\u0f87\u0f90-\u0f97\u0f99-\u0fbc\u0fc6\u102d-\u1030\u1032-\u1037\u1039\u103a\u103d\u103e\u1058\u1059\u105e-\u1060\u1071-\u1074\u1082\u1085\u1086\u108d\u109d\u135f\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17b7-\u17bd\u17c6\u17c9-\u17d3\u17dd\u180b-\u180d\u18a9\u1920-\u1922\u1927\u1928\u1932\u1939-\u193b\u1a17\u1a18\u1a56\u1a58-\u1a5e\u1a60\u1a62\u1a65-\u1a6c\u1a73-\u1a7c\u1a7f\u1b00-\u1b03\u1b34\u1b36-\u1b3a\u1b3c\u1b42\u1b6b-\u1b73\u1b80\u1b81\u1ba2-\u1ba5\u1ba8\u1ba9\u1c2c-\u1c33\u1c36\u1c37\u1cd0-\u1cd2\u1cd4-\u1ce0\u1ce2-\u1ce8\u1ced\u1dc0-\u1de6\u1dfd-\u1dff\u200c\u200d\u20d0-\u20f0\u2cef-\u2cf1\u2de0-\u2dff\u302a-\u302f\u3099\u309a\ua66f-\ua672\ua67c\ua67d\ua6f0\ua6f1\ua802\ua806\ua80b\ua825\ua826\ua8c4\ua8e0-\ua8f1\ua926-\ua92d\ua947-\ua951\ua980-\ua982\ua9b3\ua9b6-\ua9b9\ua9bc\uaa29-\uaa2e\uaa31\uaa32\uaa35\uaa36\uaa43\uaa4c\uaab0\uaab2-\uaab4\uaab7\uaab8\uaabe\uaabf\uaac1\uabe5\uabe8\uabed\udc00-\udfff\ufb1e\ufe00-\ufe0f\ufe20-\ufe26\uff9e\uff9f]/;
  function isExtendingChar(ch) { return ch.charCodeAt(0) >= 768 && extendingChars.test(ch) }

  // Returns a number from the range [`0`; `str.length`] unless `pos` is outside that range.
  function skipExtendingChars(str, pos, dir) {
    while ((dir < 0 ? pos > 0 : pos < str.length) && isExtendingChar(str.charAt(pos))) { pos += dir; }
    return pos
  }

  // Returns the value from the range [`from`; `to`] that satisfies
  // `pred` and is closest to `from`. Assumes that at least `to`
  // satisfies `pred`. Supports `from` being greater than `to`.
  function findFirst(pred, from, to) {
    // At any point we are certain `to` satisfies `pred`, don't know
    // whether `from` does.
    var dir = from > to ? -1 : 1;
    for (;;) {
      if (from == to) { return from }
      var midF = (from + to) / 2, mid = dir < 0 ? Math.ceil(midF) : Math.floor(midF);
      if (mid == from) { return pred(mid) ? from : to }
      if (pred(mid)) { to = mid; }
      else { from = mid + dir; }
    }
  }

  // BIDI HELPERS

  function iterateBidiSections(order, from, to, f) {
    if (!order) { return f(from, to, "ltr", 0) }
    var found = false;
    for (var i = 0; i < order.length; ++i) {
      var part = order[i];
      if (part.from < to && part.to > from || from == to && part.to == from) {
        f(Math.max(part.from, from), Math.min(part.to, to), part.level == 1 ? "rtl" : "ltr", i);
        found = true;
      }
    }
    if (!found) { f(from, to, "ltr"); }
  }

  var bidiOther = null;
  function getBidiPartAt(order, ch, sticky) {
    var found;
    bidiOther = null;
    for (var i = 0; i < order.length; ++i) {
      var cur = order[i];
      if (cur.from < ch && cur.to > ch) { return i }
      if (cur.to == ch) {
        if (cur.from != cur.to && sticky == "before") { found = i; }
        else { bidiOther = i; }
      }
      if (cur.from == ch) {
        if (cur.from != cur.to && sticky != "before") { found = i; }
        else { bidiOther = i; }
      }
    }
    return found != null ? found : bidiOther
  }

  // Bidirectional ordering algorithm
  // See http://unicode.org/reports/tr9/tr9-13.html for the algorithm
  // that this (partially) implements.

  // One-char codes used for character types:
  // L (L):   Left-to-Right
  // R (R):   Right-to-Left
  // r (AL):  Right-to-Left Arabic
  // 1 (EN):  European Number
  // + (ES):  European Number Separator
  // % (ET):  European Number Terminator
  // n (AN):  Arabic Number
  // , (CS):  Common Number Separator
  // m (NSM): Non-Spacing Mark
  // b (BN):  Boundary Neutral
  // s (B):   Paragraph Separator
  // t (S):   Segment Separator
  // w (WS):  Whitespace
  // N (ON):  Other Neutrals

  // Returns null if characters are ordered as they appear
  // (left-to-right), or an array of sections ({from, to, level}
  // objects) in the order in which they occur visually.
  var bidiOrdering = (function() {
    // Character types for codepoints 0 to 0xff
    var lowTypes = "bbbbbbbbbtstwsbbbbbbbbbbbbbbssstwNN%%%NNNNNN,N,N1111111111NNNNNNNLLLLLLLLLLLLLLLLLLLLLLLLLLNNNNNNLLLLLLLLLLLLLLLLLLLLLLLLLLNNNNbbbbbbsbbbbbbbbbbbbbbbbbbbbbbbbbb,N%%%%NNNNLNNNNN%%11NLNNN1LNNNNNLLLLLLLLLLLLLLLLLLLLLLLNLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLN";
    // Character types for codepoints 0x600 to 0x6f9
    var arabicTypes = "nnnnnnNNr%%r,rNNmmmmmmmmmmmrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrmmmmmmmmmmmmmmmmmmmmmnnnnnnnnnn%nnrrrmrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrmmmmmmmnNmmmmmmrrmmNmmmmrr1111111111";
    function charType(code) {
      if (code <= 0xf7) { return lowTypes.charAt(code) }
      else if (0x590 <= code && code <= 0x5f4) { return "R" }
      else if (0x600 <= code && code <= 0x6f9) { return arabicTypes.charAt(code - 0x600) }
      else if (0x6ee <= code && code <= 0x8ac) { return "r" }
      else if (0x2000 <= code && code <= 0x200b) { return "w" }
      else if (code == 0x200c) { return "b" }
      else { return "L" }
    }

    var bidiRE = /[\u0590-\u05f4\u0600-\u06ff\u0700-\u08ac]/;
    var isNeutral = /[stwN]/, isStrong = /[LRr]/, countsAsLeft = /[Lb1n]/, countsAsNum = /[1n]/;

    function BidiSpan(level, from, to) {
      this.level = level;
      this.from = from; this.to = to;
    }

    return function(str, direction) {
      var outerType = direction == "ltr" ? "L" : "R";

      if (str.length == 0 || direction == "ltr" && !bidiRE.test(str)) { return false }
      var len = str.length, types = [];
      for (var i = 0; i < len; ++i)
        { types.push(charType(str.charCodeAt(i))); }

      // W1. Examine each non-spacing mark (NSM) in the level run, and
      // change the type of the NSM to the type of the previous
      // character. If the NSM is at the start of the level run, it will
      // get the type of sor.
      for (var i$1 = 0, prev = outerType; i$1 < len; ++i$1) {
        var type = types[i$1];
        if (type == "m") { types[i$1] = prev; }
        else { prev = type; }
      }

      // W2. Search backwards from each instance of a European number
      // until the first strong type (R, L, AL, or sor) is found. If an
      // AL is found, change the type of the European number to Arabic
      // number.
      // W3. Change all ALs to R.
      for (var i$2 = 0, cur = outerType; i$2 < len; ++i$2) {
        var type$1 = types[i$2];
        if (type$1 == "1" && cur == "r") { types[i$2] = "n"; }
        else if (isStrong.test(type$1)) { cur = type$1; if (type$1 == "r") { types[i$2] = "R"; } }
      }

      // W4. A single European separator between two European numbers
      // changes to a European number. A single common separator between
      // two numbers of the same type changes to that type.
      for (var i$3 = 1, prev$1 = types[0]; i$3 < len - 1; ++i$3) {
        var type$2 = types[i$3];
        if (type$2 == "+" && prev$1 == "1" && types[i$3+1] == "1") { types[i$3] = "1"; }
        else if (type$2 == "," && prev$1 == types[i$3+1] &&
                 (prev$1 == "1" || prev$1 == "n")) { types[i$3] = prev$1; }
        prev$1 = type$2;
      }

      // W5. A sequence of European terminators adjacent to European
      // numbers changes to all European numbers.
      // W6. Otherwise, separators and terminators change to Other
      // Neutral.
      for (var i$4 = 0; i$4 < len; ++i$4) {
        var type$3 = types[i$4];
        if (type$3 == ",") { types[i$4] = "N"; }
        else if (type$3 == "%") {
          var end = (void 0);
          for (end = i$4 + 1; end < len && types[end] == "%"; ++end) {}
          var replace = (i$4 && types[i$4-1] == "!") || (end < len && types[end] == "1") ? "1" : "N";
          for (var j = i$4; j < end; ++j) { types[j] = replace; }
          i$4 = end - 1;
        }
      }

      // W7. Search backwards from each instance of a European number
      // until the first strong type (R, L, or sor) is found. If an L is
      // found, then change the type of the European number to L.
      for (var i$5 = 0, cur$1 = outerType; i$5 < len; ++i$5) {
        var type$4 = types[i$5];
        if (cur$1 == "L" && type$4 == "1") { types[i$5] = "L"; }
        else if (isStrong.test(type$4)) { cur$1 = type$4; }
      }

      // N1. A sequence of neutrals takes the direction of the
      // surrounding strong text if the text on both sides has the same
      // direction. European and Arabic numbers act as if they were R in
      // terms of their influence on neutrals. Start-of-level-run (sor)
      // and end-of-level-run (eor) are used at level run boundaries.
      // N2. Any remaining neutrals take the embedding direction.
      for (var i$6 = 0; i$6 < len; ++i$6) {
        if (isNeutral.test(types[i$6])) {
          var end$1 = (void 0);
          for (end$1 = i$6 + 1; end$1 < len && isNeutral.test(types[end$1]); ++end$1) {}
          var before = (i$6 ? types[i$6-1] : outerType) == "L";
          var after = (end$1 < len ? types[end$1] : outerType) == "L";
          var replace$1 = before == after ? (before ? "L" : "R") : outerType;
          for (var j$1 = i$6; j$1 < end$1; ++j$1) { types[j$1] = replace$1; }
          i$6 = end$1 - 1;
        }
      }

      // Here we depart from the documented algorithm, in order to avoid
      // building up an actual levels array. Since there are only three
      // levels (0, 1, 2) in an implementation that doesn't take
      // explicit embedding into account, we can build up the order on
      // the fly, without following the level-based algorithm.
      var order = [], m;
      for (var i$7 = 0; i$7 < len;) {
        if (countsAsLeft.test(types[i$7])) {
          var start = i$7;
          for (++i$7; i$7 < len && countsAsLeft.test(types[i$7]); ++i$7) {}
          order.push(new BidiSpan(0, start, i$7));
        } else {
          var pos = i$7, at = order.length, isRTL = direction == "rtl" ? 1 : 0;
          for (++i$7; i$7 < len && types[i$7] != "L"; ++i$7) {}
          for (var j$2 = pos; j$2 < i$7;) {
            if (countsAsNum.test(types[j$2])) {
              if (pos < j$2) { order.splice(at, 0, new BidiSpan(1, pos, j$2)); at += isRTL; }
              var nstart = j$2;
              for (++j$2; j$2 < i$7 && countsAsNum.test(types[j$2]); ++j$2) {}
              order.splice(at, 0, new BidiSpan(2, nstart, j$2));
              at += isRTL;
              pos = j$2;
            } else { ++j$2; }
          }
          if (pos < i$7) { order.splice(at, 0, new BidiSpan(1, pos, i$7)); }
        }
      }
      if (direction == "ltr") {
        if (order[0].level == 1 && (m = str.match(/^\s+/))) {
          order[0].from = m[0].length;
          order.unshift(new BidiSpan(0, 0, m[0].length));
        }
        if (lst(order).level == 1 && (m = str.match(/\s+$/))) {
          lst(order).to -= m[0].length;
          order.push(new BidiSpan(0, len - m[0].length, len));
        }
      }

      return direction == "rtl" ? order.reverse() : order
    }
  })();

  // Get the bidi ordering for the given line (and cache it). Returns
  // false for lines that are fully left-to-right, and an array of
  // BidiSpan objects otherwise.
  function getOrder(line, direction) {
    var order = line.order;
    if (order == null) { order = line.order = bidiOrdering(line.text, direction); }
    return order
  }

  // EVENT HANDLING

  // Lightweight event framework. on/off also work on DOM nodes,
  // registering native DOM handlers.

  var noHandlers = [];

  var on = function(emitter, type, f) {
    if (emitter.addEventListener) {
      emitter.addEventListener(type, f, false);
    } else if (emitter.attachEvent) {
      emitter.attachEvent("on" + type, f);
    } else {
      var map = emitter._handlers || (emitter._handlers = {});
      map[type] = (map[type] || noHandlers).concat(f);
    }
  };

  function getHandlers(emitter, type) {
    return emitter._handlers && emitter._handlers[type] || noHandlers
  }

  function off(emitter, type, f) {
    if (emitter.removeEventListener) {
      emitter.removeEventListener(type, f, false);
    } else if (emitter.detachEvent) {
      emitter.detachEvent("on" + type, f);
    } else {
      var map = emitter._handlers, arr = map && map[type];
      if (arr) {
        var index = indexOf(arr, f);
        if (index > -1)
          { map[type] = arr.slice(0, index).concat(arr.slice(index + 1)); }
      }
    }
  }

  function signal(emitter, type /*, values...*/) {
    var handlers = getHandlers(emitter, type);
    if (!handlers.length) { return }
    var args = Array.prototype.slice.call(arguments, 2);
    for (var i = 0; i < handlers.length; ++i) { handlers[i].apply(null, args); }
  }

  // The DOM events that CodeMirror handles can be overridden by
  // registering a (non-DOM) handler on the editor for the event name,
  // and preventDefault-ing the event in that handler.
  function signalDOMEvent(cm, e, override) {
    if (typeof e == "string")
      { e = {type: e, preventDefault: function() { this.defaultPrevented = true; }}; }
    signal(cm, override || e.type, cm, e);
    return e_defaultPrevented(e) || e.codemirrorIgnore
  }

  function signalCursorActivity(cm) {
    var arr = cm._handlers && cm._handlers.cursorActivity;
    if (!arr) { return }
    var set = cm.curOp.cursorActivityHandlers || (cm.curOp.cursorActivityHandlers = []);
    for (var i = 0; i < arr.length; ++i) { if (indexOf(set, arr[i]) == -1)
      { set.push(arr[i]); } }
  }

  function hasHandler(emitter, type) {
    return getHandlers(emitter, type).length > 0
  }

  // Add on and off methods to a constructor's prototype, to make
  // registering events on such objects more convenient.
  function eventMixin(ctor) {
    ctor.prototype.on = function(type, f) {on(this, type, f);};
    ctor.prototype.off = function(type, f) {off(this, type, f);};
  }

  // Due to the fact that we still support jurassic IE versions, some
  // compatibility wrappers are needed.

  function e_preventDefault(e) {
    if (e.preventDefault) { e.preventDefault(); }
    else { e.returnValue = false; }
  }
  function e_stopPropagation(e) {
    if (e.stopPropagation) { e.stopPropagation(); }
    else { e.cancelBubble = true; }
  }
  function e_defaultPrevented(e) {
    return e.defaultPrevented != null ? e.defaultPrevented : e.returnValue == false
  }
  function e_stop(e) {e_preventDefault(e); e_stopPropagation(e);}

  function e_target(e) {return e.target || e.srcElement}
  function e_button(e) {
    var b = e.which;
    if (b == null) {
      if (e.button & 1) { b = 1; }
      else if (e.button & 2) { b = 3; }
      else if (e.button & 4) { b = 2; }
    }
    if (mac && e.ctrlKey && b == 1) { b = 3; }
    return b
  }

  // Detect drag-and-drop
  var dragAndDrop = function() {
    // There is *some* kind of drag-and-drop support in IE6-8, but I
    // couldn't get it to work yet.
    if (ie && ie_version < 9) { return false }
    var div = elt('div');
    return "draggable" in div || "dragDrop" in div
  }();

  var zwspSupported;
  function zeroWidthElement(measure) {
    if (zwspSupported == null) {
      var test = elt("span", "\u200b");
      removeChildrenAndAdd(measure, elt("span", [test, document.createTextNode("x")]));
      if (measure.firstChild.offsetHeight != 0)
        { zwspSupported = test.offsetWidth <= 1 && test.offsetHeight > 2 && !(ie && ie_version < 8); }
    }
    var node = zwspSupported ? elt("span", "\u200b") :
      elt("span", "\u00a0", null, "display: inline-block; width: 1px; margin-right: -1px");
    node.setAttribute("cm-text", "");
    return node
  }

  // Feature-detect IE's crummy client rect reporting for bidi text
  var badBidiRects;
  function hasBadBidiRects(measure) {
    if (badBidiRects != null) { return badBidiRects }
    var txt = removeChildrenAndAdd(measure, document.createTextNode("A\u062eA"));
    var r0 = range(txt, 0, 1).getBoundingClientRect();
    var r1 = range(txt, 1, 2).getBoundingClientRect();
    removeChildren(measure);
    if (!r0 || r0.left == r0.right) { return false } // Safari returns null in some cases (#2780)
    return badBidiRects = (r1.right - r0.right < 3)
  }

  // See if "".split is the broken IE version, if so, provide an
  // alternative way to split lines.
  var splitLinesAuto = "\n\nb".split(/\n/).length != 3 ? function (string) {
    var pos = 0, result = [], l = string.length;
    while (pos <= l) {
      var nl = string.indexOf("\n", pos);
      if (nl == -1) { nl = string.length; }
      var line = string.slice(pos, string.charAt(nl - 1) == "\r" ? nl - 1 : nl);
      var rt = line.indexOf("\r");
      if (rt != -1) {
        result.push(line.slice(0, rt));
        pos += rt + 1;
      } else {
        result.push(line);
        pos = nl + 1;
      }
    }
    return result
  } : function (string) { return string.split(/\r\n?|\n/); };

  var hasSelection = window.getSelection ? function (te) {
    try { return te.selectionStart != te.selectionEnd }
    catch(e) { return false }
  } : function (te) {
    var range;
    try {range = te.ownerDocument.selection.createRange();}
    catch(e) {}
    if (!range || range.parentElement() != te) { return false }
    return range.compareEndPoints("StartToEnd", range) != 0
  };

  var hasCopyEvent = (function () {
    var e = elt("div");
    if ("oncopy" in e) { return true }
    e.setAttribute("oncopy", "return;");
    return typeof e.oncopy == "function"
  })();

  var badZoomedRects = null;
  function hasBadZoomedRects(measure) {
    if (badZoomedRects != null) { return badZoomedRects }
    var node = removeChildrenAndAdd(measure, elt("span", "x"));
    var normal = node.getBoundingClientRect();
    var fromRange = range(node, 0, 1).getBoundingClientRect();
    return badZoomedRects = Math.abs(normal.left - fromRange.left) > 1
  }

  // Known modes, by name and by MIME
  var modes = {}, mimeModes = {};

  // Extra arguments are stored as the mode's dependencies, which is
  // used by (legacy) mechanisms like loadmode.js to automatically
  // load a mode. (Preferred mechanism is the require/define calls.)
  function defineMode(name, mode) {
    if (arguments.length > 2)
      { mode.dependencies = Array.prototype.slice.call(arguments, 2); }
    modes[name] = mode;
  }

  function defineMIME(mime, spec) {
    mimeModes[mime] = spec;
  }

  // Given a MIME type, a {name, ...options} config object, or a name
  // string, return a mode config object.
  function resolveMode(spec) {
    if (typeof spec == "string" && mimeModes.hasOwnProperty(spec)) {
      spec = mimeModes[spec];
    } else if (spec && typeof spec.name == "string" && mimeModes.hasOwnProperty(spec.name)) {
      var found = mimeModes[spec.name];
      if (typeof found == "string") { found = {name: found}; }
      spec = createObj(found, spec);
      spec.name = found.name;
    } else if (typeof spec == "string" && /^[\w\-]+\/[\w\-]+\+xml$/.test(spec)) {
      return resolveMode("application/xml")
    } else if (typeof spec == "string" && /^[\w\-]+\/[\w\-]+\+json$/.test(spec)) {
      return resolveMode("application/json")
    }
    if (typeof spec == "string") { return {name: spec} }
    else { return spec || {name: "null"} }
  }

  // Given a mode spec (anything that resolveMode accepts), find and
  // initialize an actual mode object.
  function getMode(options, spec) {
    spec = resolveMode(spec);
    var mfactory = modes[spec.name];
    if (!mfactory) { return getMode(options, "text/plain") }
    var modeObj = mfactory(options, spec);
    if (modeExtensions.hasOwnProperty(spec.name)) {
      var exts = modeExtensions[spec.name];
      for (var prop in exts) {
        if (!exts.hasOwnProperty(prop)) { continue }
        if (modeObj.hasOwnProperty(prop)) { modeObj["_" + prop] = modeObj[prop]; }
        modeObj[prop] = exts[prop];
      }
    }
    modeObj.name = spec.name;
    if (spec.helperType) { modeObj.helperType = spec.helperType; }
    if (spec.modeProps) { for (var prop$1 in spec.modeProps)
      { modeObj[prop$1] = spec.modeProps[prop$1]; } }

    return modeObj
  }

  // This can be used to attach properties to mode objects from
  // outside the actual mode definition.
  var modeExtensions = {};
  function extendMode(mode, properties) {
    var exts = modeExtensions.hasOwnProperty(mode) ? modeExtensions[mode] : (modeExtensions[mode] = {});
    copyObj(properties, exts);
  }

  function copyState(mode, state) {
    if (state === true) { return state }
    if (mode.copyState) { return mode.copyState(state) }
    var nstate = {};
    for (var n in state) {
      var val = state[n];
      if (val instanceof Array) { val = val.concat([]); }
      nstate[n] = val;
    }
    return nstate
  }

  // Given a mode and a state (for that mode), find the inner mode and
  // state at the position that the state refers to.
  function innerMode(mode, state) {
    var info;
    while (mode.innerMode) {
      info = mode.innerMode(state);
      if (!info || info.mode == mode) { break }
      state = info.state;
      mode = info.mode;
    }
    return info || {mode: mode, state: state}
  }

  function startState(mode, a1, a2) {
    return mode.startState ? mode.startState(a1, a2) : true
  }

  // STRING STREAM

  // Fed to the mode parsers, provides helper functions to make
  // parsers more succinct.

  var StringStream = function(string, tabSize, lineOracle) {
    this.pos = this.start = 0;
    this.string = string;
    this.tabSize = tabSize || 8;
    this.lastColumnPos = this.lastColumnValue = 0;
    this.lineStart = 0;
    this.lineOracle = lineOracle;
  };

  StringStream.prototype.eol = function () {return this.pos >= this.string.length};
  StringStream.prototype.sol = function () {return this.pos == this.lineStart};
  StringStream.prototype.peek = function () {return this.string.charAt(this.pos) || undefined};
  StringStream.prototype.next = function () {
    if (this.pos < this.string.length)
      { return this.string.charAt(this.pos++) }
  };
  StringStream.prototype.eat = function (match) {
    var ch = this.string.charAt(this.pos);
    var ok;
    if (typeof match == "string") { ok = ch == match; }
    else { ok = ch && (match.test ? match.test(ch) : match(ch)); }
    if (ok) {++this.pos; return ch}
  };
  StringStream.prototype.eatWhile = function (match) {
    var start = this.pos;
    while (this.eat(match)){}
    return this.pos > start
  };
  StringStream.prototype.eatSpace = function () {
    var start = this.pos;
    while (/[\s\u00a0]/.test(this.string.charAt(this.pos))) { ++this.pos; }
    return this.pos > start
  };
  StringStream.prototype.skipToEnd = function () {this.pos = this.string.length;};
  StringStream.prototype.skipTo = function (ch) {
    var found = this.string.indexOf(ch, this.pos);
    if (found > -1) {this.pos = found; return true}
  };
  StringStream.prototype.backUp = function (n) {this.pos -= n;};
  StringStream.prototype.column = function () {
    if (this.lastColumnPos < this.start) {
      this.lastColumnValue = countColumn(this.string, this.start, this.tabSize, this.lastColumnPos, this.lastColumnValue);
      this.lastColumnPos = this.start;
    }
    return this.lastColumnValue - (this.lineStart ? countColumn(this.string, this.lineStart, this.tabSize) : 0)
  };
  StringStream.prototype.indentation = function () {
    return countColumn(this.string, null, this.tabSize) -
      (this.lineStart ? countColumn(this.string, this.lineStart, this.tabSize) : 0)
  };
  StringStream.prototype.match = function (pattern, consume, caseInsensitive) {
    if (typeof pattern == "string") {
      var cased = function (str) { return caseInsensitive ? str.toLowerCase() : str; };
      var substr = this.string.substr(this.pos, pattern.length);
      if (cased(substr) == cased(pattern)) {
        if (consume !== false) { this.pos += pattern.length; }
        return true
      }
    } else {
      var match = this.string.slice(this.pos).match(pattern);
      if (match && match.index > 0) { return null }
      if (match && consume !== false) { this.pos += match[0].length; }
      return match
    }
  };
  StringStream.prototype.current = function (){return this.string.slice(this.start, this.pos)};
  StringStream.prototype.hideFirstChars = function (n, inner) {
    this.lineStart += n;
    try { return inner() }
    finally { this.lineStart -= n; }
  };
  StringStream.prototype.lookAhead = function (n) {
    var oracle = this.lineOracle;
    return oracle && oracle.lookAhead(n)
  };
  StringStream.prototype.baseToken = function () {
    var oracle = this.lineOracle;
    return oracle && oracle.baseToken(this.pos)
  };

  // Find the line object corresponding to the given line number.
  function getLine(doc, n) {
    n -= doc.first;
    if (n < 0 || n >= doc.size) { throw new Error("There is no line " + (n + doc.first) + " in the document.") }
    var chunk = doc;
    while (!chunk.lines) {
      for (var i = 0;; ++i) {
        var child = chunk.children[i], sz = child.chunkSize();
        if (n < sz) { chunk = child; break }
        n -= sz;
      }
    }
    return chunk.lines[n]
  }

  // Get the part of a document between two positions, as an array of
  // strings.
  function getBetween(doc, start, end) {
    var out = [], n = start.line;
    doc.iter(start.line, end.line + 1, function (line) {
      var text = line.text;
      if (n == end.line) { text = text.slice(0, end.ch); }
      if (n == start.line) { text = text.slice(start.ch); }
      out.push(text);
      ++n;
    });
    return out
  }
  // Get the lines between from and to, as array of strings.
  function getLines(doc, from, to) {
    var out = [];
    doc.iter(from, to, function (line) { out.push(line.text); }); // iter aborts when callback returns truthy value
    return out
  }

  // Update the height of a line, propagating the height change
  // upwards to parent nodes.
  function updateLineHeight(line, height) {
    var diff = height - line.height;
    if (diff) { for (var n = line; n; n = n.parent) { n.height += diff; } }
  }

  // Given a line object, find its line number by walking up through
  // its parent links.
  function lineNo(line) {
    if (line.parent == null) { return null }
    var cur = line.parent, no = indexOf(cur.lines, line);
    for (var chunk = cur.parent; chunk; cur = chunk, chunk = chunk.parent) {
      for (var i = 0;; ++i) {
        if (chunk.children[i] == cur) { break }
        no += chunk.children[i].chunkSize();
      }
    }
    return no + cur.first
  }

  // Find the line at the given vertical position, using the height
  // information in the document tree.
  function lineAtHeight(chunk, h) {
    var n = chunk.first;
    outer: do {
      for (var i$1 = 0; i$1 < chunk.children.length; ++i$1) {
        var child = chunk.children[i$1], ch = child.height;
        if (h < ch) { chunk = child; continue outer }
        h -= ch;
        n += child.chunkSize();
      }
      return n
    } while (!chunk.lines)
    var i = 0;
    for (; i < chunk.lines.length; ++i) {
      var line = chunk.lines[i], lh = line.height;
      if (h < lh) { break }
      h -= lh;
    }
    return n + i
  }

  function isLine(doc, l) {return l >= doc.first && l < doc.first + doc.size}

  function lineNumberFor(options, i) {
    return String(options.lineNumberFormatter(i + options.firstLineNumber))
  }

  // A Pos instance represents a position within the text.
  function Pos(line, ch, sticky) {
    if ( sticky === void 0 ) sticky = null;

    if (!(this instanceof Pos)) { return new Pos(line, ch, sticky) }
    this.line = line;
    this.ch = ch;
    this.sticky = sticky;
  }

  // Compare two positions, return 0 if they are the same, a negative
  // number when a is less, and a positive number otherwise.
  function cmp(a, b) { return a.line - b.line || a.ch - b.ch }

  function equalCursorPos(a, b) { return a.sticky == b.sticky && cmp(a, b) == 0 }

  function copyPos(x) {return Pos(x.line, x.ch)}
  function maxPos(a, b) { return cmp(a, b) < 0 ? b : a }
  function minPos(a, b) { return cmp(a, b) < 0 ? a : b }

  // Most of the external API clips given positions to make sure they
  // actually exist within the document.
  function clipLine(doc, n) {return Math.max(doc.first, Math.min(n, doc.first + doc.size - 1))}
  function clipPos(doc, pos) {
    if (pos.line < doc.first) { return Pos(doc.first, 0) }
    var last = doc.first + doc.size - 1;
    if (pos.line > last) { return Pos(last, getLine(doc, last).text.length) }
    return clipToLen(pos, getLine(doc, pos.line).text.length)
  }
  function clipToLen(pos, linelen) {
    var ch = pos.ch;
    if (ch == null || ch > linelen) { return Pos(pos.line, linelen) }
    else if (ch < 0) { return Pos(pos.line, 0) }
    else { return pos }
  }
  function clipPosArray(doc, array) {
    var out = [];
    for (var i = 0; i < array.length; i++) { out[i] = clipPos(doc, array[i]); }
    return out
  }

  var SavedContext = function(state, lookAhead) {
    this.state = state;
    this.lookAhead = lookAhead;
  };

  var Context = function(doc, state, line, lookAhead) {
    this.state = state;
    this.doc = doc;
    this.line = line;
    this.maxLookAhead = lookAhead || 0;
    this.baseTokens = null;
    this.baseTokenPos = 1;
  };

  Context.prototype.lookAhead = function (n) {
    var line = this.doc.getLine(this.line + n);
    if (line != null && n > this.maxLookAhead) { this.maxLookAhead = n; }
    return line
  };

  Context.prototype.baseToken = function (n) {
    if (!this.baseTokens) { return null }
    while (this.baseTokens[this.baseTokenPos] <= n)
      { this.baseTokenPos += 2; }
    var type = this.baseTokens[this.baseTokenPos + 1];
    return {type: type && type.replace(/( |^)overlay .*/, ""),
            size: this.baseTokens[this.baseTokenPos] - n}
  };

  Context.prototype.nextLine = function () {
    this.line++;
    if (this.maxLookAhead > 0) { this.maxLookAhead--; }
  };

  Context.fromSaved = function (doc, saved, line) {
    if (saved instanceof SavedContext)
      { return new Context(doc, copyState(doc.mode, saved.state), line, saved.lookAhead) }
    else
      { return new Context(doc, copyState(doc.mode, saved), line) }
  };

  Context.prototype.save = function (copy) {
    var state = copy !== false ? copyState(this.doc.mode, this.state) : this.state;
    return this.maxLookAhead > 0 ? new SavedContext(state, this.maxLookAhead) : state
  };


  // Compute a style array (an array starting with a mode generation
  // -- for invalidation -- followed by pairs of end positions and
  // style strings), which is used to highlight the tokens on the
  // line.
  function highlightLine(cm, line, context, forceToEnd) {
    // A styles array always starts with a number identifying the
    // mode/overlays that it is based on (for easy invalidation).
    var st = [cm.state.modeGen], lineClasses = {};
    // Compute the base array of styles
    runMode(cm, line.text, cm.doc.mode, context, function (end, style) { return st.push(end, style); },
            lineClasses, forceToEnd);
    var state = context.state;

    // Run overlays, adjust style array.
    var loop = function ( o ) {
      context.baseTokens = st;
      var overlay = cm.state.overlays[o], i = 1, at = 0;
      context.state = true;
      runMode(cm, line.text, overlay.mode, context, function (end, style) {
        var start = i;
        // Ensure there's a token end at the current position, and that i points at it
        while (at < end) {
          var i_end = st[i];
          if (i_end > end)
            { st.splice(i, 1, end, st[i+1], i_end); }
          i += 2;
          at = Math.min(end, i_end);
        }
        if (!style) { return }
        if (overlay.opaque) {
          st.splice(start, i - start, end, "overlay " + style);
          i = start + 2;
        } else {
          for (; start < i; start += 2) {
            var cur = st[start+1];
            st[start+1] = (cur ? cur + " " : "") + "overlay " + style;
          }
        }
      }, lineClasses);
      context.state = state;
      context.baseTokens = null;
      context.baseTokenPos = 1;
    };

    for (var o = 0; o < cm.state.overlays.length; ++o) loop( o );

    return {styles: st, classes: lineClasses.bgClass || lineClasses.textClass ? lineClasses : null}
  }

  function getLineStyles(cm, line, updateFrontier) {
    if (!line.styles || line.styles[0] != cm.state.modeGen) {
      var context = getContextBefore(cm, lineNo(line));
      var resetState = line.text.length > cm.options.maxHighlightLength && copyState(cm.doc.mode, context.state);
      var result = highlightLine(cm, line, context);
      if (resetState) { context.state = resetState; }
      line.stateAfter = context.save(!resetState);
      line.styles = result.styles;
      if (result.classes) { line.styleClasses = result.classes; }
      else if (line.styleClasses) { line.styleClasses = null; }
      if (updateFrontier === cm.doc.highlightFrontier)
        { cm.doc.modeFrontier = Math.max(cm.doc.modeFrontier, ++cm.doc.highlightFrontier); }
    }
    return line.styles
  }

  function getContextBefore(cm, n, precise) {
    var doc = cm.doc, display = cm.display;
    if (!doc.mode.startState) { return new Context(doc, true, n) }
    var start = findStartLine(cm, n, precise);
    var saved = start > doc.first && getLine(doc, start - 1).stateAfter;
    var context = saved ? Context.fromSaved(doc, saved, start) : new Context(doc, startState(doc.mode), start);

    doc.iter(start, n, function (line) {
      processLine(cm, line.text, context);
      var pos = context.line;
      line.stateAfter = pos == n - 1 || pos % 5 == 0 || pos >= display.viewFrom && pos < display.viewTo ? context.save() : null;
      context.nextLine();
    });
    if (precise) { doc.modeFrontier = context.line; }
    return context
  }

  // Lightweight form of highlight -- proceed over this line and
  // update state, but don't save a style array. Used for lines that
  // aren't currently visible.
  function processLine(cm, text, context, startAt) {
    var mode = cm.doc.mode;
    var stream = new StringStream(text, cm.options.tabSize, context);
    stream.start = stream.pos = startAt || 0;
    if (text == "") { callBlankLine(mode, context.state); }
    while (!stream.eol()) {
      readToken(mode, stream, context.state);
      stream.start = stream.pos;
    }
  }

  function callBlankLine(mode, state) {
    if (mode.blankLine) { return mode.blankLine(state) }
    if (!mode.innerMode) { return }
    var inner = innerMode(mode, state);
    if (inner.mode.blankLine) { return inner.mode.blankLine(inner.state) }
  }

  function readToken(mode, stream, state, inner) {
    for (var i = 0; i < 10; i++) {
      if (inner) { inner[0] = innerMode(mode, state).mode; }
      var style = mode.token(stream, state);
      if (stream.pos > stream.start) { return style }
    }
    throw new Error("Mode " + mode.name + " failed to advance stream.")
  }

  var Token = function(stream, type, state) {
    this.start = stream.start; this.end = stream.pos;
    this.string = stream.current();
    this.type = type || null;
    this.state = state;
  };

  // Utility for getTokenAt and getLineTokens
  function takeToken(cm, pos, precise, asArray) {
    var doc = cm.doc, mode = doc.mode, style;
    pos = clipPos(doc, pos);
    var line = getLine(doc, pos.line), context = getContextBefore(cm, pos.line, precise);
    var stream = new StringStream(line.text, cm.options.tabSize, context), tokens;
    if (asArray) { tokens = []; }
    while ((asArray || stream.pos < pos.ch) && !stream.eol()) {
      stream.start = stream.pos;
      style = readToken(mode, stream, context.state);
      if (asArray) { tokens.push(new Token(stream, style, copyState(doc.mode, context.state))); }
    }
    return asArray ? tokens : new Token(stream, style, context.state)
  }

  function extractLineClasses(type, output) {
    if (type) { for (;;) {
      var lineClass = type.match(/(?:^|\s+)line-(background-)?(\S+)/);
      if (!lineClass) { break }
      type = type.slice(0, lineClass.index) + type.slice(lineClass.index + lineClass[0].length);
      var prop = lineClass[1] ? "bgClass" : "textClass";
      if (output[prop] == null)
        { output[prop] = lineClass[2]; }
      else if (!(new RegExp("(?:^|\s)" + lineClass[2] + "(?:$|\s)")).test(output[prop]))
        { output[prop] += " " + lineClass[2]; }
    } }
    return type
  }

  // Run the given mode's parser over a line, calling f for each token.
  function runMode(cm, text, mode, context, f, lineClasses, forceToEnd) {
    var flattenSpans = mode.flattenSpans;
    if (flattenSpans == null) { flattenSpans = cm.options.flattenSpans; }
    var curStart = 0, curStyle = null;
    var stream = new StringStream(text, cm.options.tabSize, context), style;
    var inner = cm.options.addModeClass && [null];
    if (text == "") { extractLineClasses(callBlankLine(mode, context.state), lineClasses); }
    while (!stream.eol()) {
      if (stream.pos > cm.options.maxHighlightLength) {
        flattenSpans = false;
        if (forceToEnd) { processLine(cm, text, context, stream.pos); }
        stream.pos = text.length;
        style = null;
      } else {
        style = extractLineClasses(readToken(mode, stream, context.state, inner), lineClasses);
      }
      if (inner) {
        var mName = inner[0].name;
        if (mName) { style = "m-" + (style ? mName + " " + style : mName); }
      }
      if (!flattenSpans || curStyle != style) {
        while (curStart < stream.start) {
          curStart = Math.min(stream.start, curStart + 5000);
          f(curStart, curStyle);
        }
        curStyle = style;
      }
      stream.start = stream.pos;
    }
    while (curStart < stream.pos) {
      // Webkit seems to refuse to render text nodes longer than 57444
      // characters, and returns inaccurate measurements in nodes
      // starting around 5000 chars.
      var pos = Math.min(stream.pos, curStart + 5000);
      f(pos, curStyle);
      curStart = pos;
    }
  }

  // Finds the line to start with when starting a parse. Tries to
  // find a line with a stateAfter, so that it can start with a
  // valid state. If that fails, it returns the line with the
  // smallest indentation, which tends to need the least context to
  // parse correctly.
  function findStartLine(cm, n, precise) {
    var minindent, minline, doc = cm.doc;
    var lim = precise ? -1 : n - (cm.doc.mode.innerMode ? 1000 : 100);
    for (var search = n; search > lim; --search) {
      if (search <= doc.first) { return doc.first }
      var line = getLine(doc, search - 1), after = line.stateAfter;
      if (after && (!precise || search + (after instanceof SavedContext ? after.lookAhead : 0) <= doc.modeFrontier))
        { return search }
      var indented = countColumn(line.text, null, cm.options.tabSize);
      if (minline == null || minindent > indented) {
        minline = search - 1;
        minindent = indented;
      }
    }
    return minline
  }

  function retreatFrontier(doc, n) {
    doc.modeFrontier = Math.min(doc.modeFrontier, n);
    if (doc.highlightFrontier < n - 10) { return }
    var start = doc.first;
    for (var line = n - 1; line > start; line--) {
      var saved = getLine(doc, line).stateAfter;
      // change is on 3
      // state on line 1 looked ahead 2 -- so saw 3
      // test 1 + 2 < 3 should cover this
      if (saved && (!(saved instanceof SavedContext) || line + saved.lookAhead < n)) {
        start = line + 1;
        break
      }
    }
    doc.highlightFrontier = Math.min(doc.highlightFrontier, start);
  }

  // Optimize some code when these features are not used.
  var sawReadOnlySpans = false, sawCollapsedSpans = false;

  function seeReadOnlySpans() {
    sawReadOnlySpans = true;
  }

  function seeCollapsedSpans() {
    sawCollapsedSpans = true;
  }

  // TEXTMARKER SPANS

  function MarkedSpan(marker, from, to) {
    this.marker = marker;
    this.from = from; this.to = to;
  }

  // Search an array of spans for a span matching the given marker.
  function getMarkedSpanFor(spans, marker) {
    if (spans) { for (var i = 0; i < spans.length; ++i) {
      var span = spans[i];
      if (span.marker == marker) { return span }
    } }
  }
  // Remove a span from an array, returning undefined if no spans are
  // left (we don't store arrays for lines without spans).
  function removeMarkedSpan(spans, span) {
    var r;
    for (var i = 0; i < spans.length; ++i)
      { if (spans[i] != span) { (r || (r = [])).push(spans[i]); } }
    return r
  }
  // Add a span to a line.
  function addMarkedSpan(line, span) {
    line.markedSpans = line.markedSpans ? line.markedSpans.concat([span]) : [span];
    span.marker.attachLine(line);
  }

  // Used for the algorithm that adjusts markers for a change in the
  // document. These functions cut an array of spans at a given
  // character position, returning an array of remaining chunks (or
  // undefined if nothing remains).
  function markedSpansBefore(old, startCh, isInsert) {
    var nw;
    if (old) { for (var i = 0; i < old.length; ++i) {
      var span = old[i], marker = span.marker;
      var startsBefore = span.from == null || (marker.inclusiveLeft ? span.from <= startCh : span.from < startCh);
      if (startsBefore || span.from == startCh && marker.type == "bookmark" && (!isInsert || !span.marker.insertLeft)) {
        var endsAfter = span.to == null || (marker.inclusiveRight ? span.to >= startCh : span.to > startCh)
        ;(nw || (nw = [])).push(new MarkedSpan(marker, span.from, endsAfter ? null : span.to));
      }
    } }
    return nw
  }
  function markedSpansAfter(old, endCh, isInsert) {
    var nw;
    if (old) { for (var i = 0; i < old.length; ++i) {
      var span = old[i], marker = span.marker;
      var endsAfter = span.to == null || (marker.inclusiveRight ? span.to >= endCh : span.to > endCh);
      if (endsAfter || span.from == endCh && marker.type == "bookmark" && (!isInsert || span.marker.insertLeft)) {
        var startsBefore = span.from == null || (marker.inclusiveLeft ? span.from <= endCh : span.from < endCh)
        ;(nw || (nw = [])).push(new MarkedSpan(marker, startsBefore ? null : span.from - endCh,
                                              span.to == null ? null : span.to - endCh));
      }
    } }
    return nw
  }

  // Given a change object, compute the new set of marker spans that
  // cover the line in which the change took place. Removes spans
  // entirely within the change, reconnects spans belonging to the
  // same marker that appear on both sides of the change, and cuts off
  // spans partially within the change. Returns an array of span
  // arrays with one element for each line in (after) the change.
  function stretchSpansOverChange(doc, change) {
    if (change.full) { return null }
    var oldFirst = isLine(doc, change.from.line) && getLine(doc, change.from.line).markedSpans;
    var oldLast = isLine(doc, change.to.line) && getLine(doc, change.to.line).markedSpans;
    if (!oldFirst && !oldLast) { return null }

    var startCh = change.from.ch, endCh = change.to.ch, isInsert = cmp(change.from, change.to) == 0;
    // Get the spans that 'stick out' on both sides
    var first = markedSpansBefore(oldFirst, startCh, isInsert);
    var last = markedSpansAfter(oldLast, endCh, isInsert);

    // Next, merge those two ends
    var sameLine = change.text.length == 1, offset = lst(change.text).length + (sameLine ? startCh : 0);
    if (first) {
      // Fix up .to properties of first
      for (var i = 0; i < first.length; ++i) {
        var span = first[i];
        if (span.to == null) {
          var found = getMarkedSpanFor(last, span.marker);
          if (!found) { span.to = startCh; }
          else if (sameLine) { span.to = found.to == null ? null : found.to + offset; }
        }
      }
    }
    if (last) {
      // Fix up .from in last (or move them into first in case of sameLine)
      for (var i$1 = 0; i$1 < last.length; ++i$1) {
        var span$1 = last[i$1];
        if (span$1.to != null) { span$1.to += offset; }
        if (span$1.from == null) {
          var found$1 = getMarkedSpanFor(first, span$1.marker);
          if (!found$1) {
            span$1.from = offset;
            if (sameLine) { (first || (first = [])).push(span$1); }
          }
        } else {
          span$1.from += offset;
          if (sameLine) { (first || (first = [])).push(span$1); }
        }
      }
    }
    // Make sure we didn't create any zero-length spans
    if (first) { first = clearEmptySpans(first); }
    if (last && last != first) { last = clearEmptySpans(last); }

    var newMarkers = [first];
    if (!sameLine) {
      // Fill gap with whole-line-spans
      var gap = change.text.length - 2, gapMarkers;
      if (gap > 0 && first)
        { for (var i$2 = 0; i$2 < first.length; ++i$2)
          { if (first[i$2].to == null)
            { (gapMarkers || (gapMarkers = [])).push(new MarkedSpan(first[i$2].marker, null, null)); } } }
      for (var i$3 = 0; i$3 < gap; ++i$3)
        { newMarkers.push(gapMarkers); }
      newMarkers.push(last);
    }
    return newMarkers
  }

  // Remove spans that are empty and don't have a clearWhenEmpty
  // option of false.
  function clearEmptySpans(spans) {
    for (var i = 0; i < spans.length; ++i) {
      var span = spans[i];
      if (span.from != null && span.from == span.to && span.marker.clearWhenEmpty !== false)
        { spans.splice(i--, 1); }
    }
    if (!spans.length) { return null }
    return spans
  }

  // Used to 'clip' out readOnly ranges when making a change.
  function removeReadOnlyRanges(doc, from, to) {
    var markers = null;
    doc.iter(from.line, to.line + 1, function (line) {
      if (line.markedSpans) { for (var i = 0; i < line.markedSpans.length; ++i) {
        var mark = line.markedSpans[i].marker;
        if (mark.readOnly && (!markers || indexOf(markers, mark) == -1))
          { (markers || (markers = [])).push(mark); }
      } }
    });
    if (!markers) { return null }
    var parts = [{from: from, to: to}];
    for (var i = 0; i < markers.length; ++i) {
      var mk = markers[i], m = mk.find(0);
      for (var j = 0; j < parts.length; ++j) {
        var p = parts[j];
        if (cmp(p.to, m.from) < 0 || cmp(p.from, m.to) > 0) { continue }
        var newParts = [j, 1], dfrom = cmp(p.from, m.from), dto = cmp(p.to, m.to);
        if (dfrom < 0 || !mk.inclusiveLeft && !dfrom)
          { newParts.push({from: p.from, to: m.from}); }
        if (dto > 0 || !mk.inclusiveRight && !dto)
          { newParts.push({from: m.to, to: p.to}); }
        parts.splice.apply(parts, newParts);
        j += newParts.length - 3;
      }
    }
    return parts
  }

  // Connect or disconnect spans from a line.
  function detachMarkedSpans(line) {
    var spans = line.markedSpans;
    if (!spans) { return }
    for (var i = 0; i < spans.length; ++i)
      { spans[i].marker.detachLine(line); }
    line.markedSpans = null;
  }
  function attachMarkedSpans(line, spans) {
    if (!spans) { return }
    for (var i = 0; i < spans.length; ++i)
      { spans[i].marker.attachLine(line); }
    line.markedSpans = spans;
  }

  // Helpers used when computing which overlapping collapsed span
  // counts as the larger one.
  function extraLeft(marker) { return marker.inclusiveLeft ? -1 : 0 }
  function extraRight(marker) { return marker.inclusiveRight ? 1 : 0 }

  // Returns a number indicating which of two overlapping collapsed
  // spans is larger (and thus includes the other). Falls back to
  // comparing ids when the spans cover exactly the same range.
  function compareCollapsedMarkers(a, b) {
    var lenDiff = a.lines.length - b.lines.length;
    if (lenDiff != 0) { return lenDiff }
    var aPos = a.find(), bPos = b.find();
    var fromCmp = cmp(aPos.from, bPos.from) || extraLeft(a) - extraLeft(b);
    if (fromCmp) { return -fromCmp }
    var toCmp = cmp(aPos.to, bPos.to) || extraRight(a) - extraRight(b);
    if (toCmp) { return toCmp }
    return b.id - a.id
  }

  // Find out whether a line ends or starts in a collapsed span. If
  // so, return the marker for that span.
  function collapsedSpanAtSide(line, start) {
    var sps = sawCollapsedSpans && line.markedSpans, found;
    if (sps) { for (var sp = (void 0), i = 0; i < sps.length; ++i) {
      sp = sps[i];
      if (sp.marker.collapsed && (start ? sp.from : sp.to) == null &&
          (!found || compareCollapsedMarkers(found, sp.marker) < 0))
        { found = sp.marker; }
    } }
    return found
  }
  function collapsedSpanAtStart(line) { return collapsedSpanAtSide(line, true) }
  function collapsedSpanAtEnd(line) { return collapsedSpanAtSide(line, false) }

  function collapsedSpanAround(line, ch) {
    var sps = sawCollapsedSpans && line.markedSpans, found;
    if (sps) { for (var i = 0; i < sps.length; ++i) {
      var sp = sps[i];
      if (sp.marker.collapsed && (sp.from == null || sp.from < ch) && (sp.to == null || sp.to > ch) &&
          (!found || compareCollapsedMarkers(found, sp.marker) < 0)) { found = sp.marker; }
    } }
    return found
  }

  // Test whether there exists a collapsed span that partially
  // overlaps (covers the start or end, but not both) of a new span.
  // Such overlap is not allowed.
  function conflictingCollapsedRange(doc, lineNo, from, to, marker) {
    var line = getLine(doc, lineNo);
    var sps = sawCollapsedSpans && line.markedSpans;
    if (sps) { for (var i = 0; i < sps.length; ++i) {
      var sp = sps[i];
      if (!sp.marker.collapsed) { continue }
      var found = sp.marker.find(0);
      var fromCmp = cmp(found.from, from) || extraLeft(sp.marker) - extraLeft(marker);
      var toCmp = cmp(found.to, to) || extraRight(sp.marker) - extraRight(marker);
      if (fromCmp >= 0 && toCmp <= 0 || fromCmp <= 0 && toCmp >= 0) { continue }
      if (fromCmp <= 0 && (sp.marker.inclusiveRight && marker.inclusiveLeft ? cmp(found.to, from) >= 0 : cmp(found.to, from) > 0) ||
          fromCmp >= 0 && (sp.marker.inclusiveRight && marker.inclusiveLeft ? cmp(found.from, to) <= 0 : cmp(found.from, to) < 0))
        { return true }
    } }
  }

  // A visual line is a line as drawn on the screen. Folding, for
  // example, can cause multiple logical lines to appear on the same
  // visual line. This finds the start of the visual line that the
  // given line is part of (usually that is the line itself).
  function visualLine(line) {
    var merged;
    while (merged = collapsedSpanAtStart(line))
      { line = merged.find(-1, true).line; }
    return line
  }

  function visualLineEnd(line) {
    var merged;
    while (merged = collapsedSpanAtEnd(line))
      { line = merged.find(1, true).line; }
    return line
  }

  // Returns an array of logical lines that continue the visual line
  // started by the argument, or undefined if there are no such lines.
  function visualLineContinued(line) {
    var merged, lines;
    while (merged = collapsedSpanAtEnd(line)) {
      line = merged.find(1, true).line
      ;(lines || (lines = [])).push(line);
    }
    return lines
  }

  // Get the line number of the start of the visual line that the
  // given line number is part of.
  function visualLineNo(doc, lineN) {
    var line = getLine(doc, lineN), vis = visualLine(line);
    if (line == vis) { return lineN }
    return lineNo(vis)
  }

  // Get the line number of the start of the next visual line after
  // the given line.
  function visualLineEndNo(doc, lineN) {
    if (lineN > doc.lastLine()) { return lineN }
    var line = getLine(doc, lineN), merged;
    if (!lineIsHidden(doc, line)) { return lineN }
    while (merged = collapsedSpanAtEnd(line))
      { line = merged.find(1, true).line; }
    return lineNo(line) + 1
  }

  // Compute whether a line is hidden. Lines count as hidden when they
  // are part of a visual line that starts with another line, or when
  // they are entirely covered by collapsed, non-widget span.
  function lineIsHidden(doc, line) {
    var sps = sawCollapsedSpans && line.markedSpans;
    if (sps) { for (var sp = (void 0), i = 0; i < sps.length; ++i) {
      sp = sps[i];
      if (!sp.marker.collapsed) { continue }
      if (sp.from == null) { return true }
      if (sp.marker.widgetNode) { continue }
      if (sp.from == 0 && sp.marker.inclusiveLeft && lineIsHiddenInner(doc, line, sp))
        { return true }
    } }
  }
  function lineIsHiddenInner(doc, line, span) {
    if (span.to == null) {
      var end = span.marker.find(1, true);
      return lineIsHiddenInner(doc, end.line, getMarkedSpanFor(end.line.markedSpans, span.marker))
    }
    if (span.marker.inclusiveRight && span.to == line.text.length)
      { return true }
    for (var sp = (void 0), i = 0; i < line.markedSpans.length; ++i) {
      sp = line.markedSpans[i];
      if (sp.marker.collapsed && !sp.marker.widgetNode && sp.from == span.to &&
          (sp.to == null || sp.to != span.from) &&
          (sp.marker.inclusiveLeft || span.marker.inclusiveRight) &&
          lineIsHiddenInner(doc, line, sp)) { return true }
    }
  }

  // Find the height above the given line.
  function heightAtLine(lineObj) {
    lineObj = visualLine(lineObj);

    var h = 0, chunk = lineObj.parent;
    for (var i = 0; i < chunk.lines.length; ++i) {
      var line = chunk.lines[i];
      if (line == lineObj) { break }
      else { h += line.height; }
    }
    for (var p = chunk.parent; p; chunk = p, p = chunk.parent) {
      for (var i$1 = 0; i$1 < p.children.length; ++i$1) {
        var cur = p.children[i$1];
        if (cur == chunk) { break }
        else { h += cur.height; }
      }
    }
    return h
  }

  // Compute the character length of a line, taking into account
  // collapsed ranges (see markText) that might hide parts, and join
  // other lines onto it.
  function lineLength(line) {
    if (line.height == 0) { return 0 }
    var len = line.text.length, merged, cur = line;
    while (merged = collapsedSpanAtStart(cur)) {
      var found = merged.find(0, true);
      cur = found.from.line;
      len += found.from.ch - found.to.ch;
    }
    cur = line;
    while (merged = collapsedSpanAtEnd(cur)) {
      var found$1 = merged.find(0, true);
      len -= cur.text.length - found$1.from.ch;
      cur = found$1.to.line;
      len += cur.text.length - found$1.to.ch;
    }
    return len
  }

  // Find the longest line in the document.
  function findMaxLine(cm) {
    var d = cm.display, doc = cm.doc;
    d.maxLine = getLine(doc, doc.first);
    d.maxLineLength = lineLength(d.maxLine);
    d.maxLineChanged = true;
    doc.iter(function (line) {
      var len = lineLength(line);
      if (len > d.maxLineLength) {
        d.maxLineLength = len;
        d.maxLine = line;
      }
    });
  }

  // LINE DATA STRUCTURE

  // Line objects. These hold state related to a line, including
  // highlighting info (the styles array).
  var Line = function(text, markedSpans, estimateHeight) {
    this.text = text;
    attachMarkedSpans(this, markedSpans);
    this.height = estimateHeight ? estimateHeight(this) : 1;
  };

  Line.prototype.lineNo = function () { return lineNo(this) };
  eventMixin(Line);

  // Change the content (text, markers) of a line. Automatically
  // invalidates cached information and tries to re-estimate the
  // line's height.
  function updateLine(line, text, markedSpans, estimateHeight) {
    line.text = text;
    if (line.stateAfter) { line.stateAfter = null; }
    if (line.styles) { line.styles = null; }
    if (line.order != null) { line.order = null; }
    detachMarkedSpans(line);
    attachMarkedSpans(line, markedSpans);
    var estHeight = estimateHeight ? estimateHeight(line) : 1;
    if (estHeight != line.height) { updateLineHeight(line, estHeight); }
  }

  // Detach a line from the document tree and its markers.
  function cleanUpLine(line) {
    line.parent = null;
    detachMarkedSpans(line);
  }

  // Convert a style as returned by a mode (either null, or a string
  // containing one or more styles) to a CSS style. This is cached,
  // and also looks for line-wide styles.
  var styleToClassCache = {}, styleToClassCacheWithMode = {};
  function interpretTokenStyle(style, options) {
    if (!style || /^\s*$/.test(style)) { return null }
    var cache = options.addModeClass ? styleToClassCacheWithMode : styleToClassCache;
    return cache[style] ||
      (cache[style] = style.replace(/\S+/g, "cm-$&"))
  }

  // Render the DOM representation of the text of a line. Also builds
  // up a 'line map', which points at the DOM nodes that represent
  // specific stretches of text, and is used by the measuring code.
  // The returned object contains the DOM node, this map, and
  // information about line-wide styles that were set by the mode.
  function buildLineContent(cm, lineView) {
    // The padding-right forces the element to have a 'border', which
    // is needed on Webkit to be able to get line-level bounding
    // rectangles for it (in measureChar).
    var content = eltP("span", null, null, webkit ? "padding-right: .1px" : null);
    var builder = {pre: eltP("pre", [content], "CodeMirror-line"), content: content,
                   col: 0, pos: 0, cm: cm,
                   trailingSpace: false,
                   splitSpaces: cm.getOption("lineWrapping")};
    lineView.measure = {};

    // Iterate over the logical lines that make up this visual line.
    for (var i = 0; i <= (lineView.rest ? lineView.rest.length : 0); i++) {
      var line = i ? lineView.rest[i - 1] : lineView.line, order = (void 0);
      builder.pos = 0;
      builder.addToken = buildToken;
      // Optionally wire in some hacks into the token-rendering
      // algorithm, to deal with browser quirks.
      if (hasBadBidiRects(cm.display.measure) && (order = getOrder(line, cm.doc.direction)))
        { builder.addToken = buildTokenBadBidi(builder.addToken, order); }
      builder.map = [];
      var allowFrontierUpdate = lineView != cm.display.externalMeasured && lineNo(line);
      insertLineContent(line, builder, getLineStyles(cm, line, allowFrontierUpdate));
      if (line.styleClasses) {
        if (line.styleClasses.bgClass)
          { builder.bgClass = joinClasses(line.styleClasses.bgClass, builder.bgClass || ""); }
        if (line.styleClasses.textClass)
          { builder.textClass = joinClasses(line.styleClasses.textClass, builder.textClass || ""); }
      }

      // Ensure at least a single node is present, for measuring.
      if (builder.map.length == 0)
        { builder.map.push(0, 0, builder.content.appendChild(zeroWidthElement(cm.display.measure))); }

      // Store the map and a cache object for the current logical line
      if (i == 0) {
        lineView.measure.map = builder.map;
        lineView.measure.cache = {};
      } else {
  (lineView.measure.maps || (lineView.measure.maps = [])).push(builder.map)
        ;(lineView.measure.caches || (lineView.measure.caches = [])).push({});
      }
    }

    // See issue #2901
    if (webkit) {
      var last = builder.content.lastChild;
      if (/\bcm-tab\b/.test(last.className) || (last.querySelector && last.querySelector(".cm-tab")))
        { builder.content.className = "cm-tab-wrap-hack"; }
    }

    signal(cm, "renderLine", cm, lineView.line, builder.pre);
    if (builder.pre.className)
      { builder.textClass = joinClasses(builder.pre.className, builder.textClass || ""); }

    return builder
  }

  function defaultSpecialCharPlaceholder(ch) {
    var token = elt("span", "\u2022", "cm-invalidchar");
    token.title = "\\u" + ch.charCodeAt(0).toString(16);
    token.setAttribute("aria-label", token.title);
    return token
  }

  // Build up the DOM representation for a single token, and add it to
  // the line map. Takes care to render special characters separately.
  function buildToken(builder, text, style, startStyle, endStyle, css, attributes) {
    if (!text) { return }
    var displayText = builder.splitSpaces ? splitSpaces(text, builder.trailingSpace) : text;
    var special = builder.cm.state.specialChars, mustWrap = false;
    var content;
    if (!special.test(text)) {
      builder.col += text.length;
      content = document.createTextNode(displayText);
      builder.map.push(builder.pos, builder.pos + text.length, content);
      if (ie && ie_version < 9) { mustWrap = true; }
      builder.pos += text.length;
    } else {
      content = document.createDocumentFragment();
      var pos = 0;
      while (true) {
        special.lastIndex = pos;
        var m = special.exec(text);
        var skipped = m ? m.index - pos : text.length - pos;
        if (skipped) {
          var txt = document.createTextNode(displayText.slice(pos, pos + skipped));
          if (ie && ie_version < 9) { content.appendChild(elt("span", [txt])); }
          else { content.appendChild(txt); }
          builder.map.push(builder.pos, builder.pos + skipped, txt);
          builder.col += skipped;
          builder.pos += skipped;
        }
        if (!m) { break }
        pos += skipped + 1;
        var txt$1 = (void 0);
        if (m[0] == "\t") {
          var tabSize = builder.cm.options.tabSize, tabWidth = tabSize - builder.col % tabSize;
          txt$1 = content.appendChild(elt("span", spaceStr(tabWidth), "cm-tab"));
          txt$1.setAttribute("role", "presentation");
          txt$1.setAttribute("cm-text", "\t");
          builder.col += tabWidth;
        } else if (m[0] == "\r" || m[0] == "\n") {
          txt$1 = content.appendChild(elt("span", m[0] == "\r" ? "\u240d" : "\u2424", "cm-invalidchar"));
          txt$1.setAttribute("cm-text", m[0]);
          builder.col += 1;
        } else {
          txt$1 = builder.cm.options.specialCharPlaceholder(m[0]);
          txt$1.setAttribute("cm-text", m[0]);
          if (ie && ie_version < 9) { content.appendChild(elt("span", [txt$1])); }
          else { content.appendChild(txt$1); }
          builder.col += 1;
        }
        builder.map.push(builder.pos, builder.pos + 1, txt$1);
        builder.pos++;
      }
    }
    builder.trailingSpace = displayText.charCodeAt(text.length - 1) == 32;
    if (style || startStyle || endStyle || mustWrap || css) {
      var fullStyle = style || "";
      if (startStyle) { fullStyle += startStyle; }
      if (endStyle) { fullStyle += endStyle; }
      var token = elt("span", [content], fullStyle, css);
      if (attributes) {
        for (var attr in attributes) { if (attributes.hasOwnProperty(attr) && attr != "style" && attr != "class")
          { token.setAttribute(attr, attributes[attr]); } }
      }
      return builder.content.appendChild(token)
    }
    builder.content.appendChild(content);
  }

  // Change some spaces to NBSP to prevent the browser from collapsing
  // trailing spaces at the end of a line when rendering text (issue #1362).
  function splitSpaces(text, trailingBefore) {
    if (text.length > 1 && !/  /.test(text)) { return text }
    var spaceBefore = trailingBefore, result = "";
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      if (ch == " " && spaceBefore && (i == text.length - 1 || text.charCodeAt(i + 1) == 32))
        { ch = "\u00a0"; }
      result += ch;
      spaceBefore = ch == " ";
    }
    return result
  }

  // Work around nonsense dimensions being reported for stretches of
  // right-to-left text.
  function buildTokenBadBidi(inner, order) {
    return function (builder, text, style, startStyle, endStyle, css, attributes) {
      style = style ? style + " cm-force-border" : "cm-force-border";
      var start = builder.pos, end = start + text.length;
      for (;;) {
        // Find the part that overlaps with the start of this text
        var part = (void 0);
        for (var i = 0; i < order.length; i++) {
          part = order[i];
          if (part.to > start && part.from <= start) { break }
        }
        if (part.to >= end) { return inner(builder, text, style, startStyle, endStyle, css, attributes) }
        inner(builder, text.slice(0, part.to - start), style, startStyle, null, css, attributes);
        startStyle = null;
        text = text.slice(part.to - start);
        start = part.to;
      }
    }
  }

  function buildCollapsedSpan(builder, size, marker, ignoreWidget) {
    var widget = !ignoreWidget && marker.widgetNode;
    if (widget) { builder.map.push(builder.pos, builder.pos + size, widget); }
    if (!ignoreWidget && builder.cm.display.input.needsContentAttribute) {
      if (!widget)
        { widget = builder.content.appendChild(document.createElement("span")); }
      widget.setAttribute("cm-marker", marker.id);
    }
    if (widget) {
      builder.cm.display.input.setUneditable(widget);
      builder.content.appendChild(widget);
    }
    builder.pos += size;
    builder.trailingSpace = false;
  }

  // Outputs a number of spans to make up a line, taking highlighting
  // and marked text into account.
  function insertLineContent(line, builder, styles) {
    var spans = line.markedSpans, allText = line.text, at = 0;
    if (!spans) {
      for (var i$1 = 1; i$1 < styles.length; i$1+=2)
        { builder.addToken(builder, allText.slice(at, at = styles[i$1]), interpretTokenStyle(styles[i$1+1], builder.cm.options)); }
      return
    }

    var len = allText.length, pos = 0, i = 1, text = "", style, css;
    var nextChange = 0, spanStyle, spanEndStyle, spanStartStyle, collapsed, attributes;
    for (;;) {
      if (nextChange == pos) { // Update current marker set
        spanStyle = spanEndStyle = spanStartStyle = css = "";
        attributes = null;
        collapsed = null; nextChange = Infinity;
        var foundBookmarks = [], endStyles = (void 0);
        for (var j = 0; j < spans.length; ++j) {
          var sp = spans[j], m = sp.marker;
          if (m.type == "bookmark" && sp.from == pos && m.widgetNode) {
            foundBookmarks.push(m);
          } else if (sp.from <= pos && (sp.to == null || sp.to > pos || m.collapsed && sp.to == pos && sp.from == pos)) {
            if (sp.to != null && sp.to != pos && nextChange > sp.to) {
              nextChange = sp.to;
              spanEndStyle = "";
            }
            if (m.className) { spanStyle += " " + m.className; }
            if (m.css) { css = (css ? css + ";" : "") + m.css; }
            if (m.startStyle && sp.from == pos) { spanStartStyle += " " + m.startStyle; }
            if (m.endStyle && sp.to == nextChange) { (endStyles || (endStyles = [])).push(m.endStyle, sp.to); }
            // support for the old title property
            // https://github.com/codemirror/CodeMirror/pull/5673
            if (m.title) { (attributes || (attributes = {})).title = m.title; }
            if (m.attributes) {
              for (var attr in m.attributes)
                { (attributes || (attributes = {}))[attr] = m.attributes[attr]; }
            }
            if (m.collapsed && (!collapsed || compareCollapsedMarkers(collapsed.marker, m) < 0))
              { collapsed = sp; }
          } else if (sp.from > pos && nextChange > sp.from) {
            nextChange = sp.from;
          }
        }
        if (endStyles) { for (var j$1 = 0; j$1 < endStyles.length; j$1 += 2)
          { if (endStyles[j$1 + 1] == nextChange) { spanEndStyle += " " + endStyles[j$1]; } } }

        if (!collapsed || collapsed.from == pos) { for (var j$2 = 0; j$2 < foundBookmarks.length; ++j$2)
          { buildCollapsedSpan(builder, 0, foundBookmarks[j$2]); } }
        if (collapsed && (collapsed.from || 0) == pos) {
          buildCollapsedSpan(builder, (collapsed.to == null ? len + 1 : collapsed.to) - pos,
                             collapsed.marker, collapsed.from == null);
          if (collapsed.to == null) { return }
          if (collapsed.to == pos) { collapsed = false; }
        }
      }
      if (pos >= len) { break }

      var upto = Math.min(len, nextChange);
      while (true) {
        if (text) {
          var end = pos + text.length;
          if (!collapsed) {
            var tokenText = end > upto ? text.slice(0, upto - pos) : text;
            builder.addToken(builder, tokenText, style ? style + spanStyle : spanStyle,
                             spanStartStyle, pos + tokenText.length == nextChange ? spanEndStyle : "", css, attributes);
          }
          if (end >= upto) {text = text.slice(upto - pos); pos = upto; break}
          pos = end;
          spanStartStyle = "";
        }
        text = allText.slice(at, at = styles[i++]);
        style = interpretTokenStyle(styles[i++], builder.cm.options);
      }
    }
  }


  // These objects are used to represent the visible (currently drawn)
  // part of the document. A LineView may correspond to multiple
  // logical lines, if those are connected by collapsed ranges.
  function LineView(doc, line, lineN) {
    // The starting line
    this.line = line;
    // Continuing lines, if any
    this.rest = visualLineContinued(line);
    // Number of logical lines in this visual line
    this.size = this.rest ? lineNo(lst(this.rest)) - lineN + 1 : 1;
    this.node = this.text = null;
    this.hidden = lineIsHidden(doc, line);
  }

  // Create a range of LineView objects for the given lines.
  function buildViewArray(cm, from, to) {
    var array = [], nextPos;
    for (var pos = from; pos < to; pos = nextPos) {
      var view = new LineView(cm.doc, getLine(cm.doc, pos), pos);
      nextPos = pos + view.size;
      array.push(view);
    }
    return array
  }

  var operationGroup = null;

  function pushOperation(op) {
    if (operationGroup) {
      operationGroup.ops.push(op);
    } else {
      op.ownsGroup = operationGroup = {
        ops: [op],
        delayedCallbacks: []
      };
    }
  }

  function fireCallbacksForOps(group) {
    // Calls delayed callbacks and cursorActivity handlers until no
    // new ones appear
    var callbacks = group.delayedCallbacks, i = 0;
    do {
      for (; i < callbacks.length; i++)
        { callbacks[i].call(null); }
      for (var j = 0; j < group.ops.length; j++) {
        var op = group.ops[j];
        if (op.cursorActivityHandlers)
          { while (op.cursorActivityCalled < op.cursorActivityHandlers.length)
            { op.cursorActivityHandlers[op.cursorActivityCalled++].call(null, op.cm); } }
      }
    } while (i < callbacks.length)
  }

  function finishOperation(op, endCb) {
    var group = op.ownsGroup;
    if (!group) { return }

    try { fireCallbacksForOps(group); }
    finally {
      operationGroup = null;
      endCb(group);
    }
  }

  var orphanDelayedCallbacks = null;

  // Often, we want to signal events at a point where we are in the
  // middle of some work, but don't want the handler to start calling
  // other methods on the editor, which might be in an inconsistent
  // state or simply not expect any other events to happen.
  // signalLater looks whether there are any handlers, and schedules
  // them to be executed when the last operation ends, or, if no
  // operation is active, when a timeout fires.
  function signalLater(emitter, type /*, values...*/) {
    var arr = getHandlers(emitter, type);
    if (!arr.length) { return }
    var args = Array.prototype.slice.call(arguments, 2), list;
    if (operationGroup) {
      list = operationGroup.delayedCallbacks;
    } else if (orphanDelayedCallbacks) {
      list = orphanDelayedCallbacks;
    } else {
      list = orphanDelayedCallbacks = [];
      setTimeout(fireOrphanDelayed, 0);
    }
    var loop = function ( i ) {
      list.push(function () { return arr[i].apply(null, args); });
    };

    for (var i = 0; i < arr.length; ++i)
      loop( i );
  }

  function fireOrphanDelayed() {
    var delayed = orphanDelayedCallbacks;
    orphanDelayedCallbacks = null;
    for (var i = 0; i < delayed.length; ++i) { delayed[i](); }
  }

  // When an aspect of a line changes, a string is added to
  // lineView.changes. This updates the relevant part of the line's
  // DOM structure.
  function updateLineForChanges(cm, lineView, lineN, dims) {
    for (var j = 0; j < lineView.changes.length; j++) {
      var type = lineView.changes[j];
      if (type == "text") { updateLineText(cm, lineView); }
      else if (type == "gutter") { updateLineGutter(cm, lineView, lineN, dims); }
      else if (type == "class") { updateLineClasses(cm, lineView); }
      else if (type == "widget") { updateLineWidgets(cm, lineView, dims); }
    }
    lineView.changes = null;
  }

  // Lines with gutter elements, widgets or a background class need to
  // be wrapped, and have the extra elements added to the wrapper div
  function ensureLineWrapped(lineView) {
    if (lineView.node == lineView.text) {
      lineView.node = elt("div", null, null, "position: relative");
      if (lineView.text.parentNode)
        { lineView.text.parentNode.replaceChild(lineView.node, lineView.text); }
      lineView.node.appendChild(lineView.text);
      if (ie && ie_version < 8) { lineView.node.style.zIndex = 2; }
    }
    return lineView.node
  }

  function updateLineBackground(cm, lineView) {
    var cls = lineView.bgClass ? lineView.bgClass + " " + (lineView.line.bgClass || "") : lineView.line.bgClass;
    if (cls) { cls += " CodeMirror-linebackground"; }
    if (lineView.background) {
      if (cls) { lineView.background.className = cls; }
      else { lineView.background.parentNode.removeChild(lineView.background); lineView.background = null; }
    } else if (cls) {
      var wrap = ensureLineWrapped(lineView);
      lineView.background = wrap.insertBefore(elt("div", null, cls), wrap.firstChild);
      cm.display.input.setUneditable(lineView.background);
    }
  }

  // Wrapper around buildLineContent which will reuse the structure
  // in display.externalMeasured when possible.
  function getLineContent(cm, lineView) {
    var ext = cm.display.externalMeasured;
    if (ext && ext.line == lineView.line) {
      cm.display.externalMeasured = null;
      lineView.measure = ext.measure;
      return ext.built
    }
    return buildLineContent(cm, lineView)
  }

  // Redraw the line's text. Interacts with the background and text
  // classes because the mode may output tokens that influence these
  // classes.
  function updateLineText(cm, lineView) {
    var cls = lineView.text.className;
    var built = getLineContent(cm, lineView);
    if (lineView.text == lineView.node) { lineView.node = built.pre; }
    lineView.text.parentNode.replaceChild(built.pre, lineView.text);
    lineView.text = built.pre;
    if (built.bgClass != lineView.bgClass || built.textClass != lineView.textClass) {
      lineView.bgClass = built.bgClass;
      lineView.textClass = built.textClass;
      updateLineClasses(cm, lineView);
    } else if (cls) {
      lineView.text.className = cls;
    }
  }

  function updateLineClasses(cm, lineView) {
    updateLineBackground(cm, lineView);
    if (lineView.line.wrapClass)
      { ensureLineWrapped(lineView).className = lineView.line.wrapClass; }
    else if (lineView.node != lineView.text)
      { lineView.node.className = ""; }
    var textClass = lineView.textClass ? lineView.textClass + " " + (lineView.line.textClass || "") : lineView.line.textClass;
    lineView.text.className = textClass || "";
  }

  function updateLineGutter(cm, lineView, lineN, dims) {
    if (lineView.gutter) {
      lineView.node.removeChild(lineView.gutter);
      lineView.gutter = null;
    }
    if (lineView.gutterBackground) {
      lineView.node.removeChild(lineView.gutterBackground);
      lineView.gutterBackground = null;
    }
    if (lineView.line.gutterClass) {
      var wrap = ensureLineWrapped(lineView);
      lineView.gutterBackground = elt("div", null, "CodeMirror-gutter-background " + lineView.line.gutterClass,
                                      ("left: " + (cm.options.fixedGutter ? dims.fixedPos : -dims.gutterTotalWidth) + "px; width: " + (dims.gutterTotalWidth) + "px"));
      cm.display.input.setUneditable(lineView.gutterBackground);
      wrap.insertBefore(lineView.gutterBackground, lineView.text);
    }
    var markers = lineView.line.gutterMarkers;
    if (cm.options.lineNumbers || markers) {
      var wrap$1 = ensureLineWrapped(lineView);
      var gutterWrap = lineView.gutter = elt("div", null, "CodeMirror-gutter-wrapper", ("left: " + (cm.options.fixedGutter ? dims.fixedPos : -dims.gutterTotalWidth) + "px"));
      cm.display.input.setUneditable(gutterWrap);
      wrap$1.insertBefore(gutterWrap, lineView.text);
      if (lineView.line.gutterClass)
        { gutterWrap.className += " " + lineView.line.gutterClass; }
      if (cm.options.lineNumbers && (!markers || !markers["CodeMirror-linenumbers"]))
        { lineView.lineNumber = gutterWrap.appendChild(
          elt("div", lineNumberFor(cm.options, lineN),
              "CodeMirror-linenumber CodeMirror-gutter-elt",
              ("left: " + (dims.gutterLeft["CodeMirror-linenumbers"]) + "px; width: " + (cm.display.lineNumInnerWidth) + "px"))); }
      if (markers) { for (var k = 0; k < cm.display.gutterSpecs.length; ++k) {
        var id = cm.display.gutterSpecs[k].className, found = markers.hasOwnProperty(id) && markers[id];
        if (found)
          { gutterWrap.appendChild(elt("div", [found], "CodeMirror-gutter-elt",
                                     ("left: " + (dims.gutterLeft[id]) + "px; width: " + (dims.gutterWidth[id]) + "px"))); }
      } }
    }
  }

  function updateLineWidgets(cm, lineView, dims) {
    if (lineView.alignable) { lineView.alignable = null; }
    var isWidget = classTest("CodeMirror-linewidget");
    for (var node = lineView.node.firstChild, next = (void 0); node; node = next) {
      next = node.nextSibling;
      if (isWidget.test(node.className)) { lineView.node.removeChild(node); }
    }
    insertLineWidgets(cm, lineView, dims);
  }

  // Build a line's DOM representation from scratch
  function buildLineElement(cm, lineView, lineN, dims) {
    var built = getLineContent(cm, lineView);
    lineView.text = lineView.node = built.pre;
    if (built.bgClass) { lineView.bgClass = built.bgClass; }
    if (built.textClass) { lineView.textClass = built.textClass; }

    updateLineClasses(cm, lineView);
    updateLineGutter(cm, lineView, lineN, dims);
    insertLineWidgets(cm, lineView, dims);
    return lineView.node
  }

  // A lineView may contain multiple logical lines (when merged by
  // collapsed spans). The widgets for all of them need to be drawn.
  function insertLineWidgets(cm, lineView, dims) {
    insertLineWidgetsFor(cm, lineView.line, lineView, dims, true);
    if (lineView.rest) { for (var i = 0; i < lineView.rest.length; i++)
      { insertLineWidgetsFor(cm, lineView.rest[i], lineView, dims, false); } }
  }

  function insertLineWidgetsFor(cm, line, lineView, dims, allowAbove) {
    if (!line.widgets) { return }
    var wrap = ensureLineWrapped(lineView);
    for (var i = 0, ws = line.widgets; i < ws.length; ++i) {
      var widget = ws[i], node = elt("div", [widget.node], "CodeMirror-linewidget" + (widget.className ? " " + widget.className : ""));
      if (!widget.handleMouseEvents) { node.setAttribute("cm-ignore-events", "true"); }
      positionLineWidget(widget, node, lineView, dims);
      cm.display.input.setUneditable(node);
      if (allowAbove && widget.above)
        { wrap.insertBefore(node, lineView.gutter || lineView.text); }
      else
        { wrap.appendChild(node); }
      signalLater(widget, "redraw");
    }
  }

  function positionLineWidget(widget, node, lineView, dims) {
    if (widget.noHScroll) {
  (lineView.alignable || (lineView.alignable = [])).push(node);
      var width = dims.wrapperWidth;
      node.style.left = dims.fixedPos + "px";
      if (!widget.coverGutter) {
        width -= dims.gutterTotalWidth;
        node.style.paddingLeft = dims.gutterTotalWidth + "px";
      }
      node.style.width = width + "px";
    }
    if (widget.coverGutter) {
      node.style.zIndex = 5;
      node.style.position = "relative";
      if (!widget.noHScroll) { node.style.marginLeft = -dims.gutterTotalWidth + "px"; }
    }
  }

  function widgetHeight(widget) {
    if (widget.height != null) { return widget.height }
    var cm = widget.doc.cm;
    if (!cm) { return 0 }
    if (!contains(document.body, widget.node)) {
      var parentStyle = "position: relative;";
      if (widget.coverGutter)
        { parentStyle += "margin-left: -" + cm.display.gutters.offsetWidth + "px;"; }
      if (widget.noHScroll)
        { parentStyle += "width: " + cm.display.wrapper.clientWidth + "px;"; }
      removeChildrenAndAdd(cm.display.measure, elt("div", [widget.node], null, parentStyle));
    }
    return widget.height = widget.node.parentNode.offsetHeight
  }

  // Return true when the given mouse event happened in a widget
  function eventInWidget(display, e) {
    for (var n = e_target(e); n != display.wrapper; n = n.parentNode) {
      if (!n || (n.nodeType == 1 && n.getAttribute("cm-ignore-events") == "true") ||
          (n.parentNode == display.sizer && n != display.mover))
        { return true }
    }
  }

  // POSITION MEASUREMENT

  function paddingTop(display) {return display.lineSpace.offsetTop}
  function paddingVert(display) {return display.mover.offsetHeight - display.lineSpace.offsetHeight}
  function paddingH(display) {
    if (display.cachedPaddingH) { return display.cachedPaddingH }
    var e = removeChildrenAndAdd(display.measure, elt("pre", "x", "CodeMirror-line-like"));
    var style = window.getComputedStyle ? window.getComputedStyle(e) : e.currentStyle;
    var data = {left: parseInt(style.paddingLeft), right: parseInt(style.paddingRight)};
    if (!isNaN(data.left) && !isNaN(data.right)) { display.cachedPaddingH = data; }
    return data
  }

  function scrollGap(cm) { return scrollerGap - cm.display.nativeBarWidth }
  function displayWidth(cm) {
    return cm.display.scroller.clientWidth - scrollGap(cm) - cm.display.barWidth
  }
  function displayHeight(cm) {
    return cm.display.scroller.clientHeight - scrollGap(cm) - cm.display.barHeight
  }

  // Ensure the lineView.wrapping.heights array is populated. This is
  // an array of bottom offsets for the lines that make up a drawn
  // line. When lineWrapping is on, there might be more than one
  // height.
  function ensureLineHeights(cm, lineView, rect) {
    var wrapping = cm.options.lineWrapping;
    var curWidth = wrapping && displayWidth(cm);
    if (!lineView.measure.heights || wrapping && lineView.measure.width != curWidth) {
      var heights = lineView.measure.heights = [];
      if (wrapping) {
        lineView.measure.width = curWidth;
        var rects = lineView.text.firstChild.getClientRects();
        for (var i = 0; i < rects.length - 1; i++) {
          var cur = rects[i], next = rects[i + 1];
          if (Math.abs(cur.bottom - next.bottom) > 2)
            { heights.push((cur.bottom + next.top) / 2 - rect.top); }
        }
      }
      heights.push(rect.bottom - rect.top);
    }
  }

  // Find a line map (mapping character offsets to text nodes) and a
  // measurement cache for the given line number. (A line view might
  // contain multiple lines when collapsed ranges are present.)
  function mapFromLineView(lineView, line, lineN) {
    if (lineView.line == line)
      { return {map: lineView.measure.map, cache: lineView.measure.cache} }
    for (var i = 0; i < lineView.rest.length; i++)
      { if (lineView.rest[i] == line)
        { return {map: lineView.measure.maps[i], cache: lineView.measure.caches[i]} } }
    for (var i$1 = 0; i$1 < lineView.rest.length; i$1++)
      { if (lineNo(lineView.rest[i$1]) > lineN)
        { return {map: lineView.measure.maps[i$1], cache: lineView.measure.caches[i$1], before: true} } }
  }

  // Render a line into the hidden node display.externalMeasured. Used
  // when measurement is needed for a line that's not in the viewport.
  function updateExternalMeasurement(cm, line) {
    line = visualLine(line);
    var lineN = lineNo(line);
    var view = cm.display.externalMeasured = new LineView(cm.doc, line, lineN);
    view.lineN = lineN;
    var built = view.built = buildLineContent(cm, view);
    view.text = built.pre;
    removeChildrenAndAdd(cm.display.lineMeasure, built.pre);
    return view
  }

  // Get a {top, bottom, left, right} box (in line-local coordinates)
  // for a given character.
  function measureChar(cm, line, ch, bias) {
    return measureCharPrepared(cm, prepareMeasureForLine(cm, line), ch, bias)
  }

  // Find a line view that corresponds to the given line number.
  function findViewForLine(cm, lineN) {
    if (lineN >= cm.display.viewFrom && lineN < cm.display.viewTo)
      { return cm.display.view[findViewIndex(cm, lineN)] }
    var ext = cm.display.externalMeasured;
    if (ext && lineN >= ext.lineN && lineN < ext.lineN + ext.size)
      { return ext }
  }

  // Measurement can be split in two steps, the set-up work that
  // applies to the whole line, and the measurement of the actual
  // character. Functions like coordsChar, that need to do a lot of
  // measurements in a row, can thus ensure that the set-up work is
  // only done once.
  function prepareMeasureForLine(cm, line) {
    var lineN = lineNo(line);
    var view = findViewForLine(cm, lineN);
    if (view && !view.text) {
      view = null;
    } else if (view && view.changes) {
      updateLineForChanges(cm, view, lineN, getDimensions(cm));
      cm.curOp.forceUpdate = true;
    }
    if (!view)
      { view = updateExternalMeasurement(cm, line); }

    var info = mapFromLineView(view, line, lineN);
    return {
      line: line, view: view, rect: null,
      map: info.map, cache: info.cache, before: info.before,
      hasHeights: false
    }
  }

  // Given a prepared measurement object, measures the position of an
  // actual character (or fetches it from the cache).
  function measureCharPrepared(cm, prepared, ch, bias, varHeight) {
    if (prepared.before) { ch = -1; }
    var key = ch + (bias || ""), found;
    if (prepared.cache.hasOwnProperty(key)) {
      found = prepared.cache[key];
    } else {
      if (!prepared.rect)
        { prepared.rect = prepared.view.text.getBoundingClientRect(); }
      if (!prepared.hasHeights) {
        ensureLineHeights(cm, prepared.view, prepared.rect);
        prepared.hasHeights = true;
      }
      found = measureCharInner(cm, prepared, ch, bias);
      if (!found.bogus) { prepared.cache[key] = found; }
    }
    return {left: found.left, right: found.right,
            top: varHeight ? found.rtop : found.top,
            bottom: varHeight ? found.rbottom : found.bottom}
  }

  var nullRect = {left: 0, right: 0, top: 0, bottom: 0};

  function nodeAndOffsetInLineMap(map, ch, bias) {
    var node, start, end, collapse, mStart, mEnd;
    // First, search the line map for the text node corresponding to,
    // or closest to, the target character.
    for (var i = 0; i < map.length; i += 3) {
      mStart = map[i];
      mEnd = map[i + 1];
      if (ch < mStart) {
        start = 0; end = 1;
        collapse = "left";
      } else if (ch < mEnd) {
        start = ch - mStart;
        end = start + 1;
      } else if (i == map.length - 3 || ch == mEnd && map[i + 3] > ch) {
        end = mEnd - mStart;
        start = end - 1;
        if (ch >= mEnd) { collapse = "right"; }
      }
      if (start != null) {
        node = map[i + 2];
        if (mStart == mEnd && bias == (node.insertLeft ? "left" : "right"))
          { collapse = bias; }
        if (bias == "left" && start == 0)
          { while (i && map[i - 2] == map[i - 3] && map[i - 1].insertLeft) {
            node = map[(i -= 3) + 2];
            collapse = "left";
          } }
        if (bias == "right" && start == mEnd - mStart)
          { while (i < map.length - 3 && map[i + 3] == map[i + 4] && !map[i + 5].insertLeft) {
            node = map[(i += 3) + 2];
            collapse = "right";
          } }
        break
      }
    }
    return {node: node, start: start, end: end, collapse: collapse, coverStart: mStart, coverEnd: mEnd}
  }

  function getUsefulRect(rects, bias) {
    var rect = nullRect;
    if (bias == "left") { for (var i = 0; i < rects.length; i++) {
      if ((rect = rects[i]).left != rect.right) { break }
    } } else { for (var i$1 = rects.length - 1; i$1 >= 0; i$1--) {
      if ((rect = rects[i$1]).left != rect.right) { break }
    } }
    return rect
  }

  function measureCharInner(cm, prepared, ch, bias) {
    var place = nodeAndOffsetInLineMap(prepared.map, ch, bias);
    var node = place.node, start = place.start, end = place.end, collapse = place.collapse;

    var rect;
    if (node.nodeType == 3) { // If it is a text node, use a range to retrieve the coordinates.
      for (var i$1 = 0; i$1 < 4; i$1++) { // Retry a maximum of 4 times when nonsense rectangles are returned
        while (start && isExtendingChar(prepared.line.text.charAt(place.coverStart + start))) { --start; }
        while (place.coverStart + end < place.coverEnd && isExtendingChar(prepared.line.text.charAt(place.coverStart + end))) { ++end; }
        if (ie && ie_version < 9 && start == 0 && end == place.coverEnd - place.coverStart)
          { rect = node.parentNode.getBoundingClientRect(); }
        else
          { rect = getUsefulRect(range(node, start, end).getClientRects(), bias); }
        if (rect.left || rect.right || start == 0) { break }
        end = start;
        start = start - 1;
        collapse = "right";
      }
      if (ie && ie_version < 11) { rect = maybeUpdateRectForZooming(cm.display.measure, rect); }
    } else { // If it is a widget, simply get the box for the whole widget.
      if (start > 0) { collapse = bias = "right"; }
      var rects;
      if (cm.options.lineWrapping && (rects = node.getClientRects()).length > 1)
        { rect = rects[bias == "right" ? rects.length - 1 : 0]; }
      else
        { rect = node.getBoundingClientRect(); }
    }
    if (ie && ie_version < 9 && !start && (!rect || !rect.left && !rect.right)) {
      var rSpan = node.parentNode.getClientRects()[0];
      if (rSpan)
        { rect = {left: rSpan.left, right: rSpan.left + charWidth(cm.display), top: rSpan.top, bottom: rSpan.bottom}; }
      else
        { rect = nullRect; }
    }

    var rtop = rect.top - prepared.rect.top, rbot = rect.bottom - prepared.rect.top;
    var mid = (rtop + rbot) / 2;
    var heights = prepared.view.measure.heights;
    var i = 0;
    for (; i < heights.length - 1; i++)
      { if (mid < heights[i]) { break } }
    var top = i ? heights[i - 1] : 0, bot = heights[i];
    var result = {left: (collapse == "right" ? rect.right : rect.left) - prepared.rect.left,
                  right: (collapse == "left" ? rect.left : rect.right) - prepared.rect.left,
                  top: top, bottom: bot};
    if (!rect.left && !rect.right) { result.bogus = true; }
    if (!cm.options.singleCursorHeightPerLine) { result.rtop = rtop; result.rbottom = rbot; }

    return result
  }

  // Work around problem with bounding client rects on ranges being
  // returned incorrectly when zoomed on IE10 and below.
  function maybeUpdateRectForZooming(measure, rect) {
    if (!window.screen || screen.logicalXDPI == null ||
        screen.logicalXDPI == screen.deviceXDPI || !hasBadZoomedRects(measure))
      { return rect }
    var scaleX = screen.logicalXDPI / screen.deviceXDPI;
    var scaleY = screen.logicalYDPI / screen.deviceYDPI;
    return {left: rect.left * scaleX, right: rect.right * scaleX,
            top: rect.top * scaleY, bottom: rect.bottom * scaleY}
  }

  function clearLineMeasurementCacheFor(lineView) {
    if (lineView.measure) {
      lineView.measure.cache = {};
      lineView.measure.heights = null;
      if (lineView.rest) { for (var i = 0; i < lineView.rest.length; i++)
        { lineView.measure.caches[i] = {}; } }
    }
  }

  function clearLineMeasurementCache(cm) {
    cm.display.externalMeasure = null;
    removeChildren(cm.display.lineMeasure);
    for (var i = 0; i < cm.display.view.length; i++)
      { clearLineMeasurementCacheFor(cm.display.view[i]); }
  }

  function clearCaches(cm) {
    clearLineMeasurementCache(cm);
    cm.display.cachedCharWidth = cm.display.cachedTextHeight = cm.display.cachedPaddingH = null;
    if (!cm.options.lineWrapping) { cm.display.maxLineChanged = true; }
    cm.display.lineNumChars = null;
  }

  function pageScrollX() {
    // Work around https://bugs.chromium.org/p/chromium/issues/detail?id=489206
    // which causes page_Offset and bounding client rects to use
    // different reference viewports and invalidate our calculations.
    if (chrome && android) { return -(document.body.getBoundingClientRect().left - parseInt(getComputedStyle(document.body).marginLeft)) }
    return window.pageXOffset || (document.documentElement || document.body).scrollLeft
  }
  function pageScrollY() {
    if (chrome && android) { return -(document.body.getBoundingClientRect().top - parseInt(getComputedStyle(document.body).marginTop)) }
    return window.pageYOffset || (document.documentElement || document.body).scrollTop
  }

  function widgetTopHeight(lineObj) {
    var height = 0;
    if (lineObj.widgets) { for (var i = 0; i < lineObj.widgets.length; ++i) { if (lineObj.widgets[i].above)
      { height += widgetHeight(lineObj.widgets[i]); } } }
    return height
  }

  // Converts a {top, bottom, left, right} box from line-local
  // coordinates into another coordinate system. Context may be one of
  // "line", "div" (display.lineDiv), "local"./null (editor), "window",
  // or "page".
  function intoCoordSystem(cm, lineObj, rect, context, includeWidgets) {
    if (!includeWidgets) {
      var height = widgetTopHeight(lineObj);
      rect.top += height; rect.bottom += height;
    }
    if (context == "line") { return rect }
    if (!context) { context = "local"; }
    var yOff = heightAtLine(lineObj);
    if (context == "local") { yOff += paddingTop(cm.display); }
    else { yOff -= cm.display.viewOffset; }
    if (context == "page" || context == "window") {
      var lOff = cm.display.lineSpace.getBoundingClientRect();
      yOff += lOff.top + (context == "window" ? 0 : pageScrollY());
      var xOff = lOff.left + (context == "window" ? 0 : pageScrollX());
      rect.left += xOff; rect.right += xOff;
    }
    rect.top += yOff; rect.bottom += yOff;
    return rect
  }

  // Coverts a box from "div" coords to another coordinate system.
  // Context may be "window", "page", "div", or "local"./null.
  function fromCoordSystem(cm, coords, context) {
    if (context == "div") { return coords }
    var left = coords.left, top = coords.top;
    // First move into "page" coordinate system
    if (context == "page") {
      left -= pageScrollX();
      top -= pageScrollY();
    } else if (context == "local" || !context) {
      var localBox = cm.display.sizer.getBoundingClientRect();
      left += localBox.left;
      top += localBox.top;
    }

    var lineSpaceBox = cm.display.lineSpace.getBoundingClientRect();
    return {left: left - lineSpaceBox.left, top: top - lineSpaceBox.top}
  }

  function charCoords(cm, pos, context, lineObj, bias) {
    if (!lineObj) { lineObj = getLine(cm.doc, pos.line); }
    return intoCoordSystem(cm, lineObj, measureChar(cm, lineObj, pos.ch, bias), context)
  }

  // Returns a box for a given cursor position, which may have an
  // 'other' property containing the position of the secondary cursor
  // on a bidi boundary.
  // A cursor Pos(line, char, "before") is on the same visual line as `char - 1`
  // and after `char - 1` in writing order of `char - 1`
  // A cursor Pos(line, char, "after") is on the same visual line as `char`
  // and before `char` in writing order of `char`
  // Examples (upper-case letters are RTL, lower-case are LTR):
  //     Pos(0, 1, ...)
  //     before   after
  // ab     a|b     a|b
  // aB     a|B     aB|
  // Ab     |Ab     A|b
  // AB     B|A     B|A
  // Every position after the last character on a line is considered to stick
  // to the last character on the line.
  function cursorCoords(cm, pos, context, lineObj, preparedMeasure, varHeight) {
    lineObj = lineObj || getLine(cm.doc, pos.line);
    if (!preparedMeasure) { preparedMeasure = prepareMeasureForLine(cm, lineObj); }
    function get(ch, right) {
      var m = measureCharPrepared(cm, preparedMeasure, ch, right ? "right" : "left", varHeight);
      if (right) { m.left = m.right; } else { m.right = m.left; }
      return intoCoordSystem(cm, lineObj, m, context)
    }
    var order = getOrder(lineObj, cm.doc.direction), ch = pos.ch, sticky = pos.sticky;
    if (ch >= lineObj.text.length) {
      ch = lineObj.text.length;
      sticky = "before";
    } else if (ch <= 0) {
      ch = 0;
      sticky = "after";
    }
    if (!order) { return get(sticky == "before" ? ch - 1 : ch, sticky == "before") }

    function getBidi(ch, partPos, invert) {
      var part = order[partPos], right = part.level == 1;
      return get(invert ? ch - 1 : ch, right != invert)
    }
    var partPos = getBidiPartAt(order, ch, sticky);
    var other = bidiOther;
    var val = getBidi(ch, partPos, sticky == "before");
    if (other != null) { val.other = getBidi(ch, other, sticky != "before"); }
    return val
  }

  // Used to cheaply estimate the coordinates for a position. Used for
  // intermediate scroll updates.
  function estimateCoords(cm, pos) {
    var left = 0;
    pos = clipPos(cm.doc, pos);
    if (!cm.options.lineWrapping) { left = charWidth(cm.display) * pos.ch; }
    var lineObj = getLine(cm.doc, pos.line);
    var top = heightAtLine(lineObj) + paddingTop(cm.display);
    return {left: left, right: left, top: top, bottom: top + lineObj.height}
  }

  // Positions returned by coordsChar contain some extra information.
  // xRel is the relative x position of the input coordinates compared
  // to the found position (so xRel > 0 means the coordinates are to
  // the right of the character position, for example). When outside
  // is true, that means the coordinates lie outside the line's
  // vertical range.
  function PosWithInfo(line, ch, sticky, outside, xRel) {
    var pos = Pos(line, ch, sticky);
    pos.xRel = xRel;
    if (outside) { pos.outside = outside; }
    return pos
  }

  // Compute the character position closest to the given coordinates.
  // Input must be lineSpace-local ("div" coordinate system).
  function coordsChar(cm, x, y) {
    var doc = cm.doc;
    y += cm.display.viewOffset;
    if (y < 0) { return PosWithInfo(doc.first, 0, null, -1, -1) }
    var lineN = lineAtHeight(doc, y), last = doc.first + doc.size - 1;
    if (lineN > last)
      { return PosWithInfo(doc.first + doc.size - 1, getLine(doc, last).text.length, null, 1, 1) }
    if (x < 0) { x = 0; }

    var lineObj = getLine(doc, lineN);
    for (;;) {
      var found = coordsCharInner(cm, lineObj, lineN, x, y);
      var collapsed = collapsedSpanAround(lineObj, found.ch + (found.xRel > 0 || found.outside > 0 ? 1 : 0));
      if (!collapsed) { return found }
      var rangeEnd = collapsed.find(1);
      if (rangeEnd.line == lineN) { return rangeEnd }
      lineObj = getLine(doc, lineN = rangeEnd.line);
    }
  }

  function wrappedLineExtent(cm, lineObj, preparedMeasure, y) {
    y -= widgetTopHeight(lineObj);
    var end = lineObj.text.length;
    var begin = findFirst(function (ch) { return measureCharPrepared(cm, preparedMeasure, ch - 1).bottom <= y; }, end, 0);
    end = findFirst(function (ch) { return measureCharPrepared(cm, preparedMeasure, ch).top > y; }, begin, end);
    return {begin: begin, end: end}
  }

  function wrappedLineExtentChar(cm, lineObj, preparedMeasure, target) {
    if (!preparedMeasure) { preparedMeasure = prepareMeasureForLine(cm, lineObj); }
    var targetTop = intoCoordSystem(cm, lineObj, measureCharPrepared(cm, preparedMeasure, target), "line").top;
    return wrappedLineExtent(cm, lineObj, preparedMeasure, targetTop)
  }

  // Returns true if the given side of a box is after the given
  // coordinates, in top-to-bottom, left-to-right order.
  function boxIsAfter(box, x, y, left) {
    return box.bottom <= y ? false : box.top > y ? true : (left ? box.left : box.right) > x
  }

  function coordsCharInner(cm, lineObj, lineNo, x, y) {
    // Move y into line-local coordinate space
    y -= heightAtLine(lineObj);
    var preparedMeasure = prepareMeasureForLine(cm, lineObj);
    // When directly calling `measureCharPrepared`, we have to adjust
    // for the widgets at this line.
    var widgetHeight = widgetTopHeight(lineObj);
    var begin = 0, end = lineObj.text.length, ltr = true;

    var order = getOrder(lineObj, cm.doc.direction);
    // If the line isn't plain left-to-right text, first figure out
    // which bidi section the coordinates fall into.
    if (order) {
      var part = (cm.options.lineWrapping ? coordsBidiPartWrapped : coordsBidiPart)
                   (cm, lineObj, lineNo, preparedMeasure, order, x, y);
      ltr = part.level != 1;
      // The awkward -1 offsets are needed because findFirst (called
      // on these below) will treat its first bound as inclusive,
      // second as exclusive, but we want to actually address the
      // characters in the part's range
      begin = ltr ? part.from : part.to - 1;
      end = ltr ? part.to : part.from - 1;
    }

    // A binary search to find the first character whose bounding box
    // starts after the coordinates. If we run across any whose box wrap
    // the coordinates, store that.
    var chAround = null, boxAround = null;
    var ch = findFirst(function (ch) {
      var box = measureCharPrepared(cm, preparedMeasure, ch);
      box.top += widgetHeight; box.bottom += widgetHeight;
      if (!boxIsAfter(box, x, y, false)) { return false }
      if (box.top <= y && box.left <= x) {
        chAround = ch;
        boxAround = box;
      }
      return true
    }, begin, end);

    var baseX, sticky, outside = false;
    // If a box around the coordinates was found, use that
    if (boxAround) {
      // Distinguish coordinates nearer to the left or right side of the box
      var atLeft = x - boxAround.left < boxAround.right - x, atStart = atLeft == ltr;
      ch = chAround + (atStart ? 0 : 1);
      sticky = atStart ? "after" : "before";
      baseX = atLeft ? boxAround.left : boxAround.right;
    } else {
      // (Adjust for extended bound, if necessary.)
      if (!ltr && (ch == end || ch == begin)) { ch++; }
      // To determine which side to associate with, get the box to the
      // left of the character and compare it's vertical position to the
      // coordinates
      sticky = ch == 0 ? "after" : ch == lineObj.text.length ? "before" :
        (measureCharPrepared(cm, preparedMeasure, ch - (ltr ? 1 : 0)).bottom + widgetHeight <= y) == ltr ?
        "after" : "before";
      // Now get accurate coordinates for this place, in order to get a
      // base X position
      var coords = cursorCoords(cm, Pos(lineNo, ch, sticky), "line", lineObj, preparedMeasure);
      baseX = coords.left;
      outside = y < coords.top ? -1 : y >= coords.bottom ? 1 : 0;
    }

    ch = skipExtendingChars(lineObj.text, ch, 1);
    return PosWithInfo(lineNo, ch, sticky, outside, x - baseX)
  }

  function coordsBidiPart(cm, lineObj, lineNo, preparedMeasure, order, x, y) {
    // Bidi parts are sorted left-to-right, and in a non-line-wrapping
    // situation, we can take this ordering to correspond to the visual
    // ordering. This finds the first part whose end is after the given
    // coordinates.
    var index = findFirst(function (i) {
      var part = order[i], ltr = part.level != 1;
      return boxIsAfter(cursorCoords(cm, Pos(lineNo, ltr ? part.to : part.from, ltr ? "before" : "after"),
                                     "line", lineObj, preparedMeasure), x, y, true)
    }, 0, order.length - 1);
    var part = order[index];
    // If this isn't the first part, the part's start is also after
    // the coordinates, and the coordinates aren't on the same line as
    // that start, move one part back.
    if (index > 0) {
      var ltr = part.level != 1;
      var start = cursorCoords(cm, Pos(lineNo, ltr ? part.from : part.to, ltr ? "after" : "before"),
                               "line", lineObj, preparedMeasure);
      if (boxIsAfter(start, x, y, true) && start.top > y)
        { part = order[index - 1]; }
    }
    return part
  }

  function coordsBidiPartWrapped(cm, lineObj, _lineNo, preparedMeasure, order, x, y) {
    // In a wrapped line, rtl text on wrapping boundaries can do things
    // that don't correspond to the ordering in our `order` array at
    // all, so a binary search doesn't work, and we want to return a
    // part that only spans one line so that the binary search in
    // coordsCharInner is safe. As such, we first find the extent of the
    // wrapped line, and then do a flat search in which we discard any
    // spans that aren't on the line.
    var ref = wrappedLineExtent(cm, lineObj, preparedMeasure, y);
    var begin = ref.begin;
    var end = ref.end;
    if (/\s/.test(lineObj.text.charAt(end - 1))) { end--; }
    var part = null, closestDist = null;
    for (var i = 0; i < order.length; i++) {
      var p = order[i];
      if (p.from >= end || p.to <= begin) { continue }
      var ltr = p.level != 1;
      var endX = measureCharPrepared(cm, preparedMeasure, ltr ? Math.min(end, p.to) - 1 : Math.max(begin, p.from)).right;
      // Weigh against spans ending before this, so that they are only
      // picked if nothing ends after
      var dist = endX < x ? x - endX + 1e9 : endX - x;
      if (!part || closestDist > dist) {
        part = p;
        closestDist = dist;
      }
    }
    if (!part) { part = order[order.length - 1]; }
    // Clip the part to the wrapped line.
    if (part.from < begin) { part = {from: begin, to: part.to, level: part.level}; }
    if (part.to > end) { part = {from: part.from, to: end, level: part.level}; }
    return part
  }

  var measureText;
  // Compute the default text height.
  function textHeight(display) {
    if (display.cachedTextHeight != null) { return display.cachedTextHeight }
    if (measureText == null) {
      measureText = elt("pre", null, "CodeMirror-line-like");
      // Measure a bunch of lines, for browsers that compute
      // fractional heights.
      for (var i = 0; i < 49; ++i) {
        measureText.appendChild(document.createTextNode("x"));
        measureText.appendChild(elt("br"));
      }
      measureText.appendChild(document.createTextNode("x"));
    }
    removeChildrenAndAdd(display.measure, measureText);
    var height = measureText.offsetHeight / 50;
    if (height > 3) { display.cachedTextHeight = height; }
    removeChildren(display.measure);
    return height || 1
  }

  // Compute the default character width.
  function charWidth(display) {
    if (display.cachedCharWidth != null) { return display.cachedCharWidth }
    var anchor = elt("span", "xxxxxxxxxx");
    var pre = elt("pre", [anchor], "CodeMirror-line-like");
    removeChildrenAndAdd(display.measure, pre);
    var rect = anchor.getBoundingClientRect(), width = (rect.right - rect.left) / 10;
    if (width > 2) { display.cachedCharWidth = width; }
    return width || 10
  }

  // Do a bulk-read of the DOM positions and sizes needed to draw the
  // view, so that we don't interleave reading and writing to the DOM.
  function getDimensions(cm) {
    var d = cm.display, left = {}, width = {};
    var gutterLeft = d.gutters.clientLeft;
    for (var n = d.gutters.firstChild, i = 0; n; n = n.nextSibling, ++i) {
      var id = cm.display.gutterSpecs[i].className;
      left[id] = n.offsetLeft + n.clientLeft + gutterLeft;
      width[id] = n.clientWidth;
    }
    return {fixedPos: compensateForHScroll(d),
            gutterTotalWidth: d.gutters.offsetWidth,
            gutterLeft: left,
            gutterWidth: width,
            wrapperWidth: d.wrapper.clientWidth}
  }

  // Computes display.scroller.scrollLeft + display.gutters.offsetWidth,
  // but using getBoundingClientRect to get a sub-pixel-accurate
  // result.
  function compensateForHScroll(display) {
    return display.scroller.getBoundingClientRect().left - display.sizer.getBoundingClientRect().left
  }

  // Returns a function that estimates the height of a line, to use as
  // first approximation until the line becomes visible (and is thus
  // properly measurable).
  function estimateHeight(cm) {
    var th = textHeight(cm.display), wrapping = cm.options.lineWrapping;
    var perLine = wrapping && Math.max(5, cm.display.scroller.clientWidth / charWidth(cm.display) - 3);
    return function (line) {
      if (lineIsHidden(cm.doc, line)) { return 0 }

      var widgetsHeight = 0;
      if (line.widgets) { for (var i = 0; i < line.widgets.length; i++) {
        if (line.widgets[i].height) { widgetsHeight += line.widgets[i].height; }
      } }

      if (wrapping)
        { return widgetsHeight + (Math.ceil(line.text.length / perLine) || 1) * th }
      else
        { return widgetsHeight + th }
    }
  }

  function estimateLineHeights(cm) {
    var doc = cm.doc, est = estimateHeight(cm);
    doc.iter(function (line) {
      var estHeight = est(line);
      if (estHeight != line.height) { updateLineHeight(line, estHeight); }
    });
  }

  // Given a mouse event, find the corresponding position. If liberal
  // is false, it checks whether a gutter or scrollbar was clicked,
  // and returns null if it was. forRect is used by rectangular
  // selections, and tries to estimate a character position even for
  // coordinates beyond the right of the text.
  function posFromMouse(cm, e, liberal, forRect) {
    var display = cm.display;
    if (!liberal && e_target(e).getAttribute("cm-not-content") == "true") { return null }

    var x, y, space = display.lineSpace.getBoundingClientRect();
    // Fails unpredictably on IE[67] when mouse is dragged around quickly.
    try { x = e.clientX - space.left; y = e.clientY - space.top; }
    catch (e) { return null }
    var coords = coordsChar(cm, x, y), line;
    if (forRect && coords.xRel > 0 && (line = getLine(cm.doc, coords.line).text).length == coords.ch) {
      var colDiff = countColumn(line, line.length, cm.options.tabSize) - line.length;
      coords = Pos(coords.line, Math.max(0, Math.round((x - paddingH(cm.display).left) / charWidth(cm.display)) - colDiff));
    }
    return coords
  }

  // Find the view element corresponding to a given line. Return null
  // when the line isn't visible.
  function findViewIndex(cm, n) {
    if (n >= cm.display.viewTo) { return null }
    n -= cm.display.viewFrom;
    if (n < 0) { return null }
    var view = cm.display.view;
    for (var i = 0; i < view.length; i++) {
      n -= view[i].size;
      if (n < 0) { return i }
    }
  }

  // Updates the display.view data structure for a given change to the
  // document. From and to are in pre-change coordinates. Lendiff is
  // the amount of lines added or subtracted by the change. This is
  // used for changes that span multiple lines, or change the way
  // lines are divided into visual lines. regLineChange (below)
  // registers single-line changes.
  function regChange(cm, from, to, lendiff) {
    if (from == null) { from = cm.doc.first; }
    if (to == null) { to = cm.doc.first + cm.doc.size; }
    if (!lendiff) { lendiff = 0; }

    var display = cm.display;
    if (lendiff && to < display.viewTo &&
        (display.updateLineNumbers == null || display.updateLineNumbers > from))
      { display.updateLineNumbers = from; }

    cm.curOp.viewChanged = true;

    if (from >= display.viewTo) { // Change after
      if (sawCollapsedSpans && visualLineNo(cm.doc, from) < display.viewTo)
        { resetView(cm); }
    } else if (to <= display.viewFrom) { // Change before
      if (sawCollapsedSpans && visualLineEndNo(cm.doc, to + lendiff) > display.viewFrom) {
        resetView(cm);
      } else {
        display.viewFrom += lendiff;
        display.viewTo += lendiff;
      }
    } else if (from <= display.viewFrom && to >= display.viewTo) { // Full overlap
      resetView(cm);
    } else if (from <= display.viewFrom) { // Top overlap
      var cut = viewCuttingPoint(cm, to, to + lendiff, 1);
      if (cut) {
        display.view = display.view.slice(cut.index);
        display.viewFrom = cut.lineN;
        display.viewTo += lendiff;
      } else {
        resetView(cm);
      }
    } else if (to >= display.viewTo) { // Bottom overlap
      var cut$1 = viewCuttingPoint(cm, from, from, -1);
      if (cut$1) {
        display.view = display.view.slice(0, cut$1.index);
        display.viewTo = cut$1.lineN;
      } else {
        resetView(cm);
      }
    } else { // Gap in the middle
      var cutTop = viewCuttingPoint(cm, from, from, -1);
      var cutBot = viewCuttingPoint(cm, to, to + lendiff, 1);
      if (cutTop && cutBot) {
        display.view = display.view.slice(0, cutTop.index)
          .concat(buildViewArray(cm, cutTop.lineN, cutBot.lineN))
          .concat(display.view.slice(cutBot.index));
        display.viewTo += lendiff;
      } else {
        resetView(cm);
      }
    }

    var ext = display.externalMeasured;
    if (ext) {
      if (to < ext.lineN)
        { ext.lineN += lendiff; }
      else if (from < ext.lineN + ext.size)
        { display.externalMeasured = null; }
    }
  }

  // Register a change to a single line. Type must be one of "text",
  // "gutter", "class", "widget"
  function regLineChange(cm, line, type) {
    cm.curOp.viewChanged = true;
    var display = cm.display, ext = cm.display.externalMeasured;
    if (ext && line >= ext.lineN && line < ext.lineN + ext.size)
      { display.externalMeasured = null; }

    if (line < display.viewFrom || line >= display.viewTo) { return }
    var lineView = display.view[findViewIndex(cm, line)];
    if (lineView.node == null) { return }
    var arr = lineView.changes || (lineView.changes = []);
    if (indexOf(arr, type) == -1) { arr.push(type); }
  }

  // Clear the view.
  function resetView(cm) {
    cm.display.viewFrom = cm.display.viewTo = cm.doc.first;
    cm.display.view = [];
    cm.display.viewOffset = 0;
  }

  function viewCuttingPoint(cm, oldN, newN, dir) {
    var index = findViewIndex(cm, oldN), diff, view = cm.display.view;
    if (!sawCollapsedSpans || newN == cm.doc.first + cm.doc.size)
      { return {index: index, lineN: newN} }
    var n = cm.display.viewFrom;
    for (var i = 0; i < index; i++)
      { n += view[i].size; }
    if (n != oldN) {
      if (dir > 0) {
        if (index == view.length - 1) { return null }
        diff = (n + view[index].size) - oldN;
        index++;
      } else {
        diff = n - oldN;
      }
      oldN += diff; newN += diff;
    }
    while (visualLineNo(cm.doc, newN) != newN) {
      if (index == (dir < 0 ? 0 : view.length - 1)) { return null }
      newN += dir * view[index - (dir < 0 ? 1 : 0)].size;
      index += dir;
    }
    return {index: index, lineN: newN}
  }

  // Force the view to cover a given range, adding empty view element
  // or clipping off existing ones as needed.
  function adjustView(cm, from, to) {
    var display = cm.display, view = display.view;
    if (view.length == 0 || from >= display.viewTo || to <= display.viewFrom) {
      display.view = buildViewArray(cm, from, to);
      display.viewFrom = from;
    } else {
      if (display.viewFrom > from)
        { display.view = buildViewArray(cm, from, display.viewFrom).concat(display.view); }
      else if (display.viewFrom < from)
        { display.view = display.view.slice(findViewIndex(cm, from)); }
      display.viewFrom = from;
      if (display.viewTo < to)
        { display.view = display.view.concat(buildViewArray(cm, display.viewTo, to)); }
      else if (display.viewTo > to)
        { display.view = display.view.slice(0, findViewIndex(cm, to)); }
    }
    display.viewTo = to;
  }

  // Count the number of lines in the view whose DOM representation is
  // out of date (or nonexistent).
  function countDirtyView(cm) {
    var view = cm.display.view, dirty = 0;
    for (var i = 0; i < view.length; i++) {
      var lineView = view[i];
      if (!lineView.hidden && (!lineView.node || lineView.changes)) { ++dirty; }
    }
    return dirty
  }

  function updateSelection(cm) {
    cm.display.input.showSelection(cm.display.input.prepareSelection());
  }

  function prepareSelection(cm, primary) {
    if ( primary === void 0 ) primary = true;

    var doc = cm.doc, result = {};
    var curFragment = result.cursors = document.createDocumentFragment();
    var selFragment = result.selection = document.createDocumentFragment();

    for (var i = 0; i < doc.sel.ranges.length; i++) {
      if (!primary && i == doc.sel.primIndex) { continue }
      var range = doc.sel.ranges[i];
      if (range.from().line >= cm.display.viewTo || range.to().line < cm.display.viewFrom) { continue }
      var collapsed = range.empty();
      if (collapsed || cm.options.showCursorWhenSelecting)
        { drawSelectionCursor(cm, range.head, curFragment); }
      if (!collapsed)
        { drawSelectionRange(cm, range, selFragment); }
    }
    return result
  }

  // Draws a cursor for the given range
  function drawSelectionCursor(cm, head, output) {
    var pos = cursorCoords(cm, head, "div", null, null, !cm.options.singleCursorHeightPerLine);

    var cursor = output.appendChild(elt("div", "\u00a0", "CodeMirror-cursor"));
    cursor.style.left = pos.left + "px";
    cursor.style.top = pos.top + "px";
    cursor.style.height = Math.max(0, pos.bottom - pos.top) * cm.options.cursorHeight + "px";

    if (pos.other) {
      // Secondary cursor, shown when on a 'jump' in bi-directional text
      var otherCursor = output.appendChild(elt("div", "\u00a0", "CodeMirror-cursor CodeMirror-secondarycursor"));
      otherCursor.style.display = "";
      otherCursor.style.left = pos.other.left + "px";
      otherCursor.style.top = pos.other.top + "px";
      otherCursor.style.height = (pos.other.bottom - pos.other.top) * .85 + "px";
    }
  }

  function cmpCoords(a, b) { return a.top - b.top || a.left - b.left }

  // Draws the given range as a highlighted selection
  function drawSelectionRange(cm, range, output) {
    var display = cm.display, doc = cm.doc;
    var fragment = document.createDocumentFragment();
    var padding = paddingH(cm.display), leftSide = padding.left;
    var rightSide = Math.max(display.sizerWidth, displayWidth(cm) - display.sizer.offsetLeft) - padding.right;
    var docLTR = doc.direction == "ltr";

    function add(left, top, width, bottom) {
      if (top < 0) { top = 0; }
      top = Math.round(top);
      bottom = Math.round(bottom);
      fragment.appendChild(elt("div", null, "CodeMirror-selected", ("position: absolute; left: " + left + "px;\n                             top: " + top + "px; width: " + (width == null ? rightSide - left : width) + "px;\n                             height: " + (bottom - top) + "px")));
    }

    function drawForLine(line, fromArg, toArg) {
      var lineObj = getLine(doc, line);
      var lineLen = lineObj.text.length;
      var start, end;
      function coords(ch, bias) {
        return charCoords(cm, Pos(line, ch), "div", lineObj, bias)
      }

      function wrapX(pos, dir, side) {
        var extent = wrappedLineExtentChar(cm, lineObj, null, pos);
        var prop = (dir == "ltr") == (side == "after") ? "left" : "right";
        var ch = side == "after" ? extent.begin : extent.end - (/\s/.test(lineObj.text.charAt(extent.end - 1)) ? 2 : 1);
        return coords(ch, prop)[prop]
      }

      var order = getOrder(lineObj, doc.direction);
      iterateBidiSections(order, fromArg || 0, toArg == null ? lineLen : toArg, function (from, to, dir, i) {
        var ltr = dir == "ltr";
        var fromPos = coords(from, ltr ? "left" : "right");
        var toPos = coords(to - 1, ltr ? "right" : "left");

        var openStart = fromArg == null && from == 0, openEnd = toArg == null && to == lineLen;
        var first = i == 0, last = !order || i == order.length - 1;
        if (toPos.top - fromPos.top <= 3) { // Single line
          var openLeft = (docLTR ? openStart : openEnd) && first;
          var openRight = (docLTR ? openEnd : openStart) && last;
          var left = openLeft ? leftSide : (ltr ? fromPos : toPos).left;
          var right = openRight ? rightSide : (ltr ? toPos : fromPos).right;
          add(left, fromPos.top, right - left, fromPos.bottom);
        } else { // Multiple lines
          var topLeft, topRight, botLeft, botRight;
          if (ltr) {
            topLeft = docLTR && openStart && first ? leftSide : fromPos.left;
            topRight = docLTR ? rightSide : wrapX(from, dir, "before");
            botLeft = docLTR ? leftSide : wrapX(to, dir, "after");
            botRight = docLTR && openEnd && last ? rightSide : toPos.right;
          } else {
            topLeft = !docLTR ? leftSide : wrapX(from, dir, "before");
            topRight = !docLTR && openStart && first ? rightSide : fromPos.right;
            botLeft = !docLTR && openEnd && last ? leftSide : toPos.left;
            botRight = !docLTR ? rightSide : wrapX(to, dir, "after");
          }
          add(topLeft, fromPos.top, topRight - topLeft, fromPos.bottom);
          if (fromPos.bottom < toPos.top) { add(leftSide, fromPos.bottom, null, toPos.top); }
          add(botLeft, toPos.top, botRight - botLeft, toPos.bottom);
        }

        if (!start || cmpCoords(fromPos, start) < 0) { start = fromPos; }
        if (cmpCoords(toPos, start) < 0) { start = toPos; }
        if (!end || cmpCoords(fromPos, end) < 0) { end = fromPos; }
        if (cmpCoords(toPos, end) < 0) { end = toPos; }
      });
      return {start: start, end: end}
    }

    var sFrom = range.from(), sTo = range.to();
    if (sFrom.line == sTo.line) {
      drawForLine(sFrom.line, sFrom.ch, sTo.ch);
    } else {
      var fromLine = getLine(doc, sFrom.line), toLine = getLine(doc, sTo.line);
      var singleVLine = visualLine(fromLine) == visualLine(toLine);
      var leftEnd = drawForLine(sFrom.line, sFrom.ch, singleVLine ? fromLine.text.length + 1 : null).end;
      var rightStart = drawForLine(sTo.line, singleVLine ? 0 : null, sTo.ch).start;
      if (singleVLine) {
        if (leftEnd.top < rightStart.top - 2) {
          add(leftEnd.right, leftEnd.top, null, leftEnd.bottom);
          add(leftSide, rightStart.top, rightStart.left, rightStart.bottom);
        } else {
          add(leftEnd.right, leftEnd.top, rightStart.left - leftEnd.right, leftEnd.bottom);
        }
      }
      if (leftEnd.bottom < rightStart.top)
        { add(leftSide, leftEnd.bottom, null, rightStart.top); }
    }

    output.appendChild(fragment);
  }

  // Cursor-blinking
  function restartBlink(cm) {
    if (!cm.state.focused) { return }
    var display = cm.display;
    clearInterval(display.blinker);
    var on = true;
    display.cursorDiv.style.visibility = "";
    if (cm.options.cursorBlinkRate > 0)
      { display.blinker = setInterval(function () { return display.cursorDiv.style.visibility = (on = !on) ? "" : "hidden"; },
        cm.options.cursorBlinkRate); }
    else if (cm.options.cursorBlinkRate < 0)
      { display.cursorDiv.style.visibility = "hidden"; }
  }

  function ensureFocus(cm) {
    if (!cm.state.focused) { cm.display.input.focus(); onFocus(cm); }
  }

  function delayBlurEvent(cm) {
    cm.state.delayingBlurEvent = true;
    setTimeout(function () { if (cm.state.delayingBlurEvent) {
      cm.state.delayingBlurEvent = false;
      onBlur(cm);
    } }, 100);
  }

  function onFocus(cm, e) {
    if (cm.state.delayingBlurEvent) { cm.state.delayingBlurEvent = false; }

    if (cm.options.readOnly == "nocursor") { return }
    if (!cm.state.focused) {
      signal(cm, "focus", cm, e);
      cm.state.focused = true;
      addClass(cm.display.wrapper, "CodeMirror-focused");
      // This test prevents this from firing when a context
      // menu is closed (since the input reset would kill the
      // select-all detection hack)
      if (!cm.curOp && cm.display.selForContextMenu != cm.doc.sel) {
        cm.display.input.reset();
        if (webkit) { setTimeout(function () { return cm.display.input.reset(true); }, 20); } // Issue #1730
      }
      cm.display.input.receivedFocus();
    }
    restartBlink(cm);
  }
  function onBlur(cm, e) {
    if (cm.state.delayingBlurEvent) { return }

    if (cm.state.focused) {
      signal(cm, "blur", cm, e);
      cm.state.focused = false;
      rmClass(cm.display.wrapper, "CodeMirror-focused");
    }
    clearInterval(cm.display.blinker);
    setTimeout(function () { if (!cm.state.focused) { cm.display.shift = false; } }, 150);
  }

  // Read the actual heights of the rendered lines, and update their
  // stored heights to match.
  function updateHeightsInViewport(cm) {
    var display = cm.display;
    var prevBottom = display.lineDiv.offsetTop;
    for (var i = 0; i < display.view.length; i++) {
      var cur = display.view[i], wrapping = cm.options.lineWrapping;
      var height = (void 0), width = 0;
      if (cur.hidden) { continue }
      if (ie && ie_version < 8) {
        var bot = cur.node.offsetTop + cur.node.offsetHeight;
        height = bot - prevBottom;
        prevBottom = bot;
      } else {
        var box = cur.node.getBoundingClientRect();
        height = box.bottom - box.top;
        // Check that lines don't extend past the right of the current
        // editor width
        if (!wrapping && cur.text.firstChild)
          { width = cur.text.firstChild.getBoundingClientRect().right - box.left - 1; }
      }
      var diff = cur.line.height - height;
      if (diff > .005 || diff < -.005) {
        updateLineHeight(cur.line, height);
        updateWidgetHeight(cur.line);
        if (cur.rest) { for (var j = 0; j < cur.rest.length; j++)
          { updateWidgetHeight(cur.rest[j]); } }
      }
      if (width > cm.display.sizerWidth) {
        var chWidth = Math.ceil(width / charWidth(cm.display));
        if (chWidth > cm.display.maxLineLength) {
          cm.display.maxLineLength = chWidth;
          cm.display.maxLine = cur.line;
          cm.display.maxLineChanged = true;
        }
      }
    }
  }

  // Read and store the height of line widgets associated with the
  // given line.
  function updateWidgetHeight(line) {
    if (line.widgets) { for (var i = 0; i < line.widgets.length; ++i) {
      var w = line.widgets[i], parent = w.node.parentNode;
      if (parent) { w.height = parent.offsetHeight; }
    } }
  }

  // Compute the lines that are visible in a given viewport (defaults
  // the the current scroll position). viewport may contain top,
  // height, and ensure (see op.scrollToPos) properties.
  function visibleLines(display, doc, viewport) {
    var top = viewport && viewport.top != null ? Math.max(0, viewport.top) : display.scroller.scrollTop;
    top = Math.floor(top - paddingTop(display));
    var bottom = viewport && viewport.bottom != null ? viewport.bottom : top + display.wrapper.clientHeight;

    var from = lineAtHeight(doc, top), to = lineAtHeight(doc, bottom);
    // Ensure is a {from: {line, ch}, to: {line, ch}} object, and
    // forces those lines into the viewport (if possible).
    if (viewport && viewport.ensure) {
      var ensureFrom = viewport.ensure.from.line, ensureTo = viewport.ensure.to.line;
      if (ensureFrom < from) {
        from = ensureFrom;
        to = lineAtHeight(doc, heightAtLine(getLine(doc, ensureFrom)) + display.wrapper.clientHeight);
      } else if (Math.min(ensureTo, doc.lastLine()) >= to) {
        from = lineAtHeight(doc, heightAtLine(getLine(doc, ensureTo)) - display.wrapper.clientHeight);
        to = ensureTo;
      }
    }
    return {from: from, to: Math.max(to, from + 1)}
  }

  // SCROLLING THINGS INTO VIEW

  // If an editor sits on the top or bottom of the window, partially
  // scrolled out of view, this ensures that the cursor is visible.
  function maybeScrollWindow(cm, rect) {
    if (signalDOMEvent(cm, "scrollCursorIntoView")) { return }

    var display = cm.display, box = display.sizer.getBoundingClientRect(), doScroll = null;
    if (rect.top + box.top < 0) { doScroll = true; }
    else if (rect.bottom + box.top > (window.innerHeight || document.documentElement.clientHeight)) { doScroll = false; }
    if (doScroll != null && !phantom) {
      var scrollNode = elt("div", "\u200b", null, ("position: absolute;\n                         top: " + (rect.top - display.viewOffset - paddingTop(cm.display)) + "px;\n                         height: " + (rect.bottom - rect.top + scrollGap(cm) + display.barHeight) + "px;\n                         left: " + (rect.left) + "px; width: " + (Math.max(2, rect.right - rect.left)) + "px;"));
      cm.display.lineSpace.appendChild(scrollNode);
      scrollNode.scrollIntoView(doScroll);
      cm.display.lineSpace.removeChild(scrollNode);
    }
  }

  // Scroll a given position into view (immediately), verifying that
  // it actually became visible (as line heights are accurately
  // measured, the position of something may 'drift' during drawing).
  function scrollPosIntoView(cm, pos, end, margin) {
    if (margin == null) { margin = 0; }
    var rect;
    if (!cm.options.lineWrapping && pos == end) {
      // Set pos and end to the cursor positions around the character pos sticks to
      // If pos.sticky == "before", that is around pos.ch - 1, otherwise around pos.ch
      // If pos == Pos(_, 0, "before"), pos and end are unchanged
      pos = pos.ch ? Pos(pos.line, pos.sticky == "before" ? pos.ch - 1 : pos.ch, "after") : pos;
      end = pos.sticky == "before" ? Pos(pos.line, pos.ch + 1, "before") : pos;
    }
    for (var limit = 0; limit < 5; limit++) {
      var changed = false;
      var coords = cursorCoords(cm, pos);
      var endCoords = !end || end == pos ? coords : cursorCoords(cm, end);
      rect = {left: Math.min(coords.left, endCoords.left),
              top: Math.min(coords.top, endCoords.top) - margin,
              right: Math.max(coords.left, endCoords.left),
              bottom: Math.max(coords.bottom, endCoords.bottom) + margin};
      var scrollPos = calculateScrollPos(cm, rect);
      var startTop = cm.doc.scrollTop, startLeft = cm.doc.scrollLeft;
      if (scrollPos.scrollTop != null) {
        updateScrollTop(cm, scrollPos.scrollTop);
        if (Math.abs(cm.doc.scrollTop - startTop) > 1) { changed = true; }
      }
      if (scrollPos.scrollLeft != null) {
        setScrollLeft(cm, scrollPos.scrollLeft);
        if (Math.abs(cm.doc.scrollLeft - startLeft) > 1) { changed = true; }
      }
      if (!changed) { break }
    }
    return rect
  }

  // Scroll a given set of coordinates into view (immediately).
  function scrollIntoView(cm, rect) {
    var scrollPos = calculateScrollPos(cm, rect);
    if (scrollPos.scrollTop != null) { updateScrollTop(cm, scrollPos.scrollTop); }
    if (scrollPos.scrollLeft != null) { setScrollLeft(cm, scrollPos.scrollLeft); }
  }

  // Calculate a new scroll position needed to scroll the given
  // rectangle into view. Returns an object with scrollTop and
  // scrollLeft properties. When these are undefined, the
  // vertical/horizontal position does not need to be adjusted.
  function calculateScrollPos(cm, rect) {
    var display = cm.display, snapMargin = textHeight(cm.display);
    if (rect.top < 0) { rect.top = 0; }
    var screentop = cm.curOp && cm.curOp.scrollTop != null ? cm.curOp.scrollTop : display.scroller.scrollTop;
    var screen = displayHeight(cm), result = {};
    if (rect.bottom - rect.top > screen) { rect.bottom = rect.top + screen; }
    var docBottom = cm.doc.height + paddingVert(display);
    var atTop = rect.top < snapMargin, atBottom = rect.bottom > docBottom - snapMargin;
    if (rect.top < screentop) {
      result.scrollTop = atTop ? 0 : rect.top;
    } else if (rect.bottom > screentop + screen) {
      var newTop = Math.min(rect.top, (atBottom ? docBottom : rect.bottom) - screen);
      if (newTop != screentop) { result.scrollTop = newTop; }
    }

    var screenleft = cm.curOp && cm.curOp.scrollLeft != null ? cm.curOp.scrollLeft : display.scroller.scrollLeft;
    var screenw = displayWidth(cm) - (cm.options.fixedGutter ? display.gutters.offsetWidth : 0);
    var tooWide = rect.right - rect.left > screenw;
    if (tooWide) { rect.right = rect.left + screenw; }
    if (rect.left < 10)
      { result.scrollLeft = 0; }
    else if (rect.left < screenleft)
      { result.scrollLeft = Math.max(0, rect.left - (tooWide ? 0 : 10)); }
    else if (rect.right > screenw + screenleft - 3)
      { result.scrollLeft = rect.right + (tooWide ? 0 : 10) - screenw; }
    return result
  }

  // Store a relative adjustment to the scroll position in the current
  // operation (to be applied when the operation finishes).
  function addToScrollTop(cm, top) {
    if (top == null) { return }
    resolveScrollToPos(cm);
    cm.curOp.scrollTop = (cm.curOp.scrollTop == null ? cm.doc.scrollTop : cm.curOp.scrollTop) + top;
  }

  // Make sure that at the end of the operation the current cursor is
  // shown.
  function ensureCursorVisible(cm) {
    resolveScrollToPos(cm);
    var cur = cm.getCursor();
    cm.curOp.scrollToPos = {from: cur, to: cur, margin: cm.options.cursorScrollMargin};
  }

  function scrollToCoords(cm, x, y) {
    if (x != null || y != null) { resolveScrollToPos(cm); }
    if (x != null) { cm.curOp.scrollLeft = x; }
    if (y != null) { cm.curOp.scrollTop = y; }
  }

  function scrollToRange(cm, range) {
    resolveScrollToPos(cm);
    cm.curOp.scrollToPos = range;
  }

  // When an operation has its scrollToPos property set, and another
  // scroll action is applied before the end of the operation, this
  // 'simulates' scrolling that position into view in a cheap way, so
  // that the effect of intermediate scroll commands is not ignored.
  function resolveScrollToPos(cm) {
    var range = cm.curOp.scrollToPos;
    if (range) {
      cm.curOp.scrollToPos = null;
      var from = estimateCoords(cm, range.from), to = estimateCoords(cm, range.to);
      scrollToCoordsRange(cm, from, to, range.margin);
    }
  }

  function scrollToCoordsRange(cm, from, to, margin) {
    var sPos = calculateScrollPos(cm, {
      left: Math.min(from.left, to.left),
      top: Math.min(from.top, to.top) - margin,
      right: Math.max(from.right, to.right),
      bottom: Math.max(from.bottom, to.bottom) + margin
    });
    scrollToCoords(cm, sPos.scrollLeft, sPos.scrollTop);
  }

  // Sync the scrollable area and scrollbars, ensure the viewport
  // covers the visible area.
  function updateScrollTop(cm, val) {
    if (Math.abs(cm.doc.scrollTop - val) < 2) { return }
    if (!gecko) { updateDisplaySimple(cm, {top: val}); }
    setScrollTop(cm, val, true);
    if (gecko) { updateDisplaySimple(cm); }
    startWorker(cm, 100);
  }

  function setScrollTop(cm, val, forceScroll) {
    val = Math.max(0, Math.min(cm.display.scroller.scrollHeight - cm.display.scroller.clientHeight, val));
    if (cm.display.scroller.scrollTop == val && !forceScroll) { return }
    cm.doc.scrollTop = val;
    cm.display.scrollbars.setScrollTop(val);
    if (cm.display.scroller.scrollTop != val) { cm.display.scroller.scrollTop = val; }
  }

  // Sync scroller and scrollbar, ensure the gutter elements are
  // aligned.
  function setScrollLeft(cm, val, isScroller, forceScroll) {
    val = Math.max(0, Math.min(val, cm.display.scroller.scrollWidth - cm.display.scroller.clientWidth));
    if ((isScroller ? val == cm.doc.scrollLeft : Math.abs(cm.doc.scrollLeft - val) < 2) && !forceScroll) { return }
    cm.doc.scrollLeft = val;
    alignHorizontally(cm);
    if (cm.display.scroller.scrollLeft != val) { cm.display.scroller.scrollLeft = val; }
    cm.display.scrollbars.setScrollLeft(val);
  }

  // SCROLLBARS

  // Prepare DOM reads needed to update the scrollbars. Done in one
  // shot to minimize update/measure roundtrips.
  function measureForScrollbars(cm) {
    var d = cm.display, gutterW = d.gutters.offsetWidth;
    var docH = Math.round(cm.doc.height + paddingVert(cm.display));
    return {
      clientHeight: d.scroller.clientHeight,
      viewHeight: d.wrapper.clientHeight,
      scrollWidth: d.scroller.scrollWidth, clientWidth: d.scroller.clientWidth,
      viewWidth: d.wrapper.clientWidth,
      barLeft: cm.options.fixedGutter ? gutterW : 0,
      docHeight: docH,
      scrollHeight: docH + scrollGap(cm) + d.barHeight,
      nativeBarWidth: d.nativeBarWidth,
      gutterWidth: gutterW
    }
  }

  var NativeScrollbars = function(place, scroll, cm) {
    this.cm = cm;
    var vert = this.vert = elt("div", [elt("div", null, null, "min-width: 1px")], "CodeMirror-vscrollbar");
    var horiz = this.horiz = elt("div", [elt("div", null, null, "height: 100%; min-height: 1px")], "CodeMirror-hscrollbar");
    vert.tabIndex = horiz.tabIndex = -1;
    place(vert); place(horiz);

    on(vert, "scroll", function () {
      if (vert.clientHeight) { scroll(vert.scrollTop, "vertical"); }
    });
    on(horiz, "scroll", function () {
      if (horiz.clientWidth) { scroll(horiz.scrollLeft, "horizontal"); }
    });

    this.checkedZeroWidth = false;
    // Need to set a minimum width to see the scrollbar on IE7 (but must not set it on IE8).
    if (ie && ie_version < 8) { this.horiz.style.minHeight = this.vert.style.minWidth = "18px"; }
  };

  NativeScrollbars.prototype.update = function (measure) {
    var needsH = measure.scrollWidth > measure.clientWidth + 1;
    var needsV = measure.scrollHeight > measure.clientHeight + 1;
    var sWidth = measure.nativeBarWidth;

    if (needsV) {
      this.vert.style.display = "block";
      this.vert.style.bottom = needsH ? sWidth + "px" : "0";
      var totalHeight = measure.viewHeight - (needsH ? sWidth : 0);
      // A bug in IE8 can cause this value to be negative, so guard it.
      this.vert.firstChild.style.height =
        Math.max(0, measure.scrollHeight - measure.clientHeight + totalHeight) + "px";
    } else {
      this.vert.style.display = "";
      this.vert.firstChild.style.height = "0";
    }

    if (needsH) {
      this.horiz.style.display = "block";
      this.horiz.style.right = needsV ? sWidth + "px" : "0";
      this.horiz.style.left = measure.barLeft + "px";
      var totalWidth = measure.viewWidth - measure.barLeft - (needsV ? sWidth : 0);
      this.horiz.firstChild.style.width =
        Math.max(0, measure.scrollWidth - measure.clientWidth + totalWidth) + "px";
    } else {
      this.horiz.style.display = "";
      this.horiz.firstChild.style.width = "0";
    }

    if (!this.checkedZeroWidth && measure.clientHeight > 0) {
      if (sWidth == 0) { this.zeroWidthHack(); }
      this.checkedZeroWidth = true;
    }

    return {right: needsV ? sWidth : 0, bottom: needsH ? sWidth : 0}
  };

  NativeScrollbars.prototype.setScrollLeft = function (pos) {
    if (this.horiz.scrollLeft != pos) { this.horiz.scrollLeft = pos; }
    if (this.disableHoriz) { this.enableZeroWidthBar(this.horiz, this.disableHoriz, "horiz"); }
  };

  NativeScrollbars.prototype.setScrollTop = function (pos) {
    if (this.vert.scrollTop != pos) { this.vert.scrollTop = pos; }
    if (this.disableVert) { this.enableZeroWidthBar(this.vert, this.disableVert, "vert"); }
  };

  NativeScrollbars.prototype.zeroWidthHack = function () {
    var w = mac && !mac_geMountainLion ? "12px" : "18px";
    this.horiz.style.height = this.vert.style.width = w;
    this.horiz.style.pointerEvents = this.vert.style.pointerEvents = "none";
    this.disableHoriz = new Delayed;
    this.disableVert = new Delayed;
  };

  NativeScrollbars.prototype.enableZeroWidthBar = function (bar, delay, type) {
    bar.style.pointerEvents = "auto";
    function maybeDisable() {
      // To find out whether the scrollbar is still visible, we
      // check whether the element under the pixel in the bottom
      // right corner of the scrollbar box is the scrollbar box
      // itself (when the bar is still visible) or its filler child
      // (when the bar is hidden). If it is still visible, we keep
      // it enabled, if it's hidden, we disable pointer events.
      var box = bar.getBoundingClientRect();
      var elt = type == "vert" ? document.elementFromPoint(box.right - 1, (box.top + box.bottom) / 2)
          : document.elementFromPoint((box.right + box.left) / 2, box.bottom - 1);
      if (elt != bar) { bar.style.pointerEvents = "none"; }
      else { delay.set(1000, maybeDisable); }
    }
    delay.set(1000, maybeDisable);
  };

  NativeScrollbars.prototype.clear = function () {
    var parent = this.horiz.parentNode;
    parent.removeChild(this.horiz);
    parent.removeChild(this.vert);
  };

  var NullScrollbars = function () {};

  NullScrollbars.prototype.update = function () { return {bottom: 0, right: 0} };
  NullScrollbars.prototype.setScrollLeft = function () {};
  NullScrollbars.prototype.setScrollTop = function () {};
  NullScrollbars.prototype.clear = function () {};

  function updateScrollbars(cm, measure) {
    if (!measure) { measure = measureForScrollbars(cm); }
    var startWidth = cm.display.barWidth, startHeight = cm.display.barHeight;
    updateScrollbarsInner(cm, measure);
    for (var i = 0; i < 4 && startWidth != cm.display.barWidth || startHeight != cm.display.barHeight; i++) {
      if (startWidth != cm.display.barWidth && cm.options.lineWrapping)
        { updateHeightsInViewport(cm); }
      updateScrollbarsInner(cm, measureForScrollbars(cm));
      startWidth = cm.display.barWidth; startHeight = cm.display.barHeight;
    }
  }

  // Re-synchronize the fake scrollbars with the actual size of the
  // content.
  function updateScrollbarsInner(cm, measure) {
    var d = cm.display;
    var sizes = d.scrollbars.update(measure);

    d.sizer.style.paddingRight = (d.barWidth = sizes.right) + "px";
    d.sizer.style.paddingBottom = (d.barHeight = sizes.bottom) + "px";
    d.heightForcer.style.borderBottom = sizes.bottom + "px solid transparent";

    if (sizes.right && sizes.bottom) {
      d.scrollbarFiller.style.display = "block";
      d.scrollbarFiller.style.height = sizes.bottom + "px";
      d.scrollbarFiller.style.width = sizes.right + "px";
    } else { d.scrollbarFiller.style.display = ""; }
    if (sizes.bottom && cm.options.coverGutterNextToScrollbar && cm.options.fixedGutter) {
      d.gutterFiller.style.display = "block";
      d.gutterFiller.style.height = sizes.bottom + "px";
      d.gutterFiller.style.width = measure.gutterWidth + "px";
    } else { d.gutterFiller.style.display = ""; }
  }

  var scrollbarModel = {"native": NativeScrollbars, "null": NullScrollbars};

  function initScrollbars(cm) {
    if (cm.display.scrollbars) {
      cm.display.scrollbars.clear();
      if (cm.display.scrollbars.addClass)
        { rmClass(cm.display.wrapper, cm.display.scrollbars.addClass); }
    }

    cm.display.scrollbars = new scrollbarModel[cm.options.scrollbarStyle](function (node) {
      cm.display.wrapper.insertBefore(node, cm.display.scrollbarFiller);
      // Prevent clicks in the scrollbars from killing focus
      on(node, "mousedown", function () {
        if (cm.state.focused) { setTimeout(function () { return cm.display.input.focus(); }, 0); }
      });
      node.setAttribute("cm-not-content", "true");
    }, function (pos, axis) {
      if (axis == "horizontal") { setScrollLeft(cm, pos); }
      else { updateScrollTop(cm, pos); }
    }, cm);
    if (cm.display.scrollbars.addClass)
      { addClass(cm.display.wrapper, cm.display.scrollbars.addClass); }
  }

  // Operations are used to wrap a series of changes to the editor
  // state in such a way that each change won't have to update the
  // cursor and display (which would be awkward, slow, and
  // error-prone). Instead, display updates are batched and then all
  // combined and executed at once.

  var nextOpId = 0;
  // Start a new operation.
  function startOperation(cm) {
    cm.curOp = {
      cm: cm,
      viewChanged: false,      // Flag that indicates that lines might need to be redrawn
      startHeight: cm.doc.height, // Used to detect need to update scrollbar
      forceUpdate: false,      // Used to force a redraw
      updateInput: 0,       // Whether to reset the input textarea
      typing: false,           // Whether this reset should be careful to leave existing text (for compositing)
      changeObjs: null,        // Accumulated changes, for firing change events
      cursorActivityHandlers: null, // Set of handlers to fire cursorActivity on
      cursorActivityCalled: 0, // Tracks which cursorActivity handlers have been called already
      selectionChanged: false, // Whether the selection needs to be redrawn
      updateMaxLine: false,    // Set when the widest line needs to be determined anew
      scrollLeft: null, scrollTop: null, // Intermediate scroll position, not pushed to DOM yet
      scrollToPos: null,       // Used to scroll to a specific position
      focus: false,
      id: ++nextOpId           // Unique ID
    };
    pushOperation(cm.curOp);
  }

  // Finish an operation, updating the display and signalling delayed events
  function endOperation(cm) {
    var op = cm.curOp;
    if (op) { finishOperation(op, function (group) {
      for (var i = 0; i < group.ops.length; i++)
        { group.ops[i].cm.curOp = null; }
      endOperations(group);
    }); }
  }

  // The DOM updates done when an operation finishes are batched so
  // that the minimum number of relayouts are required.
  function endOperations(group) {
    var ops = group.ops;
    for (var i = 0; i < ops.length; i++) // Read DOM
      { endOperation_R1(ops[i]); }
    for (var i$1 = 0; i$1 < ops.length; i$1++) // Write DOM (maybe)
      { endOperation_W1(ops[i$1]); }
    for (var i$2 = 0; i$2 < ops.length; i$2++) // Read DOM
      { endOperation_R2(ops[i$2]); }
    for (var i$3 = 0; i$3 < ops.length; i$3++) // Write DOM (maybe)
      { endOperation_W2(ops[i$3]); }
    for (var i$4 = 0; i$4 < ops.length; i$4++) // Read DOM
      { endOperation_finish(ops[i$4]); }
  }

  function endOperation_R1(op) {
    var cm = op.cm, display = cm.display;
    maybeClipScrollbars(cm);
    if (op.updateMaxLine) { findMaxLine(cm); }

    op.mustUpdate = op.viewChanged || op.forceUpdate || op.scrollTop != null ||
      op.scrollToPos && (op.scrollToPos.from.line < display.viewFrom ||
                         op.scrollToPos.to.line >= display.viewTo) ||
      display.maxLineChanged && cm.options.lineWrapping;
    op.update = op.mustUpdate &&
      new DisplayUpdate(cm, op.mustUpdate && {top: op.scrollTop, ensure: op.scrollToPos}, op.forceUpdate);
  }

  function endOperation_W1(op) {
    op.updatedDisplay = op.mustUpdate && updateDisplayIfNeeded(op.cm, op.update);
  }

  function endOperation_R2(op) {
    var cm = op.cm, display = cm.display;
    if (op.updatedDisplay) { updateHeightsInViewport(cm); }

    op.barMeasure = measureForScrollbars(cm);

    // If the max line changed since it was last measured, measure it,
    // and ensure the document's width matches it.
    // updateDisplay_W2 will use these properties to do the actual resizing
    if (display.maxLineChanged && !cm.options.lineWrapping) {
      op.adjustWidthTo = measureChar(cm, display.maxLine, display.maxLine.text.length).left + 3;
      cm.display.sizerWidth = op.adjustWidthTo;
      op.barMeasure.scrollWidth =
        Math.max(display.scroller.clientWidth, display.sizer.offsetLeft + op.adjustWidthTo + scrollGap(cm) + cm.display.barWidth);
      op.maxScrollLeft = Math.max(0, display.sizer.offsetLeft + op.adjustWidthTo - displayWidth(cm));
    }

    if (op.updatedDisplay || op.selectionChanged)
      { op.preparedSelection = display.input.prepareSelection(); }
  }

  function endOperation_W2(op) {
    var cm = op.cm;

    if (op.adjustWidthTo != null) {
      cm.display.sizer.style.minWidth = op.adjustWidthTo + "px";
      if (op.maxScrollLeft < cm.doc.scrollLeft)
        { setScrollLeft(cm, Math.min(cm.display.scroller.scrollLeft, op.maxScrollLeft), true); }
      cm.display.maxLineChanged = false;
    }

    var takeFocus = op.focus && op.focus == activeElt();
    if (op.preparedSelection)
      { cm.display.input.showSelection(op.preparedSelection, takeFocus); }
    if (op.updatedDisplay || op.startHeight != cm.doc.height)
      { updateScrollbars(cm, op.barMeasure); }
    if (op.updatedDisplay)
      { setDocumentHeight(cm, op.barMeasure); }

    if (op.selectionChanged) { restartBlink(cm); }

    if (cm.state.focused && op.updateInput)
      { cm.display.input.reset(op.typing); }
    if (takeFocus) { ensureFocus(op.cm); }
  }

  function endOperation_finish(op) {
    var cm = op.cm, display = cm.display, doc = cm.doc;

    if (op.updatedDisplay) { postUpdateDisplay(cm, op.update); }

    // Abort mouse wheel delta measurement, when scrolling explicitly
    if (display.wheelStartX != null && (op.scrollTop != null || op.scrollLeft != null || op.scrollToPos))
      { display.wheelStartX = display.wheelStartY = null; }

    // Propagate the scroll position to the actual DOM scroller
    if (op.scrollTop != null) { setScrollTop(cm, op.scrollTop, op.forceScroll); }

    if (op.scrollLeft != null) { setScrollLeft(cm, op.scrollLeft, true, true); }
    // If we need to scroll a specific position into view, do so.
    if (op.scrollToPos) {
      var rect = scrollPosIntoView(cm, clipPos(doc, op.scrollToPos.from),
                                   clipPos(doc, op.scrollToPos.to), op.scrollToPos.margin);
      maybeScrollWindow(cm, rect);
    }

    // Fire events for markers that are hidden/unidden by editing or
    // undoing
    var hidden = op.maybeHiddenMarkers, unhidden = op.maybeUnhiddenMarkers;
    if (hidden) { for (var i = 0; i < hidden.length; ++i)
      { if (!hidden[i].lines.length) { signal(hidden[i], "hide"); } } }
    if (unhidden) { for (var i$1 = 0; i$1 < unhidden.length; ++i$1)
      { if (unhidden[i$1].lines.length) { signal(unhidden[i$1], "unhide"); } } }

    if (display.wrapper.offsetHeight)
      { doc.scrollTop = cm.display.scroller.scrollTop; }

    // Fire change events, and delayed event handlers
    if (op.changeObjs)
      { signal(cm, "changes", cm, op.changeObjs); }
    if (op.update)
      { op.update.finish(); }
  }

  // Run the given function in an operation
  function runInOp(cm, f) {
    if (cm.curOp) { return f() }
    startOperation(cm);
    try { return f() }
    finally { endOperation(cm); }
  }
  // Wraps a function in an operation. Returns the wrapped function.
  function operation(cm, f) {
    return function() {
      if (cm.curOp) { return f.apply(cm, arguments) }
      startOperation(cm);
      try { return f.apply(cm, arguments) }
      finally { endOperation(cm); }
    }
  }
  // Used to add methods to editor and doc instances, wrapping them in
  // operations.
  function methodOp(f) {
    return function() {
      if (this.curOp) { return f.apply(this, arguments) }
      startOperation(this);
      try { return f.apply(this, arguments) }
      finally { endOperation(this); }
    }
  }
  function docMethodOp(f) {
    return function() {
      var cm = this.cm;
      if (!cm || cm.curOp) { return f.apply(this, arguments) }
      startOperation(cm);
      try { return f.apply(this, arguments) }
      finally { endOperation(cm); }
    }
  }

  // HIGHLIGHT WORKER

  function startWorker(cm, time) {
    if (cm.doc.highlightFrontier < cm.display.viewTo)
      { cm.state.highlight.set(time, bind(highlightWorker, cm)); }
  }

  function highlightWorker(cm) {
    var doc = cm.doc;
    if (doc.highlightFrontier >= cm.display.viewTo) { return }
    var end = +new Date + cm.options.workTime;
    var context = getContextBefore(cm, doc.highlightFrontier);
    var changedLines = [];

    doc.iter(context.line, Math.min(doc.first + doc.size, cm.display.viewTo + 500), function (line) {
      if (context.line >= cm.display.viewFrom) { // Visible
        var oldStyles = line.styles;
        var resetState = line.text.length > cm.options.maxHighlightLength ? copyState(doc.mode, context.state) : null;
        var highlighted = highlightLine(cm, line, context, true);
        if (resetState) { context.state = resetState; }
        line.styles = highlighted.styles;
        var oldCls = line.styleClasses, newCls = highlighted.classes;
        if (newCls) { line.styleClasses = newCls; }
        else if (oldCls) { line.styleClasses = null; }
        var ischange = !oldStyles || oldStyles.length != line.styles.length ||
          oldCls != newCls && (!oldCls || !newCls || oldCls.bgClass != newCls.bgClass || oldCls.textClass != newCls.textClass);
        for (var i = 0; !ischange && i < oldStyles.length; ++i) { ischange = oldStyles[i] != line.styles[i]; }
        if (ischange) { changedLines.push(context.line); }
        line.stateAfter = context.save();
        context.nextLine();
      } else {
        if (line.text.length <= cm.options.maxHighlightLength)
          { processLine(cm, line.text, context); }
        line.stateAfter = context.line % 5 == 0 ? context.save() : null;
        context.nextLine();
      }
      if (+new Date > end) {
        startWorker(cm, cm.options.workDelay);
        return true
      }
    });
    doc.highlightFrontier = context.line;
    doc.modeFrontier = Math.max(doc.modeFrontier, context.line);
    if (changedLines.length) { runInOp(cm, function () {
      for (var i = 0; i < changedLines.length; i++)
        { regLineChange(cm, changedLines[i], "text"); }
    }); }
  }

  // DISPLAY DRAWING

  var DisplayUpdate = function(cm, viewport, force) {
    var display = cm.display;

    this.viewport = viewport;
    // Store some values that we'll need later (but don't want to force a relayout for)
    this.visible = visibleLines(display, cm.doc, viewport);
    this.editorIsHidden = !display.wrapper.offsetWidth;
    this.wrapperHeight = display.wrapper.clientHeight;
    this.wrapperWidth = display.wrapper.clientWidth;
    this.oldDisplayWidth = displayWidth(cm);
    this.force = force;
    this.dims = getDimensions(cm);
    this.events = [];
  };

  DisplayUpdate.prototype.signal = function (emitter, type) {
    if (hasHandler(emitter, type))
      { this.events.push(arguments); }
  };
  DisplayUpdate.prototype.finish = function () {
    for (var i = 0; i < this.events.length; i++)
      { signal.apply(null, this.events[i]); }
  };

  function maybeClipScrollbars(cm) {
    var display = cm.display;
    if (!display.scrollbarsClipped && display.scroller.offsetWidth) {
      display.nativeBarWidth = display.scroller.offsetWidth - display.scroller.clientWidth;
      display.heightForcer.style.height = scrollGap(cm) + "px";
      display.sizer.style.marginBottom = -display.nativeBarWidth + "px";
      display.sizer.style.borderRightWidth = scrollGap(cm) + "px";
      display.scrollbarsClipped = true;
    }
  }

  function selectionSnapshot(cm) {
    if (cm.hasFocus()) { return null }
    var active = activeElt();
    if (!active || !contains(cm.display.lineDiv, active)) { return null }
    var result = {activeElt: active};
    if (window.getSelection) {
      var sel = window.getSelection();
      if (sel.anchorNode && sel.extend && contains(cm.display.lineDiv, sel.anchorNode)) {
        result.anchorNode = sel.anchorNode;
        result.anchorOffset = sel.anchorOffset;
        result.focusNode = sel.focusNode;
        result.focusOffset = sel.focusOffset;
      }
    }
    return result
  }

  function restoreSelection(snapshot) {
    if (!snapshot || !snapshot.activeElt || snapshot.activeElt == activeElt()) { return }
    snapshot.activeElt.focus();
    if (snapshot.anchorNode && contains(document.body, snapshot.anchorNode) && contains(document.body, snapshot.focusNode)) {
      var sel = window.getSelection(), range = document.createRange();
      range.setEnd(snapshot.anchorNode, snapshot.anchorOffset);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
      sel.extend(snapshot.focusNode, snapshot.focusOffset);
    }
  }

  // Does the actual updating of the line display. Bails out
  // (returning false) when there is nothing to be done and forced is
  // false.
  function updateDisplayIfNeeded(cm, update) {
    var display = cm.display, doc = cm.doc;

    if (update.editorIsHidden) {
      resetView(cm);
      return false
    }

    // Bail out if the visible area is already rendered and nothing changed.
    if (!update.force &&
        update.visible.from >= display.viewFrom && update.visible.to <= display.viewTo &&
        (display.updateLineNumbers == null || display.updateLineNumbers >= display.viewTo) &&
        display.renderedView == display.view && countDirtyView(cm) == 0)
      { return false }

    if (maybeUpdateLineNumberWidth(cm)) {
      resetView(cm);
      update.dims = getDimensions(cm);
    }

    // Compute a suitable new viewport (from & to)
    var end = doc.first + doc.size;
    var from = Math.max(update.visible.from - cm.options.viewportMargin, doc.first);
    var to = Math.min(end, update.visible.to + cm.options.viewportMargin);
    if (display.viewFrom < from && from - display.viewFrom < 20) { from = Math.max(doc.first, display.viewFrom); }
    if (display.viewTo > to && display.viewTo - to < 20) { to = Math.min(end, display.viewTo); }
    if (sawCollapsedSpans) {
      from = visualLineNo(cm.doc, from);
      to = visualLineEndNo(cm.doc, to);
    }

    var different = from != display.viewFrom || to != display.viewTo ||
      display.lastWrapHeight != update.wrapperHeight || display.lastWrapWidth != update.wrapperWidth;
    adjustView(cm, from, to);

    display.viewOffset = heightAtLine(getLine(cm.doc, display.viewFrom));
    // Position the mover div to align with the current scroll position
    cm.display.mover.style.top = display.viewOffset + "px";

    var toUpdate = countDirtyView(cm);
    if (!different && toUpdate == 0 && !update.force && display.renderedView == display.view &&
        (display.updateLineNumbers == null || display.updateLineNumbers >= display.viewTo))
      { return false }

    // For big changes, we hide the enclosing element during the
    // update, since that speeds up the operations on most browsers.
    var selSnapshot = selectionSnapshot(cm);
    if (toUpdate > 4) { display.lineDiv.style.display = "none"; }
    patchDisplay(cm, display.updateLineNumbers, update.dims);
    if (toUpdate > 4) { display.lineDiv.style.display = ""; }
    display.renderedView = display.view;
    // There might have been a widget with a focused element that got
    // hidden or updated, if so re-focus it.
    restoreSelection(selSnapshot);

    // Prevent selection and cursors from interfering with the scroll
    // width and height.
    removeChildren(display.cursorDiv);
    removeChildren(display.selectionDiv);
    display.gutters.style.height = display.sizer.style.minHeight = 0;

    if (different) {
      display.lastWrapHeight = update.wrapperHeight;
      display.lastWrapWidth = update.wrapperWidth;
      startWorker(cm, 400);
    }

    display.updateLineNumbers = null;

    return true
  }

  function postUpdateDisplay(cm, update) {
    var viewport = update.viewport;

    for (var first = true;; first = false) {
      if (!first || !cm.options.lineWrapping || update.oldDisplayWidth == displayWidth(cm)) {
        // Clip forced viewport to actual scrollable area.
        if (viewport && viewport.top != null)
          { viewport = {top: Math.min(cm.doc.height + paddingVert(cm.display) - displayHeight(cm), viewport.top)}; }
        // Updated line heights might result in the drawn area not
        // actually covering the viewport. Keep looping until it does.
        update.visible = visibleLines(cm.display, cm.doc, viewport);
        if (update.visible.from >= cm.display.viewFrom && update.visible.to <= cm.display.viewTo)
          { break }
      } else if (first) {
        update.visible = visibleLines(cm.display, cm.doc, viewport);
      }
      if (!updateDisplayIfNeeded(cm, update)) { break }
      updateHeightsInViewport(cm);
      var barMeasure = measureForScrollbars(cm);
      updateSelection(cm);
      updateScrollbars(cm, barMeasure);
      setDocumentHeight(cm, barMeasure);
      update.force = false;
    }

    update.signal(cm, "update", cm);
    if (cm.display.viewFrom != cm.display.reportedViewFrom || cm.display.viewTo != cm.display.reportedViewTo) {
      update.signal(cm, "viewportChange", cm, cm.display.viewFrom, cm.display.viewTo);
      cm.display.reportedViewFrom = cm.display.viewFrom; cm.display.reportedViewTo = cm.display.viewTo;
    }
  }

  function updateDisplaySimple(cm, viewport) {
    var update = new DisplayUpdate(cm, viewport);
    if (updateDisplayIfNeeded(cm, update)) {
      updateHeightsInViewport(cm);
      postUpdateDisplay(cm, update);
      var barMeasure = measureForScrollbars(cm);
      updateSelection(cm);
      updateScrollbars(cm, barMeasure);
      setDocumentHeight(cm, barMeasure);
      update.finish();
    }
  }

  // Sync the actual display DOM structure with display.view, removing
  // nodes for lines that are no longer in view, and creating the ones
  // that are not there yet, and updating the ones that are out of
  // date.
  function patchDisplay(cm, updateNumbersFrom, dims) {
    var display = cm.display, lineNumbers = cm.options.lineNumbers;
    var container = display.lineDiv, cur = container.firstChild;

    function rm(node) {
      var next = node.nextSibling;
      // Works around a throw-scroll bug in OS X Webkit
      if (webkit && mac && cm.display.currentWheelTarget == node)
        { node.style.display = "none"; }
      else
        { node.parentNode.removeChild(node); }
      return next
    }

    var view = display.view, lineN = display.viewFrom;
    // Loop over the elements in the view, syncing cur (the DOM nodes
    // in display.lineDiv) with the view as we go.
    for (var i = 0; i < view.length; i++) {
      var lineView = view[i];
      if (lineView.hidden) ; else if (!lineView.node || lineView.node.parentNode != container) { // Not drawn yet
        var node = buildLineElement(cm, lineView, lineN, dims);
        container.insertBefore(node, cur);
      } else { // Already drawn
        while (cur != lineView.node) { cur = rm(cur); }
        var updateNumber = lineNumbers && updateNumbersFrom != null &&
          updateNumbersFrom <= lineN && lineView.lineNumber;
        if (lineView.changes) {
          if (indexOf(lineView.changes, "gutter") > -1) { updateNumber = false; }
          updateLineForChanges(cm, lineView, lineN, dims);
        }
        if (updateNumber) {
          removeChildren(lineView.lineNumber);
          lineView.lineNumber.appendChild(document.createTextNode(lineNumberFor(cm.options, lineN)));
        }
        cur = lineView.node.nextSibling;
      }
      lineN += lineView.size;
    }
    while (cur) { cur = rm(cur); }
  }

  function updateGutterSpace(display) {
    var width = display.gutters.offsetWidth;
    display.sizer.style.marginLeft = width + "px";
  }

  function setDocumentHeight(cm, measure) {
    cm.display.sizer.style.minHeight = measure.docHeight + "px";
    cm.display.heightForcer.style.top = measure.docHeight + "px";
    cm.display.gutters.style.height = (measure.docHeight + cm.display.barHeight + scrollGap(cm)) + "px";
  }

  // Re-align line numbers and gutter marks to compensate for
  // horizontal scrolling.
  function alignHorizontally(cm) {
    var display = cm.display, view = display.view;
    if (!display.alignWidgets && (!display.gutters.firstChild || !cm.options.fixedGutter)) { return }
    var comp = compensateForHScroll(display) - display.scroller.scrollLeft + cm.doc.scrollLeft;
    var gutterW = display.gutters.offsetWidth, left = comp + "px";
    for (var i = 0; i < view.length; i++) { if (!view[i].hidden) {
      if (cm.options.fixedGutter) {
        if (view[i].gutter)
          { view[i].gutter.style.left = left; }
        if (view[i].gutterBackground)
          { view[i].gutterBackground.style.left = left; }
      }
      var align = view[i].alignable;
      if (align) { for (var j = 0; j < align.length; j++)
        { align[j].style.left = left; } }
    } }
    if (cm.options.fixedGutter)
      { display.gutters.style.left = (comp + gutterW) + "px"; }
  }

  // Used to ensure that the line number gutter is still the right
  // size for the current document size. Returns true when an update
  // is needed.
  function maybeUpdateLineNumberWidth(cm) {
    if (!cm.options.lineNumbers) { return false }
    var doc = cm.doc, last = lineNumberFor(cm.options, doc.first + doc.size - 1), display = cm.display;
    if (last.length != display.lineNumChars) {
      var test = display.measure.appendChild(elt("div", [elt("div", last)],
                                                 "CodeMirror-linenumber CodeMirror-gutter-elt"));
      var innerW = test.firstChild.offsetWidth, padding = test.offsetWidth - innerW;
      display.lineGutter.style.width = "";
      display.lineNumInnerWidth = Math.max(innerW, display.lineGutter.offsetWidth - padding) + 1;
      display.lineNumWidth = display.lineNumInnerWidth + padding;
      display.lineNumChars = display.lineNumInnerWidth ? last.length : -1;
      display.lineGutter.style.width = display.lineNumWidth + "px";
      updateGutterSpace(cm.display);
      return true
    }
    return false
  }

  function getGutters(gutters, lineNumbers) {
    var result = [], sawLineNumbers = false;
    for (var i = 0; i < gutters.length; i++) {
      var name = gutters[i], style = null;
      if (typeof name != "string") { style = name.style; name = name.className; }
      if (name == "CodeMirror-linenumbers") {
        if (!lineNumbers) { continue }
        else { sawLineNumbers = true; }
      }
      result.push({className: name, style: style});
    }
    if (lineNumbers && !sawLineNumbers) { result.push({className: "CodeMirror-linenumbers", style: null}); }
    return result
  }

  // Rebuild the gutter elements, ensure the margin to the left of the
  // code matches their width.
  function renderGutters(display) {
    var gutters = display.gutters, specs = display.gutterSpecs;
    removeChildren(gutters);
    display.lineGutter = null;
    for (var i = 0; i < specs.length; ++i) {
      var ref = specs[i];
      var className = ref.className;
      var style = ref.style;
      var gElt = gutters.appendChild(elt("div", null, "CodeMirror-gutter " + className));
      if (style) { gElt.style.cssText = style; }
      if (className == "CodeMirror-linenumbers") {
        display.lineGutter = gElt;
        gElt.style.width = (display.lineNumWidth || 1) + "px";
      }
    }
    gutters.style.display = specs.length ? "" : "none";
    updateGutterSpace(display);
  }

  function updateGutters(cm) {
    renderGutters(cm.display);
    regChange(cm);
    alignHorizontally(cm);
  }

  // The display handles the DOM integration, both for input reading
  // and content drawing. It holds references to DOM nodes and
  // display-related state.

  function Display(place, doc, input, options) {
    var d = this;
    this.input = input;

    // Covers bottom-right square when both scrollbars are present.
    d.scrollbarFiller = elt("div", null, "CodeMirror-scrollbar-filler");
    d.scrollbarFiller.setAttribute("cm-not-content", "true");
    // Covers bottom of gutter when coverGutterNextToScrollbar is on
    // and h scrollbar is present.
    d.gutterFiller = elt("div", null, "CodeMirror-gutter-filler");
    d.gutterFiller.setAttribute("cm-not-content", "true");
    // Will contain the actual code, positioned to cover the viewport.
    d.lineDiv = eltP("div", null, "CodeMirror-code");
    // Elements are added to these to represent selection and cursors.
    d.selectionDiv = elt("div", null, null, "position: relative; z-index: 1");
    d.cursorDiv = elt("div", null, "CodeMirror-cursors");
    // A visibility: hidden element used to find the size of things.
    d.measure = elt("div", null, "CodeMirror-measure");
    // When lines outside of the viewport are measured, they are drawn in this.
    d.lineMeasure = elt("div", null, "CodeMirror-measure");
    // Wraps everything that needs to exist inside the vertically-padded coordinate system
    d.lineSpace = eltP("div", [d.measure, d.lineMeasure, d.selectionDiv, d.cursorDiv, d.lineDiv],
                      null, "position: relative; outline: none");
    var lines = eltP("div", [d.lineSpace], "CodeMirror-lines");
    // Moved around its parent to cover visible view.
    d.mover = elt("div", [lines], null, "position: relative");
    // Set to the height of the document, allowing scrolling.
    d.sizer = elt("div", [d.mover], "CodeMirror-sizer");
    d.sizerWidth = null;
    // Behavior of elts with overflow: auto and padding is
    // inconsistent across browsers. This is used to ensure the
    // scrollable area is big enough.
    d.heightForcer = elt("div", null, null, "position: absolute; height: " + scrollerGap + "px; width: 1px;");
    // Will contain the gutters, if any.
    d.gutters = elt("div", null, "CodeMirror-gutters");
    d.lineGutter = null;
    // Actual scrollable element.
    d.scroller = elt("div", [d.sizer, d.heightForcer, d.gutters], "CodeMirror-scroll");
    d.scroller.setAttribute("tabIndex", "-1");
    // The element in which the editor lives.
    d.wrapper = elt("div", [d.scrollbarFiller, d.gutterFiller, d.scroller], "CodeMirror");

    // Work around IE7 z-index bug (not perfect, hence IE7 not really being supported)
    if (ie && ie_version < 8) { d.gutters.style.zIndex = -1; d.scroller.style.paddingRight = 0; }
    if (!webkit && !(gecko && mobile)) { d.scroller.draggable = true; }

    if (place) {
      if (place.appendChild) { place.appendChild(d.wrapper); }
      else { place(d.wrapper); }
    }

    // Current rendered range (may be bigger than the view window).
    d.viewFrom = d.viewTo = doc.first;
    d.reportedViewFrom = d.reportedViewTo = doc.first;
    // Information about the rendered lines.
    d.view = [];
    d.renderedView = null;
    // Holds info about a single rendered line when it was rendered
    // for measurement, while not in view.
    d.externalMeasured = null;
    // Empty space (in pixels) above the view
    d.viewOffset = 0;
    d.lastWrapHeight = d.lastWrapWidth = 0;
    d.updateLineNumbers = null;

    d.nativeBarWidth = d.barHeight = d.barWidth = 0;
    d.scrollbarsClipped = false;

    // Used to only resize the line number gutter when necessary (when
    // the amount of lines crosses a boundary that makes its width change)
    d.lineNumWidth = d.lineNumInnerWidth = d.lineNumChars = null;
    // Set to true when a non-horizontal-scrolling line widget is
    // added. As an optimization, line widget aligning is skipped when
    // this is false.
    d.alignWidgets = false;

    d.cachedCharWidth = d.cachedTextHeight = d.cachedPaddingH = null;

    // Tracks the maximum line length so that the horizontal scrollbar
    // can be kept static when scrolling.
    d.maxLine = null;
    d.maxLineLength = 0;
    d.maxLineChanged = false;

    // Used for measuring wheel scrolling granularity
    d.wheelDX = d.wheelDY = d.wheelStartX = d.wheelStartY = null;

    // True when shift is held down.
    d.shift = false;

    // Used to track whether anything happened since the context menu
    // was opened.
    d.selForContextMenu = null;

    d.activeTouch = null;

    d.gutterSpecs = getGutters(options.gutters, options.lineNumbers);
    renderGutters(d);

    input.init(d);
  }

  // Since the delta values reported on mouse wheel events are
  // unstandardized between browsers and even browser versions, and
  // generally horribly unpredictable, this code starts by measuring
  // the scroll effect that the first few mouse wheel events have,
  // and, from that, detects the way it can convert deltas to pixel
  // offsets afterwards.
  //
  // The reason we want to know the amount a wheel event will scroll
  // is that it gives us a chance to update the display before the
  // actual scrolling happens, reducing flickering.

  var wheelSamples = 0, wheelPixelsPerUnit = null;
  // Fill in a browser-detected starting value on browsers where we
  // know one. These don't have to be accurate -- the result of them
  // being wrong would just be a slight flicker on the first wheel
  // scroll (if it is large enough).
  if (ie) { wheelPixelsPerUnit = -.53; }
  else if (gecko) { wheelPixelsPerUnit = 15; }
  else if (chrome) { wheelPixelsPerUnit = -.7; }
  else if (safari) { wheelPixelsPerUnit = -1/3; }

  function wheelEventDelta(e) {
    var dx = e.wheelDeltaX, dy = e.wheelDeltaY;
    if (dx == null && e.detail && e.axis == e.HORIZONTAL_AXIS) { dx = e.detail; }
    if (dy == null && e.detail && e.axis == e.VERTICAL_AXIS) { dy = e.detail; }
    else if (dy == null) { dy = e.wheelDelta; }
    return {x: dx, y: dy}
  }
  function wheelEventPixels(e) {
    var delta = wheelEventDelta(e);
    delta.x *= wheelPixelsPerUnit;
    delta.y *= wheelPixelsPerUnit;
    return delta
  }

  function onScrollWheel(cm, e) {
    var delta = wheelEventDelta(e), dx = delta.x, dy = delta.y;

    var display = cm.display, scroll = display.scroller;
    // Quit if there's nothing to scroll here
    var canScrollX = scroll.scrollWidth > scroll.clientWidth;
    var canScrollY = scroll.scrollHeight > scroll.clientHeight;
    if (!(dx && canScrollX || dy && canScrollY)) { return }

    // Webkit browsers on OS X abort momentum scrolls when the target
    // of the scroll event is removed from the scrollable element.
    // This hack (see related code in patchDisplay) makes sure the
    // element is kept around.
    if (dy && mac && webkit) {
      outer: for (var cur = e.target, view = display.view; cur != scroll; cur = cur.parentNode) {
        for (var i = 0; i < view.length; i++) {
          if (view[i].node == cur) {
            cm.display.currentWheelTarget = cur;
            break outer
          }
        }
      }
    }

    // On some browsers, horizontal scrolling will cause redraws to
    // happen before the gutter has been realigned, causing it to
    // wriggle around in a most unseemly way. When we have an
    // estimated pixels/delta value, we just handle horizontal
    // scrolling entirely here. It'll be slightly off from native, but
    // better than glitching out.
    if (dx && !gecko && !presto && wheelPixelsPerUnit != null) {
      if (dy && canScrollY)
        { updateScrollTop(cm, Math.max(0, scroll.scrollTop + dy * wheelPixelsPerUnit)); }
      setScrollLeft(cm, Math.max(0, scroll.scrollLeft + dx * wheelPixelsPerUnit));
      // Only prevent default scrolling if vertical scrolling is
      // actually possible. Otherwise, it causes vertical scroll
      // jitter on OSX trackpads when deltaX is small and deltaY
      // is large (issue #3579)
      if (!dy || (dy && canScrollY))
        { e_preventDefault(e); }
      display.wheelStartX = null; // Abort measurement, if in progress
      return
    }

    // 'Project' the visible viewport to cover the area that is being
    // scrolled into view (if we know enough to estimate it).
    if (dy && wheelPixelsPerUnit != null) {
      var pixels = dy * wheelPixelsPerUnit;
      var top = cm.doc.scrollTop, bot = top + display.wrapper.clientHeight;
      if (pixels < 0) { top = Math.max(0, top + pixels - 50); }
      else { bot = Math.min(cm.doc.height, bot + pixels + 50); }
      updateDisplaySimple(cm, {top: top, bottom: bot});
    }

    if (wheelSamples < 20) {
      if (display.wheelStartX == null) {
        display.wheelStartX = scroll.scrollLeft; display.wheelStartY = scroll.scrollTop;
        display.wheelDX = dx; display.wheelDY = dy;
        setTimeout(function () {
          if (display.wheelStartX == null) { return }
          var movedX = scroll.scrollLeft - display.wheelStartX;
          var movedY = scroll.scrollTop - display.wheelStartY;
          var sample = (movedY && display.wheelDY && movedY / display.wheelDY) ||
            (movedX && display.wheelDX && movedX / display.wheelDX);
          display.wheelStartX = display.wheelStartY = null;
          if (!sample) { return }
          wheelPixelsPerUnit = (wheelPixelsPerUnit * wheelSamples + sample) / (wheelSamples + 1);
          ++wheelSamples;
        }, 200);
      } else {
        display.wheelDX += dx; display.wheelDY += dy;
      }
    }
  }

  // Selection objects are immutable. A new one is created every time
  // the selection changes. A selection is one or more non-overlapping
  // (and non-touching) ranges, sorted, and an integer that indicates
  // which one is the primary selection (the one that's scrolled into
  // view, that getCursor returns, etc).
  var Selection = function(ranges, primIndex) {
    this.ranges = ranges;
    this.primIndex = primIndex;
  };

  Selection.prototype.primary = function () { return this.ranges[this.primIndex] };

  Selection.prototype.equals = function (other) {
    if (other == this) { return true }
    if (other.primIndex != this.primIndex || other.ranges.length != this.ranges.length) { return false }
    for (var i = 0; i < this.ranges.length; i++) {
      var here = this.ranges[i], there = other.ranges[i];
      if (!equalCursorPos(here.anchor, there.anchor) || !equalCursorPos(here.head, there.head)) { return false }
    }
    return true
  };

  Selection.prototype.deepCopy = function () {
    var out = [];
    for (var i = 0; i < this.ranges.length; i++)
      { out[i] = new Range(copyPos(this.ranges[i].anchor), copyPos(this.ranges[i].head)); }
    return new Selection(out, this.primIndex)
  };

  Selection.prototype.somethingSelected = function () {
    for (var i = 0; i < this.ranges.length; i++)
      { if (!this.ranges[i].empty()) { return true } }
    return false
  };

  Selection.prototype.contains = function (pos, end) {
    if (!end) { end = pos; }
    for (var i = 0; i < this.ranges.length; i++) {
      var range = this.ranges[i];
      if (cmp(end, range.from()) >= 0 && cmp(pos, range.to()) <= 0)
        { return i }
    }
    return -1
  };

  var Range = function(anchor, head) {
    this.anchor = anchor; this.head = head;
  };

  Range.prototype.from = function () { return minPos(this.anchor, this.head) };
  Range.prototype.to = function () { return maxPos(this.anchor, this.head) };
  Range.prototype.empty = function () { return this.head.line == this.anchor.line && this.head.ch == this.anchor.ch };

  // Take an unsorted, potentially overlapping set of ranges, and
  // build a selection out of it. 'Consumes' ranges array (modifying
  // it).
  function normalizeSelection(cm, ranges, primIndex) {
    var mayTouch = cm && cm.options.selectionsMayTouch;
    var prim = ranges[primIndex];
    ranges.sort(function (a, b) { return cmp(a.from(), b.from()); });
    primIndex = indexOf(ranges, prim);
    for (var i = 1; i < ranges.length; i++) {
      var cur = ranges[i], prev = ranges[i - 1];
      var diff = cmp(prev.to(), cur.from());
      if (mayTouch && !cur.empty() ? diff > 0 : diff >= 0) {
        var from = minPos(prev.from(), cur.from()), to = maxPos(prev.to(), cur.to());
        var inv = prev.empty() ? cur.from() == cur.head : prev.from() == prev.head;
        if (i <= primIndex) { --primIndex; }
        ranges.splice(--i, 2, new Range(inv ? to : from, inv ? from : to));
      }
    }
    return new Selection(ranges, primIndex)
  }

  function simpleSelection(anchor, head) {
    return new Selection([new Range(anchor, head || anchor)], 0)
  }

  // Compute the position of the end of a change (its 'to' property
  // refers to the pre-change end).
  function changeEnd(change) {
    if (!change.text) { return change.to }
    return Pos(change.from.line + change.text.length - 1,
               lst(change.text).length + (change.text.length == 1 ? change.from.ch : 0))
  }

  // Adjust a position to refer to the post-change position of the
  // same text, or the end of the change if the change covers it.
  function adjustForChange(pos, change) {
    if (cmp(pos, change.from) < 0) { return pos }
    if (cmp(pos, change.to) <= 0) { return changeEnd(change) }

    var line = pos.line + change.text.length - (change.to.line - change.from.line) - 1, ch = pos.ch;
    if (pos.line == change.to.line) { ch += changeEnd(change).ch - change.to.ch; }
    return Pos(line, ch)
  }

  function computeSelAfterChange(doc, change) {
    var out = [];
    for (var i = 0; i < doc.sel.ranges.length; i++) {
      var range = doc.sel.ranges[i];
      out.push(new Range(adjustForChange(range.anchor, change),
                         adjustForChange(range.head, change)));
    }
    return normalizeSelection(doc.cm, out, doc.sel.primIndex)
  }

  function offsetPos(pos, old, nw) {
    if (pos.line == old.line)
      { return Pos(nw.line, pos.ch - old.ch + nw.ch) }
    else
      { return Pos(nw.line + (pos.line - old.line), pos.ch) }
  }

  // Used by replaceSelections to allow moving the selection to the
  // start or around the replaced test. Hint may be "start" or "around".
  function computeReplacedSel(doc, changes, hint) {
    var out = [];
    var oldPrev = Pos(doc.first, 0), newPrev = oldPrev;
    for (var i = 0; i < changes.length; i++) {
      var change = changes[i];
      var from = offsetPos(change.from, oldPrev, newPrev);
      var to = offsetPos(changeEnd(change), oldPrev, newPrev);
      oldPrev = change.to;
      newPrev = to;
      if (hint == "around") {
        var range = doc.sel.ranges[i], inv = cmp(range.head, range.anchor) < 0;
        out[i] = new Range(inv ? to : from, inv ? from : to);
      } else {
        out[i] = new Range(from, from);
      }
    }
    return new Selection(out, doc.sel.primIndex)
  }

  // Used to get the editor into a consistent state again when options change.

  function loadMode(cm) {
    cm.doc.mode = getMode(cm.options, cm.doc.modeOption);
    resetModeState(cm);
  }

  function resetModeState(cm) {
    cm.doc.iter(function (line) {
      if (line.stateAfter) { line.stateAfter = null; }
      if (line.styles) { line.styles = null; }
    });
    cm.doc.modeFrontier = cm.doc.highlightFrontier = cm.doc.first;
    startWorker(cm, 100);
    cm.state.modeGen++;
    if (cm.curOp) { regChange(cm); }
  }

  // DOCUMENT DATA STRUCTURE

  // By default, updates that start and end at the beginning of a line
  // are treated specially, in order to make the association of line
  // widgets and marker elements with the text behave more intuitive.
  function isWholeLineUpdate(doc, change) {
    return change.from.ch == 0 && change.to.ch == 0 && lst(change.text) == "" &&
      (!doc.cm || doc.cm.options.wholeLineUpdateBefore)
  }

  // Perform a change on the document data structure.
  function updateDoc(doc, change, markedSpans, estimateHeight) {
    function spansFor(n) {return markedSpans ? markedSpans[n] : null}
    function update(line, text, spans) {
      updateLine(line, text, spans, estimateHeight);
      signalLater(line, "change", line, change);
    }
    function linesFor(start, end) {
      var result = [];
      for (var i = start; i < end; ++i)
        { result.push(new Line(text[i], spansFor(i), estimateHeight)); }
      return result
    }

    var from = change.from, to = change.to, text = change.text;
    var firstLine = getLine(doc, from.line), lastLine = getLine(doc, to.line);
    var lastText = lst(text), lastSpans = spansFor(text.length - 1), nlines = to.line - from.line;

    // Adjust the line structure
    if (change.full) {
      doc.insert(0, linesFor(0, text.length));
      doc.remove(text.length, doc.size - text.length);
    } else if (isWholeLineUpdate(doc, change)) {
      // This is a whole-line replace. Treated specially to make
      // sure line objects move the way they are supposed to.
      var added = linesFor(0, text.length - 1);
      update(lastLine, lastLine.text, lastSpans);
      if (nlines) { doc.remove(from.line, nlines); }
      if (added.length) { doc.insert(from.line, added); }
    } else if (firstLine == lastLine) {
      if (text.length == 1) {
        update(firstLine, firstLine.text.slice(0, from.ch) + lastText + firstLine.text.slice(to.ch), lastSpans);
      } else {
        var added$1 = linesFor(1, text.length - 1);
        added$1.push(new Line(lastText + firstLine.text.slice(to.ch), lastSpans, estimateHeight));
        update(firstLine, firstLine.text.slice(0, from.ch) + text[0], spansFor(0));
        doc.insert(from.line + 1, added$1);
      }
    } else if (text.length == 1) {
      update(firstLine, firstLine.text.slice(0, from.ch) + text[0] + lastLine.text.slice(to.ch), spansFor(0));
      doc.remove(from.line + 1, nlines);
    } else {
      update(firstLine, firstLine.text.slice(0, from.ch) + text[0], spansFor(0));
      update(lastLine, lastText + lastLine.text.slice(to.ch), lastSpans);
      var added$2 = linesFor(1, text.length - 1);
      if (nlines > 1) { doc.remove(from.line + 1, nlines - 1); }
      doc.insert(from.line + 1, added$2);
    }

    signalLater(doc, "change", doc, change);
  }

  // Call f for all linked documents.
  function linkedDocs(doc, f, sharedHistOnly) {
    function propagate(doc, skip, sharedHist) {
      if (doc.linked) { for (var i = 0; i < doc.linked.length; ++i) {
        var rel = doc.linked[i];
        if (rel.doc == skip) { continue }
        var shared = sharedHist && rel.sharedHist;
        if (sharedHistOnly && !shared) { continue }
        f(rel.doc, shared);
        propagate(rel.doc, doc, shared);
      } }
    }
    propagate(doc, null, true);
  }

  // Attach a document to an editor.
  function attachDoc(cm, doc) {
    if (doc.cm) { throw new Error("This document is already in use.") }
    cm.doc = doc;
    doc.cm = cm;
    estimateLineHeights(cm);
    loadMode(cm);
    setDirectionClass(cm);
    if (!cm.options.lineWrapping) { findMaxLine(cm); }
    cm.options.mode = doc.modeOption;
    regChange(cm);
  }

  function setDirectionClass(cm) {
  (cm.doc.direction == "rtl" ? addClass : rmClass)(cm.display.lineDiv, "CodeMirror-rtl");
  }

  function directionChanged(cm) {
    runInOp(cm, function () {
      setDirectionClass(cm);
      regChange(cm);
    });
  }

  function History(startGen) {
    // Arrays of change events and selections. Doing something adds an
    // event to done and clears undo. Undoing moves events from done
    // to undone, redoing moves them in the other direction.
    this.done = []; this.undone = [];
    this.undoDepth = Infinity;
    // Used to track when changes can be merged into a single undo
    // event
    this.lastModTime = this.lastSelTime = 0;
    this.lastOp = this.lastSelOp = null;
    this.lastOrigin = this.lastSelOrigin = null;
    // Used by the isClean() method
    this.generation = this.maxGeneration = startGen || 1;
  }

  // Create a history change event from an updateDoc-style change
  // object.
  function historyChangeFromChange(doc, change) {
    var histChange = {from: copyPos(change.from), to: changeEnd(change), text: getBetween(doc, change.from, change.to)};
    attachLocalSpans(doc, histChange, change.from.line, change.to.line + 1);
    linkedDocs(doc, function (doc) { return attachLocalSpans(doc, histChange, change.from.line, change.to.line + 1); }, true);
    return histChange
  }

  // Pop all selection events off the end of a history array. Stop at
  // a change event.
  function clearSelectionEvents(array) {
    while (array.length) {
      var last = lst(array);
      if (last.ranges) { array.pop(); }
      else { break }
    }
  }

  // Find the top change event in the history. Pop off selection
  // events that are in the way.
  function lastChangeEvent(hist, force) {
    if (force) {
      clearSelectionEvents(hist.done);
      return lst(hist.done)
    } else if (hist.done.length && !lst(hist.done).ranges) {
      return lst(hist.done)
    } else if (hist.done.length > 1 && !hist.done[hist.done.length - 2].ranges) {
      hist.done.pop();
      return lst(hist.done)
    }
  }

  // Register a change in the history. Merges changes that are within
  // a single operation, or are close together with an origin that
  // allows merging (starting with "+") into a single event.
  function addChangeToHistory(doc, change, selAfter, opId) {
    var hist = doc.history;
    hist.undone.length = 0;
    var time = +new Date, cur;
    var last;

    if ((hist.lastOp == opId ||
         hist.lastOrigin == change.origin && change.origin &&
         ((change.origin.charAt(0) == "+" && hist.lastModTime > time - (doc.cm ? doc.cm.options.historyEventDelay : 500)) ||
          change.origin.charAt(0) == "*")) &&
        (cur = lastChangeEvent(hist, hist.lastOp == opId))) {
      // Merge this change into the last event
      last = lst(cur.changes);
      if (cmp(change.from, change.to) == 0 && cmp(change.from, last.to) == 0) {
        // Optimized case for simple insertion -- don't want to add
        // new changesets for every character typed
        last.to = changeEnd(change);
      } else {
        // Add new sub-event
        cur.changes.push(historyChangeFromChange(doc, change));
      }
    } else {
      // Can not be merged, start a new event.
      var before = lst(hist.done);
      if (!before || !before.ranges)
        { pushSelectionToHistory(doc.sel, hist.done); }
      cur = {changes: [historyChangeFromChange(doc, change)],
             generation: hist.generation};
      hist.done.push(cur);
      while (hist.done.length > hist.undoDepth) {
        hist.done.shift();
        if (!hist.done[0].ranges) { hist.done.shift(); }
      }
    }
    hist.done.push(selAfter);
    hist.generation = ++hist.maxGeneration;
    hist.lastModTime = hist.lastSelTime = time;
    hist.lastOp = hist.lastSelOp = opId;
    hist.lastOrigin = hist.lastSelOrigin = change.origin;

    if (!last) { signal(doc, "historyAdded"); }
  }

  function selectionEventCanBeMerged(doc, origin, prev, sel) {
    var ch = origin.charAt(0);
    return ch == "*" ||
      ch == "+" &&
      prev.ranges.length == sel.ranges.length &&
      prev.somethingSelected() == sel.somethingSelected() &&
      new Date - doc.history.lastSelTime <= (doc.cm ? doc.cm.options.historyEventDelay : 500)
  }

  // Called whenever the selection changes, sets the new selection as
  // the pending selection in the history, and pushes the old pending
  // selection into the 'done' array when it was significantly
  // different (in number of selected ranges, emptiness, or time).
  function addSelectionToHistory(doc, sel, opId, options) {
    var hist = doc.history, origin = options && options.origin;

    // A new event is started when the previous origin does not match
    // the current, or the origins don't allow matching. Origins
    // starting with * are always merged, those starting with + are
    // merged when similar and close together in time.
    if (opId == hist.lastSelOp ||
        (origin && hist.lastSelOrigin == origin &&
         (hist.lastModTime == hist.lastSelTime && hist.lastOrigin == origin ||
          selectionEventCanBeMerged(doc, origin, lst(hist.done), sel))))
      { hist.done[hist.done.length - 1] = sel; }
    else
      { pushSelectionToHistory(sel, hist.done); }

    hist.lastSelTime = +new Date;
    hist.lastSelOrigin = origin;
    hist.lastSelOp = opId;
    if (options && options.clearRedo !== false)
      { clearSelectionEvents(hist.undone); }
  }

  function pushSelectionToHistory(sel, dest) {
    var top = lst(dest);
    if (!(top && top.ranges && top.equals(sel)))
      { dest.push(sel); }
  }

  // Used to store marked span information in the history.
  function attachLocalSpans(doc, change, from, to) {
    var existing = change["spans_" + doc.id], n = 0;
    doc.iter(Math.max(doc.first, from), Math.min(doc.first + doc.size, to), function (line) {
      if (line.markedSpans)
        { (existing || (existing = change["spans_" + doc.id] = {}))[n] = line.markedSpans; }
      ++n;
    });
  }

  // When un/re-doing restores text containing marked spans, those
  // that have been explicitly cleared should not be restored.
  function removeClearedSpans(spans) {
    if (!spans) { return null }
    var out;
    for (var i = 0; i < spans.length; ++i) {
      if (spans[i].marker.explicitlyCleared) { if (!out) { out = spans.slice(0, i); } }
      else if (out) { out.push(spans[i]); }
    }
    return !out ? spans : out.length ? out : null
  }

  // Retrieve and filter the old marked spans stored in a change event.
  function getOldSpans(doc, change) {
    var found = change["spans_" + doc.id];
    if (!found) { return null }
    var nw = [];
    for (var i = 0; i < change.text.length; ++i)
      { nw.push(removeClearedSpans(found[i])); }
    return nw
  }

  // Used for un/re-doing changes from the history. Combines the
  // result of computing the existing spans with the set of spans that
  // existed in the history (so that deleting around a span and then
  // undoing brings back the span).
  function mergeOldSpans(doc, change) {
    var old = getOldSpans(doc, change);
    var stretched = stretchSpansOverChange(doc, change);
    if (!old) { return stretched }
    if (!stretched) { return old }

    for (var i = 0; i < old.length; ++i) {
      var oldCur = old[i], stretchCur = stretched[i];
      if (oldCur && stretchCur) {
        spans: for (var j = 0; j < stretchCur.length; ++j) {
          var span = stretchCur[j];
          for (var k = 0; k < oldCur.length; ++k)
            { if (oldCur[k].marker == span.marker) { continue spans } }
          oldCur.push(span);
        }
      } else if (stretchCur) {
        old[i] = stretchCur;
      }
    }
    return old
  }

  // Used both to provide a JSON-safe object in .getHistory, and, when
  // detaching a document, to split the history in two
  function copyHistoryArray(events, newGroup, instantiateSel) {
    var copy = [];
    for (var i = 0; i < events.length; ++i) {
      var event = events[i];
      if (event.ranges) {
        copy.push(instantiateSel ? Selection.prototype.deepCopy.call(event) : event);
        continue
      }
      var changes = event.changes, newChanges = [];
      copy.push({changes: newChanges});
      for (var j = 0; j < changes.length; ++j) {
        var change = changes[j], m = (void 0);
        newChanges.push({from: change.from, to: change.to, text: change.text});
        if (newGroup) { for (var prop in change) { if (m = prop.match(/^spans_(\d+)$/)) {
          if (indexOf(newGroup, Number(m[1])) > -1) {
            lst(newChanges)[prop] = change[prop];
            delete change[prop];
          }
        } } }
      }
    }
    return copy
  }

  // The 'scroll' parameter given to many of these indicated whether
  // the new cursor position should be scrolled into view after
  // modifying the selection.

  // If shift is held or the extend flag is set, extends a range to
  // include a given position (and optionally a second position).
  // Otherwise, simply returns the range between the given positions.
  // Used for cursor motion and such.
  function extendRange(range, head, other, extend) {
    if (extend) {
      var anchor = range.anchor;
      if (other) {
        var posBefore = cmp(head, anchor) < 0;
        if (posBefore != (cmp(other, anchor) < 0)) {
          anchor = head;
          head = other;
        } else if (posBefore != (cmp(head, other) < 0)) {
          head = other;
        }
      }
      return new Range(anchor, head)
    } else {
      return new Range(other || head, head)
    }
  }

  // Extend the primary selection range, discard the rest.
  function extendSelection(doc, head, other, options, extend) {
    if (extend == null) { extend = doc.cm && (doc.cm.display.shift || doc.extend); }
    setSelection(doc, new Selection([extendRange(doc.sel.primary(), head, other, extend)], 0), options);
  }

  // Extend all selections (pos is an array of selections with length
  // equal the number of selections)
  function extendSelections(doc, heads, options) {
    var out = [];
    var extend = doc.cm && (doc.cm.display.shift || doc.extend);
    for (var i = 0; i < doc.sel.ranges.length; i++)
      { out[i] = extendRange(doc.sel.ranges[i], heads[i], null, extend); }
    var newSel = normalizeSelection(doc.cm, out, doc.sel.primIndex);
    setSelection(doc, newSel, options);
  }

  // Updates a single range in the selection.
  function replaceOneSelection(doc, i, range, options) {
    var ranges = doc.sel.ranges.slice(0);
    ranges[i] = range;
    setSelection(doc, normalizeSelection(doc.cm, ranges, doc.sel.primIndex), options);
  }

  // Reset the selection to a single range.
  function setSimpleSelection(doc, anchor, head, options) {
    setSelection(doc, simpleSelection(anchor, head), options);
  }

  // Give beforeSelectionChange handlers a change to influence a
  // selection update.
  function filterSelectionChange(doc, sel, options) {
    var obj = {
      ranges: sel.ranges,
      update: function(ranges) {
        this.ranges = [];
        for (var i = 0; i < ranges.length; i++)
          { this.ranges[i] = new Range(clipPos(doc, ranges[i].anchor),
                                     clipPos(doc, ranges[i].head)); }
      },
      origin: options && options.origin
    };
    signal(doc, "beforeSelectionChange", doc, obj);
    if (doc.cm) { signal(doc.cm, "beforeSelectionChange", doc.cm, obj); }
    if (obj.ranges != sel.ranges) { return normalizeSelection(doc.cm, obj.ranges, obj.ranges.length - 1) }
    else { return sel }
  }

  function setSelectionReplaceHistory(doc, sel, options) {
    var done = doc.history.done, last = lst(done);
    if (last && last.ranges) {
      done[done.length - 1] = sel;
      setSelectionNoUndo(doc, sel, options);
    } else {
      setSelection(doc, sel, options);
    }
  }

  // Set a new selection.
  function setSelection(doc, sel, options) {
    setSelectionNoUndo(doc, sel, options);
    addSelectionToHistory(doc, doc.sel, doc.cm ? doc.cm.curOp.id : NaN, options);
  }

  function setSelectionNoUndo(doc, sel, options) {
    if (hasHandler(doc, "beforeSelectionChange") || doc.cm && hasHandler(doc.cm, "beforeSelectionChange"))
      { sel = filterSelectionChange(doc, sel, options); }

    var bias = options && options.bias ||
      (cmp(sel.primary().head, doc.sel.primary().head) < 0 ? -1 : 1);
    setSelectionInner(doc, skipAtomicInSelection(doc, sel, bias, true));

    if (!(options && options.scroll === false) && doc.cm)
      { ensureCursorVisible(doc.cm); }
  }

  function setSelectionInner(doc, sel) {
    if (sel.equals(doc.sel)) { return }

    doc.sel = sel;

    if (doc.cm) {
      doc.cm.curOp.updateInput = 1;
      doc.cm.curOp.selectionChanged = true;
      signalCursorActivity(doc.cm);
    }
    signalLater(doc, "cursorActivity", doc);
  }

  // Verify that the selection does not partially select any atomic
  // marked ranges.
  function reCheckSelection(doc) {
    setSelectionInner(doc, skipAtomicInSelection(doc, doc.sel, null, false));
  }

  // Return a selection that does not partially select any atomic
  // ranges.
  function skipAtomicInSelection(doc, sel, bias, mayClear) {
    var out;
    for (var i = 0; i < sel.ranges.length; i++) {
      var range = sel.ranges[i];
      var old = sel.ranges.length == doc.sel.ranges.length && doc.sel.ranges[i];
      var newAnchor = skipAtomic(doc, range.anchor, old && old.anchor, bias, mayClear);
      var newHead = skipAtomic(doc, range.head, old && old.head, bias, mayClear);
      if (out || newAnchor != range.anchor || newHead != range.head) {
        if (!out) { out = sel.ranges.slice(0, i); }
        out[i] = new Range(newAnchor, newHead);
      }
    }
    return out ? normalizeSelection(doc.cm, out, sel.primIndex) : sel
  }

  function skipAtomicInner(doc, pos, oldPos, dir, mayClear) {
    var line = getLine(doc, pos.line);
    if (line.markedSpans) { for (var i = 0; i < line.markedSpans.length; ++i) {
      var sp = line.markedSpans[i], m = sp.marker;

      // Determine if we should prevent the cursor being placed to the left/right of an atomic marker
      // Historically this was determined using the inclusiveLeft/Right option, but the new way to control it
      // is with selectLeft/Right
      var preventCursorLeft = ("selectLeft" in m) ? !m.selectLeft : m.inclusiveLeft;
      var preventCursorRight = ("selectRight" in m) ? !m.selectRight : m.inclusiveRight;

      if ((sp.from == null || (preventCursorLeft ? sp.from <= pos.ch : sp.from < pos.ch)) &&
          (sp.to == null || (preventCursorRight ? sp.to >= pos.ch : sp.to > pos.ch))) {
        if (mayClear) {
          signal(m, "beforeCursorEnter");
          if (m.explicitlyCleared) {
            if (!line.markedSpans) { break }
            else {--i; continue}
          }
        }
        if (!m.atomic) { continue }

        if (oldPos) {
          var near = m.find(dir < 0 ? 1 : -1), diff = (void 0);
          if (dir < 0 ? preventCursorRight : preventCursorLeft)
            { near = movePos(doc, near, -dir, near && near.line == pos.line ? line : null); }
          if (near && near.line == pos.line && (diff = cmp(near, oldPos)) && (dir < 0 ? diff < 0 : diff > 0))
            { return skipAtomicInner(doc, near, pos, dir, mayClear) }
        }

        var far = m.find(dir < 0 ? -1 : 1);
        if (dir < 0 ? preventCursorLeft : preventCursorRight)
          { far = movePos(doc, far, dir, far.line == pos.line ? line : null); }
        return far ? skipAtomicInner(doc, far, pos, dir, mayClear) : null
      }
    } }
    return pos
  }

  // Ensure a given position is not inside an atomic range.
  function skipAtomic(doc, pos, oldPos, bias, mayClear) {
    var dir = bias || 1;
    var found = skipAtomicInner(doc, pos, oldPos, dir, mayClear) ||
        (!mayClear && skipAtomicInner(doc, pos, oldPos, dir, true)) ||
        skipAtomicInner(doc, pos, oldPos, -dir, mayClear) ||
        (!mayClear && skipAtomicInner(doc, pos, oldPos, -dir, true));
    if (!found) {
      doc.cantEdit = true;
      return Pos(doc.first, 0)
    }
    return found
  }

  function movePos(doc, pos, dir, line) {
    if (dir < 0 && pos.ch == 0) {
      if (pos.line > doc.first) { return clipPos(doc, Pos(pos.line - 1)) }
      else { return null }
    } else if (dir > 0 && pos.ch == (line || getLine(doc, pos.line)).text.length) {
      if (pos.line < doc.first + doc.size - 1) { return Pos(pos.line + 1, 0) }
      else { return null }
    } else {
      return new Pos(pos.line, pos.ch + dir)
    }
  }

  function selectAll(cm) {
    cm.setSelection(Pos(cm.firstLine(), 0), Pos(cm.lastLine()), sel_dontScroll);
  }

  // UPDATING

  // Allow "beforeChange" event handlers to influence a change
  function filterChange(doc, change, update) {
    var obj = {
      canceled: false,
      from: change.from,
      to: change.to,
      text: change.text,
      origin: change.origin,
      cancel: function () { return obj.canceled = true; }
    };
    if (update) { obj.update = function (from, to, text, origin) {
      if (from) { obj.from = clipPos(doc, from); }
      if (to) { obj.to = clipPos(doc, to); }
      if (text) { obj.text = text; }
      if (origin !== undefined) { obj.origin = origin; }
    }; }
    signal(doc, "beforeChange", doc, obj);
    if (doc.cm) { signal(doc.cm, "beforeChange", doc.cm, obj); }

    if (obj.canceled) {
      if (doc.cm) { doc.cm.curOp.updateInput = 2; }
      return null
    }
    return {from: obj.from, to: obj.to, text: obj.text, origin: obj.origin}
  }

  // Apply a change to a document, and add it to the document's
  // history, and propagating it to all linked documents.
  function makeChange(doc, change, ignoreReadOnly) {
    if (doc.cm) {
      if (!doc.cm.curOp) { return operation(doc.cm, makeChange)(doc, change, ignoreReadOnly) }
      if (doc.cm.state.suppressEdits) { return }
    }

    if (hasHandler(doc, "beforeChange") || doc.cm && hasHandler(doc.cm, "beforeChange")) {
      change = filterChange(doc, change, true);
      if (!change) { return }
    }

    // Possibly split or suppress the update based on the presence
    // of read-only spans in its range.
    var split = sawReadOnlySpans && !ignoreReadOnly && removeReadOnlyRanges(doc, change.from, change.to);
    if (split) {
      for (var i = split.length - 1; i >= 0; --i)
        { makeChangeInner(doc, {from: split[i].from, to: split[i].to, text: i ? [""] : change.text, origin: change.origin}); }
    } else {
      makeChangeInner(doc, change);
    }
  }

  function makeChangeInner(doc, change) {
    if (change.text.length == 1 && change.text[0] == "" && cmp(change.from, change.to) == 0) { return }
    var selAfter = computeSelAfterChange(doc, change);
    addChangeToHistory(doc, change, selAfter, doc.cm ? doc.cm.curOp.id : NaN);

    makeChangeSingleDoc(doc, change, selAfter, stretchSpansOverChange(doc, change));
    var rebased = [];

    linkedDocs(doc, function (doc, sharedHist) {
      if (!sharedHist && indexOf(rebased, doc.history) == -1) {
        rebaseHist(doc.history, change);
        rebased.push(doc.history);
      }
      makeChangeSingleDoc(doc, change, null, stretchSpansOverChange(doc, change));
    });
  }

  // Revert a change stored in a document's history.
  function makeChangeFromHistory(doc, type, allowSelectionOnly) {
    var suppress = doc.cm && doc.cm.state.suppressEdits;
    if (suppress && !allowSelectionOnly) { return }

    var hist = doc.history, event, selAfter = doc.sel;
    var source = type == "undo" ? hist.done : hist.undone, dest = type == "undo" ? hist.undone : hist.done;

    // Verify that there is a useable event (so that ctrl-z won't
    // needlessly clear selection events)
    var i = 0;
    for (; i < source.length; i++) {
      event = source[i];
      if (allowSelectionOnly ? event.ranges && !event.equals(doc.sel) : !event.ranges)
        { break }
    }
    if (i == source.length) { return }
    hist.lastOrigin = hist.lastSelOrigin = null;

    for (;;) {
      event = source.pop();
      if (event.ranges) {
        pushSelectionToHistory(event, dest);
        if (allowSelectionOnly && !event.equals(doc.sel)) {
          setSelection(doc, event, {clearRedo: false});
          return
        }
        selAfter = event;
      } else if (suppress) {
        source.push(event);
        return
      } else { break }
    }

    // Build up a reverse change object to add to the opposite history
    // stack (redo when undoing, and vice versa).
    var antiChanges = [];
    pushSelectionToHistory(selAfter, dest);
    dest.push({changes: antiChanges, generation: hist.generation});
    hist.generation = event.generation || ++hist.maxGeneration;

    var filter = hasHandler(doc, "beforeChange") || doc.cm && hasHandler(doc.cm, "beforeChange");

    var loop = function ( i ) {
      var change = event.changes[i];
      change.origin = type;
      if (filter && !filterChange(doc, change, false)) {
        source.length = 0;
        return {}
      }

      antiChanges.push(historyChangeFromChange(doc, change));

      var after = i ? computeSelAfterChange(doc, change) : lst(source);
      makeChangeSingleDoc(doc, change, after, mergeOldSpans(doc, change));
      if (!i && doc.cm) { doc.cm.scrollIntoView({from: change.from, to: changeEnd(change)}); }
      var rebased = [];

      // Propagate to the linked documents
      linkedDocs(doc, function (doc, sharedHist) {
        if (!sharedHist && indexOf(rebased, doc.history) == -1) {
          rebaseHist(doc.history, change);
          rebased.push(doc.history);
        }
        makeChangeSingleDoc(doc, change, null, mergeOldSpans(doc, change));
      });
    };

    for (var i$1 = event.changes.length - 1; i$1 >= 0; --i$1) {
      var returned = loop( i$1 );

      if ( returned ) return returned.v;
    }
  }

  // Sub-views need their line numbers shifted when text is added
  // above or below them in the parent document.
  function shiftDoc(doc, distance) {
    if (distance == 0) { return }
    doc.first += distance;
    doc.sel = new Selection(map(doc.sel.ranges, function (range) { return new Range(
      Pos(range.anchor.line + distance, range.anchor.ch),
      Pos(range.head.line + distance, range.head.ch)
    ); }), doc.sel.primIndex);
    if (doc.cm) {
      regChange(doc.cm, doc.first, doc.first - distance, distance);
      for (var d = doc.cm.display, l = d.viewFrom; l < d.viewTo; l++)
        { regLineChange(doc.cm, l, "gutter"); }
    }
  }

  // More lower-level change function, handling only a single document
  // (not linked ones).
  function makeChangeSingleDoc(doc, change, selAfter, spans) {
    if (doc.cm && !doc.cm.curOp)
      { return operation(doc.cm, makeChangeSingleDoc)(doc, change, selAfter, spans) }

    if (change.to.line < doc.first) {
      shiftDoc(doc, change.text.length - 1 - (change.to.line - change.from.line));
      return
    }
    if (change.from.line > doc.lastLine()) { return }

    // Clip the change to the size of this doc
    if (change.from.line < doc.first) {
      var shift = change.text.length - 1 - (doc.first - change.from.line);
      shiftDoc(doc, shift);
      change = {from: Pos(doc.first, 0), to: Pos(change.to.line + shift, change.to.ch),
                text: [lst(change.text)], origin: change.origin};
    }
    var last = doc.lastLine();
    if (change.to.line > last) {
      change = {from: change.from, to: Pos(last, getLine(doc, last).text.length),
                text: [change.text[0]], origin: change.origin};
    }

    change.removed = getBetween(doc, change.from, change.to);

    if (!selAfter) { selAfter = computeSelAfterChange(doc, change); }
    if (doc.cm) { makeChangeSingleDocInEditor(doc.cm, change, spans); }
    else { updateDoc(doc, change, spans); }
    setSelectionNoUndo(doc, selAfter, sel_dontScroll);

    if (doc.cantEdit && skipAtomic(doc, Pos(doc.firstLine(), 0)))
      { doc.cantEdit = false; }
  }

  // Handle the interaction of a change to a document with the editor
  // that this document is part of.
  function makeChangeSingleDocInEditor(cm, change, spans) {
    var doc = cm.doc, display = cm.display, from = change.from, to = change.to;

    var recomputeMaxLength = false, checkWidthStart = from.line;
    if (!cm.options.lineWrapping) {
      checkWidthStart = lineNo(visualLine(getLine(doc, from.line)));
      doc.iter(checkWidthStart, to.line + 1, function (line) {
        if (line == display.maxLine) {
          recomputeMaxLength = true;
          return true
        }
      });
    }

    if (doc.sel.contains(change.from, change.to) > -1)
      { signalCursorActivity(cm); }

    updateDoc(doc, change, spans, estimateHeight(cm));

    if (!cm.options.lineWrapping) {
      doc.iter(checkWidthStart, from.line + change.text.length, function (line) {
        var len = lineLength(line);
        if (len > display.maxLineLength) {
          display.maxLine = line;
          display.maxLineLength = len;
          display.maxLineChanged = true;
          recomputeMaxLength = false;
        }
      });
      if (recomputeMaxLength) { cm.curOp.updateMaxLine = true; }
    }

    retreatFrontier(doc, from.line);
    startWorker(cm, 400);

    var lendiff = change.text.length - (to.line - from.line) - 1;
    // Remember that these lines changed, for updating the display
    if (change.full)
      { regChange(cm); }
    else if (from.line == to.line && change.text.length == 1 && !isWholeLineUpdate(cm.doc, change))
      { regLineChange(cm, from.line, "text"); }
    else
      { regChange(cm, from.line, to.line + 1, lendiff); }

    var changesHandler = hasHandler(cm, "changes"), changeHandler = hasHandler(cm, "change");
    if (changeHandler || changesHandler) {
      var obj = {
        from: from, to: to,
        text: change.text,
        removed: change.removed,
        origin: change.origin
      };
      if (changeHandler) { signalLater(cm, "change", cm, obj); }
      if (changesHandler) { (cm.curOp.changeObjs || (cm.curOp.changeObjs = [])).push(obj); }
    }
    cm.display.selForContextMenu = null;
  }

  function replaceRange(doc, code, from, to, origin) {
    var assign;

    if (!to) { to = from; }
    if (cmp(to, from) < 0) { (assign = [to, from], from = assign[0], to = assign[1]); }
    if (typeof code == "string") { code = doc.splitLines(code); }
    makeChange(doc, {from: from, to: to, text: code, origin: origin});
  }

  // Rebasing/resetting history to deal with externally-sourced changes

  function rebaseHistSelSingle(pos, from, to, diff) {
    if (to < pos.line) {
      pos.line += diff;
    } else if (from < pos.line) {
      pos.line = from;
      pos.ch = 0;
    }
  }

  // Tries to rebase an array of history events given a change in the
  // document. If the change touches the same lines as the event, the
  // event, and everything 'behind' it, is discarded. If the change is
  // before the event, the event's positions are updated. Uses a
  // copy-on-write scheme for the positions, to avoid having to
  // reallocate them all on every rebase, but also avoid problems with
  // shared position objects being unsafely updated.
  function rebaseHistArray(array, from, to, diff) {
    for (var i = 0; i < array.length; ++i) {
      var sub = array[i], ok = true;
      if (sub.ranges) {
        if (!sub.copied) { sub = array[i] = sub.deepCopy(); sub.copied = true; }
        for (var j = 0; j < sub.ranges.length; j++) {
          rebaseHistSelSingle(sub.ranges[j].anchor, from, to, diff);
          rebaseHistSelSingle(sub.ranges[j].head, from, to, diff);
        }
        continue
      }
      for (var j$1 = 0; j$1 < sub.changes.length; ++j$1) {
        var cur = sub.changes[j$1];
        if (to < cur.from.line) {
          cur.from = Pos(cur.from.line + diff, cur.from.ch);
          cur.to = Pos(cur.to.line + diff, cur.to.ch);
        } else if (from <= cur.to.line) {
          ok = false;
          break
        }
      }
      if (!ok) {
        array.splice(0, i + 1);
        i = 0;
      }
    }
  }

  function rebaseHist(hist, change) {
    var from = change.from.line, to = change.to.line, diff = change.text.length - (to - from) - 1;
    rebaseHistArray(hist.done, from, to, diff);
    rebaseHistArray(hist.undone, from, to, diff);
  }

  // Utility for applying a change to a line by handle or number,
  // returning the number and optionally registering the line as
  // changed.
  function changeLine(doc, handle, changeType, op) {
    var no = handle, line = handle;
    if (typeof handle == "number") { line = getLine(doc, clipLine(doc, handle)); }
    else { no = lineNo(handle); }
    if (no == null) { return null }
    if (op(line, no) && doc.cm) { regLineChange(doc.cm, no, changeType); }
    return line
  }

  // The document is represented as a BTree consisting of leaves, with
  // chunk of lines in them, and branches, with up to ten leaves or
  // other branch nodes below them. The top node is always a branch
  // node, and is the document object itself (meaning it has
  // additional methods and properties).
  //
  // All nodes have parent links. The tree is used both to go from
  // line numbers to line objects, and to go from objects to numbers.
  // It also indexes by height, and is used to convert between height
  // and line object, and to find the total height of the document.
  //
  // See also http://marijnhaverbeke.nl/blog/codemirror-line-tree.html

  function LeafChunk(lines) {
    this.lines = lines;
    this.parent = null;
    var height = 0;
    for (var i = 0; i < lines.length; ++i) {
      lines[i].parent = this;
      height += lines[i].height;
    }
    this.height = height;
  }

  LeafChunk.prototype = {
    chunkSize: function() { return this.lines.length },

    // Remove the n lines at offset 'at'.
    removeInner: function(at, n) {
      for (var i = at, e = at + n; i < e; ++i) {
        var line = this.lines[i];
        this.height -= line.height;
        cleanUpLine(line);
        signalLater(line, "delete");
      }
      this.lines.splice(at, n);
    },

    // Helper used to collapse a small branch into a single leaf.
    collapse: function(lines) {
      lines.push.apply(lines, this.lines);
    },

    // Insert the given array of lines at offset 'at', count them as
    // having the given height.
    insertInner: function(at, lines, height) {
      this.height += height;
      this.lines = this.lines.slice(0, at).concat(lines).concat(this.lines.slice(at));
      for (var i = 0; i < lines.length; ++i) { lines[i].parent = this; }
    },

    // Used to iterate over a part of the tree.
    iterN: function(at, n, op) {
      for (var e = at + n; at < e; ++at)
        { if (op(this.lines[at])) { return true } }
    }
  };

  function BranchChunk(children) {
    this.children = children;
    var size = 0, height = 0;
    for (var i = 0; i < children.length; ++i) {
      var ch = children[i];
      size += ch.chunkSize(); height += ch.height;
      ch.parent = this;
    }
    this.size = size;
    this.height = height;
    this.parent = null;
  }

  BranchChunk.prototype = {
    chunkSize: function() { return this.size },

    removeInner: function(at, n) {
      this.size -= n;
      for (var i = 0; i < this.children.length; ++i) {
        var child = this.children[i], sz = child.chunkSize();
        if (at < sz) {
          var rm = Math.min(n, sz - at), oldHeight = child.height;
          child.removeInner(at, rm);
          this.height -= oldHeight - child.height;
          if (sz == rm) { this.children.splice(i--, 1); child.parent = null; }
          if ((n -= rm) == 0) { break }
          at = 0;
        } else { at -= sz; }
      }
      // If the result is smaller than 25 lines, ensure that it is a
      // single leaf node.
      if (this.size - n < 25 &&
          (this.children.length > 1 || !(this.children[0] instanceof LeafChunk))) {
        var lines = [];
        this.collapse(lines);
        this.children = [new LeafChunk(lines)];
        this.children[0].parent = this;
      }
    },

    collapse: function(lines) {
      for (var i = 0; i < this.children.length; ++i) { this.children[i].collapse(lines); }
    },

    insertInner: function(at, lines, height) {
      this.size += lines.length;
      this.height += height;
      for (var i = 0; i < this.children.length; ++i) {
        var child = this.children[i], sz = child.chunkSize();
        if (at <= sz) {
          child.insertInner(at, lines, height);
          if (child.lines && child.lines.length > 50) {
            // To avoid memory thrashing when child.lines is huge (e.g. first view of a large file), it's never spliced.
            // Instead, small slices are taken. They're taken in order because sequential memory accesses are fastest.
            var remaining = child.lines.length % 25 + 25;
            for (var pos = remaining; pos < child.lines.length;) {
              var leaf = new LeafChunk(child.lines.slice(pos, pos += 25));
              child.height -= leaf.height;
              this.children.splice(++i, 0, leaf);
              leaf.parent = this;
            }
            child.lines = child.lines.slice(0, remaining);
            this.maybeSpill();
          }
          break
        }
        at -= sz;
      }
    },

    // When a node has grown, check whether it should be split.
    maybeSpill: function() {
      if (this.children.length <= 10) { return }
      var me = this;
      do {
        var spilled = me.children.splice(me.children.length - 5, 5);
        var sibling = new BranchChunk(spilled);
        if (!me.parent) { // Become the parent node
          var copy = new BranchChunk(me.children);
          copy.parent = me;
          me.children = [copy, sibling];
          me = copy;
       } else {
          me.size -= sibling.size;
          me.height -= sibling.height;
          var myIndex = indexOf(me.parent.children, me);
          me.parent.children.splice(myIndex + 1, 0, sibling);
        }
        sibling.parent = me.parent;
      } while (me.children.length > 10)
      me.parent.maybeSpill();
    },

    iterN: function(at, n, op) {
      for (var i = 0; i < this.children.length; ++i) {
        var child = this.children[i], sz = child.chunkSize();
        if (at < sz) {
          var used = Math.min(n, sz - at);
          if (child.iterN(at, used, op)) { return true }
          if ((n -= used) == 0) { break }
          at = 0;
        } else { at -= sz; }
      }
    }
  };

  // Line widgets are block elements displayed above or below a line.

  var LineWidget = function(doc, node, options) {
    if (options) { for (var opt in options) { if (options.hasOwnProperty(opt))
      { this[opt] = options[opt]; } } }
    this.doc = doc;
    this.node = node;
  };

  LineWidget.prototype.clear = function () {
    var cm = this.doc.cm, ws = this.line.widgets, line = this.line, no = lineNo(line);
    if (no == null || !ws) { return }
    for (var i = 0; i < ws.length; ++i) { if (ws[i] == this) { ws.splice(i--, 1); } }
    if (!ws.length) { line.widgets = null; }
    var height = widgetHeight(this);
    updateLineHeight(line, Math.max(0, line.height - height));
    if (cm) {
      runInOp(cm, function () {
        adjustScrollWhenAboveVisible(cm, line, -height);
        regLineChange(cm, no, "widget");
      });
      signalLater(cm, "lineWidgetCleared", cm, this, no);
    }
  };

  LineWidget.prototype.changed = function () {
      var this$1 = this;

    var oldH = this.height, cm = this.doc.cm, line = this.line;
    this.height = null;
    var diff = widgetHeight(this) - oldH;
    if (!diff) { return }
    if (!lineIsHidden(this.doc, line)) { updateLineHeight(line, line.height + diff); }
    if (cm) {
      runInOp(cm, function () {
        cm.curOp.forceUpdate = true;
        adjustScrollWhenAboveVisible(cm, line, diff);
        signalLater(cm, "lineWidgetChanged", cm, this$1, lineNo(line));
      });
    }
  };
  eventMixin(LineWidget);

  function adjustScrollWhenAboveVisible(cm, line, diff) {
    if (heightAtLine(line) < ((cm.curOp && cm.curOp.scrollTop) || cm.doc.scrollTop))
      { addToScrollTop(cm, diff); }
  }

  function addLineWidget(doc, handle, node, options) {
    var widget = new LineWidget(doc, node, options);
    var cm = doc.cm;
    if (cm && widget.noHScroll) { cm.display.alignWidgets = true; }
    changeLine(doc, handle, "widget", function (line) {
      var widgets = line.widgets || (line.widgets = []);
      if (widget.insertAt == null) { widgets.push(widget); }
      else { widgets.splice(Math.min(widgets.length - 1, Math.max(0, widget.insertAt)), 0, widget); }
      widget.line = line;
      if (cm && !lineIsHidden(doc, line)) {
        var aboveVisible = heightAtLine(line) < doc.scrollTop;
        updateLineHeight(line, line.height + widgetHeight(widget));
        if (aboveVisible) { addToScrollTop(cm, widget.height); }
        cm.curOp.forceUpdate = true;
      }
      return true
    });
    if (cm) { signalLater(cm, "lineWidgetAdded", cm, widget, typeof handle == "number" ? handle : lineNo(handle)); }
    return widget
  }

  // TEXTMARKERS

  // Created with markText and setBookmark methods. A TextMarker is a
  // handle that can be used to clear or find a marked position in the
  // document. Line objects hold arrays (markedSpans) containing
  // {from, to, marker} object pointing to such marker objects, and
  // indicating that such a marker is present on that line. Multiple
  // lines may point to the same marker when it spans across lines.
  // The spans will have null for their from/to properties when the
  // marker continues beyond the start/end of the line. Markers have
  // links back to the lines they currently touch.

  // Collapsed markers have unique ids, in order to be able to order
  // them, which is needed for uniquely determining an outer marker
  // when they overlap (they may nest, but not partially overlap).
  var nextMarkerId = 0;

  var TextMarker = function(doc, type) {
    this.lines = [];
    this.type = type;
    this.doc = doc;
    this.id = ++nextMarkerId;
  };

  // Clear the marker.
  TextMarker.prototype.clear = function () {
    if (this.explicitlyCleared) { return }
    var cm = this.doc.cm, withOp = cm && !cm.curOp;
    if (withOp) { startOperation(cm); }
    if (hasHandler(this, "clear")) {
      var found = this.find();
      if (found) { signalLater(this, "clear", found.from, found.to); }
    }
    var min = null, max = null;
    for (var i = 0; i < this.lines.length; ++i) {
      var line = this.lines[i];
      var span = getMarkedSpanFor(line.markedSpans, this);
      if (cm && !this.collapsed) { regLineChange(cm, lineNo(line), "text"); }
      else if (cm) {
        if (span.to != null) { max = lineNo(line); }
        if (span.from != null) { min = lineNo(line); }
      }
      line.markedSpans = removeMarkedSpan(line.markedSpans, span);
      if (span.from == null && this.collapsed && !lineIsHidden(this.doc, line) && cm)
        { updateLineHeight(line, textHeight(cm.display)); }
    }
    if (cm && this.collapsed && !cm.options.lineWrapping) { for (var i$1 = 0; i$1 < this.lines.length; ++i$1) {
      var visual = visualLine(this.lines[i$1]), len = lineLength(visual);
      if (len > cm.display.maxLineLength) {
        cm.display.maxLine = visual;
        cm.display.maxLineLength = len;
        cm.display.maxLineChanged = true;
      }
    } }

    if (min != null && cm && this.collapsed) { regChange(cm, min, max + 1); }
    this.lines.length = 0;
    this.explicitlyCleared = true;
    if (this.atomic && this.doc.cantEdit) {
      this.doc.cantEdit = false;
      if (cm) { reCheckSelection(cm.doc); }
    }
    if (cm) { signalLater(cm, "markerCleared", cm, this, min, max); }
    if (withOp) { endOperation(cm); }
    if (this.parent) { this.parent.clear(); }
  };

  // Find the position of the marker in the document. Returns a {from,
  // to} object by default. Side can be passed to get a specific side
  // -- 0 (both), -1 (left), or 1 (right). When lineObj is true, the
  // Pos objects returned contain a line object, rather than a line
  // number (used to prevent looking up the same line twice).
  TextMarker.prototype.find = function (side, lineObj) {
    if (side == null && this.type == "bookmark") { side = 1; }
    var from, to;
    for (var i = 0; i < this.lines.length; ++i) {
      var line = this.lines[i];
      var span = getMarkedSpanFor(line.markedSpans, this);
      if (span.from != null) {
        from = Pos(lineObj ? line : lineNo(line), span.from);
        if (side == -1) { return from }
      }
      if (span.to != null) {
        to = Pos(lineObj ? line : lineNo(line), span.to);
        if (side == 1) { return to }
      }
    }
    return from && {from: from, to: to}
  };

  // Signals that the marker's widget changed, and surrounding layout
  // should be recomputed.
  TextMarker.prototype.changed = function () {
      var this$1 = this;

    var pos = this.find(-1, true), widget = this, cm = this.doc.cm;
    if (!pos || !cm) { return }
    runInOp(cm, function () {
      var line = pos.line, lineN = lineNo(pos.line);
      var view = findViewForLine(cm, lineN);
      if (view) {
        clearLineMeasurementCacheFor(view);
        cm.curOp.selectionChanged = cm.curOp.forceUpdate = true;
      }
      cm.curOp.updateMaxLine = true;
      if (!lineIsHidden(widget.doc, line) && widget.height != null) {
        var oldHeight = widget.height;
        widget.height = null;
        var dHeight = widgetHeight(widget) - oldHeight;
        if (dHeight)
          { updateLineHeight(line, line.height + dHeight); }
      }
      signalLater(cm, "markerChanged", cm, this$1);
    });
  };

  TextMarker.prototype.attachLine = function (line) {
    if (!this.lines.length && this.doc.cm) {
      var op = this.doc.cm.curOp;
      if (!op.maybeHiddenMarkers || indexOf(op.maybeHiddenMarkers, this) == -1)
        { (op.maybeUnhiddenMarkers || (op.maybeUnhiddenMarkers = [])).push(this); }
    }
    this.lines.push(line);
  };

  TextMarker.prototype.detachLine = function (line) {
    this.lines.splice(indexOf(this.lines, line), 1);
    if (!this.lines.length && this.doc.cm) {
      var op = this.doc.cm.curOp
      ;(op.maybeHiddenMarkers || (op.maybeHiddenMarkers = [])).push(this);
    }
  };
  eventMixin(TextMarker);

  // Create a marker, wire it up to the right lines, and
  function markText(doc, from, to, options, type) {
    // Shared markers (across linked documents) are handled separately
    // (markTextShared will call out to this again, once per
    // document).
    if (options && options.shared) { return markTextShared(doc, from, to, options, type) }
    // Ensure we are in an operation.
    if (doc.cm && !doc.cm.curOp) { return operation(doc.cm, markText)(doc, from, to, options, type) }

    var marker = new TextMarker(doc, type), diff = cmp(from, to);
    if (options) { copyObj(options, marker, false); }
    // Don't connect empty markers unless clearWhenEmpty is false
    if (diff > 0 || diff == 0 && marker.clearWhenEmpty !== false)
      { return marker }
    if (marker.replacedWith) {
      // Showing up as a widget implies collapsed (widget replaces text)
      marker.collapsed = true;
      marker.widgetNode = eltP("span", [marker.replacedWith], "CodeMirror-widget");
      if (!options.handleMouseEvents) { marker.widgetNode.setAttribute("cm-ignore-events", "true"); }
      if (options.insertLeft) { marker.widgetNode.insertLeft = true; }
    }
    if (marker.collapsed) {
      if (conflictingCollapsedRange(doc, from.line, from, to, marker) ||
          from.line != to.line && conflictingCollapsedRange(doc, to.line, from, to, marker))
        { throw new Error("Inserting collapsed marker partially overlapping an existing one") }
      seeCollapsedSpans();
    }

    if (marker.addToHistory)
      { addChangeToHistory(doc, {from: from, to: to, origin: "markText"}, doc.sel, NaN); }

    var curLine = from.line, cm = doc.cm, updateMaxLine;
    doc.iter(curLine, to.line + 1, function (line) {
      if (cm && marker.collapsed && !cm.options.lineWrapping && visualLine(line) == cm.display.maxLine)
        { updateMaxLine = true; }
      if (marker.collapsed && curLine != from.line) { updateLineHeight(line, 0); }
      addMarkedSpan(line, new MarkedSpan(marker,
                                         curLine == from.line ? from.ch : null,
                                         curLine == to.line ? to.ch : null));
      ++curLine;
    });
    // lineIsHidden depends on the presence of the spans, so needs a second pass
    if (marker.collapsed) { doc.iter(from.line, to.line + 1, function (line) {
      if (lineIsHidden(doc, line)) { updateLineHeight(line, 0); }
    }); }

    if (marker.clearOnEnter) { on(marker, "beforeCursorEnter", function () { return marker.clear(); }); }

    if (marker.readOnly) {
      seeReadOnlySpans();
      if (doc.history.done.length || doc.history.undone.length)
        { doc.clearHistory(); }
    }
    if (marker.collapsed) {
      marker.id = ++nextMarkerId;
      marker.atomic = true;
    }
    if (cm) {
      // Sync editor state
      if (updateMaxLine) { cm.curOp.updateMaxLine = true; }
      if (marker.collapsed)
        { regChange(cm, from.line, to.line + 1); }
      else if (marker.className || marker.startStyle || marker.endStyle || marker.css ||
               marker.attributes || marker.title)
        { for (var i = from.line; i <= to.line; i++) { regLineChange(cm, i, "text"); } }
      if (marker.atomic) { reCheckSelection(cm.doc); }
      signalLater(cm, "markerAdded", cm, marker);
    }
    return marker
  }

  // SHARED TEXTMARKERS

  // A shared marker spans multiple linked documents. It is
  // implemented as a meta-marker-object controlling multiple normal
  // markers.
  var SharedTextMarker = function(markers, primary) {
    this.markers = markers;
    this.primary = primary;
    for (var i = 0; i < markers.length; ++i)
      { markers[i].parent = this; }
  };

  SharedTextMarker.prototype.clear = function () {
    if (this.explicitlyCleared) { return }
    this.explicitlyCleared = true;
    for (var i = 0; i < this.markers.length; ++i)
      { this.markers[i].clear(); }
    signalLater(this, "clear");
  };

  SharedTextMarker.prototype.find = function (side, lineObj) {
    return this.primary.find(side, lineObj)
  };
  eventMixin(SharedTextMarker);

  function markTextShared(doc, from, to, options, type) {
    options = copyObj(options);
    options.shared = false;
    var markers = [markText(doc, from, to, options, type)], primary = markers[0];
    var widget = options.widgetNode;
    linkedDocs(doc, function (doc) {
      if (widget) { options.widgetNode = widget.cloneNode(true); }
      markers.push(markText(doc, clipPos(doc, from), clipPos(doc, to), options, type));
      for (var i = 0; i < doc.linked.length; ++i)
        { if (doc.linked[i].isParent) { return } }
      primary = lst(markers);
    });
    return new SharedTextMarker(markers, primary)
  }

  function findSharedMarkers(doc) {
    return doc.findMarks(Pos(doc.first, 0), doc.clipPos(Pos(doc.lastLine())), function (m) { return m.parent; })
  }

  function copySharedMarkers(doc, markers) {
    for (var i = 0; i < markers.length; i++) {
      var marker = markers[i], pos = marker.find();
      var mFrom = doc.clipPos(pos.from), mTo = doc.clipPos(pos.to);
      if (cmp(mFrom, mTo)) {
        var subMark = markText(doc, mFrom, mTo, marker.primary, marker.primary.type);
        marker.markers.push(subMark);
        subMark.parent = marker;
      }
    }
  }

  function detachSharedMarkers(markers) {
    var loop = function ( i ) {
      var marker = markers[i], linked = [marker.primary.doc];
      linkedDocs(marker.primary.doc, function (d) { return linked.push(d); });
      for (var j = 0; j < marker.markers.length; j++) {
        var subMarker = marker.markers[j];
        if (indexOf(linked, subMarker.doc) == -1) {
          subMarker.parent = null;
          marker.markers.splice(j--, 1);
        }
      }
    };

    for (var i = 0; i < markers.length; i++) loop( i );
  }

  var nextDocId = 0;
  var Doc = function(text, mode, firstLine, lineSep, direction) {
    if (!(this instanceof Doc)) { return new Doc(text, mode, firstLine, lineSep, direction) }
    if (firstLine == null) { firstLine = 0; }

    BranchChunk.call(this, [new LeafChunk([new Line("", null)])]);
    this.first = firstLine;
    this.scrollTop = this.scrollLeft = 0;
    this.cantEdit = false;
    this.cleanGeneration = 1;
    this.modeFrontier = this.highlightFrontier = firstLine;
    var start = Pos(firstLine, 0);
    this.sel = simpleSelection(start);
    this.history = new History(null);
    this.id = ++nextDocId;
    this.modeOption = mode;
    this.lineSep = lineSep;
    this.direction = (direction == "rtl") ? "rtl" : "ltr";
    this.extend = false;

    if (typeof text == "string") { text = this.splitLines(text); }
    updateDoc(this, {from: start, to: start, text: text});
    setSelection(this, simpleSelection(start), sel_dontScroll);
  };

  Doc.prototype = createObj(BranchChunk.prototype, {
    constructor: Doc,
    // Iterate over the document. Supports two forms -- with only one
    // argument, it calls that for each line in the document. With
    // three, it iterates over the range given by the first two (with
    // the second being non-inclusive).
    iter: function(from, to, op) {
      if (op) { this.iterN(from - this.first, to - from, op); }
      else { this.iterN(this.first, this.first + this.size, from); }
    },

    // Non-public interface for adding and removing lines.
    insert: function(at, lines) {
      var height = 0;
      for (var i = 0; i < lines.length; ++i) { height += lines[i].height; }
      this.insertInner(at - this.first, lines, height);
    },
    remove: function(at, n) { this.removeInner(at - this.first, n); },

    // From here, the methods are part of the public interface. Most
    // are also available from CodeMirror (editor) instances.

    getValue: function(lineSep) {
      var lines = getLines(this, this.first, this.first + this.size);
      if (lineSep === false) { return lines }
      return lines.join(lineSep || this.lineSeparator())
    },
    setValue: docMethodOp(function(code) {
      var top = Pos(this.first, 0), last = this.first + this.size - 1;
      makeChange(this, {from: top, to: Pos(last, getLine(this, last).text.length),
                        text: this.splitLines(code), origin: "setValue", full: true}, true);
      if (this.cm) { scrollToCoords(this.cm, 0, 0); }
      setSelection(this, simpleSelection(top), sel_dontScroll);
    }),
    replaceRange: function(code, from, to, origin) {
      from = clipPos(this, from);
      to = to ? clipPos(this, to) : from;
      replaceRange(this, code, from, to, origin);
    },
    getRange: function(from, to, lineSep) {
      var lines = getBetween(this, clipPos(this, from), clipPos(this, to));
      if (lineSep === false) { return lines }
      return lines.join(lineSep || this.lineSeparator())
    },

    getLine: function(line) {var l = this.getLineHandle(line); return l && l.text},

    getLineHandle: function(line) {if (isLine(this, line)) { return getLine(this, line) }},
    getLineNumber: function(line) {return lineNo(line)},

    getLineHandleVisualStart: function(line) {
      if (typeof line == "number") { line = getLine(this, line); }
      return visualLine(line)
    },

    lineCount: function() {return this.size},
    firstLine: function() {return this.first},
    lastLine: function() {return this.first + this.size - 1},

    clipPos: function(pos) {return clipPos(this, pos)},

    getCursor: function(start) {
      var range = this.sel.primary(), pos;
      if (start == null || start == "head") { pos = range.head; }
      else if (start == "anchor") { pos = range.anchor; }
      else if (start == "end" || start == "to" || start === false) { pos = range.to(); }
      else { pos = range.from(); }
      return pos
    },
    listSelections: function() { return this.sel.ranges },
    somethingSelected: function() {return this.sel.somethingSelected()},

    setCursor: docMethodOp(function(line, ch, options) {
      setSimpleSelection(this, clipPos(this, typeof line == "number" ? Pos(line, ch || 0) : line), null, options);
    }),
    setSelection: docMethodOp(function(anchor, head, options) {
      setSimpleSelection(this, clipPos(this, anchor), clipPos(this, head || anchor), options);
    }),
    extendSelection: docMethodOp(function(head, other, options) {
      extendSelection(this, clipPos(this, head), other && clipPos(this, other), options);
    }),
    extendSelections: docMethodOp(function(heads, options) {
      extendSelections(this, clipPosArray(this, heads), options);
    }),
    extendSelectionsBy: docMethodOp(function(f, options) {
      var heads = map(this.sel.ranges, f);
      extendSelections(this, clipPosArray(this, heads), options);
    }),
    setSelections: docMethodOp(function(ranges, primary, options) {
      if (!ranges.length) { return }
      var out = [];
      for (var i = 0; i < ranges.length; i++)
        { out[i] = new Range(clipPos(this, ranges[i].anchor),
                           clipPos(this, ranges[i].head)); }
      if (primary == null) { primary = Math.min(ranges.length - 1, this.sel.primIndex); }
      setSelection(this, normalizeSelection(this.cm, out, primary), options);
    }),
    addSelection: docMethodOp(function(anchor, head, options) {
      var ranges = this.sel.ranges.slice(0);
      ranges.push(new Range(clipPos(this, anchor), clipPos(this, head || anchor)));
      setSelection(this, normalizeSelection(this.cm, ranges, ranges.length - 1), options);
    }),

    getSelection: function(lineSep) {
      var ranges = this.sel.ranges, lines;
      for (var i = 0; i < ranges.length; i++) {
        var sel = getBetween(this, ranges[i].from(), ranges[i].to());
        lines = lines ? lines.concat(sel) : sel;
      }
      if (lineSep === false) { return lines }
      else { return lines.join(lineSep || this.lineSeparator()) }
    },
    getSelections: function(lineSep) {
      var parts = [], ranges = this.sel.ranges;
      for (var i = 0; i < ranges.length; i++) {
        var sel = getBetween(this, ranges[i].from(), ranges[i].to());
        if (lineSep !== false) { sel = sel.join(lineSep || this.lineSeparator()); }
        parts[i] = sel;
      }
      return parts
    },
    replaceSelection: function(code, collapse, origin) {
      var dup = [];
      for (var i = 0; i < this.sel.ranges.length; i++)
        { dup[i] = code; }
      this.replaceSelections(dup, collapse, origin || "+input");
    },
    replaceSelections: docMethodOp(function(code, collapse, origin) {
      var changes = [], sel = this.sel;
      for (var i = 0; i < sel.ranges.length; i++) {
        var range = sel.ranges[i];
        changes[i] = {from: range.from(), to: range.to(), text: this.splitLines(code[i]), origin: origin};
      }
      var newSel = collapse && collapse != "end" && computeReplacedSel(this, changes, collapse);
      for (var i$1 = changes.length - 1; i$1 >= 0; i$1--)
        { makeChange(this, changes[i$1]); }
      if (newSel) { setSelectionReplaceHistory(this, newSel); }
      else if (this.cm) { ensureCursorVisible(this.cm); }
    }),
    undo: docMethodOp(function() {makeChangeFromHistory(this, "undo");}),
    redo: docMethodOp(function() {makeChangeFromHistory(this, "redo");}),
    undoSelection: docMethodOp(function() {makeChangeFromHistory(this, "undo", true);}),
    redoSelection: docMethodOp(function() {makeChangeFromHistory(this, "redo", true);}),

    setExtending: function(val) {this.extend = val;},
    getExtending: function() {return this.extend},

    historySize: function() {
      var hist = this.history, done = 0, undone = 0;
      for (var i = 0; i < hist.done.length; i++) { if (!hist.done[i].ranges) { ++done; } }
      for (var i$1 = 0; i$1 < hist.undone.length; i$1++) { if (!hist.undone[i$1].ranges) { ++undone; } }
      return {undo: done, redo: undone}
    },
    clearHistory: function() {
      var this$1 = this;

      this.history = new History(this.history.maxGeneration);
      linkedDocs(this, function (doc) { return doc.history = this$1.history; }, true);
    },

    markClean: function() {
      this.cleanGeneration = this.changeGeneration(true);
    },
    changeGeneration: function(forceSplit) {
      if (forceSplit)
        { this.history.lastOp = this.history.lastSelOp = this.history.lastOrigin = null; }
      return this.history.generation
    },
    isClean: function (gen) {
      return this.history.generation == (gen || this.cleanGeneration)
    },

    getHistory: function() {
      return {done: copyHistoryArray(this.history.done),
              undone: copyHistoryArray(this.history.undone)}
    },
    setHistory: function(histData) {
      var hist = this.history = new History(this.history.maxGeneration);
      hist.done = copyHistoryArray(histData.done.slice(0), null, true);
      hist.undone = copyHistoryArray(histData.undone.slice(0), null, true);
    },

    setGutterMarker: docMethodOp(function(line, gutterID, value) {
      return changeLine(this, line, "gutter", function (line) {
        var markers = line.gutterMarkers || (line.gutterMarkers = {});
        markers[gutterID] = value;
        if (!value && isEmpty(markers)) { line.gutterMarkers = null; }
        return true
      })
    }),

    clearGutter: docMethodOp(function(gutterID) {
      var this$1 = this;

      this.iter(function (line) {
        if (line.gutterMarkers && line.gutterMarkers[gutterID]) {
          changeLine(this$1, line, "gutter", function () {
            line.gutterMarkers[gutterID] = null;
            if (isEmpty(line.gutterMarkers)) { line.gutterMarkers = null; }
            return true
          });
        }
      });
    }),

    lineInfo: function(line) {
      var n;
      if (typeof line == "number") {
        if (!isLine(this, line)) { return null }
        n = line;
        line = getLine(this, line);
        if (!line) { return null }
      } else {
        n = lineNo(line);
        if (n == null) { return null }
      }
      return {line: n, handle: line, text: line.text, gutterMarkers: line.gutterMarkers,
              textClass: line.textClass, bgClass: line.bgClass, wrapClass: line.wrapClass,
              widgets: line.widgets}
    },

    addLineClass: docMethodOp(function(handle, where, cls) {
      return changeLine(this, handle, where == "gutter" ? "gutter" : "class", function (line) {
        var prop = where == "text" ? "textClass"
                 : where == "background" ? "bgClass"
                 : where == "gutter" ? "gutterClass" : "wrapClass";
        if (!line[prop]) { line[prop] = cls; }
        else if (classTest(cls).test(line[prop])) { return false }
        else { line[prop] += " " + cls; }
        return true
      })
    }),
    removeLineClass: docMethodOp(function(handle, where, cls) {
      return changeLine(this, handle, where == "gutter" ? "gutter" : "class", function (line) {
        var prop = where == "text" ? "textClass"
                 : where == "background" ? "bgClass"
                 : where == "gutter" ? "gutterClass" : "wrapClass";
        var cur = line[prop];
        if (!cur) { return false }
        else if (cls == null) { line[prop] = null; }
        else {
          var found = cur.match(classTest(cls));
          if (!found) { return false }
          var end = found.index + found[0].length;
          line[prop] = cur.slice(0, found.index) + (!found.index || end == cur.length ? "" : " ") + cur.slice(end) || null;
        }
        return true
      })
    }),

    addLineWidget: docMethodOp(function(handle, node, options) {
      return addLineWidget(this, handle, node, options)
    }),
    removeLineWidget: function(widget) { widget.clear(); },

    markText: function(from, to, options) {
      return markText(this, clipPos(this, from), clipPos(this, to), options, options && options.type || "range")
    },
    setBookmark: function(pos, options) {
      var realOpts = {replacedWith: options && (options.nodeType == null ? options.widget : options),
                      insertLeft: options && options.insertLeft,
                      clearWhenEmpty: false, shared: options && options.shared,
                      handleMouseEvents: options && options.handleMouseEvents};
      pos = clipPos(this, pos);
      return markText(this, pos, pos, realOpts, "bookmark")
    },
    findMarksAt: function(pos) {
      pos = clipPos(this, pos);
      var markers = [], spans = getLine(this, pos.line).markedSpans;
      if (spans) { for (var i = 0; i < spans.length; ++i) {
        var span = spans[i];
        if ((span.from == null || span.from <= pos.ch) &&
            (span.to == null || span.to >= pos.ch))
          { markers.push(span.marker.parent || span.marker); }
      } }
      return markers
    },
    findMarks: function(from, to, filter) {
      from = clipPos(this, from); to = clipPos(this, to);
      var found = [], lineNo = from.line;
      this.iter(from.line, to.line + 1, function (line) {
        var spans = line.markedSpans;
        if (spans) { for (var i = 0; i < spans.length; i++) {
          var span = spans[i];
          if (!(span.to != null && lineNo == from.line && from.ch >= span.to ||
                span.from == null && lineNo != from.line ||
                span.from != null && lineNo == to.line && span.from >= to.ch) &&
              (!filter || filter(span.marker)))
            { found.push(span.marker.parent || span.marker); }
        } }
        ++lineNo;
      });
      return found
    },
    getAllMarks: function() {
      var markers = [];
      this.iter(function (line) {
        var sps = line.markedSpans;
        if (sps) { for (var i = 0; i < sps.length; ++i)
          { if (sps[i].from != null) { markers.push(sps[i].marker); } } }
      });
      return markers
    },

    posFromIndex: function(off) {
      var ch, lineNo = this.first, sepSize = this.lineSeparator().length;
      this.iter(function (line) {
        var sz = line.text.length + sepSize;
        if (sz > off) { ch = off; return true }
        off -= sz;
        ++lineNo;
      });
      return clipPos(this, Pos(lineNo, ch))
    },
    indexFromPos: function (coords) {
      coords = clipPos(this, coords);
      var index = coords.ch;
      if (coords.line < this.first || coords.ch < 0) { return 0 }
      var sepSize = this.lineSeparator().length;
      this.iter(this.first, coords.line, function (line) { // iter aborts when callback returns a truthy value
        index += line.text.length + sepSize;
      });
      return index
    },

    copy: function(copyHistory) {
      var doc = new Doc(getLines(this, this.first, this.first + this.size),
                        this.modeOption, this.first, this.lineSep, this.direction);
      doc.scrollTop = this.scrollTop; doc.scrollLeft = this.scrollLeft;
      doc.sel = this.sel;
      doc.extend = false;
      if (copyHistory) {
        doc.history.undoDepth = this.history.undoDepth;
        doc.setHistory(this.getHistory());
      }
      return doc
    },

    linkedDoc: function(options) {
      if (!options) { options = {}; }
      var from = this.first, to = this.first + this.size;
      if (options.from != null && options.from > from) { from = options.from; }
      if (options.to != null && options.to < to) { to = options.to; }
      var copy = new Doc(getLines(this, from, to), options.mode || this.modeOption, from, this.lineSep, this.direction);
      if (options.sharedHist) { copy.history = this.history
      ; }(this.linked || (this.linked = [])).push({doc: copy, sharedHist: options.sharedHist});
      copy.linked = [{doc: this, isParent: true, sharedHist: options.sharedHist}];
      copySharedMarkers(copy, findSharedMarkers(this));
      return copy
    },
    unlinkDoc: function(other) {
      if (other instanceof CodeMirror) { other = other.doc; }
      if (this.linked) { for (var i = 0; i < this.linked.length; ++i) {
        var link = this.linked[i];
        if (link.doc != other) { continue }
        this.linked.splice(i, 1);
        other.unlinkDoc(this);
        detachSharedMarkers(findSharedMarkers(this));
        break
      } }
      // If the histories were shared, split them again
      if (other.history == this.history) {
        var splitIds = [other.id];
        linkedDocs(other, function (doc) { return splitIds.push(doc.id); }, true);
        other.history = new History(null);
        other.history.done = copyHistoryArray(this.history.done, splitIds);
        other.history.undone = copyHistoryArray(this.history.undone, splitIds);
      }
    },
    iterLinkedDocs: function(f) {linkedDocs(this, f);},

    getMode: function() {return this.mode},
    getEditor: function() {return this.cm},

    splitLines: function(str) {
      if (this.lineSep) { return str.split(this.lineSep) }
      return splitLinesAuto(str)
    },
    lineSeparator: function() { return this.lineSep || "\n" },

    setDirection: docMethodOp(function (dir) {
      if (dir != "rtl") { dir = "ltr"; }
      if (dir == this.direction) { return }
      this.direction = dir;
      this.iter(function (line) { return line.order = null; });
      if (this.cm) { directionChanged(this.cm); }
    })
  });

  // Public alias.
  Doc.prototype.eachLine = Doc.prototype.iter;

  // Kludge to work around strange IE behavior where it'll sometimes
  // re-fire a series of drag-related events right after the drop (#1551)
  var lastDrop = 0;

  function onDrop(e) {
    var cm = this;
    clearDragCursor(cm);
    if (signalDOMEvent(cm, e) || eventInWidget(cm.display, e))
      { return }
    e_preventDefault(e);
    if (ie) { lastDrop = +new Date; }
    var pos = posFromMouse(cm, e, true), files = e.dataTransfer.files;
    if (!pos || cm.isReadOnly()) { return }
    // Might be a file drop, in which case we simply extract the text
    // and insert it.
    if (files && files.length && window.FileReader && window.File) {
      var n = files.length, text = Array(n), read = 0;
      var markAsReadAndPasteIfAllFilesAreRead = function () {
        if (++read == n) {
          operation(cm, function () {
            pos = clipPos(cm.doc, pos);
            var change = {from: pos, to: pos,
                          text: cm.doc.splitLines(
                              text.filter(function (t) { return t != null; }).join(cm.doc.lineSeparator())),
                          origin: "paste"};
            makeChange(cm.doc, change);
            setSelectionReplaceHistory(cm.doc, simpleSelection(clipPos(cm.doc, pos), clipPos(cm.doc, changeEnd(change))));
          })();
        }
      };
      var readTextFromFile = function (file, i) {
        if (cm.options.allowDropFileTypes &&
            indexOf(cm.options.allowDropFileTypes, file.type) == -1) {
          markAsReadAndPasteIfAllFilesAreRead();
          return
        }
        var reader = new FileReader;
        reader.onerror = function () { return markAsReadAndPasteIfAllFilesAreRead(); };
        reader.onload = function () {
          var content = reader.result;
          if (/[\x00-\x08\x0e-\x1f]{2}/.test(content)) {
            markAsReadAndPasteIfAllFilesAreRead();
            return
          }
          text[i] = content;
          markAsReadAndPasteIfAllFilesAreRead();
        };
        reader.readAsText(file);
      };
      for (var i = 0; i < files.length; i++) { readTextFromFile(files[i], i); }
    } else { // Normal drop
      // Don't do a replace if the drop happened inside of the selected text.
      if (cm.state.draggingText && cm.doc.sel.contains(pos) > -1) {
        cm.state.draggingText(e);
        // Ensure the editor is re-focused
        setTimeout(function () { return cm.display.input.focus(); }, 20);
        return
      }
      try {
        var text$1 = e.dataTransfer.getData("Text");
        if (text$1) {
          var selected;
          if (cm.state.draggingText && !cm.state.draggingText.copy)
            { selected = cm.listSelections(); }
          setSelectionNoUndo(cm.doc, simpleSelection(pos, pos));
          if (selected) { for (var i$1 = 0; i$1 < selected.length; ++i$1)
            { replaceRange(cm.doc, "", selected[i$1].anchor, selected[i$1].head, "drag"); } }
          cm.replaceSelection(text$1, "around", "paste");
          cm.display.input.focus();
        }
      }
      catch(e){}
    }
  }

  function onDragStart(cm, e) {
    if (ie && (!cm.state.draggingText || +new Date - lastDrop < 100)) { e_stop(e); return }
    if (signalDOMEvent(cm, e) || eventInWidget(cm.display, e)) { return }

    e.dataTransfer.setData("Text", cm.getSelection());
    e.dataTransfer.effectAllowed = "copyMove";

    // Use dummy image instead of default browsers image.
    // Recent Safari (~6.0.2) have a tendency to segfault when this happens, so we don't do it there.
    if (e.dataTransfer.setDragImage && !safari) {
      var img = elt("img", null, null, "position: fixed; left: 0; top: 0;");
      img.src = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
      if (presto) {
        img.width = img.height = 1;
        cm.display.wrapper.appendChild(img);
        // Force a relayout, or Opera won't use our image for some obscure reason
        img._top = img.offsetTop;
      }
      e.dataTransfer.setDragImage(img, 0, 0);
      if (presto) { img.parentNode.removeChild(img); }
    }
  }

  function onDragOver(cm, e) {
    var pos = posFromMouse(cm, e);
    if (!pos) { return }
    var frag = document.createDocumentFragment();
    drawSelectionCursor(cm, pos, frag);
    if (!cm.display.dragCursor) {
      cm.display.dragCursor = elt("div", null, "CodeMirror-cursors CodeMirror-dragcursors");
      cm.display.lineSpace.insertBefore(cm.display.dragCursor, cm.display.cursorDiv);
    }
    removeChildrenAndAdd(cm.display.dragCursor, frag);
  }

  function clearDragCursor(cm) {
    if (cm.display.dragCursor) {
      cm.display.lineSpace.removeChild(cm.display.dragCursor);
      cm.display.dragCursor = null;
    }
  }

  // These must be handled carefully, because naively registering a
  // handler for each editor will cause the editors to never be
  // garbage collected.

  function forEachCodeMirror(f) {
    if (!document.getElementsByClassName) { return }
    var byClass = document.getElementsByClassName("CodeMirror"), editors = [];
    for (var i = 0; i < byClass.length; i++) {
      var cm = byClass[i].CodeMirror;
      if (cm) { editors.push(cm); }
    }
    if (editors.length) { editors[0].operation(function () {
      for (var i = 0; i < editors.length; i++) { f(editors[i]); }
    }); }
  }

  var globalsRegistered = false;
  function ensureGlobalHandlers() {
    if (globalsRegistered) { return }
    registerGlobalHandlers();
    globalsRegistered = true;
  }
  function registerGlobalHandlers() {
    // When the window resizes, we need to refresh active editors.
    var resizeTimer;
    on(window, "resize", function () {
      if (resizeTimer == null) { resizeTimer = setTimeout(function () {
        resizeTimer = null;
        forEachCodeMirror(onResize);
      }, 100); }
    });
    // When the window loses focus, we want to show the editor as blurred
    on(window, "blur", function () { return forEachCodeMirror(onBlur); });
  }
  // Called when the window resizes
  function onResize(cm) {
    var d = cm.display;
    // Might be a text scaling operation, clear size caches.
    d.cachedCharWidth = d.cachedTextHeight = d.cachedPaddingH = null;
    d.scrollbarsClipped = false;
    cm.setSize();
  }

  var keyNames = {
    3: "Pause", 8: "Backspace", 9: "Tab", 13: "Enter", 16: "Shift", 17: "Ctrl", 18: "Alt",
    19: "Pause", 20: "CapsLock", 27: "Esc", 32: "Space", 33: "PageUp", 34: "PageDown", 35: "End",
    36: "Home", 37: "Left", 38: "Up", 39: "Right", 40: "Down", 44: "PrintScrn", 45: "Insert",
    46: "Delete", 59: ";", 61: "=", 91: "Mod", 92: "Mod", 93: "Mod",
    106: "*", 107: "=", 109: "-", 110: ".", 111: "/", 145: "ScrollLock",
    173: "-", 186: ";", 187: "=", 188: ",", 189: "-", 190: ".", 191: "/", 192: "`", 219: "[", 220: "\\",
    221: "]", 222: "'", 63232: "Up", 63233: "Down", 63234: "Left", 63235: "Right", 63272: "Delete",
    63273: "Home", 63275: "End", 63276: "PageUp", 63277: "PageDown", 63302: "Insert"
  };

  // Number keys
  for (var i = 0; i < 10; i++) { keyNames[i + 48] = keyNames[i + 96] = String(i); }
  // Alphabetic keys
  for (var i$1 = 65; i$1 <= 90; i$1++) { keyNames[i$1] = String.fromCharCode(i$1); }
  // Function keys
  for (var i$2 = 1; i$2 <= 12; i$2++) { keyNames[i$2 + 111] = keyNames[i$2 + 63235] = "F" + i$2; }

  var keyMap = {};

  keyMap.basic = {
    "Left": "goCharLeft", "Right": "goCharRight", "Up": "goLineUp", "Down": "goLineDown",
    "End": "goLineEnd", "Home": "goLineStartSmart", "PageUp": "goPageUp", "PageDown": "goPageDown",
    "Delete": "delCharAfter", "Backspace": "delCharBefore", "Shift-Backspace": "delCharBefore",
    "Tab": "defaultTab", "Shift-Tab": "indentAuto",
    "Enter": "newlineAndIndent", "Insert": "toggleOverwrite",
    "Esc": "singleSelection"
  };
  // Note that the save and find-related commands aren't defined by
  // default. User code or addons can define them. Unknown commands
  // are simply ignored.
  keyMap.pcDefault = {
    "Ctrl-A": "selectAll", "Ctrl-D": "deleteLine", "Ctrl-Z": "undo", "Shift-Ctrl-Z": "redo", "Ctrl-Y": "redo",
    "Ctrl-Home": "goDocStart", "Ctrl-End": "goDocEnd", "Ctrl-Up": "goLineUp", "Ctrl-Down": "goLineDown",
    "Ctrl-Left": "goGroupLeft", "Ctrl-Right": "goGroupRight", "Alt-Left": "goLineStart", "Alt-Right": "goLineEnd",
    "Ctrl-Backspace": "delGroupBefore", "Ctrl-Delete": "delGroupAfter", "Ctrl-S": "save", "Ctrl-F": "find",
    "Ctrl-G": "findNext", "Shift-Ctrl-G": "findPrev", "Shift-Ctrl-F": "replace", "Shift-Ctrl-R": "replaceAll",
    "Ctrl-[": "indentLess", "Ctrl-]": "indentMore",
    "Ctrl-U": "undoSelection", "Shift-Ctrl-U": "redoSelection", "Alt-U": "redoSelection",
    "fallthrough": "basic"
  };
  // Very basic readline/emacs-style bindings, which are standard on Mac.
  keyMap.emacsy = {
    "Ctrl-F": "goCharRight", "Ctrl-B": "goCharLeft", "Ctrl-P": "goLineUp", "Ctrl-N": "goLineDown",
    "Alt-F": "goWordRight", "Alt-B": "goWordLeft", "Ctrl-A": "goLineStart", "Ctrl-E": "goLineEnd",
    "Ctrl-V": "goPageDown", "Shift-Ctrl-V": "goPageUp", "Ctrl-D": "delCharAfter", "Ctrl-H": "delCharBefore",
    "Alt-D": "delWordAfter", "Alt-Backspace": "delWordBefore", "Ctrl-K": "killLine", "Ctrl-T": "transposeChars",
    "Ctrl-O": "openLine"
  };
  keyMap.macDefault = {
    "Cmd-A": "selectAll", "Cmd-D": "deleteLine", "Cmd-Z": "undo", "Shift-Cmd-Z": "redo", "Cmd-Y": "redo",
    "Cmd-Home": "goDocStart", "Cmd-Up": "goDocStart", "Cmd-End": "goDocEnd", "Cmd-Down": "goDocEnd", "Alt-Left": "goGroupLeft",
    "Alt-Right": "goGroupRight", "Cmd-Left": "goLineLeft", "Cmd-Right": "goLineRight", "Alt-Backspace": "delGroupBefore",
    "Ctrl-Alt-Backspace": "delGroupAfter", "Alt-Delete": "delGroupAfter", "Cmd-S": "save", "Cmd-F": "find",
    "Cmd-G": "findNext", "Shift-Cmd-G": "findPrev", "Cmd-Alt-F": "replace", "Shift-Cmd-Alt-F": "replaceAll",
    "Cmd-[": "indentLess", "Cmd-]": "indentMore", "Cmd-Backspace": "delWrappedLineLeft", "Cmd-Delete": "delWrappedLineRight",
    "Cmd-U": "undoSelection", "Shift-Cmd-U": "redoSelection", "Ctrl-Up": "goDocStart", "Ctrl-Down": "goDocEnd",
    "fallthrough": ["basic", "emacsy"]
  };
  keyMap["default"] = mac ? keyMap.macDefault : keyMap.pcDefault;

  // KEYMAP DISPATCH

  function normalizeKeyName(name) {
    var parts = name.split(/-(?!$)/);
    name = parts[parts.length - 1];
    var alt, ctrl, shift, cmd;
    for (var i = 0; i < parts.length - 1; i++) {
      var mod = parts[i];
      if (/^(cmd|meta|m)$/i.test(mod)) { cmd = true; }
      else if (/^a(lt)?$/i.test(mod)) { alt = true; }
      else if (/^(c|ctrl|control)$/i.test(mod)) { ctrl = true; }
      else if (/^s(hift)?$/i.test(mod)) { shift = true; }
      else { throw new Error("Unrecognized modifier name: " + mod) }
    }
    if (alt) { name = "Alt-" + name; }
    if (ctrl) { name = "Ctrl-" + name; }
    if (cmd) { name = "Cmd-" + name; }
    if (shift) { name = "Shift-" + name; }
    return name
  }

  // This is a kludge to keep keymaps mostly working as raw objects
  // (backwards compatibility) while at the same time support features
  // like normalization and multi-stroke key bindings. It compiles a
  // new normalized keymap, and then updates the old object to reflect
  // this.
  function normalizeKeyMap(keymap) {
    var copy = {};
    for (var keyname in keymap) { if (keymap.hasOwnProperty(keyname)) {
      var value = keymap[keyname];
      if (/^(name|fallthrough|(de|at)tach)$/.test(keyname)) { continue }
      if (value == "...") { delete keymap[keyname]; continue }

      var keys = map(keyname.split(" "), normalizeKeyName);
      for (var i = 0; i < keys.length; i++) {
        var val = (void 0), name = (void 0);
        if (i == keys.length - 1) {
          name = keys.join(" ");
          val = value;
        } else {
          name = keys.slice(0, i + 1).join(" ");
          val = "...";
        }
        var prev = copy[name];
        if (!prev) { copy[name] = val; }
        else if (prev != val) { throw new Error("Inconsistent bindings for " + name) }
      }
      delete keymap[keyname];
    } }
    for (var prop in copy) { keymap[prop] = copy[prop]; }
    return keymap
  }

  function lookupKey(key, map, handle, context) {
    map = getKeyMap(map);
    var found = map.call ? map.call(key, context) : map[key];
    if (found === false) { return "nothing" }
    if (found === "...") { return "multi" }
    if (found != null && handle(found)) { return "handled" }

    if (map.fallthrough) {
      if (Object.prototype.toString.call(map.fallthrough) != "[object Array]")
        { return lookupKey(key, map.fallthrough, handle, context) }
      for (var i = 0; i < map.fallthrough.length; i++) {
        var result = lookupKey(key, map.fallthrough[i], handle, context);
        if (result) { return result }
      }
    }
  }

  // Modifier key presses don't count as 'real' key presses for the
  // purpose of keymap fallthrough.
  function isModifierKey(value) {
    var name = typeof value == "string" ? value : keyNames[value.keyCode];
    return name == "Ctrl" || name == "Alt" || name == "Shift" || name == "Mod"
  }

  function addModifierNames(name, event, noShift) {
    var base = name;
    if (event.altKey && base != "Alt") { name = "Alt-" + name; }
    if ((flipCtrlCmd ? event.metaKey : event.ctrlKey) && base != "Ctrl") { name = "Ctrl-" + name; }
    if ((flipCtrlCmd ? event.ctrlKey : event.metaKey) && base != "Cmd") { name = "Cmd-" + name; }
    if (!noShift && event.shiftKey && base != "Shift") { name = "Shift-" + name; }
    return name
  }

  // Look up the name of a key as indicated by an event object.
  function keyName(event, noShift) {
    if (presto && event.keyCode == 34 && event["char"]) { return false }
    var name = keyNames[event.keyCode];
    if (name == null || event.altGraphKey) { return false }
    // Ctrl-ScrollLock has keyCode 3, same as Ctrl-Pause,
    // so we'll use event.code when available (Chrome 48+, FF 38+, Safari 10.1+)
    if (event.keyCode == 3 && event.code) { name = event.code; }
    return addModifierNames(name, event, noShift)
  }

  function getKeyMap(val) {
    return typeof val == "string" ? keyMap[val] : val
  }

  // Helper for deleting text near the selection(s), used to implement
  // backspace, delete, and similar functionality.
  function deleteNearSelection(cm, compute) {
    var ranges = cm.doc.sel.ranges, kill = [];
    // Build up a set of ranges to kill first, merging overlapping
    // ranges.
    for (var i = 0; i < ranges.length; i++) {
      var toKill = compute(ranges[i]);
      while (kill.length && cmp(toKill.from, lst(kill).to) <= 0) {
        var replaced = kill.pop();
        if (cmp(replaced.from, toKill.from) < 0) {
          toKill.from = replaced.from;
          break
        }
      }
      kill.push(toKill);
    }
    // Next, remove those actual ranges.
    runInOp(cm, function () {
      for (var i = kill.length - 1; i >= 0; i--)
        { replaceRange(cm.doc, "", kill[i].from, kill[i].to, "+delete"); }
      ensureCursorVisible(cm);
    });
  }

  function moveCharLogically(line, ch, dir) {
    var target = skipExtendingChars(line.text, ch + dir, dir);
    return target < 0 || target > line.text.length ? null : target
  }

  function moveLogically(line, start, dir) {
    var ch = moveCharLogically(line, start.ch, dir);
    return ch == null ? null : new Pos(start.line, ch, dir < 0 ? "after" : "before")
  }

  function endOfLine(visually, cm, lineObj, lineNo, dir) {
    if (visually) {
      if (cm.doc.direction == "rtl") { dir = -dir; }
      var order = getOrder(lineObj, cm.doc.direction);
      if (order) {
        var part = dir < 0 ? lst(order) : order[0];
        var moveInStorageOrder = (dir < 0) == (part.level == 1);
        var sticky = moveInStorageOrder ? "after" : "before";
        var ch;
        // With a wrapped rtl chunk (possibly spanning multiple bidi parts),
        // it could be that the last bidi part is not on the last visual line,
        // since visual lines contain content order-consecutive chunks.
        // Thus, in rtl, we are looking for the first (content-order) character
        // in the rtl chunk that is on the last line (that is, the same line
        // as the last (content-order) character).
        if (part.level > 0 || cm.doc.direction == "rtl") {
          var prep = prepareMeasureForLine(cm, lineObj);
          ch = dir < 0 ? lineObj.text.length - 1 : 0;
          var targetTop = measureCharPrepared(cm, prep, ch).top;
          ch = findFirst(function (ch) { return measureCharPrepared(cm, prep, ch).top == targetTop; }, (dir < 0) == (part.level == 1) ? part.from : part.to - 1, ch);
          if (sticky == "before") { ch = moveCharLogically(lineObj, ch, 1); }
        } else { ch = dir < 0 ? part.to : part.from; }
        return new Pos(lineNo, ch, sticky)
      }
    }
    return new Pos(lineNo, dir < 0 ? lineObj.text.length : 0, dir < 0 ? "before" : "after")
  }

  function moveVisually(cm, line, start, dir) {
    var bidi = getOrder(line, cm.doc.direction);
    if (!bidi) { return moveLogically(line, start, dir) }
    if (start.ch >= line.text.length) {
      start.ch = line.text.length;
      start.sticky = "before";
    } else if (start.ch <= 0) {
      start.ch = 0;
      start.sticky = "after";
    }
    var partPos = getBidiPartAt(bidi, start.ch, start.sticky), part = bidi[partPos];
    if (cm.doc.direction == "ltr" && part.level % 2 == 0 && (dir > 0 ? part.to > start.ch : part.from < start.ch)) {
      // Case 1: We move within an ltr part in an ltr editor. Even with wrapped lines,
      // nothing interesting happens.
      return moveLogically(line, start, dir)
    }

    var mv = function (pos, dir) { return moveCharLogically(line, pos instanceof Pos ? pos.ch : pos, dir); };
    var prep;
    var getWrappedLineExtent = function (ch) {
      if (!cm.options.lineWrapping) { return {begin: 0, end: line.text.length} }
      prep = prep || prepareMeasureForLine(cm, line);
      return wrappedLineExtentChar(cm, line, prep, ch)
    };
    var wrappedLineExtent = getWrappedLineExtent(start.sticky == "before" ? mv(start, -1) : start.ch);

    if (cm.doc.direction == "rtl" || part.level == 1) {
      var moveInStorageOrder = (part.level == 1) == (dir < 0);
      var ch = mv(start, moveInStorageOrder ? 1 : -1);
      if (ch != null && (!moveInStorageOrder ? ch >= part.from && ch >= wrappedLineExtent.begin : ch <= part.to && ch <= wrappedLineExtent.end)) {
        // Case 2: We move within an rtl part or in an rtl editor on the same visual line
        var sticky = moveInStorageOrder ? "before" : "after";
        return new Pos(start.line, ch, sticky)
      }
    }

    // Case 3: Could not move within this bidi part in this visual line, so leave
    // the current bidi part

    var searchInVisualLine = function (partPos, dir, wrappedLineExtent) {
      var getRes = function (ch, moveInStorageOrder) { return moveInStorageOrder
        ? new Pos(start.line, mv(ch, 1), "before")
        : new Pos(start.line, ch, "after"); };

      for (; partPos >= 0 && partPos < bidi.length; partPos += dir) {
        var part = bidi[partPos];
        var moveInStorageOrder = (dir > 0) == (part.level != 1);
        var ch = moveInStorageOrder ? wrappedLineExtent.begin : mv(wrappedLineExtent.end, -1);
        if (part.from <= ch && ch < part.to) { return getRes(ch, moveInStorageOrder) }
        ch = moveInStorageOrder ? part.from : mv(part.to, -1);
        if (wrappedLineExtent.begin <= ch && ch < wrappedLineExtent.end) { return getRes(ch, moveInStorageOrder) }
      }
    };

    // Case 3a: Look for other bidi parts on the same visual line
    var res = searchInVisualLine(partPos + dir, dir, wrappedLineExtent);
    if (res) { return res }

    // Case 3b: Look for other bidi parts on the next visual line
    var nextCh = dir > 0 ? wrappedLineExtent.end : mv(wrappedLineExtent.begin, -1);
    if (nextCh != null && !(dir > 0 && nextCh == line.text.length)) {
      res = searchInVisualLine(dir > 0 ? 0 : bidi.length - 1, dir, getWrappedLineExtent(nextCh));
      if (res) { return res }
    }

    // Case 4: Nowhere to move
    return null
  }

  // Commands are parameter-less actions that can be performed on an
  // editor, mostly used for keybindings.
  var commands = {
    selectAll: selectAll,
    singleSelection: function (cm) { return cm.setSelection(cm.getCursor("anchor"), cm.getCursor("head"), sel_dontScroll); },
    killLine: function (cm) { return deleteNearSelection(cm, function (range) {
      if (range.empty()) {
        var len = getLine(cm.doc, range.head.line).text.length;
        if (range.head.ch == len && range.head.line < cm.lastLine())
          { return {from: range.head, to: Pos(range.head.line + 1, 0)} }
        else
          { return {from: range.head, to: Pos(range.head.line, len)} }
      } else {
        return {from: range.from(), to: range.to()}
      }
    }); },
    deleteLine: function (cm) { return deleteNearSelection(cm, function (range) { return ({
      from: Pos(range.from().line, 0),
      to: clipPos(cm.doc, Pos(range.to().line + 1, 0))
    }); }); },
    delLineLeft: function (cm) { return deleteNearSelection(cm, function (range) { return ({
      from: Pos(range.from().line, 0), to: range.from()
    }); }); },
    delWrappedLineLeft: function (cm) { return deleteNearSelection(cm, function (range) {
      var top = cm.charCoords(range.head, "div").top + 5;
      var leftPos = cm.coordsChar({left: 0, top: top}, "div");
      return {from: leftPos, to: range.from()}
    }); },
    delWrappedLineRight: function (cm) { return deleteNearSelection(cm, function (range) {
      var top = cm.charCoords(range.head, "div").top + 5;
      var rightPos = cm.coordsChar({left: cm.display.lineDiv.offsetWidth + 100, top: top}, "div");
      return {from: range.from(), to: rightPos }
    }); },
    undo: function (cm) { return cm.undo(); },
    redo: function (cm) { return cm.redo(); },
    undoSelection: function (cm) { return cm.undoSelection(); },
    redoSelection: function (cm) { return cm.redoSelection(); },
    goDocStart: function (cm) { return cm.extendSelection(Pos(cm.firstLine(), 0)); },
    goDocEnd: function (cm) { return cm.extendSelection(Pos(cm.lastLine())); },
    goLineStart: function (cm) { return cm.extendSelectionsBy(function (range) { return lineStart(cm, range.head.line); },
      {origin: "+move", bias: 1}
    ); },
    goLineStartSmart: function (cm) { return cm.extendSelectionsBy(function (range) { return lineStartSmart(cm, range.head); },
      {origin: "+move", bias: 1}
    ); },
    goLineEnd: function (cm) { return cm.extendSelectionsBy(function (range) { return lineEnd(cm, range.head.line); },
      {origin: "+move", bias: -1}
    ); },
    goLineRight: function (cm) { return cm.extendSelectionsBy(function (range) {
      var top = cm.cursorCoords(range.head, "div").top + 5;
      return cm.coordsChar({left: cm.display.lineDiv.offsetWidth + 100, top: top}, "div")
    }, sel_move); },
    goLineLeft: function (cm) { return cm.extendSelectionsBy(function (range) {
      var top = cm.cursorCoords(range.head, "div").top + 5;
      return cm.coordsChar({left: 0, top: top}, "div")
    }, sel_move); },
    goLineLeftSmart: function (cm) { return cm.extendSelectionsBy(function (range) {
      var top = cm.cursorCoords(range.head, "div").top + 5;
      var pos = cm.coordsChar({left: 0, top: top}, "div");
      if (pos.ch < cm.getLine(pos.line).search(/\S/)) { return lineStartSmart(cm, range.head) }
      return pos
    }, sel_move); },
    goLineUp: function (cm) { return cm.moveV(-1, "line"); },
    goLineDown: function (cm) { return cm.moveV(1, "line"); },
    goPageUp: function (cm) { return cm.moveV(-1, "page"); },
    goPageDown: function (cm) { return cm.moveV(1, "page"); },
    goCharLeft: function (cm) { return cm.moveH(-1, "char"); },
    goCharRight: function (cm) { return cm.moveH(1, "char"); },
    goColumnLeft: function (cm) { return cm.moveH(-1, "column"); },
    goColumnRight: function (cm) { return cm.moveH(1, "column"); },
    goWordLeft: function (cm) { return cm.moveH(-1, "word"); },
    goGroupRight: function (cm) { return cm.moveH(1, "group"); },
    goGroupLeft: function (cm) { return cm.moveH(-1, "group"); },
    goWordRight: function (cm) { return cm.moveH(1, "word"); },
    delCharBefore: function (cm) { return cm.deleteH(-1, "char"); },
    delCharAfter: function (cm) { return cm.deleteH(1, "char"); },
    delWordBefore: function (cm) { return cm.deleteH(-1, "word"); },
    delWordAfter: function (cm) { return cm.deleteH(1, "word"); },
    delGroupBefore: function (cm) { return cm.deleteH(-1, "group"); },
    delGroupAfter: function (cm) { return cm.deleteH(1, "group"); },
    indentAuto: function (cm) { return cm.indentSelection("smart"); },
    indentMore: function (cm) { return cm.indentSelection("add"); },
    indentLess: function (cm) { return cm.indentSelection("subtract"); },
    insertTab: function (cm) { return cm.replaceSelection("\t"); },
    insertSoftTab: function (cm) {
      var spaces = [], ranges = cm.listSelections(), tabSize = cm.options.tabSize;
      for (var i = 0; i < ranges.length; i++) {
        var pos = ranges[i].from();
        var col = countColumn(cm.getLine(pos.line), pos.ch, tabSize);
        spaces.push(spaceStr(tabSize - col % tabSize));
      }
      cm.replaceSelections(spaces);
    },
    defaultTab: function (cm) {
      if (cm.somethingSelected()) { cm.indentSelection("add"); }
      else { cm.execCommand("insertTab"); }
    },
    // Swap the two chars left and right of each selection's head.
    // Move cursor behind the two swapped characters afterwards.
    //
    // Doesn't consider line feeds a character.
    // Doesn't scan more than one line above to find a character.
    // Doesn't do anything on an empty line.
    // Doesn't do anything with non-empty selections.
    transposeChars: function (cm) { return runInOp(cm, function () {
      var ranges = cm.listSelections(), newSel = [];
      for (var i = 0; i < ranges.length; i++) {
        if (!ranges[i].empty()) { continue }
        var cur = ranges[i].head, line = getLine(cm.doc, cur.line).text;
        if (line) {
          if (cur.ch == line.length) { cur = new Pos(cur.line, cur.ch - 1); }
          if (cur.ch > 0) {
            cur = new Pos(cur.line, cur.ch + 1);
            cm.replaceRange(line.charAt(cur.ch - 1) + line.charAt(cur.ch - 2),
                            Pos(cur.line, cur.ch - 2), cur, "+transpose");
          } else if (cur.line > cm.doc.first) {
            var prev = getLine(cm.doc, cur.line - 1).text;
            if (prev) {
              cur = new Pos(cur.line, 1);
              cm.replaceRange(line.charAt(0) + cm.doc.lineSeparator() +
                              prev.charAt(prev.length - 1),
                              Pos(cur.line - 1, prev.length - 1), cur, "+transpose");
            }
          }
        }
        newSel.push(new Range(cur, cur));
      }
      cm.setSelections(newSel);
    }); },
    newlineAndIndent: function (cm) { return runInOp(cm, function () {
      var sels = cm.listSelections();
      for (var i = sels.length - 1; i >= 0; i--)
        { cm.replaceRange(cm.doc.lineSeparator(), sels[i].anchor, sels[i].head, "+input"); }
      sels = cm.listSelections();
      for (var i$1 = 0; i$1 < sels.length; i$1++)
        { cm.indentLine(sels[i$1].from().line, null, true); }
      ensureCursorVisible(cm);
    }); },
    openLine: function (cm) { return cm.replaceSelection("\n", "start"); },
    toggleOverwrite: function (cm) { return cm.toggleOverwrite(); }
  };


  function lineStart(cm, lineN) {
    var line = getLine(cm.doc, lineN);
    var visual = visualLine(line);
    if (visual != line) { lineN = lineNo(visual); }
    return endOfLine(true, cm, visual, lineN, 1)
  }
  function lineEnd(cm, lineN) {
    var line = getLine(cm.doc, lineN);
    var visual = visualLineEnd(line);
    if (visual != line) { lineN = lineNo(visual); }
    return endOfLine(true, cm, line, lineN, -1)
  }
  function lineStartSmart(cm, pos) {
    var start = lineStart(cm, pos.line);
    var line = getLine(cm.doc, start.line);
    var order = getOrder(line, cm.doc.direction);
    if (!order || order[0].level == 0) {
      var firstNonWS = Math.max(start.ch, line.text.search(/\S/));
      var inWS = pos.line == start.line && pos.ch <= firstNonWS && pos.ch;
      return Pos(start.line, inWS ? 0 : firstNonWS, start.sticky)
    }
    return start
  }

  // Run a handler that was bound to a key.
  function doHandleBinding(cm, bound, dropShift) {
    if (typeof bound == "string") {
      bound = commands[bound];
      if (!bound) { return false }
    }
    // Ensure previous input has been read, so that the handler sees a
    // consistent view of the document
    cm.display.input.ensurePolled();
    var prevShift = cm.display.shift, done = false;
    try {
      if (cm.isReadOnly()) { cm.state.suppressEdits = true; }
      if (dropShift) { cm.display.shift = false; }
      done = bound(cm) != Pass;
    } finally {
      cm.display.shift = prevShift;
      cm.state.suppressEdits = false;
    }
    return done
  }

  function lookupKeyForEditor(cm, name, handle) {
    for (var i = 0; i < cm.state.keyMaps.length; i++) {
      var result = lookupKey(name, cm.state.keyMaps[i], handle, cm);
      if (result) { return result }
    }
    return (cm.options.extraKeys && lookupKey(name, cm.options.extraKeys, handle, cm))
      || lookupKey(name, cm.options.keyMap, handle, cm)
  }

  // Note that, despite the name, this function is also used to check
  // for bound mouse clicks.

  var stopSeq = new Delayed;

  function dispatchKey(cm, name, e, handle) {
    var seq = cm.state.keySeq;
    if (seq) {
      if (isModifierKey(name)) { return "handled" }
      if (/\'$/.test(name))
        { cm.state.keySeq = null; }
      else
        { stopSeq.set(50, function () {
          if (cm.state.keySeq == seq) {
            cm.state.keySeq = null;
            cm.display.input.reset();
          }
        }); }
      if (dispatchKeyInner(cm, seq + " " + name, e, handle)) { return true }
    }
    return dispatchKeyInner(cm, name, e, handle)
  }

  function dispatchKeyInner(cm, name, e, handle) {
    var result = lookupKeyForEditor(cm, name, handle);

    if (result == "multi")
      { cm.state.keySeq = name; }
    if (result == "handled")
      { signalLater(cm, "keyHandled", cm, name, e); }

    if (result == "handled" || result == "multi") {
      e_preventDefault(e);
      restartBlink(cm);
    }

    return !!result
  }

  // Handle a key from the keydown event.
  function handleKeyBinding(cm, e) {
    var name = keyName(e, true);
    if (!name) { return false }

    if (e.shiftKey && !cm.state.keySeq) {
      // First try to resolve full name (including 'Shift-'). Failing
      // that, see if there is a cursor-motion command (starting with
      // 'go') bound to the keyname without 'Shift-'.
      return dispatchKey(cm, "Shift-" + name, e, function (b) { return doHandleBinding(cm, b, true); })
          || dispatchKey(cm, name, e, function (b) {
               if (typeof b == "string" ? /^go[A-Z]/.test(b) : b.motion)
                 { return doHandleBinding(cm, b) }
             })
    } else {
      return dispatchKey(cm, name, e, function (b) { return doHandleBinding(cm, b); })
    }
  }

  // Handle a key from the keypress event
  function handleCharBinding(cm, e, ch) {
    return dispatchKey(cm, "'" + ch + "'", e, function (b) { return doHandleBinding(cm, b, true); })
  }

  var lastStoppedKey = null;
  function onKeyDown(e) {
    var cm = this;
    cm.curOp.focus = activeElt();
    if (signalDOMEvent(cm, e)) { return }
    // IE does strange things with escape.
    if (ie && ie_version < 11 && e.keyCode == 27) { e.returnValue = false; }
    var code = e.keyCode;
    cm.display.shift = code == 16 || e.shiftKey;
    var handled = handleKeyBinding(cm, e);
    if (presto) {
      lastStoppedKey = handled ? code : null;
      // Opera has no cut event... we try to at least catch the key combo
      if (!handled && code == 88 && !hasCopyEvent && (mac ? e.metaKey : e.ctrlKey))
        { cm.replaceSelection("", null, "cut"); }
    }
    if (gecko && !mac && !handled && code == 46 && e.shiftKey && !e.ctrlKey && document.execCommand)
      { document.execCommand("cut"); }

    // Turn mouse into crosshair when Alt is held on Mac.
    if (code == 18 && !/\bCodeMirror-crosshair\b/.test(cm.display.lineDiv.className))
      { showCrossHair(cm); }
  }

  function showCrossHair(cm) {
    var lineDiv = cm.display.lineDiv;
    addClass(lineDiv, "CodeMirror-crosshair");

    function up(e) {
      if (e.keyCode == 18 || !e.altKey) {
        rmClass(lineDiv, "CodeMirror-crosshair");
        off(document, "keyup", up);
        off(document, "mouseover", up);
      }
    }
    on(document, "keyup", up);
    on(document, "mouseover", up);
  }

  function onKeyUp(e) {
    if (e.keyCode == 16) { this.doc.sel.shift = false; }
    signalDOMEvent(this, e);
  }

  function onKeyPress(e) {
    var cm = this;
    if (eventInWidget(cm.display, e) || signalDOMEvent(cm, e) || e.ctrlKey && !e.altKey || mac && e.metaKey) { return }
    var keyCode = e.keyCode, charCode = e.charCode;
    if (presto && keyCode == lastStoppedKey) {lastStoppedKey = null; e_preventDefault(e); return}
    if ((presto && (!e.which || e.which < 10)) && handleKeyBinding(cm, e)) { return }
    var ch = String.fromCharCode(charCode == null ? keyCode : charCode);
    // Some browsers fire keypress events for backspace
    if (ch == "\x08") { return }
    if (handleCharBinding(cm, e, ch)) { return }
    cm.display.input.onKeyPress(e);
  }

  var DOUBLECLICK_DELAY = 400;

  var PastClick = function(time, pos, button) {
    this.time = time;
    this.pos = pos;
    this.button = button;
  };

  PastClick.prototype.compare = function (time, pos, button) {
    return this.time + DOUBLECLICK_DELAY > time &&
      cmp(pos, this.pos) == 0 && button == this.button
  };

  var lastClick, lastDoubleClick;
  function clickRepeat(pos, button) {
    var now = +new Date;
    if (lastDoubleClick && lastDoubleClick.compare(now, pos, button)) {
      lastClick = lastDoubleClick = null;
      return "triple"
    } else if (lastClick && lastClick.compare(now, pos, button)) {
      lastDoubleClick = new PastClick(now, pos, button);
      lastClick = null;
      return "double"
    } else {
      lastClick = new PastClick(now, pos, button);
      lastDoubleClick = null;
      return "single"
    }
  }

  // A mouse down can be a single click, double click, triple click,
  // start of selection drag, start of text drag, new cursor
  // (ctrl-click), rectangle drag (alt-drag), or xwin
  // middle-click-paste. Or it might be a click on something we should
  // not interfere with, such as a scrollbar or widget.
  function onMouseDown(e) {
    var cm = this, display = cm.display;
    if (signalDOMEvent(cm, e) || display.activeTouch && display.input.supportsTouch()) { return }
    display.input.ensurePolled();
    display.shift = e.shiftKey;

    if (eventInWidget(display, e)) {
      if (!webkit) {
        // Briefly turn off draggability, to allow widgets to do
        // normal dragging things.
        display.scroller.draggable = false;
        setTimeout(function () { return display.scroller.draggable = true; }, 100);
      }
      return
    }
    if (clickInGutter(cm, e)) { return }
    var pos = posFromMouse(cm, e), button = e_button(e), repeat = pos ? clickRepeat(pos, button) : "single";
    window.focus();

    // #3261: make sure, that we're not starting a second selection
    if (button == 1 && cm.state.selectingText)
      { cm.state.selectingText(e); }

    if (pos && handleMappedButton(cm, button, pos, repeat, e)) { return }

    if (button == 1) {
      if (pos) { leftButtonDown(cm, pos, repeat, e); }
      else if (e_target(e) == display.scroller) { e_preventDefault(e); }
    } else if (button == 2) {
      if (pos) { extendSelection(cm.doc, pos); }
      setTimeout(function () { return display.input.focus(); }, 20);
    } else if (button == 3) {
      if (captureRightClick) { cm.display.input.onContextMenu(e); }
      else { delayBlurEvent(cm); }
    }
  }

  function handleMappedButton(cm, button, pos, repeat, event) {
    var name = "Click";
    if (repeat == "double") { name = "Double" + name; }
    else if (repeat == "triple") { name = "Triple" + name; }
    name = (button == 1 ? "Left" : button == 2 ? "Middle" : "Right") + name;

    return dispatchKey(cm,  addModifierNames(name, event), event, function (bound) {
      if (typeof bound == "string") { bound = commands[bound]; }
      if (!bound) { return false }
      var done = false;
      try {
        if (cm.isReadOnly()) { cm.state.suppressEdits = true; }
        done = bound(cm, pos) != Pass;
      } finally {
        cm.state.suppressEdits = false;
      }
      return done
    })
  }

  function configureMouse(cm, repeat, event) {
    var option = cm.getOption("configureMouse");
    var value = option ? option(cm, repeat, event) : {};
    if (value.unit == null) {
      var rect = chromeOS ? event.shiftKey && event.metaKey : event.altKey;
      value.unit = rect ? "rectangle" : repeat == "single" ? "char" : repeat == "double" ? "word" : "line";
    }
    if (value.extend == null || cm.doc.extend) { value.extend = cm.doc.extend || event.shiftKey; }
    if (value.addNew == null) { value.addNew = mac ? event.metaKey : event.ctrlKey; }
    if (value.moveOnDrag == null) { value.moveOnDrag = !(mac ? event.altKey : event.ctrlKey); }
    return value
  }

  function leftButtonDown(cm, pos, repeat, event) {
    if (ie) { setTimeout(bind(ensureFocus, cm), 0); }
    else { cm.curOp.focus = activeElt(); }

    var behavior = configureMouse(cm, repeat, event);

    var sel = cm.doc.sel, contained;
    if (cm.options.dragDrop && dragAndDrop && !cm.isReadOnly() &&
        repeat == "single" && (contained = sel.contains(pos)) > -1 &&
        (cmp((contained = sel.ranges[contained]).from(), pos) < 0 || pos.xRel > 0) &&
        (cmp(contained.to(), pos) > 0 || pos.xRel < 0))
      { leftButtonStartDrag(cm, event, pos, behavior); }
    else
      { leftButtonSelect(cm, event, pos, behavior); }
  }

  // Start a text drag. When it ends, see if any dragging actually
  // happen, and treat as a click if it didn't.
  function leftButtonStartDrag(cm, event, pos, behavior) {
    var display = cm.display, moved = false;
    var dragEnd = operation(cm, function (e) {
      if (webkit) { display.scroller.draggable = false; }
      cm.state.draggingText = false;
      off(display.wrapper.ownerDocument, "mouseup", dragEnd);
      off(display.wrapper.ownerDocument, "mousemove", mouseMove);
      off(display.scroller, "dragstart", dragStart);
      off(display.scroller, "drop", dragEnd);
      if (!moved) {
        e_preventDefault(e);
        if (!behavior.addNew)
          { extendSelection(cm.doc, pos, null, null, behavior.extend); }
        // Work around unexplainable focus problem in IE9 (#2127) and Chrome (#3081)
        if (webkit || ie && ie_version == 9)
          { setTimeout(function () {display.wrapper.ownerDocument.body.focus(); display.input.focus();}, 20); }
        else
          { display.input.focus(); }
      }
    });
    var mouseMove = function(e2) {
      moved = moved || Math.abs(event.clientX - e2.clientX) + Math.abs(event.clientY - e2.clientY) >= 10;
    };
    var dragStart = function () { return moved = true; };
    // Let the drag handler handle this.
    if (webkit) { display.scroller.draggable = true; }
    cm.state.draggingText = dragEnd;
    dragEnd.copy = !behavior.moveOnDrag;
    // IE's approach to draggable
    if (display.scroller.dragDrop) { display.scroller.dragDrop(); }
    on(display.wrapper.ownerDocument, "mouseup", dragEnd);
    on(display.wrapper.ownerDocument, "mousemove", mouseMove);
    on(display.scroller, "dragstart", dragStart);
    on(display.scroller, "drop", dragEnd);

    delayBlurEvent(cm);
    setTimeout(function () { return display.input.focus(); }, 20);
  }

  function rangeForUnit(cm, pos, unit) {
    if (unit == "char") { return new Range(pos, pos) }
    if (unit == "word") { return cm.findWordAt(pos) }
    if (unit == "line") { return new Range(Pos(pos.line, 0), clipPos(cm.doc, Pos(pos.line + 1, 0))) }
    var result = unit(cm, pos);
    return new Range(result.from, result.to)
  }

  // Normal selection, as opposed to text dragging.
  function leftButtonSelect(cm, event, start, behavior) {
    var display = cm.display, doc = cm.doc;
    e_preventDefault(event);

    var ourRange, ourIndex, startSel = doc.sel, ranges = startSel.ranges;
    if (behavior.addNew && !behavior.extend) {
      ourIndex = doc.sel.contains(start);
      if (ourIndex > -1)
        { ourRange = ranges[ourIndex]; }
      else
        { ourRange = new Range(start, start); }
    } else {
      ourRange = doc.sel.primary();
      ourIndex = doc.sel.primIndex;
    }

    if (behavior.unit == "rectangle") {
      if (!behavior.addNew) { ourRange = new Range(start, start); }
      start = posFromMouse(cm, event, true, true);
      ourIndex = -1;
    } else {
      var range = rangeForUnit(cm, start, behavior.unit);
      if (behavior.extend)
        { ourRange = extendRange(ourRange, range.anchor, range.head, behavior.extend); }
      else
        { ourRange = range; }
    }

    if (!behavior.addNew) {
      ourIndex = 0;
      setSelection(doc, new Selection([ourRange], 0), sel_mouse);
      startSel = doc.sel;
    } else if (ourIndex == -1) {
      ourIndex = ranges.length;
      setSelection(doc, normalizeSelection(cm, ranges.concat([ourRange]), ourIndex),
                   {scroll: false, origin: "*mouse"});
    } else if (ranges.length > 1 && ranges[ourIndex].empty() && behavior.unit == "char" && !behavior.extend) {
      setSelection(doc, normalizeSelection(cm, ranges.slice(0, ourIndex).concat(ranges.slice(ourIndex + 1)), 0),
                   {scroll: false, origin: "*mouse"});
      startSel = doc.sel;
    } else {
      replaceOneSelection(doc, ourIndex, ourRange, sel_mouse);
    }

    var lastPos = start;
    function extendTo(pos) {
      if (cmp(lastPos, pos) == 0) { return }
      lastPos = pos;

      if (behavior.unit == "rectangle") {
        var ranges = [], tabSize = cm.options.tabSize;
        var startCol = countColumn(getLine(doc, start.line).text, start.ch, tabSize);
        var posCol = countColumn(getLine(doc, pos.line).text, pos.ch, tabSize);
        var left = Math.min(startCol, posCol), right = Math.max(startCol, posCol);
        for (var line = Math.min(start.line, pos.line), end = Math.min(cm.lastLine(), Math.max(start.line, pos.line));
             line <= end; line++) {
          var text = getLine(doc, line).text, leftPos = findColumn(text, left, tabSize);
          if (left == right)
            { ranges.push(new Range(Pos(line, leftPos), Pos(line, leftPos))); }
          else if (text.length > leftPos)
            { ranges.push(new Range(Pos(line, leftPos), Pos(line, findColumn(text, right, tabSize)))); }
        }
        if (!ranges.length) { ranges.push(new Range(start, start)); }
        setSelection(doc, normalizeSelection(cm, startSel.ranges.slice(0, ourIndex).concat(ranges), ourIndex),
                     {origin: "*mouse", scroll: false});
        cm.scrollIntoView(pos);
      } else {
        var oldRange = ourRange;
        var range = rangeForUnit(cm, pos, behavior.unit);
        var anchor = oldRange.anchor, head;
        if (cmp(range.anchor, anchor) > 0) {
          head = range.head;
          anchor = minPos(oldRange.from(), range.anchor);
        } else {
          head = range.anchor;
          anchor = maxPos(oldRange.to(), range.head);
        }
        var ranges$1 = startSel.ranges.slice(0);
        ranges$1[ourIndex] = bidiSimplify(cm, new Range(clipPos(doc, anchor), head));
        setSelection(doc, normalizeSelection(cm, ranges$1, ourIndex), sel_mouse);
      }
    }

    var editorSize = display.wrapper.getBoundingClientRect();
    // Used to ensure timeout re-tries don't fire when another extend
    // happened in the meantime (clearTimeout isn't reliable -- at
    // least on Chrome, the timeouts still happen even when cleared,
    // if the clear happens after their scheduled firing time).
    var counter = 0;

    function extend(e) {
      var curCount = ++counter;
      var cur = posFromMouse(cm, e, true, behavior.unit == "rectangle");
      if (!cur) { return }
      if (cmp(cur, lastPos) != 0) {
        cm.curOp.focus = activeElt();
        extendTo(cur);
        var visible = visibleLines(display, doc);
        if (cur.line >= visible.to || cur.line < visible.from)
          { setTimeout(operation(cm, function () {if (counter == curCount) { extend(e); }}), 150); }
      } else {
        var outside = e.clientY < editorSize.top ? -20 : e.clientY > editorSize.bottom ? 20 : 0;
        if (outside) { setTimeout(operation(cm, function () {
          if (counter != curCount) { return }
          display.scroller.scrollTop += outside;
          extend(e);
        }), 50); }
      }
    }

    function done(e) {
      cm.state.selectingText = false;
      counter = Infinity;
      // If e is null or undefined we interpret this as someone trying
      // to explicitly cancel the selection rather than the user
      // letting go of the mouse button.
      if (e) {
        e_preventDefault(e);
        display.input.focus();
      }
      off(display.wrapper.ownerDocument, "mousemove", move);
      off(display.wrapper.ownerDocument, "mouseup", up);
      doc.history.lastSelOrigin = null;
    }

    var move = operation(cm, function (e) {
      if (e.buttons === 0 || !e_button(e)) { done(e); }
      else { extend(e); }
    });
    var up = operation(cm, done);
    cm.state.selectingText = up;
    on(display.wrapper.ownerDocument, "mousemove", move);
    on(display.wrapper.ownerDocument, "mouseup", up);
  }

  // Used when mouse-selecting to adjust the anchor to the proper side
  // of a bidi jump depending on the visual position of the head.
  function bidiSimplify(cm, range) {
    var anchor = range.anchor;
    var head = range.head;
    var anchorLine = getLine(cm.doc, anchor.line);
    if (cmp(anchor, head) == 0 && anchor.sticky == head.sticky) { return range }
    var order = getOrder(anchorLine);
    if (!order) { return range }
    var index = getBidiPartAt(order, anchor.ch, anchor.sticky), part = order[index];
    if (part.from != anchor.ch && part.to != anchor.ch) { return range }
    var boundary = index + ((part.from == anchor.ch) == (part.level != 1) ? 0 : 1);
    if (boundary == 0 || boundary == order.length) { return range }

    // Compute the relative visual position of the head compared to the
    // anchor (<0 is to the left, >0 to the right)
    var leftSide;
    if (head.line != anchor.line) {
      leftSide = (head.line - anchor.line) * (cm.doc.direction == "ltr" ? 1 : -1) > 0;
    } else {
      var headIndex = getBidiPartAt(order, head.ch, head.sticky);
      var dir = headIndex - index || (head.ch - anchor.ch) * (part.level == 1 ? -1 : 1);
      if (headIndex == boundary - 1 || headIndex == boundary)
        { leftSide = dir < 0; }
      else
        { leftSide = dir > 0; }
    }

    var usePart = order[boundary + (leftSide ? -1 : 0)];
    var from = leftSide == (usePart.level == 1);
    var ch = from ? usePart.from : usePart.to, sticky = from ? "after" : "before";
    return anchor.ch == ch && anchor.sticky == sticky ? range : new Range(new Pos(anchor.line, ch, sticky), head)
  }


  // Determines whether an event happened in the gutter, and fires the
  // handlers for the corresponding event.
  function gutterEvent(cm, e, type, prevent) {
    var mX, mY;
    if (e.touches) {
      mX = e.touches[0].clientX;
      mY = e.touches[0].clientY;
    } else {
      try { mX = e.clientX; mY = e.clientY; }
      catch(e) { return false }
    }
    if (mX >= Math.floor(cm.display.gutters.getBoundingClientRect().right)) { return false }
    if (prevent) { e_preventDefault(e); }

    var display = cm.display;
    var lineBox = display.lineDiv.getBoundingClientRect();

    if (mY > lineBox.bottom || !hasHandler(cm, type)) { return e_defaultPrevented(e) }
    mY -= lineBox.top - display.viewOffset;

    for (var i = 0; i < cm.display.gutterSpecs.length; ++i) {
      var g = display.gutters.childNodes[i];
      if (g && g.getBoundingClientRect().right >= mX) {
        var line = lineAtHeight(cm.doc, mY);
        var gutter = cm.display.gutterSpecs[i];
        signal(cm, type, cm, line, gutter.className, e);
        return e_defaultPrevented(e)
      }
    }
  }

  function clickInGutter(cm, e) {
    return gutterEvent(cm, e, "gutterClick", true)
  }

  // CONTEXT MENU HANDLING

  // To make the context menu work, we need to briefly unhide the
  // textarea (making it as unobtrusive as possible) to let the
  // right-click take effect on it.
  function onContextMenu(cm, e) {
    if (eventInWidget(cm.display, e) || contextMenuInGutter(cm, e)) { return }
    if (signalDOMEvent(cm, e, "contextmenu")) { return }
    if (!captureRightClick) { cm.display.input.onContextMenu(e); }
  }

  function contextMenuInGutter(cm, e) {
    if (!hasHandler(cm, "gutterContextMenu")) { return false }
    return gutterEvent(cm, e, "gutterContextMenu", false)
  }

  function themeChanged(cm) {
    cm.display.wrapper.className = cm.display.wrapper.className.replace(/\s*cm-s-\S+/g, "") +
      cm.options.theme.replace(/(^|\s)\s*/g, " cm-s-");
    clearCaches(cm);
  }

  var Init = {toString: function(){return "CodeMirror.Init"}};

  var defaults = {};
  var optionHandlers = {};

  function defineOptions(CodeMirror) {
    var optionHandlers = CodeMirror.optionHandlers;

    function option(name, deflt, handle, notOnInit) {
      CodeMirror.defaults[name] = deflt;
      if (handle) { optionHandlers[name] =
        notOnInit ? function (cm, val, old) {if (old != Init) { handle(cm, val, old); }} : handle; }
    }

    CodeMirror.defineOption = option;

    // Passed to option handlers when there is no old value.
    CodeMirror.Init = Init;

    // These two are, on init, called from the constructor because they
    // have to be initialized before the editor can start at all.
    option("value", "", function (cm, val) { return cm.setValue(val); }, true);
    option("mode", null, function (cm, val) {
      cm.doc.modeOption = val;
      loadMode(cm);
    }, true);

    option("indentUnit", 2, loadMode, true);
    option("indentWithTabs", false);
    option("smartIndent", true);
    option("tabSize", 4, function (cm) {
      resetModeState(cm);
      clearCaches(cm);
      regChange(cm);
    }, true);

    option("lineSeparator", null, function (cm, val) {
      cm.doc.lineSep = val;
      if (!val) { return }
      var newBreaks = [], lineNo = cm.doc.first;
      cm.doc.iter(function (line) {
        for (var pos = 0;;) {
          var found = line.text.indexOf(val, pos);
          if (found == -1) { break }
          pos = found + val.length;
          newBreaks.push(Pos(lineNo, found));
        }
        lineNo++;
      });
      for (var i = newBreaks.length - 1; i >= 0; i--)
        { replaceRange(cm.doc, val, newBreaks[i], Pos(newBreaks[i].line, newBreaks[i].ch + val.length)); }
    });
    option("specialChars", /[\u0000-\u001f\u007f-\u009f\u00ad\u061c\u200b-\u200f\u2028\u2029\ufeff\ufff9-\ufffc]/g, function (cm, val, old) {
      cm.state.specialChars = new RegExp(val.source + (val.test("\t") ? "" : "|\t"), "g");
      if (old != Init) { cm.refresh(); }
    });
    option("specialCharPlaceholder", defaultSpecialCharPlaceholder, function (cm) { return cm.refresh(); }, true);
    option("electricChars", true);
    option("inputStyle", mobile ? "contenteditable" : "textarea", function () {
      throw new Error("inputStyle can not (yet) be changed in a running editor") // FIXME
    }, true);
    option("spellcheck", false, function (cm, val) { return cm.getInputField().spellcheck = val; }, true);
    option("autocorrect", false, function (cm, val) { return cm.getInputField().autocorrect = val; }, true);
    option("autocapitalize", false, function (cm, val) { return cm.getInputField().autocapitalize = val; }, true);
    option("rtlMoveVisually", !windows);
    option("wholeLineUpdateBefore", true);

    option("theme", "default", function (cm) {
      themeChanged(cm);
      updateGutters(cm);
    }, true);
    option("keyMap", "default", function (cm, val, old) {
      var next = getKeyMap(val);
      var prev = old != Init && getKeyMap(old);
      if (prev && prev.detach) { prev.detach(cm, next); }
      if (next.attach) { next.attach(cm, prev || null); }
    });
    option("extraKeys", null);
    option("configureMouse", null);

    option("lineWrapping", false, wrappingChanged, true);
    option("gutters", [], function (cm, val) {
      cm.display.gutterSpecs = getGutters(val, cm.options.lineNumbers);
      updateGutters(cm);
    }, true);
    option("fixedGutter", true, function (cm, val) {
      cm.display.gutters.style.left = val ? compensateForHScroll(cm.display) + "px" : "0";
      cm.refresh();
    }, true);
    option("coverGutterNextToScrollbar", false, function (cm) { return updateScrollbars(cm); }, true);
    option("scrollbarStyle", "native", function (cm) {
      initScrollbars(cm);
      updateScrollbars(cm);
      cm.display.scrollbars.setScrollTop(cm.doc.scrollTop);
      cm.display.scrollbars.setScrollLeft(cm.doc.scrollLeft);
    }, true);
    option("lineNumbers", false, function (cm, val) {
      cm.display.gutterSpecs = getGutters(cm.options.gutters, val);
      updateGutters(cm);
    }, true);
    option("firstLineNumber", 1, updateGutters, true);
    option("lineNumberFormatter", function (integer) { return integer; }, updateGutters, true);
    option("showCursorWhenSelecting", false, updateSelection, true);

    option("resetSelectionOnContextMenu", true);
    option("lineWiseCopyCut", true);
    option("pasteLinesPerSelection", true);
    option("selectionsMayTouch", false);

    option("readOnly", false, function (cm, val) {
      if (val == "nocursor") {
        onBlur(cm);
        cm.display.input.blur();
      }
      cm.display.input.readOnlyChanged(val);
    });

    option("screenReaderLabel", null, function (cm, val) {
      val = (val === '') ? null : val;
      cm.display.input.screenReaderLabelChanged(val);
    });

    option("disableInput", false, function (cm, val) {if (!val) { cm.display.input.reset(); }}, true);
    option("dragDrop", true, dragDropChanged);
    option("allowDropFileTypes", null);

    option("cursorBlinkRate", 530);
    option("cursorScrollMargin", 0);
    option("cursorHeight", 1, updateSelection, true);
    option("singleCursorHeightPerLine", true, updateSelection, true);
    option("workTime", 100);
    option("workDelay", 100);
    option("flattenSpans", true, resetModeState, true);
    option("addModeClass", false, resetModeState, true);
    option("pollInterval", 100);
    option("undoDepth", 200, function (cm, val) { return cm.doc.history.undoDepth = val; });
    option("historyEventDelay", 1250);
    option("viewportMargin", 10, function (cm) { return cm.refresh(); }, true);
    option("maxHighlightLength", 10000, resetModeState, true);
    option("moveInputWithCursor", true, function (cm, val) {
      if (!val) { cm.display.input.resetPosition(); }
    });

    option("tabindex", null, function (cm, val) { return cm.display.input.getField().tabIndex = val || ""; });
    option("autofocus", null);
    option("direction", "ltr", function (cm, val) { return cm.doc.setDirection(val); }, true);
    option("phrases", null);
  }

  function dragDropChanged(cm, value, old) {
    var wasOn = old && old != Init;
    if (!value != !wasOn) {
      var funcs = cm.display.dragFunctions;
      var toggle = value ? on : off;
      toggle(cm.display.scroller, "dragstart", funcs.start);
      toggle(cm.display.scroller, "dragenter", funcs.enter);
      toggle(cm.display.scroller, "dragover", funcs.over);
      toggle(cm.display.scroller, "dragleave", funcs.leave);
      toggle(cm.display.scroller, "drop", funcs.drop);
    }
  }

  function wrappingChanged(cm) {
    if (cm.options.lineWrapping) {
      addClass(cm.display.wrapper, "CodeMirror-wrap");
      cm.display.sizer.style.minWidth = "";
      cm.display.sizerWidth = null;
    } else {
      rmClass(cm.display.wrapper, "CodeMirror-wrap");
      findMaxLine(cm);
    }
    estimateLineHeights(cm);
    regChange(cm);
    clearCaches(cm);
    setTimeout(function () { return updateScrollbars(cm); }, 100);
  }

  // A CodeMirror instance represents an editor. This is the object
  // that user code is usually dealing with.

  function CodeMirror(place, options) {
    var this$1 = this;

    if (!(this instanceof CodeMirror)) { return new CodeMirror(place, options) }

    this.options = options = options ? copyObj(options) : {};
    // Determine effective options based on given values and defaults.
    copyObj(defaults, options, false);

    var doc = options.value;
    if (typeof doc == "string") { doc = new Doc(doc, options.mode, null, options.lineSeparator, options.direction); }
    else if (options.mode) { doc.modeOption = options.mode; }
    this.doc = doc;

    var input = new CodeMirror.inputStyles[options.inputStyle](this);
    var display = this.display = new Display(place, doc, input, options);
    display.wrapper.CodeMirror = this;
    themeChanged(this);
    if (options.lineWrapping)
      { this.display.wrapper.className += " CodeMirror-wrap"; }
    initScrollbars(this);

    this.state = {
      keyMaps: [],  // stores maps added by addKeyMap
      overlays: [], // highlighting overlays, as added by addOverlay
      modeGen: 0,   // bumped when mode/overlay changes, used to invalidate highlighting info
      overwrite: false,
      delayingBlurEvent: false,
      focused: false,
      suppressEdits: false, // used to disable editing during key handlers when in readOnly mode
      pasteIncoming: -1, cutIncoming: -1, // help recognize paste/cut edits in input.poll
      selectingText: false,
      draggingText: false,
      highlight: new Delayed(), // stores highlight worker timeout
      keySeq: null,  // Unfinished key sequence
      specialChars: null
    };

    if (options.autofocus && !mobile) { display.input.focus(); }

    // Override magic textarea content restore that IE sometimes does
    // on our hidden textarea on reload
    if (ie && ie_version < 11) { setTimeout(function () { return this$1.display.input.reset(true); }, 20); }

    registerEventHandlers(this);
    ensureGlobalHandlers();

    startOperation(this);
    this.curOp.forceUpdate = true;
    attachDoc(this, doc);

    if ((options.autofocus && !mobile) || this.hasFocus())
      { setTimeout(bind(onFocus, this), 20); }
    else
      { onBlur(this); }

    for (var opt in optionHandlers) { if (optionHandlers.hasOwnProperty(opt))
      { optionHandlers[opt](this, options[opt], Init); } }
    maybeUpdateLineNumberWidth(this);
    if (options.finishInit) { options.finishInit(this); }
    for (var i = 0; i < initHooks.length; ++i) { initHooks[i](this); }
    endOperation(this);
    // Suppress optimizelegibility in Webkit, since it breaks text
    // measuring on line wrapping boundaries.
    if (webkit && options.lineWrapping &&
        getComputedStyle(display.lineDiv).textRendering == "optimizelegibility")
      { display.lineDiv.style.textRendering = "auto"; }
  }

  // The default configuration options.
  CodeMirror.defaults = defaults;
  // Functions to run when options are changed.
  CodeMirror.optionHandlers = optionHandlers;

  // Attach the necessary event handlers when initializing the editor
  function registerEventHandlers(cm) {
    var d = cm.display;
    on(d.scroller, "mousedown", operation(cm, onMouseDown));
    // Older IE's will not fire a second mousedown for a double click
    if (ie && ie_version < 11)
      { on(d.scroller, "dblclick", operation(cm, function (e) {
        if (signalDOMEvent(cm, e)) { return }
        var pos = posFromMouse(cm, e);
        if (!pos || clickInGutter(cm, e) || eventInWidget(cm.display, e)) { return }
        e_preventDefault(e);
        var word = cm.findWordAt(pos);
        extendSelection(cm.doc, word.anchor, word.head);
      })); }
    else
      { on(d.scroller, "dblclick", function (e) { return signalDOMEvent(cm, e) || e_preventDefault(e); }); }
    // Some browsers fire contextmenu *after* opening the menu, at
    // which point we can't mess with it anymore. Context menu is
    // handled in onMouseDown for these browsers.
    on(d.scroller, "contextmenu", function (e) { return onContextMenu(cm, e); });
    on(d.input.getField(), "contextmenu", function (e) {
      if (!d.scroller.contains(e.target)) { onContextMenu(cm, e); }
    });

    // Used to suppress mouse event handling when a touch happens
    var touchFinished, prevTouch = {end: 0};
    function finishTouch() {
      if (d.activeTouch) {
        touchFinished = setTimeout(function () { return d.activeTouch = null; }, 1000);
        prevTouch = d.activeTouch;
        prevTouch.end = +new Date;
      }
    }
    function isMouseLikeTouchEvent(e) {
      if (e.touches.length != 1) { return false }
      var touch = e.touches[0];
      return touch.radiusX <= 1 && touch.radiusY <= 1
    }
    function farAway(touch, other) {
      if (other.left == null) { return true }
      var dx = other.left - touch.left, dy = other.top - touch.top;
      return dx * dx + dy * dy > 20 * 20
    }
    on(d.scroller, "touchstart", function (e) {
      if (!signalDOMEvent(cm, e) && !isMouseLikeTouchEvent(e) && !clickInGutter(cm, e)) {
        d.input.ensurePolled();
        clearTimeout(touchFinished);
        var now = +new Date;
        d.activeTouch = {start: now, moved: false,
                         prev: now - prevTouch.end <= 300 ? prevTouch : null};
        if (e.touches.length == 1) {
          d.activeTouch.left = e.touches[0].pageX;
          d.activeTouch.top = e.touches[0].pageY;
        }
      }
    });
    on(d.scroller, "touchmove", function () {
      if (d.activeTouch) { d.activeTouch.moved = true; }
    });
    on(d.scroller, "touchend", function (e) {
      var touch = d.activeTouch;
      if (touch && !eventInWidget(d, e) && touch.left != null &&
          !touch.moved && new Date - touch.start < 300) {
        var pos = cm.coordsChar(d.activeTouch, "page"), range;
        if (!touch.prev || farAway(touch, touch.prev)) // Single tap
          { range = new Range(pos, pos); }
        else if (!touch.prev.prev || farAway(touch, touch.prev.prev)) // Double tap
          { range = cm.findWordAt(pos); }
        else // Triple tap
          { range = new Range(Pos(pos.line, 0), clipPos(cm.doc, Pos(pos.line + 1, 0))); }
        cm.setSelection(range.anchor, range.head);
        cm.focus();
        e_preventDefault(e);
      }
      finishTouch();
    });
    on(d.scroller, "touchcancel", finishTouch);

    // Sync scrolling between fake scrollbars and real scrollable
    // area, ensure viewport is updated when scrolling.
    on(d.scroller, "scroll", function () {
      if (d.scroller.clientHeight) {
        updateScrollTop(cm, d.scroller.scrollTop);
        setScrollLeft(cm, d.scroller.scrollLeft, true);
        signal(cm, "scroll", cm);
      }
    });

    // Listen to wheel events in order to try and update the viewport on time.
    on(d.scroller, "mousewheel", function (e) { return onScrollWheel(cm, e); });
    on(d.scroller, "DOMMouseScroll", function (e) { return onScrollWheel(cm, e); });

    // Prevent wrapper from ever scrolling
    on(d.wrapper, "scroll", function () { return d.wrapper.scrollTop = d.wrapper.scrollLeft = 0; });

    d.dragFunctions = {
      enter: function (e) {if (!signalDOMEvent(cm, e)) { e_stop(e); }},
      over: function (e) {if (!signalDOMEvent(cm, e)) { onDragOver(cm, e); e_stop(e); }},
      start: function (e) { return onDragStart(cm, e); },
      drop: operation(cm, onDrop),
      leave: function (e) {if (!signalDOMEvent(cm, e)) { clearDragCursor(cm); }}
    };

    var inp = d.input.getField();
    on(inp, "keyup", function (e) { return onKeyUp.call(cm, e); });
    on(inp, "keydown", operation(cm, onKeyDown));
    on(inp, "keypress", operation(cm, onKeyPress));
    on(inp, "focus", function (e) { return onFocus(cm, e); });
    on(inp, "blur", function (e) { return onBlur(cm, e); });
  }

  var initHooks = [];
  CodeMirror.defineInitHook = function (f) { return initHooks.push(f); };

  // Indent the given line. The how parameter can be "smart",
  // "add"/null, "subtract", or "prev". When aggressive is false
  // (typically set to true for forced single-line indents), empty
  // lines are not indented, and places where the mode returns Pass
  // are left alone.
  function indentLine(cm, n, how, aggressive) {
    var doc = cm.doc, state;
    if (how == null) { how = "add"; }
    if (how == "smart") {
      // Fall back to "prev" when the mode doesn't have an indentation
      // method.
      if (!doc.mode.indent) { how = "prev"; }
      else { state = getContextBefore(cm, n).state; }
    }

    var tabSize = cm.options.tabSize;
    var line = getLine(doc, n), curSpace = countColumn(line.text, null, tabSize);
    if (line.stateAfter) { line.stateAfter = null; }
    var curSpaceString = line.text.match(/^\s*/)[0], indentation;
    if (!aggressive && !/\S/.test(line.text)) {
      indentation = 0;
      how = "not";
    } else if (how == "smart") {
      indentation = doc.mode.indent(state, line.text.slice(curSpaceString.length), line.text);
      if (indentation == Pass || indentation > 150) {
        if (!aggressive) { return }
        how = "prev";
      }
    }
    if (how == "prev") {
      if (n > doc.first) { indentation = countColumn(getLine(doc, n-1).text, null, tabSize); }
      else { indentation = 0; }
    } else if (how == "add") {
      indentation = curSpace + cm.options.indentUnit;
    } else if (how == "subtract") {
      indentation = curSpace - cm.options.indentUnit;
    } else if (typeof how == "number") {
      indentation = curSpace + how;
    }
    indentation = Math.max(0, indentation);

    var indentString = "", pos = 0;
    if (cm.options.indentWithTabs)
      { for (var i = Math.floor(indentation / tabSize); i; --i) {pos += tabSize; indentString += "\t";} }
    if (pos < indentation) { indentString += spaceStr(indentation - pos); }

    if (indentString != curSpaceString) {
      replaceRange(doc, indentString, Pos(n, 0), Pos(n, curSpaceString.length), "+input");
      line.stateAfter = null;
      return true
    } else {
      // Ensure that, if the cursor was in the whitespace at the start
      // of the line, it is moved to the end of that space.
      for (var i$1 = 0; i$1 < doc.sel.ranges.length; i$1++) {
        var range = doc.sel.ranges[i$1];
        if (range.head.line == n && range.head.ch < curSpaceString.length) {
          var pos$1 = Pos(n, curSpaceString.length);
          replaceOneSelection(doc, i$1, new Range(pos$1, pos$1));
          break
        }
      }
    }
  }

  // This will be set to a {lineWise: bool, text: [string]} object, so
  // that, when pasting, we know what kind of selections the copied
  // text was made out of.
  var lastCopied = null;

  function setLastCopied(newLastCopied) {
    lastCopied = newLastCopied;
  }

  function applyTextInput(cm, inserted, deleted, sel, origin) {
    var doc = cm.doc;
    cm.display.shift = false;
    if (!sel) { sel = doc.sel; }

    var recent = +new Date - 200;
    var paste = origin == "paste" || cm.state.pasteIncoming > recent;
    var textLines = splitLinesAuto(inserted), multiPaste = null;
    // When pasting N lines into N selections, insert one line per selection
    if (paste && sel.ranges.length > 1) {
      if (lastCopied && lastCopied.text.join("\n") == inserted) {
        if (sel.ranges.length % lastCopied.text.length == 0) {
          multiPaste = [];
          for (var i = 0; i < lastCopied.text.length; i++)
            { multiPaste.push(doc.splitLines(lastCopied.text[i])); }
        }
      } else if (textLines.length == sel.ranges.length && cm.options.pasteLinesPerSelection) {
        multiPaste = map(textLines, function (l) { return [l]; });
      }
    }

    var updateInput = cm.curOp.updateInput;
    // Normal behavior is to insert the new text into every selection
    for (var i$1 = sel.ranges.length - 1; i$1 >= 0; i$1--) {
      var range = sel.ranges[i$1];
      var from = range.from(), to = range.to();
      if (range.empty()) {
        if (deleted && deleted > 0) // Handle deletion
          { from = Pos(from.line, from.ch - deleted); }
        else if (cm.state.overwrite && !paste) // Handle overwrite
          { to = Pos(to.line, Math.min(getLine(doc, to.line).text.length, to.ch + lst(textLines).length)); }
        else if (paste && lastCopied && lastCopied.lineWise && lastCopied.text.join("\n") == inserted)
          { from = to = Pos(from.line, 0); }
      }
      var changeEvent = {from: from, to: to, text: multiPaste ? multiPaste[i$1 % multiPaste.length] : textLines,
                         origin: origin || (paste ? "paste" : cm.state.cutIncoming > recent ? "cut" : "+input")};
      makeChange(cm.doc, changeEvent);
      signalLater(cm, "inputRead", cm, changeEvent);
    }
    if (inserted && !paste)
      { triggerElectric(cm, inserted); }

    ensureCursorVisible(cm);
    if (cm.curOp.updateInput < 2) { cm.curOp.updateInput = updateInput; }
    cm.curOp.typing = true;
    cm.state.pasteIncoming = cm.state.cutIncoming = -1;
  }

  function handlePaste(e, cm) {
    var pasted = e.clipboardData && e.clipboardData.getData("Text");
    if (pasted) {
      e.preventDefault();
      if (!cm.isReadOnly() && !cm.options.disableInput)
        { runInOp(cm, function () { return applyTextInput(cm, pasted, 0, null, "paste"); }); }
      return true
    }
  }

  function triggerElectric(cm, inserted) {
    // When an 'electric' character is inserted, immediately trigger a reindent
    if (!cm.options.electricChars || !cm.options.smartIndent) { return }
    var sel = cm.doc.sel;

    for (var i = sel.ranges.length - 1; i >= 0; i--) {
      var range = sel.ranges[i];
      if (range.head.ch > 100 || (i && sel.ranges[i - 1].head.line == range.head.line)) { continue }
      var mode = cm.getModeAt(range.head);
      var indented = false;
      if (mode.electricChars) {
        for (var j = 0; j < mode.electricChars.length; j++)
          { if (inserted.indexOf(mode.electricChars.charAt(j)) > -1) {
            indented = indentLine(cm, range.head.line, "smart");
            break
          } }
      } else if (mode.electricInput) {
        if (mode.electricInput.test(getLine(cm.doc, range.head.line).text.slice(0, range.head.ch)))
          { indented = indentLine(cm, range.head.line, "smart"); }
      }
      if (indented) { signalLater(cm, "electricInput", cm, range.head.line); }
    }
  }

  function copyableRanges(cm) {
    var text = [], ranges = [];
    for (var i = 0; i < cm.doc.sel.ranges.length; i++) {
      var line = cm.doc.sel.ranges[i].head.line;
      var lineRange = {anchor: Pos(line, 0), head: Pos(line + 1, 0)};
      ranges.push(lineRange);
      text.push(cm.getRange(lineRange.anchor, lineRange.head));
    }
    return {text: text, ranges: ranges}
  }

  function disableBrowserMagic(field, spellcheck, autocorrect, autocapitalize) {
    field.setAttribute("autocorrect", autocorrect ? "" : "off");
    field.setAttribute("autocapitalize", autocapitalize ? "" : "off");
    field.setAttribute("spellcheck", !!spellcheck);
  }

  function hiddenTextarea() {
    var te = elt("textarea", null, null, "position: absolute; bottom: -1em; padding: 0; width: 1px; height: 1em; outline: none");
    var div = elt("div", [te], null, "overflow: hidden; position: relative; width: 3px; height: 0px;");
    // The textarea is kept positioned near the cursor to prevent the
    // fact that it'll be scrolled into view on input from scrolling
    // our fake cursor out of view. On webkit, when wrap=off, paste is
    // very slow. So make the area wide instead.
    if (webkit) { te.style.width = "1000px"; }
    else { te.setAttribute("wrap", "off"); }
    // If border: 0; -- iOS fails to open keyboard (issue #1287)
    if (ios) { te.style.border = "1px solid black"; }
    disableBrowserMagic(te);
    return div
  }

  // The publicly visible API. Note that methodOp(f) means
  // 'wrap f in an operation, performed on its `this` parameter'.

  // This is not the complete set of editor methods. Most of the
  // methods defined on the Doc type are also injected into
  // CodeMirror.prototype, for backwards compatibility and
  // convenience.

  function addEditorMethods(CodeMirror) {
    var optionHandlers = CodeMirror.optionHandlers;

    var helpers = CodeMirror.helpers = {};

    CodeMirror.prototype = {
      constructor: CodeMirror,
      focus: function(){window.focus(); this.display.input.focus();},

      setOption: function(option, value) {
        var options = this.options, old = options[option];
        if (options[option] == value && option != "mode") { return }
        options[option] = value;
        if (optionHandlers.hasOwnProperty(option))
          { operation(this, optionHandlers[option])(this, value, old); }
        signal(this, "optionChange", this, option);
      },

      getOption: function(option) {return this.options[option]},
      getDoc: function() {return this.doc},

      addKeyMap: function(map, bottom) {
        this.state.keyMaps[bottom ? "push" : "unshift"](getKeyMap(map));
      },
      removeKeyMap: function(map) {
        var maps = this.state.keyMaps;
        for (var i = 0; i < maps.length; ++i)
          { if (maps[i] == map || maps[i].name == map) {
            maps.splice(i, 1);
            return true
          } }
      },

      addOverlay: methodOp(function(spec, options) {
        var mode = spec.token ? spec : CodeMirror.getMode(this.options, spec);
        if (mode.startState) { throw new Error("Overlays may not be stateful.") }
        insertSorted(this.state.overlays,
                     {mode: mode, modeSpec: spec, opaque: options && options.opaque,
                      priority: (options && options.priority) || 0},
                     function (overlay) { return overlay.priority; });
        this.state.modeGen++;
        regChange(this);
      }),
      removeOverlay: methodOp(function(spec) {
        var overlays = this.state.overlays;
        for (var i = 0; i < overlays.length; ++i) {
          var cur = overlays[i].modeSpec;
          if (cur == spec || typeof spec == "string" && cur.name == spec) {
            overlays.splice(i, 1);
            this.state.modeGen++;
            regChange(this);
            return
          }
        }
      }),

      indentLine: methodOp(function(n, dir, aggressive) {
        if (typeof dir != "string" && typeof dir != "number") {
          if (dir == null) { dir = this.options.smartIndent ? "smart" : "prev"; }
          else { dir = dir ? "add" : "subtract"; }
        }
        if (isLine(this.doc, n)) { indentLine(this, n, dir, aggressive); }
      }),
      indentSelection: methodOp(function(how) {
        var ranges = this.doc.sel.ranges, end = -1;
        for (var i = 0; i < ranges.length; i++) {
          var range = ranges[i];
          if (!range.empty()) {
            var from = range.from(), to = range.to();
            var start = Math.max(end, from.line);
            end = Math.min(this.lastLine(), to.line - (to.ch ? 0 : 1)) + 1;
            for (var j = start; j < end; ++j)
              { indentLine(this, j, how); }
            var newRanges = this.doc.sel.ranges;
            if (from.ch == 0 && ranges.length == newRanges.length && newRanges[i].from().ch > 0)
              { replaceOneSelection(this.doc, i, new Range(from, newRanges[i].to()), sel_dontScroll); }
          } else if (range.head.line > end) {
            indentLine(this, range.head.line, how, true);
            end = range.head.line;
            if (i == this.doc.sel.primIndex) { ensureCursorVisible(this); }
          }
        }
      }),

      // Fetch the parser token for a given character. Useful for hacks
      // that want to inspect the mode state (say, for completion).
      getTokenAt: function(pos, precise) {
        return takeToken(this, pos, precise)
      },

      getLineTokens: function(line, precise) {
        return takeToken(this, Pos(line), precise, true)
      },

      getTokenTypeAt: function(pos) {
        pos = clipPos(this.doc, pos);
        var styles = getLineStyles(this, getLine(this.doc, pos.line));
        var before = 0, after = (styles.length - 1) / 2, ch = pos.ch;
        var type;
        if (ch == 0) { type = styles[2]; }
        else { for (;;) {
          var mid = (before + after) >> 1;
          if ((mid ? styles[mid * 2 - 1] : 0) >= ch) { after = mid; }
          else if (styles[mid * 2 + 1] < ch) { before = mid + 1; }
          else { type = styles[mid * 2 + 2]; break }
        } }
        var cut = type ? type.indexOf("overlay ") : -1;
        return cut < 0 ? type : cut == 0 ? null : type.slice(0, cut - 1)
      },

      getModeAt: function(pos) {
        var mode = this.doc.mode;
        if (!mode.innerMode) { return mode }
        return CodeMirror.innerMode(mode, this.getTokenAt(pos).state).mode
      },

      getHelper: function(pos, type) {
        return this.getHelpers(pos, type)[0]
      },

      getHelpers: function(pos, type) {
        var found = [];
        if (!helpers.hasOwnProperty(type)) { return found }
        var help = helpers[type], mode = this.getModeAt(pos);
        if (typeof mode[type] == "string") {
          if (help[mode[type]]) { found.push(help[mode[type]]); }
        } else if (mode[type]) {
          for (var i = 0; i < mode[type].length; i++) {
            var val = help[mode[type][i]];
            if (val) { found.push(val); }
          }
        } else if (mode.helperType && help[mode.helperType]) {
          found.push(help[mode.helperType]);
        } else if (help[mode.name]) {
          found.push(help[mode.name]);
        }
        for (var i$1 = 0; i$1 < help._global.length; i$1++) {
          var cur = help._global[i$1];
          if (cur.pred(mode, this) && indexOf(found, cur.val) == -1)
            { found.push(cur.val); }
        }
        return found
      },

      getStateAfter: function(line, precise) {
        var doc = this.doc;
        line = clipLine(doc, line == null ? doc.first + doc.size - 1: line);
        return getContextBefore(this, line + 1, precise).state
      },

      cursorCoords: function(start, mode) {
        var pos, range = this.doc.sel.primary();
        if (start == null) { pos = range.head; }
        else if (typeof start == "object") { pos = clipPos(this.doc, start); }
        else { pos = start ? range.from() : range.to(); }
        return cursorCoords(this, pos, mode || "page")
      },

      charCoords: function(pos, mode) {
        return charCoords(this, clipPos(this.doc, pos), mode || "page")
      },

      coordsChar: function(coords, mode) {
        coords = fromCoordSystem(this, coords, mode || "page");
        return coordsChar(this, coords.left, coords.top)
      },

      lineAtHeight: function(height, mode) {
        height = fromCoordSystem(this, {top: height, left: 0}, mode || "page").top;
        return lineAtHeight(this.doc, height + this.display.viewOffset)
      },
      heightAtLine: function(line, mode, includeWidgets) {
        var end = false, lineObj;
        if (typeof line == "number") {
          var last = this.doc.first + this.doc.size - 1;
          if (line < this.doc.first) { line = this.doc.first; }
          else if (line > last) { line = last; end = true; }
          lineObj = getLine(this.doc, line);
        } else {
          lineObj = line;
        }
        return intoCoordSystem(this, lineObj, {top: 0, left: 0}, mode || "page", includeWidgets || end).top +
          (end ? this.doc.height - heightAtLine(lineObj) : 0)
      },

      defaultTextHeight: function() { return textHeight(this.display) },
      defaultCharWidth: function() { return charWidth(this.display) },

      getViewport: function() { return {from: this.display.viewFrom, to: this.display.viewTo}},

      addWidget: function(pos, node, scroll, vert, horiz) {
        var display = this.display;
        pos = cursorCoords(this, clipPos(this.doc, pos));
        var top = pos.bottom, left = pos.left;
        node.style.position = "absolute";
        node.setAttribute("cm-ignore-events", "true");
        this.display.input.setUneditable(node);
        display.sizer.appendChild(node);
        if (vert == "over") {
          top = pos.top;
        } else if (vert == "above" || vert == "near") {
          var vspace = Math.max(display.wrapper.clientHeight, this.doc.height),
          hspace = Math.max(display.sizer.clientWidth, display.lineSpace.clientWidth);
          // Default to positioning above (if specified and possible); otherwise default to positioning below
          if ((vert == 'above' || pos.bottom + node.offsetHeight > vspace) && pos.top > node.offsetHeight)
            { top = pos.top - node.offsetHeight; }
          else if (pos.bottom + node.offsetHeight <= vspace)
            { top = pos.bottom; }
          if (left + node.offsetWidth > hspace)
            { left = hspace - node.offsetWidth; }
        }
        node.style.top = top + "px";
        node.style.left = node.style.right = "";
        if (horiz == "right") {
          left = display.sizer.clientWidth - node.offsetWidth;
          node.style.right = "0px";
        } else {
          if (horiz == "left") { left = 0; }
          else if (horiz == "middle") { left = (display.sizer.clientWidth - node.offsetWidth) / 2; }
          node.style.left = left + "px";
        }
        if (scroll)
          { scrollIntoView(this, {left: left, top: top, right: left + node.offsetWidth, bottom: top + node.offsetHeight}); }
      },

      triggerOnKeyDown: methodOp(onKeyDown),
      triggerOnKeyPress: methodOp(onKeyPress),
      triggerOnKeyUp: onKeyUp,
      triggerOnMouseDown: methodOp(onMouseDown),

      execCommand: function(cmd) {
        if (commands.hasOwnProperty(cmd))
          { return commands[cmd].call(null, this) }
      },

      triggerElectric: methodOp(function(text) { triggerElectric(this, text); }),

      findPosH: function(from, amount, unit, visually) {
        var dir = 1;
        if (amount < 0) { dir = -1; amount = -amount; }
        var cur = clipPos(this.doc, from);
        for (var i = 0; i < amount; ++i) {
          cur = findPosH(this.doc, cur, dir, unit, visually);
          if (cur.hitSide) { break }
        }
        return cur
      },

      moveH: methodOp(function(dir, unit) {
        var this$1 = this;

        this.extendSelectionsBy(function (range) {
          if (this$1.display.shift || this$1.doc.extend || range.empty())
            { return findPosH(this$1.doc, range.head, dir, unit, this$1.options.rtlMoveVisually) }
          else
            { return dir < 0 ? range.from() : range.to() }
        }, sel_move);
      }),

      deleteH: methodOp(function(dir, unit) {
        var sel = this.doc.sel, doc = this.doc;
        if (sel.somethingSelected())
          { doc.replaceSelection("", null, "+delete"); }
        else
          { deleteNearSelection(this, function (range) {
            var other = findPosH(doc, range.head, dir, unit, false);
            return dir < 0 ? {from: other, to: range.head} : {from: range.head, to: other}
          }); }
      }),

      findPosV: function(from, amount, unit, goalColumn) {
        var dir = 1, x = goalColumn;
        if (amount < 0) { dir = -1; amount = -amount; }
        var cur = clipPos(this.doc, from);
        for (var i = 0; i < amount; ++i) {
          var coords = cursorCoords(this, cur, "div");
          if (x == null) { x = coords.left; }
          else { coords.left = x; }
          cur = findPosV(this, coords, dir, unit);
          if (cur.hitSide) { break }
        }
        return cur
      },

      moveV: methodOp(function(dir, unit) {
        var this$1 = this;

        var doc = this.doc, goals = [];
        var collapse = !this.display.shift && !doc.extend && doc.sel.somethingSelected();
        doc.extendSelectionsBy(function (range) {
          if (collapse)
            { return dir < 0 ? range.from() : range.to() }
          var headPos = cursorCoords(this$1, range.head, "div");
          if (range.goalColumn != null) { headPos.left = range.goalColumn; }
          goals.push(headPos.left);
          var pos = findPosV(this$1, headPos, dir, unit);
          if (unit == "page" && range == doc.sel.primary())
            { addToScrollTop(this$1, charCoords(this$1, pos, "div").top - headPos.top); }
          return pos
        }, sel_move);
        if (goals.length) { for (var i = 0; i < doc.sel.ranges.length; i++)
          { doc.sel.ranges[i].goalColumn = goals[i]; } }
      }),

      // Find the word at the given position (as returned by coordsChar).
      findWordAt: function(pos) {
        var doc = this.doc, line = getLine(doc, pos.line).text;
        var start = pos.ch, end = pos.ch;
        if (line) {
          var helper = this.getHelper(pos, "wordChars");
          if ((pos.sticky == "before" || end == line.length) && start) { --start; } else { ++end; }
          var startChar = line.charAt(start);
          var check = isWordChar(startChar, helper)
            ? function (ch) { return isWordChar(ch, helper); }
            : /\s/.test(startChar) ? function (ch) { return /\s/.test(ch); }
            : function (ch) { return (!/\s/.test(ch) && !isWordChar(ch)); };
          while (start > 0 && check(line.charAt(start - 1))) { --start; }
          while (end < line.length && check(line.charAt(end))) { ++end; }
        }
        return new Range(Pos(pos.line, start), Pos(pos.line, end))
      },

      toggleOverwrite: function(value) {
        if (value != null && value == this.state.overwrite) { return }
        if (this.state.overwrite = !this.state.overwrite)
          { addClass(this.display.cursorDiv, "CodeMirror-overwrite"); }
        else
          { rmClass(this.display.cursorDiv, "CodeMirror-overwrite"); }

        signal(this, "overwriteToggle", this, this.state.overwrite);
      },
      hasFocus: function() { return this.display.input.getField() == activeElt() },
      isReadOnly: function() { return !!(this.options.readOnly || this.doc.cantEdit) },

      scrollTo: methodOp(function (x, y) { scrollToCoords(this, x, y); }),
      getScrollInfo: function() {
        var scroller = this.display.scroller;
        return {left: scroller.scrollLeft, top: scroller.scrollTop,
                height: scroller.scrollHeight - scrollGap(this) - this.display.barHeight,
                width: scroller.scrollWidth - scrollGap(this) - this.display.barWidth,
                clientHeight: displayHeight(this), clientWidth: displayWidth(this)}
      },

      scrollIntoView: methodOp(function(range, margin) {
        if (range == null) {
          range = {from: this.doc.sel.primary().head, to: null};
          if (margin == null) { margin = this.options.cursorScrollMargin; }
        } else if (typeof range == "number") {
          range = {from: Pos(range, 0), to: null};
        } else if (range.from == null) {
          range = {from: range, to: null};
        }
        if (!range.to) { range.to = range.from; }
        range.margin = margin || 0;

        if (range.from.line != null) {
          scrollToRange(this, range);
        } else {
          scrollToCoordsRange(this, range.from, range.to, range.margin);
        }
      }),

      setSize: methodOp(function(width, height) {
        var this$1 = this;

        var interpret = function (val) { return typeof val == "number" || /^\d+$/.test(String(val)) ? val + "px" : val; };
        if (width != null) { this.display.wrapper.style.width = interpret(width); }
        if (height != null) { this.display.wrapper.style.height = interpret(height); }
        if (this.options.lineWrapping) { clearLineMeasurementCache(this); }
        var lineNo = this.display.viewFrom;
        this.doc.iter(lineNo, this.display.viewTo, function (line) {
          if (line.widgets) { for (var i = 0; i < line.widgets.length; i++)
            { if (line.widgets[i].noHScroll) { regLineChange(this$1, lineNo, "widget"); break } } }
          ++lineNo;
        });
        this.curOp.forceUpdate = true;
        signal(this, "refresh", this);
      }),

      operation: function(f){return runInOp(this, f)},
      startOperation: function(){return startOperation(this)},
      endOperation: function(){return endOperation(this)},

      refresh: methodOp(function() {
        var oldHeight = this.display.cachedTextHeight;
        regChange(this);
        this.curOp.forceUpdate = true;
        clearCaches(this);
        scrollToCoords(this, this.doc.scrollLeft, this.doc.scrollTop);
        updateGutterSpace(this.display);
        if (oldHeight == null || Math.abs(oldHeight - textHeight(this.display)) > .5 || this.options.lineWrapping)
          { estimateLineHeights(this); }
        signal(this, "refresh", this);
      }),

      swapDoc: methodOp(function(doc) {
        var old = this.doc;
        old.cm = null;
        // Cancel the current text selection if any (#5821)
        if (this.state.selectingText) { this.state.selectingText(); }
        attachDoc(this, doc);
        clearCaches(this);
        this.display.input.reset();
        scrollToCoords(this, doc.scrollLeft, doc.scrollTop);
        this.curOp.forceScroll = true;
        signalLater(this, "swapDoc", this, old);
        return old
      }),

      phrase: function(phraseText) {
        var phrases = this.options.phrases;
        return phrases && Object.prototype.hasOwnProperty.call(phrases, phraseText) ? phrases[phraseText] : phraseText
      },

      getInputField: function(){return this.display.input.getField()},
      getWrapperElement: function(){return this.display.wrapper},
      getScrollerElement: function(){return this.display.scroller},
      getGutterElement: function(){return this.display.gutters}
    };
    eventMixin(CodeMirror);

    CodeMirror.registerHelper = function(type, name, value) {
      if (!helpers.hasOwnProperty(type)) { helpers[type] = CodeMirror[type] = {_global: []}; }
      helpers[type][name] = value;
    };
    CodeMirror.registerGlobalHelper = function(type, name, predicate, value) {
      CodeMirror.registerHelper(type, name, value);
      helpers[type]._global.push({pred: predicate, val: value});
    };
  }

  // Used for horizontal relative motion. Dir is -1 or 1 (left or
  // right), unit can be "char", "column" (like char, but doesn't
  // cross line boundaries), "word" (across next word), or "group" (to
  // the start of next group of word or non-word-non-whitespace
  // chars). The visually param controls whether, in right-to-left
  // text, direction 1 means to move towards the next index in the
  // string, or towards the character to the right of the current
  // position. The resulting position will have a hitSide=true
  // property if it reached the end of the document.
  function findPosH(doc, pos, dir, unit, visually) {
    var oldPos = pos;
    var origDir = dir;
    var lineObj = getLine(doc, pos.line);
    var lineDir = visually && doc.direction == "rtl" ? -dir : dir;
    function findNextLine() {
      var l = pos.line + lineDir;
      if (l < doc.first || l >= doc.first + doc.size) { return false }
      pos = new Pos(l, pos.ch, pos.sticky);
      return lineObj = getLine(doc, l)
    }
    function moveOnce(boundToLine) {
      var next;
      if (visually) {
        next = moveVisually(doc.cm, lineObj, pos, dir);
      } else {
        next = moveLogically(lineObj, pos, dir);
      }
      if (next == null) {
        if (!boundToLine && findNextLine())
          { pos = endOfLine(visually, doc.cm, lineObj, pos.line, lineDir); }
        else
          { return false }
      } else {
        pos = next;
      }
      return true
    }

    if (unit == "char") {
      moveOnce();
    } else if (unit == "column") {
      moveOnce(true);
    } else if (unit == "word" || unit == "group") {
      var sawType = null, group = unit == "group";
      var helper = doc.cm && doc.cm.getHelper(pos, "wordChars");
      for (var first = true;; first = false) {
        if (dir < 0 && !moveOnce(!first)) { break }
        var cur = lineObj.text.charAt(pos.ch) || "\n";
        var type = isWordChar(cur, helper) ? "w"
          : group && cur == "\n" ? "n"
          : !group || /\s/.test(cur) ? null
          : "p";
        if (group && !first && !type) { type = "s"; }
        if (sawType && sawType != type) {
          if (dir < 0) {dir = 1; moveOnce(); pos.sticky = "after";}
          break
        }

        if (type) { sawType = type; }
        if (dir > 0 && !moveOnce(!first)) { break }
      }
    }
    var result = skipAtomic(doc, pos, oldPos, origDir, true);
    if (equalCursorPos(oldPos, result)) { result.hitSide = true; }
    return result
  }

  // For relative vertical movement. Dir may be -1 or 1. Unit can be
  // "page" or "line". The resulting position will have a hitSide=true
  // property if it reached the end of the document.
  function findPosV(cm, pos, dir, unit) {
    var doc = cm.doc, x = pos.left, y;
    if (unit == "page") {
      var pageSize = Math.min(cm.display.wrapper.clientHeight, window.innerHeight || document.documentElement.clientHeight);
      var moveAmount = Math.max(pageSize - .5 * textHeight(cm.display), 3);
      y = (dir > 0 ? pos.bottom : pos.top) + dir * moveAmount;

    } else if (unit == "line") {
      y = dir > 0 ? pos.bottom + 3 : pos.top - 3;
    }
    var target;
    for (;;) {
      target = coordsChar(cm, x, y);
      if (!target.outside) { break }
      if (dir < 0 ? y <= 0 : y >= doc.height) { target.hitSide = true; break }
      y += dir * 5;
    }
    return target
  }

  // CONTENTEDITABLE INPUT STYLE

  var ContentEditableInput = function(cm) {
    this.cm = cm;
    this.lastAnchorNode = this.lastAnchorOffset = this.lastFocusNode = this.lastFocusOffset = null;
    this.polling = new Delayed();
    this.composing = null;
    this.gracePeriod = false;
    this.readDOMTimeout = null;
  };

  ContentEditableInput.prototype.init = function (display) {
      var this$1 = this;

    var input = this, cm = input.cm;
    var div = input.div = display.lineDiv;
    disableBrowserMagic(div, cm.options.spellcheck, cm.options.autocorrect, cm.options.autocapitalize);

    on(div, "paste", function (e) {
      if (signalDOMEvent(cm, e) || handlePaste(e, cm)) { return }
      // IE doesn't fire input events, so we schedule a read for the pasted content in this way
      if (ie_version <= 11) { setTimeout(operation(cm, function () { return this$1.updateFromDOM(); }), 20); }
    });

    on(div, "compositionstart", function (e) {
      this$1.composing = {data: e.data, done: false};
    });
    on(div, "compositionupdate", function (e) {
      if (!this$1.composing) { this$1.composing = {data: e.data, done: false}; }
    });
    on(div, "compositionend", function (e) {
      if (this$1.composing) {
        if (e.data != this$1.composing.data) { this$1.readFromDOMSoon(); }
        this$1.composing.done = true;
      }
    });

    on(div, "touchstart", function () { return input.forceCompositionEnd(); });

    on(div, "input", function () {
      if (!this$1.composing) { this$1.readFromDOMSoon(); }
    });

    function onCopyCut(e) {
      if (signalDOMEvent(cm, e)) { return }
      if (cm.somethingSelected()) {
        setLastCopied({lineWise: false, text: cm.getSelections()});
        if (e.type == "cut") { cm.replaceSelection("", null, "cut"); }
      } else if (!cm.options.lineWiseCopyCut) {
        return
      } else {
        var ranges = copyableRanges(cm);
        setLastCopied({lineWise: true, text: ranges.text});
        if (e.type == "cut") {
          cm.operation(function () {
            cm.setSelections(ranges.ranges, 0, sel_dontScroll);
            cm.replaceSelection("", null, "cut");
          });
        }
      }
      if (e.clipboardData) {
        e.clipboardData.clearData();
        var content = lastCopied.text.join("\n");
        // iOS exposes the clipboard API, but seems to discard content inserted into it
        e.clipboardData.setData("Text", content);
        if (e.clipboardData.getData("Text") == content) {
          e.preventDefault();
          return
        }
      }
      // Old-fashioned briefly-focus-a-textarea hack
      var kludge = hiddenTextarea(), te = kludge.firstChild;
      cm.display.lineSpace.insertBefore(kludge, cm.display.lineSpace.firstChild);
      te.value = lastCopied.text.join("\n");
      var hadFocus = document.activeElement;
      selectInput(te);
      setTimeout(function () {
        cm.display.lineSpace.removeChild(kludge);
        hadFocus.focus();
        if (hadFocus == div) { input.showPrimarySelection(); }
      }, 50);
    }
    on(div, "copy", onCopyCut);
    on(div, "cut", onCopyCut);
  };

  ContentEditableInput.prototype.screenReaderLabelChanged = function (label) {
    // Label for screenreaders, accessibility
    if(label) {
      this.div.setAttribute('aria-label', label);
    } else {
      this.div.removeAttribute('aria-label');
    }
  };

  ContentEditableInput.prototype.prepareSelection = function () {
    var result = prepareSelection(this.cm, false);
    result.focus = document.activeElement == this.div;
    return result
  };

  ContentEditableInput.prototype.showSelection = function (info, takeFocus) {
    if (!info || !this.cm.display.view.length) { return }
    if (info.focus || takeFocus) { this.showPrimarySelection(); }
    this.showMultipleSelections(info);
  };

  ContentEditableInput.prototype.getSelection = function () {
    return this.cm.display.wrapper.ownerDocument.getSelection()
  };

  ContentEditableInput.prototype.showPrimarySelection = function () {
    var sel = this.getSelection(), cm = this.cm, prim = cm.doc.sel.primary();
    var from = prim.from(), to = prim.to();

    if (cm.display.viewTo == cm.display.viewFrom || from.line >= cm.display.viewTo || to.line < cm.display.viewFrom) {
      sel.removeAllRanges();
      return
    }

    var curAnchor = domToPos(cm, sel.anchorNode, sel.anchorOffset);
    var curFocus = domToPos(cm, sel.focusNode, sel.focusOffset);
    if (curAnchor && !curAnchor.bad && curFocus && !curFocus.bad &&
        cmp(minPos(curAnchor, curFocus), from) == 0 &&
        cmp(maxPos(curAnchor, curFocus), to) == 0)
      { return }

    var view = cm.display.view;
    var start = (from.line >= cm.display.viewFrom && posToDOM(cm, from)) ||
        {node: view[0].measure.map[2], offset: 0};
    var end = to.line < cm.display.viewTo && posToDOM(cm, to);
    if (!end) {
      var measure = view[view.length - 1].measure;
      var map = measure.maps ? measure.maps[measure.maps.length - 1] : measure.map;
      end = {node: map[map.length - 1], offset: map[map.length - 2] - map[map.length - 3]};
    }

    if (!start || !end) {
      sel.removeAllRanges();
      return
    }

    var old = sel.rangeCount && sel.getRangeAt(0), rng;
    try { rng = range(start.node, start.offset, end.offset, end.node); }
    catch(e) {} // Our model of the DOM might be outdated, in which case the range we try to set can be impossible
    if (rng) {
      if (!gecko && cm.state.focused) {
        sel.collapse(start.node, start.offset);
        if (!rng.collapsed) {
          sel.removeAllRanges();
          sel.addRange(rng);
        }
      } else {
        sel.removeAllRanges();
        sel.addRange(rng);
      }
      if (old && sel.anchorNode == null) { sel.addRange(old); }
      else if (gecko) { this.startGracePeriod(); }
    }
    this.rememberSelection();
  };

  ContentEditableInput.prototype.startGracePeriod = function () {
      var this$1 = this;

    clearTimeout(this.gracePeriod);
    this.gracePeriod = setTimeout(function () {
      this$1.gracePeriod = false;
      if (this$1.selectionChanged())
        { this$1.cm.operation(function () { return this$1.cm.curOp.selectionChanged = true; }); }
    }, 20);
  };

  ContentEditableInput.prototype.showMultipleSelections = function (info) {
    removeChildrenAndAdd(this.cm.display.cursorDiv, info.cursors);
    removeChildrenAndAdd(this.cm.display.selectionDiv, info.selection);
  };

  ContentEditableInput.prototype.rememberSelection = function () {
    var sel = this.getSelection();
    this.lastAnchorNode = sel.anchorNode; this.lastAnchorOffset = sel.anchorOffset;
    this.lastFocusNode = sel.focusNode; this.lastFocusOffset = sel.focusOffset;
  };

  ContentEditableInput.prototype.selectionInEditor = function () {
    var sel = this.getSelection();
    if (!sel.rangeCount) { return false }
    var node = sel.getRangeAt(0).commonAncestorContainer;
    return contains(this.div, node)
  };

  ContentEditableInput.prototype.focus = function () {
    if (this.cm.options.readOnly != "nocursor") {
      if (!this.selectionInEditor() || document.activeElement != this.div)
        { this.showSelection(this.prepareSelection(), true); }
      this.div.focus();
    }
  };
  ContentEditableInput.prototype.blur = function () { this.div.blur(); };
  ContentEditableInput.prototype.getField = function () { return this.div };

  ContentEditableInput.prototype.supportsTouch = function () { return true };

  ContentEditableInput.prototype.receivedFocus = function () {
    var input = this;
    if (this.selectionInEditor())
      { this.pollSelection(); }
    else
      { runInOp(this.cm, function () { return input.cm.curOp.selectionChanged = true; }); }

    function poll() {
      if (input.cm.state.focused) {
        input.pollSelection();
        input.polling.set(input.cm.options.pollInterval, poll);
      }
    }
    this.polling.set(this.cm.options.pollInterval, poll);
  };

  ContentEditableInput.prototype.selectionChanged = function () {
    var sel = this.getSelection();
    return sel.anchorNode != this.lastAnchorNode || sel.anchorOffset != this.lastAnchorOffset ||
      sel.focusNode != this.lastFocusNode || sel.focusOffset != this.lastFocusOffset
  };

  ContentEditableInput.prototype.pollSelection = function () {
    if (this.readDOMTimeout != null || this.gracePeriod || !this.selectionChanged()) { return }
    var sel = this.getSelection(), cm = this.cm;
    // On Android Chrome (version 56, at least), backspacing into an
    // uneditable block element will put the cursor in that element,
    // and then, because it's not editable, hide the virtual keyboard.
    // Because Android doesn't allow us to actually detect backspace
    // presses in a sane way, this code checks for when that happens
    // and simulates a backspace press in this case.
    if (android && chrome && this.cm.display.gutterSpecs.length && isInGutter(sel.anchorNode)) {
      this.cm.triggerOnKeyDown({type: "keydown", keyCode: 8, preventDefault: Math.abs});
      this.blur();
      this.focus();
      return
    }
    if (this.composing) { return }
    this.rememberSelection();
    var anchor = domToPos(cm, sel.anchorNode, sel.anchorOffset);
    var head = domToPos(cm, sel.focusNode, sel.focusOffset);
    if (anchor && head) { runInOp(cm, function () {
      setSelection(cm.doc, simpleSelection(anchor, head), sel_dontScroll);
      if (anchor.bad || head.bad) { cm.curOp.selectionChanged = true; }
    }); }
  };

  ContentEditableInput.prototype.pollContent = function () {
    if (this.readDOMTimeout != null) {
      clearTimeout(this.readDOMTimeout);
      this.readDOMTimeout = null;
    }

    var cm = this.cm, display = cm.display, sel = cm.doc.sel.primary();
    var from = sel.from(), to = sel.to();
    if (from.ch == 0 && from.line > cm.firstLine())
      { from = Pos(from.line - 1, getLine(cm.doc, from.line - 1).length); }
    if (to.ch == getLine(cm.doc, to.line).text.length && to.line < cm.lastLine())
      { to = Pos(to.line + 1, 0); }
    if (from.line < display.viewFrom || to.line > display.viewTo - 1) { return false }

    var fromIndex, fromLine, fromNode;
    if (from.line == display.viewFrom || (fromIndex = findViewIndex(cm, from.line)) == 0) {
      fromLine = lineNo(display.view[0].line);
      fromNode = display.view[0].node;
    } else {
      fromLine = lineNo(display.view[fromIndex].line);
      fromNode = display.view[fromIndex - 1].node.nextSibling;
    }
    var toIndex = findViewIndex(cm, to.line);
    var toLine, toNode;
    if (toIndex == display.view.length - 1) {
      toLine = display.viewTo - 1;
      toNode = display.lineDiv.lastChild;
    } else {
      toLine = lineNo(display.view[toIndex + 1].line) - 1;
      toNode = display.view[toIndex + 1].node.previousSibling;
    }

    if (!fromNode) { return false }
    var newText = cm.doc.splitLines(domTextBetween(cm, fromNode, toNode, fromLine, toLine));
    var oldText = getBetween(cm.doc, Pos(fromLine, 0), Pos(toLine, getLine(cm.doc, toLine).text.length));
    while (newText.length > 1 && oldText.length > 1) {
      if (lst(newText) == lst(oldText)) { newText.pop(); oldText.pop(); toLine--; }
      else if (newText[0] == oldText[0]) { newText.shift(); oldText.shift(); fromLine++; }
      else { break }
    }

    var cutFront = 0, cutEnd = 0;
    var newTop = newText[0], oldTop = oldText[0], maxCutFront = Math.min(newTop.length, oldTop.length);
    while (cutFront < maxCutFront && newTop.charCodeAt(cutFront) == oldTop.charCodeAt(cutFront))
      { ++cutFront; }
    var newBot = lst(newText), oldBot = lst(oldText);
    var maxCutEnd = Math.min(newBot.length - (newText.length == 1 ? cutFront : 0),
                             oldBot.length - (oldText.length == 1 ? cutFront : 0));
    while (cutEnd < maxCutEnd &&
           newBot.charCodeAt(newBot.length - cutEnd - 1) == oldBot.charCodeAt(oldBot.length - cutEnd - 1))
      { ++cutEnd; }
    // Try to move start of change to start of selection if ambiguous
    if (newText.length == 1 && oldText.length == 1 && fromLine == from.line) {
      while (cutFront && cutFront > from.ch &&
             newBot.charCodeAt(newBot.length - cutEnd - 1) == oldBot.charCodeAt(oldBot.length - cutEnd - 1)) {
        cutFront--;
        cutEnd++;
      }
    }

    newText[newText.length - 1] = newBot.slice(0, newBot.length - cutEnd).replace(/^\u200b+/, "");
    newText[0] = newText[0].slice(cutFront).replace(/\u200b+$/, "");

    var chFrom = Pos(fromLine, cutFront);
    var chTo = Pos(toLine, oldText.length ? lst(oldText).length - cutEnd : 0);
    if (newText.length > 1 || newText[0] || cmp(chFrom, chTo)) {
      replaceRange(cm.doc, newText, chFrom, chTo, "+input");
      return true
    }
  };

  ContentEditableInput.prototype.ensurePolled = function () {
    this.forceCompositionEnd();
  };
  ContentEditableInput.prototype.reset = function () {
    this.forceCompositionEnd();
  };
  ContentEditableInput.prototype.forceCompositionEnd = function () {
    if (!this.composing) { return }
    clearTimeout(this.readDOMTimeout);
    this.composing = null;
    this.updateFromDOM();
    this.div.blur();
    this.div.focus();
  };
  ContentEditableInput.prototype.readFromDOMSoon = function () {
      var this$1 = this;

    if (this.readDOMTimeout != null) { return }
    this.readDOMTimeout = setTimeout(function () {
      this$1.readDOMTimeout = null;
      if (this$1.composing) {
        if (this$1.composing.done) { this$1.composing = null; }
        else { return }
      }
      this$1.updateFromDOM();
    }, 80);
  };

  ContentEditableInput.prototype.updateFromDOM = function () {
      var this$1 = this;

    if (this.cm.isReadOnly() || !this.pollContent())
      { runInOp(this.cm, function () { return regChange(this$1.cm); }); }
  };

  ContentEditableInput.prototype.setUneditable = function (node) {
    node.contentEditable = "false";
  };

  ContentEditableInput.prototype.onKeyPress = function (e) {
    if (e.charCode == 0 || this.composing) { return }
    e.preventDefault();
    if (!this.cm.isReadOnly())
      { operation(this.cm, applyTextInput)(this.cm, String.fromCharCode(e.charCode == null ? e.keyCode : e.charCode), 0); }
  };

  ContentEditableInput.prototype.readOnlyChanged = function (val) {
    this.div.contentEditable = String(val != "nocursor");
  };

  ContentEditableInput.prototype.onContextMenu = function () {};
  ContentEditableInput.prototype.resetPosition = function () {};

  ContentEditableInput.prototype.needsContentAttribute = true;

  function posToDOM(cm, pos) {
    var view = findViewForLine(cm, pos.line);
    if (!view || view.hidden) { return null }
    var line = getLine(cm.doc, pos.line);
    var info = mapFromLineView(view, line, pos.line);

    var order = getOrder(line, cm.doc.direction), side = "left";
    if (order) {
      var partPos = getBidiPartAt(order, pos.ch);
      side = partPos % 2 ? "right" : "left";
    }
    var result = nodeAndOffsetInLineMap(info.map, pos.ch, side);
    result.offset = result.collapse == "right" ? result.end : result.start;
    return result
  }

  function isInGutter(node) {
    for (var scan = node; scan; scan = scan.parentNode)
      { if (/CodeMirror-gutter-wrapper/.test(scan.className)) { return true } }
    return false
  }

  function badPos(pos, bad) { if (bad) { pos.bad = true; } return pos }

  function domTextBetween(cm, from, to, fromLine, toLine) {
    var text = "", closing = false, lineSep = cm.doc.lineSeparator(), extraLinebreak = false;
    function recognizeMarker(id) { return function (marker) { return marker.id == id; } }
    function close() {
      if (closing) {
        text += lineSep;
        if (extraLinebreak) { text += lineSep; }
        closing = extraLinebreak = false;
      }
    }
    function addText(str) {
      if (str) {
        close();
        text += str;
      }
    }
    function walk(node) {
      if (node.nodeType == 1) {
        var cmText = node.getAttribute("cm-text");
        if (cmText) {
          addText(cmText);
          return
        }
        var markerID = node.getAttribute("cm-marker"), range;
        if (markerID) {
          var found = cm.findMarks(Pos(fromLine, 0), Pos(toLine + 1, 0), recognizeMarker(+markerID));
          if (found.length && (range = found[0].find(0)))
            { addText(getBetween(cm.doc, range.from, range.to).join(lineSep)); }
          return
        }
        if (node.getAttribute("contenteditable") == "false") { return }
        var isBlock = /^(pre|div|p|li|table|br)$/i.test(node.nodeName);
        if (!/^br$/i.test(node.nodeName) && node.textContent.length == 0) { return }

        if (isBlock) { close(); }
        for (var i = 0; i < node.childNodes.length; i++)
          { walk(node.childNodes[i]); }

        if (/^(pre|p)$/i.test(node.nodeName)) { extraLinebreak = true; }
        if (isBlock) { closing = true; }
      } else if (node.nodeType == 3) {
        addText(node.nodeValue.replace(/\u200b/g, "").replace(/\u00a0/g, " "));
      }
    }
    for (;;) {
      walk(from);
      if (from == to) { break }
      from = from.nextSibling;
      extraLinebreak = false;
    }
    return text
  }

  function domToPos(cm, node, offset) {
    var lineNode;
    if (node == cm.display.lineDiv) {
      lineNode = cm.display.lineDiv.childNodes[offset];
      if (!lineNode) { return badPos(cm.clipPos(Pos(cm.display.viewTo - 1)), true) }
      node = null; offset = 0;
    } else {
      for (lineNode = node;; lineNode = lineNode.parentNode) {
        if (!lineNode || lineNode == cm.display.lineDiv) { return null }
        if (lineNode.parentNode && lineNode.parentNode == cm.display.lineDiv) { break }
      }
    }
    for (var i = 0; i < cm.display.view.length; i++) {
      var lineView = cm.display.view[i];
      if (lineView.node == lineNode)
        { return locateNodeInLineView(lineView, node, offset) }
    }
  }

  function locateNodeInLineView(lineView, node, offset) {
    var wrapper = lineView.text.firstChild, bad = false;
    if (!node || !contains(wrapper, node)) { return badPos(Pos(lineNo(lineView.line), 0), true) }
    if (node == wrapper) {
      bad = true;
      node = wrapper.childNodes[offset];
      offset = 0;
      if (!node) {
        var line = lineView.rest ? lst(lineView.rest) : lineView.line;
        return badPos(Pos(lineNo(line), line.text.length), bad)
      }
    }

    var textNode = node.nodeType == 3 ? node : null, topNode = node;
    if (!textNode && node.childNodes.length == 1 && node.firstChild.nodeType == 3) {
      textNode = node.firstChild;
      if (offset) { offset = textNode.nodeValue.length; }
    }
    while (topNode.parentNode != wrapper) { topNode = topNode.parentNode; }
    var measure = lineView.measure, maps = measure.maps;

    function find(textNode, topNode, offset) {
      for (var i = -1; i < (maps ? maps.length : 0); i++) {
        var map = i < 0 ? measure.map : maps[i];
        for (var j = 0; j < map.length; j += 3) {
          var curNode = map[j + 2];
          if (curNode == textNode || curNode == topNode) {
            var line = lineNo(i < 0 ? lineView.line : lineView.rest[i]);
            var ch = map[j] + offset;
            if (offset < 0 || curNode != textNode) { ch = map[j + (offset ? 1 : 0)]; }
            return Pos(line, ch)
          }
        }
      }
    }
    var found = find(textNode, topNode, offset);
    if (found) { return badPos(found, bad) }

    // FIXME this is all really shaky. might handle the few cases it needs to handle, but likely to cause problems
    for (var after = topNode.nextSibling, dist = textNode ? textNode.nodeValue.length - offset : 0; after; after = after.nextSibling) {
      found = find(after, after.firstChild, 0);
      if (found)
        { return badPos(Pos(found.line, found.ch - dist), bad) }
      else
        { dist += after.textContent.length; }
    }
    for (var before = topNode.previousSibling, dist$1 = offset; before; before = before.previousSibling) {
      found = find(before, before.firstChild, -1);
      if (found)
        { return badPos(Pos(found.line, found.ch + dist$1), bad) }
      else
        { dist$1 += before.textContent.length; }
    }
  }

  // TEXTAREA INPUT STYLE

  var TextareaInput = function(cm) {
    this.cm = cm;
    // See input.poll and input.reset
    this.prevInput = "";

    // Flag that indicates whether we expect input to appear real soon
    // now (after some event like 'keypress' or 'input') and are
    // polling intensively.
    this.pollingFast = false;
    // Self-resetting timeout for the poller
    this.polling = new Delayed();
    // Used to work around IE issue with selection being forgotten when focus moves away from textarea
    this.hasSelection = false;
    this.composing = null;
  };

  TextareaInput.prototype.init = function (display) {
      var this$1 = this;

    var input = this, cm = this.cm;
    this.createField(display);
    var te = this.textarea;

    display.wrapper.insertBefore(this.wrapper, display.wrapper.firstChild);

    // Needed to hide big blue blinking cursor on Mobile Safari (doesn't seem to work in iOS 8 anymore)
    if (ios) { te.style.width = "0px"; }

    on(te, "input", function () {
      if (ie && ie_version >= 9 && this$1.hasSelection) { this$1.hasSelection = null; }
      input.poll();
    });

    on(te, "paste", function (e) {
      if (signalDOMEvent(cm, e) || handlePaste(e, cm)) { return }

      cm.state.pasteIncoming = +new Date;
      input.fastPoll();
    });

    function prepareCopyCut(e) {
      if (signalDOMEvent(cm, e)) { return }
      if (cm.somethingSelected()) {
        setLastCopied({lineWise: false, text: cm.getSelections()});
      } else if (!cm.options.lineWiseCopyCut) {
        return
      } else {
        var ranges = copyableRanges(cm);
        setLastCopied({lineWise: true, text: ranges.text});
        if (e.type == "cut") {
          cm.setSelections(ranges.ranges, null, sel_dontScroll);
        } else {
          input.prevInput = "";
          te.value = ranges.text.join("\n");
          selectInput(te);
        }
      }
      if (e.type == "cut") { cm.state.cutIncoming = +new Date; }
    }
    on(te, "cut", prepareCopyCut);
    on(te, "copy", prepareCopyCut);

    on(display.scroller, "paste", function (e) {
      if (eventInWidget(display, e) || signalDOMEvent(cm, e)) { return }
      if (!te.dispatchEvent) {
        cm.state.pasteIncoming = +new Date;
        input.focus();
        return
      }

      // Pass the `paste` event to the textarea so it's handled by its event listener.
      var event = new Event("paste");
      event.clipboardData = e.clipboardData;
      te.dispatchEvent(event);
    });

    // Prevent normal selection in the editor (we handle our own)
    on(display.lineSpace, "selectstart", function (e) {
      if (!eventInWidget(display, e)) { e_preventDefault(e); }
    });

    on(te, "compositionstart", function () {
      var start = cm.getCursor("from");
      if (input.composing) { input.composing.range.clear(); }
      input.composing = {
        start: start,
        range: cm.markText(start, cm.getCursor("to"), {className: "CodeMirror-composing"})
      };
    });
    on(te, "compositionend", function () {
      if (input.composing) {
        input.poll();
        input.composing.range.clear();
        input.composing = null;
      }
    });
  };

  TextareaInput.prototype.createField = function (_display) {
    // Wraps and hides input textarea
    this.wrapper = hiddenTextarea();
    // The semihidden textarea that is focused when the editor is
    // focused, and receives input.
    this.textarea = this.wrapper.firstChild;
  };

  TextareaInput.prototype.screenReaderLabelChanged = function (label) {
    // Label for screenreaders, accessibility
    if(label) {
      this.textarea.setAttribute('aria-label', label);
    } else {
      this.textarea.removeAttribute('aria-label');
    }
  };

  TextareaInput.prototype.prepareSelection = function () {
    // Redraw the selection and/or cursor
    var cm = this.cm, display = cm.display, doc = cm.doc;
    var result = prepareSelection(cm);

    // Move the hidden textarea near the cursor to prevent scrolling artifacts
    if (cm.options.moveInputWithCursor) {
      var headPos = cursorCoords(cm, doc.sel.primary().head, "div");
      var wrapOff = display.wrapper.getBoundingClientRect(), lineOff = display.lineDiv.getBoundingClientRect();
      result.teTop = Math.max(0, Math.min(display.wrapper.clientHeight - 10,
                                          headPos.top + lineOff.top - wrapOff.top));
      result.teLeft = Math.max(0, Math.min(display.wrapper.clientWidth - 10,
                                           headPos.left + lineOff.left - wrapOff.left));
    }

    return result
  };

  TextareaInput.prototype.showSelection = function (drawn) {
    var cm = this.cm, display = cm.display;
    removeChildrenAndAdd(display.cursorDiv, drawn.cursors);
    removeChildrenAndAdd(display.selectionDiv, drawn.selection);
    if (drawn.teTop != null) {
      this.wrapper.style.top = drawn.teTop + "px";
      this.wrapper.style.left = drawn.teLeft + "px";
    }
  };

  // Reset the input to correspond to the selection (or to be empty,
  // when not typing and nothing is selected)
  TextareaInput.prototype.reset = function (typing) {
    if (this.contextMenuPending || this.composing) { return }
    var cm = this.cm;
    if (cm.somethingSelected()) {
      this.prevInput = "";
      var content = cm.getSelection();
      this.textarea.value = content;
      if (cm.state.focused) { selectInput(this.textarea); }
      if (ie && ie_version >= 9) { this.hasSelection = content; }
    } else if (!typing) {
      this.prevInput = this.textarea.value = "";
      if (ie && ie_version >= 9) { this.hasSelection = null; }
    }
  };

  TextareaInput.prototype.getField = function () { return this.textarea };

  TextareaInput.prototype.supportsTouch = function () { return false };

  TextareaInput.prototype.focus = function () {
    if (this.cm.options.readOnly != "nocursor" && (!mobile || activeElt() != this.textarea)) {
      try { this.textarea.focus(); }
      catch (e) {} // IE8 will throw if the textarea is display: none or not in DOM
    }
  };

  TextareaInput.prototype.blur = function () { this.textarea.blur(); };

  TextareaInput.prototype.resetPosition = function () {
    this.wrapper.style.top = this.wrapper.style.left = 0;
  };

  TextareaInput.prototype.receivedFocus = function () { this.slowPoll(); };

  // Poll for input changes, using the normal rate of polling. This
  // runs as long as the editor is focused.
  TextareaInput.prototype.slowPoll = function () {
      var this$1 = this;

    if (this.pollingFast) { return }
    this.polling.set(this.cm.options.pollInterval, function () {
      this$1.poll();
      if (this$1.cm.state.focused) { this$1.slowPoll(); }
    });
  };

  // When an event has just come in that is likely to add or change
  // something in the input textarea, we poll faster, to ensure that
  // the change appears on the screen quickly.
  TextareaInput.prototype.fastPoll = function () {
    var missed = false, input = this;
    input.pollingFast = true;
    function p() {
      var changed = input.poll();
      if (!changed && !missed) {missed = true; input.polling.set(60, p);}
      else {input.pollingFast = false; input.slowPoll();}
    }
    input.polling.set(20, p);
  };

  // Read input from the textarea, and update the document to match.
  // When something is selected, it is present in the textarea, and
  // selected (unless it is huge, in which case a placeholder is
  // used). When nothing is selected, the cursor sits after previously
  // seen text (can be empty), which is stored in prevInput (we must
  // not reset the textarea when typing, because that breaks IME).
  TextareaInput.prototype.poll = function () {
      var this$1 = this;

    var cm = this.cm, input = this.textarea, prevInput = this.prevInput;
    // Since this is called a *lot*, try to bail out as cheaply as
    // possible when it is clear that nothing happened. hasSelection
    // will be the case when there is a lot of text in the textarea,
    // in which case reading its value would be expensive.
    if (this.contextMenuPending || !cm.state.focused ||
        (hasSelection(input) && !prevInput && !this.composing) ||
        cm.isReadOnly() || cm.options.disableInput || cm.state.keySeq)
      { return false }

    var text = input.value;
    // If nothing changed, bail.
    if (text == prevInput && !cm.somethingSelected()) { return false }
    // Work around nonsensical selection resetting in IE9/10, and
    // inexplicable appearance of private area unicode characters on
    // some key combos in Mac (#2689).
    if (ie && ie_version >= 9 && this.hasSelection === text ||
        mac && /[\uf700-\uf7ff]/.test(text)) {
      cm.display.input.reset();
      return false
    }

    if (cm.doc.sel == cm.display.selForContextMenu) {
      var first = text.charCodeAt(0);
      if (first == 0x200b && !prevInput) { prevInput = "\u200b"; }
      if (first == 0x21da) { this.reset(); return this.cm.execCommand("undo") }
    }
    // Find the part of the input that is actually new
    var same = 0, l = Math.min(prevInput.length, text.length);
    while (same < l && prevInput.charCodeAt(same) == text.charCodeAt(same)) { ++same; }

    runInOp(cm, function () {
      applyTextInput(cm, text.slice(same), prevInput.length - same,
                     null, this$1.composing ? "*compose" : null);

      // Don't leave long text in the textarea, since it makes further polling slow
      if (text.length > 1000 || text.indexOf("\n") > -1) { input.value = this$1.prevInput = ""; }
      else { this$1.prevInput = text; }

      if (this$1.composing) {
        this$1.composing.range.clear();
        this$1.composing.range = cm.markText(this$1.composing.start, cm.getCursor("to"),
                                           {className: "CodeMirror-composing"});
      }
    });
    return true
  };

  TextareaInput.prototype.ensurePolled = function () {
    if (this.pollingFast && this.poll()) { this.pollingFast = false; }
  };

  TextareaInput.prototype.onKeyPress = function () {
    if (ie && ie_version >= 9) { this.hasSelection = null; }
    this.fastPoll();
  };

  TextareaInput.prototype.onContextMenu = function (e) {
    var input = this, cm = input.cm, display = cm.display, te = input.textarea;
    if (input.contextMenuPending) { input.contextMenuPending(); }
    var pos = posFromMouse(cm, e), scrollPos = display.scroller.scrollTop;
    if (!pos || presto) { return } // Opera is difficult.

    // Reset the current text selection only if the click is done outside of the selection
    // and 'resetSelectionOnContextMenu' option is true.
    var reset = cm.options.resetSelectionOnContextMenu;
    if (reset && cm.doc.sel.contains(pos) == -1)
      { operation(cm, setSelection)(cm.doc, simpleSelection(pos), sel_dontScroll); }

    var oldCSS = te.style.cssText, oldWrapperCSS = input.wrapper.style.cssText;
    var wrapperBox = input.wrapper.offsetParent.getBoundingClientRect();
    input.wrapper.style.cssText = "position: static";
    te.style.cssText = "position: absolute; width: 30px; height: 30px;\n      top: " + (e.clientY - wrapperBox.top - 5) + "px; left: " + (e.clientX - wrapperBox.left - 5) + "px;\n      z-index: 1000; background: " + (ie ? "rgba(255, 255, 255, .05)" : "transparent") + ";\n      outline: none; border-width: 0; outline: none; overflow: hidden; opacity: .05; filter: alpha(opacity=5);";
    var oldScrollY;
    if (webkit) { oldScrollY = window.scrollY; } // Work around Chrome issue (#2712)
    display.input.focus();
    if (webkit) { window.scrollTo(null, oldScrollY); }
    display.input.reset();
    // Adds "Select all" to context menu in FF
    if (!cm.somethingSelected()) { te.value = input.prevInput = " "; }
    input.contextMenuPending = rehide;
    display.selForContextMenu = cm.doc.sel;
    clearTimeout(display.detectingSelectAll);

    // Select-all will be greyed out if there's nothing to select, so
    // this adds a zero-width space so that we can later check whether
    // it got selected.
    function prepareSelectAllHack() {
      if (te.selectionStart != null) {
        var selected = cm.somethingSelected();
        var extval = "\u200b" + (selected ? te.value : "");
        te.value = "\u21da"; // Used to catch context-menu undo
        te.value = extval;
        input.prevInput = selected ? "" : "\u200b";
        te.selectionStart = 1; te.selectionEnd = extval.length;
        // Re-set this, in case some other handler touched the
        // selection in the meantime.
        display.selForContextMenu = cm.doc.sel;
      }
    }
    function rehide() {
      if (input.contextMenuPending != rehide) { return }
      input.contextMenuPending = false;
      input.wrapper.style.cssText = oldWrapperCSS;
      te.style.cssText = oldCSS;
      if (ie && ie_version < 9) { display.scrollbars.setScrollTop(display.scroller.scrollTop = scrollPos); }

      // Try to detect the user choosing select-all
      if (te.selectionStart != null) {
        if (!ie || (ie && ie_version < 9)) { prepareSelectAllHack(); }
        var i = 0, poll = function () {
          if (display.selForContextMenu == cm.doc.sel && te.selectionStart == 0 &&
              te.selectionEnd > 0 && input.prevInput == "\u200b") {
            operation(cm, selectAll)(cm);
          } else if (i++ < 10) {
            display.detectingSelectAll = setTimeout(poll, 500);
          } else {
            display.selForContextMenu = null;
            display.input.reset();
          }
        };
        display.detectingSelectAll = setTimeout(poll, 200);
      }
    }

    if (ie && ie_version >= 9) { prepareSelectAllHack(); }
    if (captureRightClick) {
      e_stop(e);
      var mouseup = function () {
        off(window, "mouseup", mouseup);
        setTimeout(rehide, 20);
      };
      on(window, "mouseup", mouseup);
    } else {
      setTimeout(rehide, 50);
    }
  };

  TextareaInput.prototype.readOnlyChanged = function (val) {
    if (!val) { this.reset(); }
    this.textarea.disabled = val == "nocursor";
  };

  TextareaInput.prototype.setUneditable = function () {};

  TextareaInput.prototype.needsContentAttribute = false;

  function fromTextArea(textarea, options) {
    options = options ? copyObj(options) : {};
    options.value = textarea.value;
    if (!options.tabindex && textarea.tabIndex)
      { options.tabindex = textarea.tabIndex; }
    if (!options.placeholder && textarea.placeholder)
      { options.placeholder = textarea.placeholder; }
    // Set autofocus to true if this textarea is focused, or if it has
    // autofocus and no other element is focused.
    if (options.autofocus == null) {
      var hasFocus = activeElt();
      options.autofocus = hasFocus == textarea ||
        textarea.getAttribute("autofocus") != null && hasFocus == document.body;
    }

    function save() {textarea.value = cm.getValue();}

    var realSubmit;
    if (textarea.form) {
      on(textarea.form, "submit", save);
      // Deplorable hack to make the submit method do the right thing.
      if (!options.leaveSubmitMethodAlone) {
        var form = textarea.form;
        realSubmit = form.submit;
        try {
          var wrappedSubmit = form.submit = function () {
            save();
            form.submit = realSubmit;
            form.submit();
            form.submit = wrappedSubmit;
          };
        } catch(e) {}
      }
    }

    options.finishInit = function (cm) {
      cm.save = save;
      cm.getTextArea = function () { return textarea; };
      cm.toTextArea = function () {
        cm.toTextArea = isNaN; // Prevent this from being ran twice
        save();
        textarea.parentNode.removeChild(cm.getWrapperElement());
        textarea.style.display = "";
        if (textarea.form) {
          off(textarea.form, "submit", save);
          if (!options.leaveSubmitMethodAlone && typeof textarea.form.submit == "function")
            { textarea.form.submit = realSubmit; }
        }
      };
    };

    textarea.style.display = "none";
    var cm = CodeMirror(function (node) { return textarea.parentNode.insertBefore(node, textarea.nextSibling); },
      options);
    return cm
  }

  function addLegacyProps(CodeMirror) {
    CodeMirror.off = off;
    CodeMirror.on = on;
    CodeMirror.wheelEventPixels = wheelEventPixels;
    CodeMirror.Doc = Doc;
    CodeMirror.splitLines = splitLinesAuto;
    CodeMirror.countColumn = countColumn;
    CodeMirror.findColumn = findColumn;
    CodeMirror.isWordChar = isWordCharBasic;
    CodeMirror.Pass = Pass;
    CodeMirror.signal = signal;
    CodeMirror.Line = Line;
    CodeMirror.changeEnd = changeEnd;
    CodeMirror.scrollbarModel = scrollbarModel;
    CodeMirror.Pos = Pos;
    CodeMirror.cmpPos = cmp;
    CodeMirror.modes = modes;
    CodeMirror.mimeModes = mimeModes;
    CodeMirror.resolveMode = resolveMode;
    CodeMirror.getMode = getMode;
    CodeMirror.modeExtensions = modeExtensions;
    CodeMirror.extendMode = extendMode;
    CodeMirror.copyState = copyState;
    CodeMirror.startState = startState;
    CodeMirror.innerMode = innerMode;
    CodeMirror.commands = commands;
    CodeMirror.keyMap = keyMap;
    CodeMirror.keyName = keyName;
    CodeMirror.isModifierKey = isModifierKey;
    CodeMirror.lookupKey = lookupKey;
    CodeMirror.normalizeKeyMap = normalizeKeyMap;
    CodeMirror.StringStream = StringStream;
    CodeMirror.SharedTextMarker = SharedTextMarker;
    CodeMirror.TextMarker = TextMarker;
    CodeMirror.LineWidget = LineWidget;
    CodeMirror.e_preventDefault = e_preventDefault;
    CodeMirror.e_stopPropagation = e_stopPropagation;
    CodeMirror.e_stop = e_stop;
    CodeMirror.addClass = addClass;
    CodeMirror.contains = contains;
    CodeMirror.rmClass = rmClass;
    CodeMirror.keyNames = keyNames;
  }

  // EDITOR CONSTRUCTOR

  defineOptions(CodeMirror);

  addEditorMethods(CodeMirror);

  // Set up methods on CodeMirror's prototype to redirect to the editor's document.
  var dontDelegate = "iter insert remove copy getEditor constructor".split(" ");
  for (var prop in Doc.prototype) { if (Doc.prototype.hasOwnProperty(prop) && indexOf(dontDelegate, prop) < 0)
    { CodeMirror.prototype[prop] = (function(method) {
      return function() {return method.apply(this.doc, arguments)}
    })(Doc.prototype[prop]); } }

  eventMixin(Doc);
  CodeMirror.inputStyles = {"textarea": TextareaInput, "contenteditable": ContentEditableInput};

  // Extra arguments are stored as the mode's dependencies, which is
  // used by (legacy) mechanisms like loadmode.js to automatically
  // load a mode. (Preferred mechanism is the require/define calls.)
  CodeMirror.defineMode = function(name/*, mode, …*/) {
    if (!CodeMirror.defaults.mode && name != "null") { CodeMirror.defaults.mode = name; }
    defineMode.apply(this, arguments);
  };

  CodeMirror.defineMIME = defineMIME;

  // Minimal default mode.
  CodeMirror.defineMode("null", function () { return ({token: function (stream) { return stream.skipToEnd(); }}); });
  CodeMirror.defineMIME("text/plain", "null");

  // EXTENSIONS

  CodeMirror.defineExtension = function (name, func) {
    CodeMirror.prototype[name] = func;
  };
  CodeMirror.defineDocExtension = function (name, func) {
    Doc.prototype[name] = func;
  };

  CodeMirror.fromTextArea = fromTextArea;

  addLegacyProps(CodeMirror);

  CodeMirror.version = "5.53.2";

  return CodeMirror;

})));


/***/ }),

/***/ "./src/$$_lazy_route_resource lazy recursive":
/*!**********************************************************!*\
  !*** ./src/$$_lazy_route_resource lazy namespace object ***!
  \**********************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

function webpackEmptyAsyncContext(req) {
	// Here Promise.resolve().then() is used instead of new Promise() to prevent
	// uncaught exception popping up in devtools
	return Promise.resolve().then(function() {
		var e = new Error("Cannot find module '" + req + "'");
		e.code = 'MODULE_NOT_FOUND';
		throw e;
	});
}
webpackEmptyAsyncContext.keys = function() { return []; };
webpackEmptyAsyncContext.resolve = webpackEmptyAsyncContext;
module.exports = webpackEmptyAsyncContext;
webpackEmptyAsyncContext.id = "./src/$$_lazy_route_resource lazy recursive";

/***/ }),

/***/ "./src/app/alu.ts":
/*!************************!*\
  !*** ./src/app/alu.ts ***!
  \************************/
/*! exports provided: ALUErrorType, ALUError, ALUOperationType, ALUOperation, ArithmeticLogicUnit */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ALUErrorType", function() { return ALUErrorType; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ALUError", function() { return ALUError; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ALUOperationType", function() { return ALUOperationType; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ALUOperation", function() { return ALUOperation; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ArithmeticLogicUnit", function() { return ArithmeticLogicUnit; });
/* harmony import */ var _utils__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./utils */ "./src/app/utils.ts");

var ALUErrorType;
(function (ALUErrorType) {
    ALUErrorType[ALUErrorType["DIVISION_BY_ZERO"] = 0] = "DIVISION_BY_ZERO";
})(ALUErrorType || (ALUErrorType = {}));
var ALUError = /** @class */ (function () {
    function ALUError(type, message) {
        this.type = type;
        this.message = message;
    }
    return ALUError;
}());

var ALUOperationType;
(function (ALUOperationType) {
    ALUOperationType[ALUOperationType["ADD"] = 0] = "ADD";
    ALUOperationType[ALUOperationType["ADDB"] = 1] = "ADDB";
    ALUOperationType[ALUOperationType["SUB"] = 2] = "SUB";
    ALUOperationType[ALUOperationType["SUBB"] = 3] = "SUBB";
    ALUOperationType[ALUOperationType["MUL"] = 4] = "MUL";
    ALUOperationType[ALUOperationType["MULB"] = 5] = "MULB";
    ALUOperationType[ALUOperationType["DIV"] = 6] = "DIV";
    ALUOperationType[ALUOperationType["DIVB"] = 7] = "DIVB";
    ALUOperationType[ALUOperationType["AND"] = 8] = "AND";
    ALUOperationType[ALUOperationType["ANDB"] = 9] = "ANDB";
    ALUOperationType[ALUOperationType["OR"] = 10] = "OR";
    ALUOperationType[ALUOperationType["ORB"] = 11] = "ORB";
    ALUOperationType[ALUOperationType["XOR"] = 12] = "XOR";
    ALUOperationType[ALUOperationType["XORB"] = 13] = "XORB";
    ALUOperationType[ALUOperationType["NOT"] = 14] = "NOT";
    ALUOperationType[ALUOperationType["NOTB"] = 15] = "NOTB";
    ALUOperationType[ALUOperationType["SHL"] = 16] = "SHL";
    ALUOperationType[ALUOperationType["SHLB"] = 17] = "SHLB";
    ALUOperationType[ALUOperationType["SHR"] = 18] = "SHR";
    ALUOperationType[ALUOperationType["SHRB"] = 19] = "SHRB";
})(ALUOperationType || (ALUOperationType = {}));
var ALUOperation = /** @class */ (function () {
    function ALUOperation(operationType, data) {
        this.operationType = operationType;
        this.data = data;
    }
    ALUOperation.prototype.toString = function () {
        var ret, params;
        switch (this.operationType) {
            case ALUOperationType.ADD:
                params = this.data;
                ret = "ALU: 16-bits addition (0x" + _utils__WEBPACK_IMPORTED_MODULE_0__["Utils"].pad(params.summand1, 16, 4) + " + " +
                    ("0x" + _utils__WEBPACK_IMPORTED_MODULE_0__["Utils"].pad(params.summand2, 16, 4) + ") = ") +
                    ("0x" + _utils__WEBPACK_IMPORTED_MODULE_0__["Utils"].pad(params.result, 16, 4) + ", C = " + params.carryFlag + ", Z = " + params.zeroFlag);
                break;
            case ALUOperationType.ADDB:
                params = this.data;
                ret = "ALU: 8-bits addition (0x" + _utils__WEBPACK_IMPORTED_MODULE_0__["Utils"].pad(params.summand1, 16, 2) + " + " +
                    ("0x" + _utils__WEBPACK_IMPORTED_MODULE_0__["Utils"].pad(params.summand2, 16, 2) + ") = ") +
                    ("0x" + _utils__WEBPACK_IMPORTED_MODULE_0__["Utils"].pad(params.result, 16, 2) + ", C = " + params.carryFlag + ", Z = " + params.zeroFlag);
                break;
            case ALUOperationType.SUB:
                params = this.data;
                ret = "ALU: 16-bits substraction (0x" + _utils__WEBPACK_IMPORTED_MODULE_0__["Utils"].pad(params.minuend, 16, 4) + " - " +
                    ("0x" + _utils__WEBPACK_IMPORTED_MODULE_0__["Utils"].pad(params.subtrahend, 16, 4) + ") = ") +
                    ("0x" + _utils__WEBPACK_IMPORTED_MODULE_0__["Utils"].pad(params.result, 16, 4) + ", C = " + params.carryFlag + ", Z = " + params.zeroFlag);
                break;
            case ALUOperationType.SUBB:
                params = this.data;
                ret = "ALU: 8-bits substraction (0x" + _utils__WEBPACK_IMPORTED_MODULE_0__["Utils"].pad(params.minuend, 16, 2) + " - " +
                    ("0x" + _utils__WEBPACK_IMPORTED_MODULE_0__["Utils"].pad(params.subtrahend, 16, 2) + ") = ") +
                    ("0x" + _utils__WEBPACK_IMPORTED_MODULE_0__["Utils"].pad(params.result, 16, 4) + ", C = " + params.carryFlag + ", Z = " + params.zeroFlag);
                break;
            case ALUOperationType.MUL:
                params = this.data;
                ret = "ALU: 16-bits multiplication (0x" + _utils__WEBPACK_IMPORTED_MODULE_0__["Utils"].pad(params.multiplicand, 16, 4) + " * " +
                    ("0x" + _utils__WEBPACK_IMPORTED_MODULE_0__["Utils"].pad(params.multiplier, 16, 4) + ") = ") +
                    ("0x" + _utils__WEBPACK_IMPORTED_MODULE_0__["Utils"].pad(params.result, 16, 4) + ", C = " + params.carryFlag + ", Z = " + params.zeroFlag);
                break;
            case ALUOperationType.MULB:
                params = this.data;
                ret = "ALU: 8-bits multiplication (0x" + _utils__WEBPACK_IMPORTED_MODULE_0__["Utils"].pad(params.multiplicand, 16, 2) + " * " +
                    ("0x" + _utils__WEBPACK_IMPORTED_MODULE_0__["Utils"].pad(params.multiplier, 16, 2) + ") = ") +
                    ("0x" + _utils__WEBPACK_IMPORTED_MODULE_0__["Utils"].pad(params.result, 16, 2) + ", C = " + params.carryFlag + ", Z = " + params.zeroFlag);
                break;
            case ALUOperationType.DIV:
                params = this.data;
                ret = "ALU: 16-bits integer division (0x" + _utils__WEBPACK_IMPORTED_MODULE_0__["Utils"].pad(params.dividend, 16, 4) + " * " +
                    ("0x" + _utils__WEBPACK_IMPORTED_MODULE_0__["Utils"].pad(params.divisor, 16, 4) + ") = ") +
                    ("0x" + _utils__WEBPACK_IMPORTED_MODULE_0__["Utils"].pad(params.result, 16, 4) + ", C = " + params.carryFlag + ", Z = " + params.zeroFlag);
                break;
            case ALUOperationType.DIVB:
                params = this.data;
                ret = "ALU: 8-bits integer division (0x" + _utils__WEBPACK_IMPORTED_MODULE_0__["Utils"].pad(params.dividend, 16, 2) + " * " +
                    ("0x" + _utils__WEBPACK_IMPORTED_MODULE_0__["Utils"].pad(params.divisor, 16, 2) + ") = ") +
                    ("0x" + _utils__WEBPACK_IMPORTED_MODULE_0__["Utils"].pad(params.result, 16, 2) + ", C = " + params.carryFlag + ", Z = " + params.zeroFlag);
                break;
            case ALUOperationType.AND:
                params = this.data;
                ret = "ALU: 16-bits bitwise AND (0x" + _utils__WEBPACK_IMPORTED_MODULE_0__["Utils"].pad(params.operand1, 16, 4) + " & " +
                    ("0x" + _utils__WEBPACK_IMPORTED_MODULE_0__["Utils"].pad(params.operand2, 16, 4) + ") = ") +
                    ("0x" + _utils__WEBPACK_IMPORTED_MODULE_0__["Utils"].pad(params.result, 16, 4) + ", C = " + params.carryFlag + ", Z = " + params.zeroFlag);
                break;
            case ALUOperationType.ANDB:
                params = this.data;
                ret = "ALU: 8-bits bitwise AND (0x" + _utils__WEBPACK_IMPORTED_MODULE_0__["Utils"].pad(params.operand1, 16, 2) + " & " +
                    ("0x" + _utils__WEBPACK_IMPORTED_MODULE_0__["Utils"].pad(params.operand2, 16, 2) + ") = ") +
                    ("0x" + _utils__WEBPACK_IMPORTED_MODULE_0__["Utils"].pad(params.result, 16, 2) + ", C = " + params.carryFlag + ", Z = " + params.zeroFlag);
                break;
            case ALUOperationType.OR:
                params = this.data;
                ret = "ALU: 16-bits bitwise OR (0x" + _utils__WEBPACK_IMPORTED_MODULE_0__["Utils"].pad(params.operand1, 16, 4) + " | " +
                    ("0x" + _utils__WEBPACK_IMPORTED_MODULE_0__["Utils"].pad(params.operand2, 16, 4) + ") = ") +
                    ("0x" + _utils__WEBPACK_IMPORTED_MODULE_0__["Utils"].pad(params.result, 16, 4) + ", C = " + params.carryFlag + ", Z = " + params.zeroFlag);
                break;
            case ALUOperationType.ORB:
                params = this.data;
                ret = "ALU: 8-bits bitwise OR (0x" + _utils__WEBPACK_IMPORTED_MODULE_0__["Utils"].pad(params.operand1, 16, 2) + " | " +
                    ("0x" + _utils__WEBPACK_IMPORTED_MODULE_0__["Utils"].pad(params.operand2, 16, 2) + ") = ") +
                    ("0x" + _utils__WEBPACK_IMPORTED_MODULE_0__["Utils"].pad(params.result, 16, 2) + ", C = " + params.carryFlag + ", Z = " + params.zeroFlag);
                break;
            case ALUOperationType.XOR:
                params = this.data;
                ret = "ALU: 16-bits bitwise XOR (0x" + _utils__WEBPACK_IMPORTED_MODULE_0__["Utils"].pad(params.operand1, 16, 4) + " ^ " +
                    ("0x" + _utils__WEBPACK_IMPORTED_MODULE_0__["Utils"].pad(params.operand2, 16, 4) + ") = ") +
                    ("0x" + _utils__WEBPACK_IMPORTED_MODULE_0__["Utils"].pad(params.result, 16, 4) + ", C = " + params.carryFlag + ", Z = " + params.zeroFlag);
                break;
            case ALUOperationType.XORB:
                params = this.data;
                ret = "ALU: 8-bits bitwise XOR (0x" + _utils__WEBPACK_IMPORTED_MODULE_0__["Utils"].pad(params.operand1, 16, 2) + " ^ " +
                    ("0x" + _utils__WEBPACK_IMPORTED_MODULE_0__["Utils"].pad(params.operand2, 16, 2) + ") = ") +
                    ("0x" + _utils__WEBPACK_IMPORTED_MODULE_0__["Utils"].pad(params.result, 16, 2) + ", C = " + params.carryFlag + ", Z = " + params.zeroFlag);
                break;
            case ALUOperationType.NOT:
                params = this.data;
                ret = "ALU: 16-bits bitwise NOT (~0x" + _utils__WEBPACK_IMPORTED_MODULE_0__["Utils"].pad(params.operand, 16, 4) + ") = " +
                    ("0x" + _utils__WEBPACK_IMPORTED_MODULE_0__["Utils"].pad(params.result, 16, 4) + ", C = ") +
                    (params.carryFlag + ", Z = " + params.zeroFlag);
                break;
            case ALUOperationType.NOTB:
                params = this.data;
                ret = "ALU: 8-bits bitwise NOT (~0x" + _utils__WEBPACK_IMPORTED_MODULE_0__["Utils"].pad(params.operand, 16, 2) + ") = " +
                    ("0x" + _utils__WEBPACK_IMPORTED_MODULE_0__["Utils"].pad(params.result, 16, 2) + ", C = ") +
                    (params.carryFlag + ", Z = " + params.zeroFlag);
                break;
            case ALUOperationType.SHL:
                params = this.data;
                ret = "ALU: 16-bits bitshift left (0x" + _utils__WEBPACK_IMPORTED_MODULE_0__["Utils"].pad(params.operand, 16, 4) + " << " +
                    ("0x" + _utils__WEBPACK_IMPORTED_MODULE_0__["Utils"].pad(params.places, 16, 4) + ") = ") +
                    ("0x" + _utils__WEBPACK_IMPORTED_MODULE_0__["Utils"].pad(params.result, 16, 4) + ", C = " + params.carryFlag + ", Z = " + params.zeroFlag);
                break;
            case ALUOperationType.SHLB:
                params = this.data;
                ret = "ALU: 8-bits bitshift left (0x" + _utils__WEBPACK_IMPORTED_MODULE_0__["Utils"].pad(params.operand, 16, 2) + " << " +
                    ("0x" + _utils__WEBPACK_IMPORTED_MODULE_0__["Utils"].pad(params.places, 16, 2) + ") = ") +
                    ("0x" + _utils__WEBPACK_IMPORTED_MODULE_0__["Utils"].pad(params.result, 16, 2) + ", C = " + params.carryFlag + ", Z = " + params.zeroFlag);
                break;
            case ALUOperationType.SHR:
                params = this.data;
                ret = "ALU: 16-bits bitshift right (0x" + _utils__WEBPACK_IMPORTED_MODULE_0__["Utils"].pad(params.operand, 16, 4) + " >> " +
                    ("0x" + _utils__WEBPACK_IMPORTED_MODULE_0__["Utils"].pad(params.places, 16, 4) + ") = ") +
                    ("0x" + _utils__WEBPACK_IMPORTED_MODULE_0__["Utils"].pad(params.result, 16, 4) + ", C = " + params.carryFlag + ", Z = " + params.zeroFlag);
                break;
            case ALUOperationType.SHRB:
                params = this.data;
                ret = "ALU: 8-bits bitshift right (0x" + _utils__WEBPACK_IMPORTED_MODULE_0__["Utils"].pad(params.operand, 16, 2) + " >> " +
                    ("0x" + _utils__WEBPACK_IMPORTED_MODULE_0__["Utils"].pad(params.places, 16, 2) + ") = ") +
                    ("0x" + _utils__WEBPACK_IMPORTED_MODULE_0__["Utils"].pad(params.result, 16, 2) + ", C = " + params.carryFlag + ", Z = " + params.zeroFlag);
                break;
            default:
                break;
        }
        return ret;
    };
    return ALUOperation;
}());

var ArithmeticLogicUnit = /** @class */ (function () {
    function ArithmeticLogicUnit(SR, publishALUOperation) {
        this.SR = SR;
        this.publishALUOperation = publishALUOperation;
    }
    ArithmeticLogicUnit.check8bitsOperation = function (value) {
        var carry, zero;
        if (value >= 256) {
            carry = 1;
            value = value % 256;
        }
        else if (value < 0) {
            carry = 1;
            value = 256 - (-value) % 256;
        }
        else {
            carry = 0;
        }
        if (value === 0) {
            zero = 1;
        }
        else {
            zero = 0;
        }
        return { result: value, carryFlag: carry, zeroFlag: zero };
    };
    ArithmeticLogicUnit.check16bitsOperation = function (value) {
        var carry, zero;
        if (value >= 65536) {
            carry = 1;
            value = value % 65536;
        }
        else if (value < 0) {
            carry = 1;
            value = 65536 - (-value) % 65536;
        }
        else {
            carry = 0;
        }
        if (value === 0) {
            zero = 1;
        }
        else {
            zero = 0;
        }
        return { result: value, carryFlag: carry, zeroFlag: zero };
    };
    ArithmeticLogicUnit.prototype.publishAddition = function (operationType, summand1, summand2, result, carryFlag, zeroFlag) {
        if (this.publishALUOperation) {
            var parameters = {
                summand1: summand1,
                summand2: summand2,
                result: result,
                carryFlag: carryFlag,
                zeroFlag: zeroFlag
            };
            this.publishALUOperation(new ALUOperation(operationType, parameters));
        }
    };
    ArithmeticLogicUnit.prototype.publishSubstraction = function (operationType, minuend, subtrahend, result, carryFlag, zeroFlag) {
        if (this.publishALUOperation) {
            var parameters = {
                minuend: minuend,
                subtrahend: subtrahend,
                result: result,
                carryFlag: carryFlag,
                zeroFlag: zeroFlag
            };
            this.publishALUOperation(new ALUOperation(operationType, parameters));
        }
    };
    ArithmeticLogicUnit.prototype.publishMultiplication = function (operationType, multiplicand, multiplier, result, carryFlag, zeroFlag) {
        if (this.publishALUOperation) {
            var parameters = {
                multiplicand: multiplicand,
                multiplier: multiplier,
                result: result,
                carryFlag: carryFlag,
                zeroFlag: zeroFlag
            };
            this.publishALUOperation(new ALUOperation(operationType, parameters));
        }
    };
    ArithmeticLogicUnit.prototype.publishDivision = function (operationType, dividend, divisor, result, carryFlag, zeroFlag) {
        if (this.publishALUOperation) {
            var parameters = {
                dividend: dividend,
                divisor: divisor,
                result: result,
                carryFlag: carryFlag,
                zeroFlag: zeroFlag
            };
            this.publishALUOperation(new ALUOperation(operationType, parameters));
        }
    };
    ArithmeticLogicUnit.prototype.publishBitwiseOp = function (operationType, operand1, operand2, result, carryFlag, zeroFlag) {
        if (this.publishALUOperation) {
            var parameters = {
                operand1: operand1,
                operand2: operand2,
                result: result,
                carryFlag: carryFlag,
                zeroFlag: zeroFlag
            };
            this.publishALUOperation(new ALUOperation(operationType, parameters));
        }
    };
    ArithmeticLogicUnit.prototype.publishBitwiseNegation = function (operationType, operand, result, carryFlag, zeroFlag) {
        if (this.publishALUOperation) {
            var parameters = {
                operand: operand,
                result: result,
                carryFlag: carryFlag,
                zeroFlag: zeroFlag
            };
            this.publishALUOperation(new ALUOperation(operationType, parameters));
        }
    };
    ArithmeticLogicUnit.prototype.publishBitshiftOp = function (operationType, operand, places, result, carryFlag, zeroFlag) {
        if (this.publishALUOperation) {
            var parameters = {
                operand: operand,
                places: places,
                result: result,
                carryFlag: carryFlag,
                zeroFlag: zeroFlag
            };
            this.publishALUOperation(new ALUOperation(operationType, parameters));
        }
    };
    ArithmeticLogicUnit.prototype.performAddition16Bits = function (summand1, summand2) {
        var ret = ArithmeticLogicUnit.check16bitsOperation(summand1 + summand2);
        this.publishAddition(ALUOperationType.ADD, summand1, summand2, ret.result, ret.carryFlag, ret.zeroFlag);
        this.SR.carry = ret.carryFlag;
        this.SR.zero = ret.zeroFlag;
        return ret.result;
    };
    ArithmeticLogicUnit.prototype.performAddition8Bits = function (summand1, summand2) {
        var ret = ArithmeticLogicUnit.check8bitsOperation(summand1 + summand2);
        this.publishAddition(ALUOperationType.ADDB, summand1, summand2, ret.result, ret.carryFlag, ret.zeroFlag);
        this.SR.carry = ret.carryFlag;
        this.SR.zero = ret.zeroFlag;
        return ret.result;
    };
    ArithmeticLogicUnit.prototype.performSubstraction16Bits = function (minuend, subtrahend) {
        var ret = ArithmeticLogicUnit.check16bitsOperation(minuend - subtrahend);
        this.publishSubstraction(ALUOperationType.SUB, minuend, subtrahend, ret.result, ret.carryFlag, ret.zeroFlag);
        this.SR.carry = ret.carryFlag;
        this.SR.zero = ret.zeroFlag;
        return ret.result;
    };
    ArithmeticLogicUnit.prototype.performSubstraction8Bits = function (minuend, subtrahend) {
        var ret = ArithmeticLogicUnit.check8bitsOperation(minuend - subtrahend);
        this.publishSubstraction(ALUOperationType.SUBB, minuend, subtrahend, ret.result, ret.carryFlag, ret.zeroFlag);
        this.SR.carry = ret.carryFlag;
        this.SR.zero = ret.zeroFlag;
        return ret.result;
    };
    ArithmeticLogicUnit.prototype.performMultiplication16Bits = function (multiplicand, multiplier) {
        var ret = ArithmeticLogicUnit.check16bitsOperation(multiplicand * multiplier);
        this.publishMultiplication(ALUOperationType.MUL, multiplicand, multiplier, ret.result, ret.carryFlag, ret.zeroFlag);
        this.SR.carry = ret.carryFlag;
        this.SR.zero = ret.zeroFlag;
        return ret.result;
    };
    ArithmeticLogicUnit.prototype.performMultiplication8Bits = function (multiplicand, multiplier) {
        var ret = ArithmeticLogicUnit.check8bitsOperation(multiplicand * multiplier);
        this.publishMultiplication(ALUOperationType.MULB, multiplicand, multiplier, ret.result, ret.carryFlag, ret.zeroFlag);
        this.SR.carry = ret.carryFlag;
        this.SR.zero = ret.zeroFlag;
        return ret.result;
    };
    ArithmeticLogicUnit.prototype.performDivision16Bits = function (dividend, divisor) {
        if (divisor === 0) {
            throw new ALUError(ALUErrorType.DIVISION_BY_ZERO, "Divide by zero error");
        }
        var ret = ArithmeticLogicUnit.check16bitsOperation(Math.floor(dividend / divisor));
        this.publishDivision(ALUOperationType.DIV, dividend, divisor, ret.result, ret.carryFlag, ret.zeroFlag);
        this.SR.carry = ret.carryFlag;
        this.SR.zero = ret.zeroFlag;
        return ret.result;
    };
    ArithmeticLogicUnit.prototype.performDivision8Bits = function (dividend, divisor) {
        if (divisor === 0) {
            throw new ALUError(ALUErrorType.DIVISION_BY_ZERO, "Divide by zero error");
        }
        var ret = ArithmeticLogicUnit.check8bitsOperation(Math.floor(dividend / divisor));
        this.publishDivision(ALUOperationType.DIVB, dividend, divisor, ret.result, ret.carryFlag, ret.zeroFlag);
        this.SR.carry = ret.carryFlag;
        this.SR.zero = ret.zeroFlag;
        return ret.result;
    };
    ArithmeticLogicUnit.prototype.performBitwiseAND16Bits = function (operand1, operand2) {
        var ret = ArithmeticLogicUnit.check16bitsOperation(operand1 & operand2);
        this.publishBitwiseOp(ALUOperationType.AND, operand1, operand2, ret.result, ret.carryFlag, ret.zeroFlag);
        this.SR.carry = ret.carryFlag;
        this.SR.zero = ret.zeroFlag;
        return ret.result;
    };
    ArithmeticLogicUnit.prototype.performBitwiseAND8Bits = function (operand1, operand2) {
        var ret = ArithmeticLogicUnit.check8bitsOperation(operand1 & operand2);
        this.publishBitwiseOp(ALUOperationType.ORB, operand1, operand2, ret.result, ret.carryFlag, ret.zeroFlag);
        this.SR.carry = ret.carryFlag;
        this.SR.zero = ret.zeroFlag;
        return ret.result;
    };
    ArithmeticLogicUnit.prototype.performBitwiseOR16Bits = function (operand1, operand2) {
        var ret = ArithmeticLogicUnit.check16bitsOperation(operand1 | operand2);
        this.publishBitwiseOp(ALUOperationType.OR, operand1, operand2, ret.result, ret.carryFlag, ret.zeroFlag);
        this.SR.carry = ret.carryFlag;
        this.SR.zero = ret.zeroFlag;
        return ret.result;
    };
    ArithmeticLogicUnit.prototype.performBitwiseOR8Bits = function (operand1, operand2) {
        var ret = ArithmeticLogicUnit.check8bitsOperation(operand1 | operand2);
        this.publishBitwiseOp(ALUOperationType.ORB, operand1, operand2, ret.result, ret.carryFlag, ret.zeroFlag);
        this.SR.carry = ret.carryFlag;
        this.SR.zero = ret.zeroFlag;
        return ret.result;
    };
    ArithmeticLogicUnit.prototype.performBitwiseXOR16Bits = function (operand1, operand2) {
        var ret = ArithmeticLogicUnit.check16bitsOperation(operand1 ^ operand2);
        this.publishBitwiseOp(ALUOperationType.XOR, operand1, operand2, ret.result, ret.carryFlag, ret.zeroFlag);
        this.SR.carry = ret.carryFlag;
        this.SR.zero = ret.zeroFlag;
        return ret.result;
    };
    ArithmeticLogicUnit.prototype.performBitwiseXOR8Bits = function (operand1, operand2) {
        var ret = ArithmeticLogicUnit.check8bitsOperation(operand1 ^ operand2);
        this.publishBitwiseOp(ALUOperationType.XORB, operand1, operand2, ret.result, ret.carryFlag, ret.zeroFlag);
        this.SR.carry = ret.carryFlag;
        this.SR.zero = ret.zeroFlag;
        return ret.result;
    };
    ArithmeticLogicUnit.prototype.performBitwiseNOT16Bits = function (operand) {
        var ret = ArithmeticLogicUnit.check16bitsOperation(~operand);
        this.publishBitwiseNegation(ALUOperationType.NOT, operand, ret.result, ret.carryFlag, ret.zeroFlag);
        this.SR.carry = ret.carryFlag;
        this.SR.zero = ret.zeroFlag;
        return ret.result;
    };
    ArithmeticLogicUnit.prototype.performBitwiseNOT8Bits = function (operand) {
        var ret = ArithmeticLogicUnit.check8bitsOperation(~operand);
        this.publishBitwiseNegation(ALUOperationType.NOTB, operand, ret.result, ret.carryFlag, ret.zeroFlag);
        this.SR.carry = ret.carryFlag;
        this.SR.zero = ret.zeroFlag;
        return ret.result;
    };
    ArithmeticLogicUnit.prototype.performBitshiftLeft16Bits = function (operand, places) {
        var ret = ArithmeticLogicUnit.check16bitsOperation(operand << places);
        this.publishBitshiftOp(ALUOperationType.SHL, operand, places, ret.result, ret.carryFlag, ret.zeroFlag);
        this.SR.carry = ret.carryFlag;
        this.SR.zero = ret.zeroFlag;
        return ret.result;
    };
    ArithmeticLogicUnit.prototype.performBitshiftLeft8Bits = function (operand, places) {
        var ret = ArithmeticLogicUnit.check8bitsOperation(operand << places);
        this.publishBitshiftOp(ALUOperationType.SHLB, operand, places, ret.result, ret.carryFlag, ret.zeroFlag);
        this.SR.carry = ret.carryFlag;
        this.SR.zero = ret.zeroFlag;
        return ret.result;
    };
    ArithmeticLogicUnit.prototype.performBitshiftRight16Bits = function (operand, places) {
        var ret = ArithmeticLogicUnit.check16bitsOperation(operand >>> places);
        this.publishBitshiftOp(ALUOperationType.SHR, operand, places, ret.result, ret.carryFlag, ret.zeroFlag);
        this.SR.carry = ret.carryFlag;
        this.SR.zero = ret.zeroFlag;
        return ret.result;
    };
    ArithmeticLogicUnit.prototype.performBitshiftRight8Bits = function (operand, places) {
        var ret = ArithmeticLogicUnit.check8bitsOperation(operand >>> places);
        this.publishBitshiftOp(ALUOperationType.SHRB, operand, places, ret.result, ret.carryFlag, ret.zeroFlag);
        this.SR.carry = ret.carryFlag;
        this.SR.zero = ret.zeroFlag;
        return ret.result;
    };
    return ArithmeticLogicUnit;
}());



/***/ }),

/***/ "./src/app/angular-split/components/split.component.ts":
/*!*************************************************************!*\
  !*** ./src/app/angular-split/components/split.component.ts ***!
  \*************************************************************/
/*! exports provided: SplitComponent */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "SplitComponent", function() { return SplitComponent; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var rxjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! rxjs */ "./node_modules/rxjs/_esm5/index.js");
/* harmony import */ var rxjs_operators__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! rxjs/operators */ "./node_modules/rxjs/_esm5/operators/index.js");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};



/**
 * angular-split
 *
 * Areas size are set in percentage of the split container.
 * Gutters size are set in pixels.
 *
 * So we set css 'flex-basis' property like this (where 0 <= area.size <= 1):
 *  calc( { area.size * 100 }% - { area.size * nbGutter * gutterSize }px );
 *
 * Examples with 3 visible areas and 2 gutters:
 *
 * |                     10px                   10px                                  |
 * |---------------------[]---------------------[]------------------------------------|
 * |  calc(20% - 4px)          calc(20% - 4px)              calc(60% - 12px)          |
 *
 *
 * |                          10px                        10px                        |
 * |--------------------------[]--------------------------[]--------------------------|
 * |  calc(33.33% - 6.667px)      calc(33.33% - 6.667px)      calc(33.33% - 6.667px)  |
 *
 *
 * |10px                                                  10px                        |
 * |[]----------------------------------------------------[]--------------------------|
 * |0                 calc(66.66% - 13.333px)                  calc(33%% - 6.667px)   |
 *
 *
 *  10px 10px                                                                         |
 * |[][]------------------------------------------------------------------------------|
 * |0 0                               calc(100% - 20px)                               |
 *
 */
var SplitComponent = /** @class */ (function () {
    function SplitComponent(ngZone, elRef, cdRef, renderer) {
        this.ngZone = ngZone;
        this.elRef = elRef;
        this.cdRef = cdRef;
        this.renderer = renderer;
        this._direction = 'horizontal';
        ////
        this._useTransition = false;
        ////
        this._disabled = false;
        ////
        this._width = null;
        ////
        this._height = null;
        ////
        this._gutterSize = 11;
        ////
        this._gutterColor = '';
        ////
        this._gutterImageH = '';
        ////
        this._gutterImageV = '';
        ////
        this._dir = 'ltr';
        ////
        this.dragStart = new _angular_core__WEBPACK_IMPORTED_MODULE_0__["EventEmitter"](false);
        this.dragProgress = new _angular_core__WEBPACK_IMPORTED_MODULE_0__["EventEmitter"](false);
        this.dragEnd = new _angular_core__WEBPACK_IMPORTED_MODULE_0__["EventEmitter"](false);
        this.gutterClick = new _angular_core__WEBPACK_IMPORTED_MODULE_0__["EventEmitter"](false);
        this.transitionEndInternal = new rxjs__WEBPACK_IMPORTED_MODULE_1__["Subject"]();
        this.transitionEnd = this.transitionEndInternal.asObservable().pipe(Object(rxjs_operators__WEBPACK_IMPORTED_MODULE_2__["debounceTime"])(20));
        this.isViewInitialized = false;
        this.isDragging = false;
        this.draggingWithoutMove = false;
        this.currentGutterNum = 0;
        this.displayedAreas = [];
        this.hidedAreas = [];
        this.dragListeners = [];
        this.dragStartValues = {
            sizePixelContainer: 0,
            sizePixelA: 0,
            sizePixelB: 0,
            sizePercentA: 0,
            sizePercentB: 0,
        };
    }
    Object.defineProperty(SplitComponent.prototype, "direction", {
        get: function () {
            return this._direction;
        },
        set: function (v) {
            var _this = this;
            v = (v === 'vertical') ? 'vertical' : 'horizontal';
            this._direction = v;
            this.displayedAreas.concat(this.hidedAreas).forEach(function (area) {
                area.comp.setStyleVisibleAndDir(area.comp.visible, _this.isDragging, _this.direction);
            });
            this.build(false, false);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SplitComponent.prototype, "useTransition", {
        get: function () {
            return this._useTransition;
        },
        set: function (v) {
            v = (typeof (v) === 'boolean') ? v : (v === 'false' ? false : true);
            this._useTransition = v;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SplitComponent.prototype, "disabled", {
        get: function () {
            return this._disabled;
        },
        set: function (v) {
            v = (typeof (v) === 'boolean') ? v : (v === 'false' ? false : true);
            this._disabled = v;
            // Force repaint if modified from TS class (instead of the template)
            this.cdRef.markForCheck();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SplitComponent.prototype, "width", {
        get: function () {
            return this._width;
        },
        set: function (v) {
            v = Number(v);
            this._width = (!isNaN(v) && v > 0) ? v : null;
            this.build(false, false);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SplitComponent.prototype, "height", {
        get: function () {
            return this._height;
        },
        set: function (v) {
            v = Number(v);
            this._height = (!isNaN(v) && v > 0) ? v : null;
            this.build(false, false);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SplitComponent.prototype, "gutterSize", {
        get: function () {
            return this._gutterSize;
        },
        set: function (v) {
            v = Number(v);
            this._gutterSize = (!isNaN(v) && v > 0) ? v : 11;
            this.build(false, false);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SplitComponent.prototype, "gutterColor", {
        get: function () {
            return this._gutterColor;
        },
        set: function (v) {
            this._gutterColor = (typeof v === 'string' && v !== '') ? v : '';
            // Force repaint if modified from TS class (instead of the template)
            this.cdRef.markForCheck();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SplitComponent.prototype, "gutterImageH", {
        get: function () {
            return this._gutterImageH;
        },
        set: function (v) {
            this._gutterImageH = (typeof v === 'string' && v !== '') ? v : '';
            // Force repaint if modified from TS class (instead of the template)
            this.cdRef.markForCheck();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SplitComponent.prototype, "gutterImageV", {
        get: function () {
            return this._gutterImageV;
        },
        set: function (v) {
            this._gutterImageV = (typeof v === 'string' && v !== '') ? v : '';
            // Force repaint if modified from TS class (instead of the template)
            this.cdRef.markForCheck();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SplitComponent.prototype, "dir", {
        get: function () {
            return this._dir;
        },
        set: function (v) {
            v = (v === 'rtl') ? 'rtl' : 'ltr';
            this._dir = v;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SplitComponent.prototype, "cssFlexdirection", {
        get: function () {
            return (this.direction === 'horizontal') ? 'row' : 'column';
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SplitComponent.prototype, "cssWidth", {
        get: function () {
            return this.width ? this.width + "px" : '100%';
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SplitComponent.prototype, "cssHeight", {
        get: function () {
            return this.height ? this.height + "px" : '100%';
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SplitComponent.prototype, "cssMinwidth", {
        get: function () {
            return (this.direction === 'horizontal') ? this.getNbGutters() * this.gutterSize + "px" : null;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SplitComponent.prototype, "cssMinheight", {
        get: function () {
            return (this.direction === 'vertical') ? this.getNbGutters() * this.gutterSize + "px" : null;
        },
        enumerable: true,
        configurable: true
    });
    SplitComponent.prototype.ngAfterViewInit = function () {
        this.isViewInitialized = true;
    };
    SplitComponent.prototype.getNbGutters = function () {
        return this.displayedAreas.length - 1;
    };
    SplitComponent.prototype.addArea = function (comp) {
        var newArea = {
            comp: comp,
            order: 0,
            size: 0,
        };
        if (comp.visible === true) {
            this.displayedAreas.push(newArea);
        }
        else {
            this.hidedAreas.push(newArea);
        }
        comp.setStyleVisibleAndDir(comp.visible, this.isDragging, this.direction);
        this.build(true, true);
    };
    SplitComponent.prototype.removeArea = function (comp) {
        if (this.displayedAreas.some(function (a) { return a.comp === comp; })) {
            var area = this.displayedAreas.find(function (a) { return a.comp === comp; });
            this.displayedAreas.splice(this.displayedAreas.indexOf(area), 1);
            this.build(true, true);
        }
        else if (this.hidedAreas.some(function (a) { return a.comp === comp; })) {
            var area = this.hidedAreas.find(function (a) { return a.comp === comp; });
            this.hidedAreas.splice(this.hidedAreas.indexOf(area), 1);
        }
    };
    SplitComponent.prototype.updateArea = function (comp, resetOrders, resetSizes) {
        // Only refresh if area is displayed (No need to check inside 'hidedAreas')
        var item = this.displayedAreas.find(function (a) { return a.comp === comp; });
        if (item) {
            this.build(resetOrders, resetSizes);
        }
    };
    SplitComponent.prototype.showArea = function (comp) {
        var _a;
        var area = this.hidedAreas.find(function (a) { return a.comp === comp; });
        if (area) {
            comp.setStyleVisibleAndDir(comp.visible, this.isDragging, this.direction);
            var areas = this.hidedAreas.splice(this.hidedAreas.indexOf(area), 1);
            (_a = this.displayedAreas).push.apply(_a, areas);
            this.build(true, true);
        }
    };
    SplitComponent.prototype.hideArea = function (comp) {
        var _a;
        var area = this.displayedAreas.find(function (a) { return a.comp === comp; });
        if (area) {
            comp.setStyleVisibleAndDir(comp.visible, this.isDragging, this.direction);
            var areas = this.displayedAreas.splice(this.displayedAreas.indexOf(area), 1);
            areas.forEach(function (area) {
                area.order = 0;
                area.size = 0;
            });
            (_a = this.hidedAreas).push.apply(_a, areas);
            this.build(true, true);
        }
    };
    SplitComponent.prototype.build = function (resetOrders, resetSizes) {
        var _this = this;
        this.stopDragging();
        // ¤ AREAS ORDER
        if (resetOrders === true) {
            // If user provided 'order' for each area, use it to sort them.
            if (this.displayedAreas.every(function (a) { return a.comp.order !== null; })) {
                this.displayedAreas.sort(function (a, b) { return a.comp.order - b.comp.order; });
            }
            // Then set real order with multiples of 2, numbers between will be used by gutters.
            this.displayedAreas.forEach(function (area, i) {
                area.order = i * 2;
                area.comp.setStyleOrder(area.order);
            });
        }
        // ¤ AREAS SIZE PERCENT
        if (resetSizes === true) {
            var totalUserSize = this.displayedAreas.reduce(function (total, s) { return s.comp.size ? total + s.comp.size : total; }, 0);
            // If user provided 'size' for each area and total == 1, use it.
            if (this.displayedAreas.every(function (a) { return a.comp.size !== null; }) && totalUserSize > .999 && totalUserSize < 1.001) {
                this.displayedAreas.forEach(function (area) {
                    area.size = area.comp.size;
                });
            }
            // Else set equal sizes for all areas.
            else {
                var size_1 = 1 / this.displayedAreas.length;
                this.displayedAreas.forEach(function (area) {
                    area.size = size_1;
                });
            }
        }
        // ¤ 
        // If some real area sizes are less than gutterSize, 
        // set them to zero and dispatch size to others.
        var percentToDispatch = 0;
        // Get container pixel size
        var containerSizePixel = this.getNbGutters() * this.gutterSize;
        if (this.direction === 'horizontal') {
            containerSizePixel = this.width ? this.width : this.elRef.nativeElement['offsetWidth'];
        }
        else {
            containerSizePixel = this.height ? this.height : this.elRef.nativeElement['offsetHeight'];
        }
        this.displayedAreas.forEach(function (area) {
            if (area.size * containerSizePixel < _this.gutterSize) {
                percentToDispatch += area.size;
                area.size = 0;
            }
        });
        if (percentToDispatch > 0 && this.displayedAreas.length > 0) {
            var nbAreasNotZero = this.displayedAreas.filter(function (a) { return a.size !== 0; }).length;
            if (nbAreasNotZero > 0) {
                var percentToAdd_1 = percentToDispatch / nbAreasNotZero;
                this.displayedAreas.filter(function (a) { return a.size !== 0; }).forEach(function (area) {
                    area.size += percentToAdd_1;
                });
            }
            // All area sizes (container percentage) are less than guterSize,
            // It means containerSize < ngGutters * gutterSize
            else {
                this.displayedAreas[this.displayedAreas.length - 1].size = 1;
            }
        }
        this.refreshStyleSizes();
        this.cdRef.markForCheck();
    };
    SplitComponent.prototype.refreshStyleSizes = function () {
        var _this = this;
        var sumGutterSize = this.getNbGutters() * this.gutterSize;
        this.displayedAreas.forEach(function (area) {
            area.comp.setStyleFlexbasis("calc( " + area.size * 100 + "% - " + area.size * sumGutterSize + "px )", _this.isDragging);
        });
    };
    SplitComponent.prototype.startDragging = function (startEvent, gutterOrder, gutterNum) {
        var _this = this;
        startEvent.preventDefault();
        // Place code here to allow '(gutterClick)' event even if '[disabled]="true"'.
        this.currentGutterNum = gutterNum;
        this.draggingWithoutMove = true;
        this.ngZone.runOutsideAngular(function () {
            _this.dragListeners.push(_this.renderer.listen('document', 'mouseup', function (e) { return _this.stopDragging(); }));
            _this.dragListeners.push(_this.renderer.listen('document', 'touchend', function (e) { return _this.stopDragging(); }));
            _this.dragListeners.push(_this.renderer.listen('document', 'touchcancel', function (e) { return _this.stopDragging(); }));
        });
        if (this.disabled) {
            return;
        }
        var areaA = this.displayedAreas.find(function (a) { return a.order === gutterOrder - 1; });
        var areaB = this.displayedAreas.find(function (a) { return a.order === gutterOrder + 1; });
        if (!areaA || !areaB) {
            return;
        }
        var prop = (this.direction === 'horizontal') ? 'offsetWidth' : 'offsetHeight';
        this.dragStartValues.sizePixelContainer = this.elRef.nativeElement[prop];
        this.dragStartValues.sizePixelA = areaA.comp.getSizePixel(prop);
        this.dragStartValues.sizePixelB = areaB.comp.getSizePixel(prop);
        this.dragStartValues.sizePercentA = areaA.size;
        this.dragStartValues.sizePercentB = areaB.size;
        var start;
        if (startEvent instanceof MouseEvent) {
            start = {
                x: startEvent.screenX,
                y: startEvent.screenY,
            };
        }
        else if (startEvent instanceof TouchEvent) {
            start = {
                x: startEvent.touches[0].screenX,
                y: startEvent.touches[0].screenY,
            };
        }
        else {
            return;
        }
        this.ngZone.runOutsideAngular(function () {
            _this.dragListeners.push(_this.renderer.listen('document', 'mousemove', function (e) { return _this.dragEvent(e, start, areaA, areaB); }));
            _this.dragListeners.push(_this.renderer.listen('document', 'touchmove', function (e) { return _this.dragEvent(e, start, areaA, areaB); }));
        });
        areaA.comp.lockEvents();
        areaB.comp.lockEvents();
        this.isDragging = true;
        this.notify('start');
    };
    SplitComponent.prototype.dragEvent = function (event, start, areaA, areaB) {
        if (!this.isDragging) {
            return;
        }
        var end;
        if (event instanceof MouseEvent) {
            end = {
                x: event.screenX,
                y: event.screenY,
            };
        }
        else if (event instanceof TouchEvent) {
            end = {
                x: event.touches[0].screenX,
                y: event.touches[0].screenY,
            };
        }
        else {
            return;
        }
        this.draggingWithoutMove = false;
        this.drag(start, end, areaA, areaB);
    };
    SplitComponent.prototype.drag = function (start, end, areaA, areaB) {
        // ¤ AREAS SIZE PIXEL
        var devicePixelRatio = window.devicePixelRatio || 1;
        var offsetPixel = (this.direction === 'horizontal') ? (start.x - end.x) : (start.y - end.y);
        offsetPixel = offsetPixel / devicePixelRatio;
        if (this.dir === 'rtl') {
            offsetPixel = -offsetPixel;
        }
        var newSizePixelA = this.dragStartValues.sizePixelA - offsetPixel;
        var newSizePixelB = this.dragStartValues.sizePixelB + offsetPixel;
        if (newSizePixelA < this.gutterSize && newSizePixelB < this.gutterSize) {
            // WTF.. get out of here!
            return;
        }
        else if (newSizePixelA < this.gutterSize) {
            newSizePixelB += newSizePixelA;
            newSizePixelA = 0;
        }
        else if (newSizePixelB < this.gutterSize) {
            newSizePixelA += newSizePixelB;
            newSizePixelB = 0;
        }
        // ¤ AREAS SIZE PERCENT
        if (newSizePixelA === 0) {
            areaB.size += areaA.size;
            areaA.size = 0;
        }
        else if (newSizePixelB === 0) {
            areaA.size += areaB.size;
            areaB.size = 0;
        }
        else {
            // NEW_PERCENT = START_PERCENT / START_PIXEL * NEW_PIXEL;
            if (this.dragStartValues.sizePercentA === 0) {
                areaB.size = this.dragStartValues.sizePercentB / this.dragStartValues.sizePixelB * newSizePixelB;
                areaA.size = this.dragStartValues.sizePercentB - areaB.size;
            }
            else if (this.dragStartValues.sizePercentB === 0) {
                areaA.size = this.dragStartValues.sizePercentA / this.dragStartValues.sizePixelA * newSizePixelA;
                areaB.size = this.dragStartValues.sizePercentA - areaA.size;
            }
            else {
                areaA.size = this.dragStartValues.sizePercentA / this.dragStartValues.sizePixelA * newSizePixelA;
                areaB.size = (this.dragStartValues.sizePercentA + this.dragStartValues.sizePercentB) - areaA.size;
            }
        }
        this.refreshStyleSizes();
        this.notify('progress');
    };
    SplitComponent.prototype.stopDragging = function () {
        if (this.isDragging === false && this.draggingWithoutMove === false) {
            return;
        }
        this.displayedAreas.forEach(function (area) {
            area.comp.unlockEvents();
        });
        while (this.dragListeners.length > 0) {
            var fct = this.dragListeners.pop();
            if (fct) {
                fct();
            }
        }
        if (this.draggingWithoutMove === true) {
            this.notify('click');
        }
        else {
            this.notify('end');
        }
        this.isDragging = false;
        this.draggingWithoutMove = false;
    };
    SplitComponent.prototype.notify = function (type) {
        var areasSize = this.displayedAreas.map(function (a) { return a.size * 100; });
        switch (type) {
            case 'start':
                return this.dragStart.emit({ gutterNum: this.currentGutterNum, sizes: areasSize });
            case 'progress':
                return this.dragProgress.emit({ gutterNum: this.currentGutterNum, sizes: areasSize });
            case 'end':
                return this.dragEnd.emit({ gutterNum: this.currentGutterNum, sizes: areasSize });
            case 'click':
                return this.gutterClick.emit({ gutterNum: this.currentGutterNum, sizes: areasSize });
            case 'transitionEnd':
                return this.transitionEndInternal.next(areasSize);
        }
    };
    SplitComponent.prototype.ngOnDestroy = function () {
        this.stopDragging();
    };
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Input"])(),
        __metadata("design:type", String),
        __metadata("design:paramtypes", [String])
    ], SplitComponent.prototype, "direction", null);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Input"])(),
        __metadata("design:type", Boolean),
        __metadata("design:paramtypes", [Boolean])
    ], SplitComponent.prototype, "useTransition", null);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Input"])(),
        __metadata("design:type", Boolean),
        __metadata("design:paramtypes", [Boolean])
    ], SplitComponent.prototype, "disabled", null);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Input"])(),
        __metadata("design:type", Number),
        __metadata("design:paramtypes", [Number])
    ], SplitComponent.prototype, "width", null);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Input"])(),
        __metadata("design:type", Number),
        __metadata("design:paramtypes", [Number])
    ], SplitComponent.prototype, "height", null);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Input"])(),
        __metadata("design:type", Number),
        __metadata("design:paramtypes", [Number])
    ], SplitComponent.prototype, "gutterSize", null);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Input"])(),
        __metadata("design:type", String),
        __metadata("design:paramtypes", [String])
    ], SplitComponent.prototype, "gutterColor", null);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Input"])(),
        __metadata("design:type", String),
        __metadata("design:paramtypes", [String])
    ], SplitComponent.prototype, "gutterImageH", null);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Input"])(),
        __metadata("design:type", String),
        __metadata("design:paramtypes", [String])
    ], SplitComponent.prototype, "gutterImageV", null);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Input"])(),
        __metadata("design:type", String),
        __metadata("design:paramtypes", [String])
    ], SplitComponent.prototype, "dir", null);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Output"])(),
        __metadata("design:type", Object)
    ], SplitComponent.prototype, "dragStart", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Output"])(),
        __metadata("design:type", Object)
    ], SplitComponent.prototype, "dragProgress", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Output"])(),
        __metadata("design:type", Object)
    ], SplitComponent.prototype, "dragEnd", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Output"])(),
        __metadata("design:type", Object)
    ], SplitComponent.prototype, "gutterClick", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Output"])(),
        __metadata("design:type", Object)
    ], SplitComponent.prototype, "transitionEnd", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["HostBinding"])('style.flex-direction'),
        __metadata("design:type", Object),
        __metadata("design:paramtypes", [])
    ], SplitComponent.prototype, "cssFlexdirection", null);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["HostBinding"])('style.width'),
        __metadata("design:type", Object),
        __metadata("design:paramtypes", [])
    ], SplitComponent.prototype, "cssWidth", null);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["HostBinding"])('style.height'),
        __metadata("design:type", Object),
        __metadata("design:paramtypes", [])
    ], SplitComponent.prototype, "cssHeight", null);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["HostBinding"])('style.min-width'),
        __metadata("design:type", Object),
        __metadata("design:paramtypes", [])
    ], SplitComponent.prototype, "cssMinwidth", null);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["HostBinding"])('style.min-height'),
        __metadata("design:type", Object),
        __metadata("design:paramtypes", [])
    ], SplitComponent.prototype, "cssMinheight", null);
    SplitComponent = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"])({
            selector: 'split',
            changeDetection: _angular_core__WEBPACK_IMPORTED_MODULE_0__["ChangeDetectionStrategy"].OnPush,
            styles: ["\n        :host {\n            display: flex;\n            flex-wrap: nowrap;\n            justify-content: flex-start;\n            align-items: stretch;\n            overflow: hidden;\n            /* \n                Important to keep following rules even if overrided later by 'HostBinding' \n                because if [width] & [height] not provided, when build() is executed,\n                'HostBinding' hasn't been applied yet so code:\n                this.elRef.nativeElement[\"offsetHeight\"] gives wrong value!  \n             */\n            width: 100%;\n            height: 100%;   \n        }\n\n        split-gutter {\n            flex-grow: 0;\n            flex-shrink: 0;\n            background-position: center center;\n            background-repeat: no-repeat;\n        }\n    "],
            template: "\n        <ng-content></ng-content>\n        <ng-template ngFor let-area [ngForOf]=\"displayedAreas\" let-index=\"index\" let-last=\"last\">\n            <split-gutter *ngIf=\"last === false\" \n                          [order]=\"index*2+1\"\n                          [direction]=\"direction\"\n                          [useTransition]=\"useTransition\"\n                          [size]=\"gutterSize\"\n                          [color]=\"gutterColor\"\n                          [imageH]=\"gutterImageH\"\n                          [imageV]=\"gutterImageV\"\n                          [disabled]=\"disabled\"\n                          (mousedown)=\"startDragging($event, index*2+1, index+1)\"\n                          (touchstart)=\"startDragging($event, index*2+1, index+1)\"></split-gutter>\n        </ng-template>",
        }),
        __metadata("design:paramtypes", [_angular_core__WEBPACK_IMPORTED_MODULE_0__["NgZone"],
            _angular_core__WEBPACK_IMPORTED_MODULE_0__["ElementRef"],
            _angular_core__WEBPACK_IMPORTED_MODULE_0__["ChangeDetectorRef"],
            _angular_core__WEBPACK_IMPORTED_MODULE_0__["Renderer2"]])
    ], SplitComponent);
    return SplitComponent;
}());



/***/ }),

/***/ "./src/app/angular-split/components/splitArea.directive.ts":
/*!*****************************************************************!*\
  !*** ./src/app/angular-split/components/splitArea.directive.ts ***!
  \*****************************************************************/
/*! exports provided: SplitAreaDirective */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "SplitAreaDirective", function() { return SplitAreaDirective; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var _split_component__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./split.component */ "./src/app/angular-split/components/split.component.ts");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};


var SplitAreaDirective = /** @class */ (function () {
    function SplitAreaDirective(ngZone, elRef, renderer, split) {
        this.ngZone = ngZone;
        this.elRef = elRef;
        this.renderer = renderer;
        this.split = split;
        this._order = null;
        ////
        this._size = null;
        ////
        this._minSize = 0;
        ////
        this._visible = true;
        this.lockListeners = [];
    }
    Object.defineProperty(SplitAreaDirective.prototype, "order", {
        get: function () {
            return this._order;
        },
        set: function (v) {
            v = Number(v);
            this._order = !isNaN(v) ? v : null;
            this.split.updateArea(this, true, false);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SplitAreaDirective.prototype, "size", {
        get: function () {
            return this._size;
        },
        set: function (v) {
            v = Number(v);
            this._size = (!isNaN(v) && v >= 0 && v <= 100) ? (v / 100) : null;
            this.split.updateArea(this, false, true);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SplitAreaDirective.prototype, "minSize", {
        get: function () {
            return this._minSize;
        },
        set: function (v) {
            v = Number(v);
            this._minSize = (!isNaN(v) && v > 0 && v < 100) ? v / 100 : 0;
            this.split.updateArea(this, false, true);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SplitAreaDirective.prototype, "visible", {
        get: function () {
            return this._visible;
        },
        set: function (v) {
            v = (typeof (v) === 'boolean') ? v : (v === 'false' ? false : true);
            this._visible = v;
            if (this.visible) {
                this.split.showArea(this);
            }
            else {
                this.split.hideArea(this);
            }
        },
        enumerable: true,
        configurable: true
    });
    SplitAreaDirective.prototype.ngOnInit = function () {
        var _this = this;
        this.split.addArea(this);
        this.renderer.setStyle(this.elRef.nativeElement, 'flex-grow', '0');
        this.renderer.setStyle(this.elRef.nativeElement, 'flex-shrink', '0');
        this.ngZone.runOutsideAngular(function () {
            _this.transitionListener = _this.renderer.listen(_this.elRef.nativeElement, 'transitionend', function (e) { return _this.onTransitionEnd(e); });
        });
    };
    SplitAreaDirective.prototype.getSizePixel = function (prop) {
        return this.elRef.nativeElement[prop];
    };
    SplitAreaDirective.prototype.setStyleVisibleAndDir = function (isVisible, isDragging, direction) {
        if (isVisible === false) {
            this.setStyleFlexbasis('0', isDragging);
            this.renderer.setStyle(this.elRef.nativeElement, 'overflow-x', 'hidden');
            this.renderer.setStyle(this.elRef.nativeElement, 'overflow-y', 'hidden');
            if (direction === 'vertical') {
                this.renderer.setStyle(this.elRef.nativeElement, 'max-width', '0');
            }
        }
        else {
            this.renderer.setStyle(this.elRef.nativeElement, 'overflow-x', 'hidden');
            this.renderer.setStyle(this.elRef.nativeElement, 'overflow-y', 'auto');
            this.renderer.removeStyle(this.elRef.nativeElement, 'max-width');
        }
        if (direction === 'horizontal') {
            this.renderer.setStyle(this.elRef.nativeElement, 'height', '100%');
            this.renderer.removeStyle(this.elRef.nativeElement, 'width');
        }
        else {
            this.renderer.setStyle(this.elRef.nativeElement, 'width', '100%');
            this.renderer.removeStyle(this.elRef.nativeElement, 'height');
        }
    };
    SplitAreaDirective.prototype.setStyleOrder = function (value) {
        this.renderer.setStyle(this.elRef.nativeElement, 'order', value);
    };
    SplitAreaDirective.prototype.setStyleFlexbasis = function (value, isDragging) {
        // If component not yet initialized or gutter being dragged, disable transition
        if (this.split.isViewInitialized === false || isDragging === true) {
            this.setStyleTransition(false);
        }
        // Or use 'useTransition' to know if transition.
        else {
            this.setStyleTransition(this.split.useTransition);
        }
        this.renderer.setStyle(this.elRef.nativeElement, 'flex-basis', value);
    };
    SplitAreaDirective.prototype.setStyleTransition = function (useTransition) {
        if (useTransition) {
            this.renderer.setStyle(this.elRef.nativeElement, 'transition', "flex-basis 0.3s");
        }
        else {
            this.renderer.removeStyle(this.elRef.nativeElement, 'transition');
        }
    };
    SplitAreaDirective.prototype.onTransitionEnd = function (event) {
        // Limit only flex-basis transition to trigger the event
        if (event.propertyName === 'flex-basis') {
            this.split.notify('transitionEnd');
        }
    };
    SplitAreaDirective.prototype.lockEvents = function () {
        var _this = this;
        this.ngZone.runOutsideAngular(function () {
            _this.lockListeners.push(_this.renderer.listen(_this.elRef.nativeElement, 'selectstart', function (e) { return false; }));
            _this.lockListeners.push(_this.renderer.listen(_this.elRef.nativeElement, 'dragstart', function (e) { return false; }));
        });
    };
    SplitAreaDirective.prototype.unlockEvents = function () {
        while (this.lockListeners.length > 0) {
            var fct = this.lockListeners.pop();
            if (fct) {
                fct();
            }
        }
    };
    SplitAreaDirective.prototype.ngOnDestroy = function () {
        this.unlockEvents();
        if (this.transitionListener) {
            this.transitionListener();
        }
        this.split.removeArea(this);
    };
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Input"])(),
        __metadata("design:type", Number),
        __metadata("design:paramtypes", [Number])
    ], SplitAreaDirective.prototype, "order", null);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Input"])(),
        __metadata("design:type", Number),
        __metadata("design:paramtypes", [Number])
    ], SplitAreaDirective.prototype, "size", null);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Input"])(),
        __metadata("design:type", Number),
        __metadata("design:paramtypes", [Number])
    ], SplitAreaDirective.prototype, "minSize", null);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Input"])(),
        __metadata("design:type", Boolean),
        __metadata("design:paramtypes", [Boolean])
    ], SplitAreaDirective.prototype, "visible", null);
    SplitAreaDirective = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Directive"])({
            selector: 'split-area'
        }),
        __metadata("design:paramtypes", [_angular_core__WEBPACK_IMPORTED_MODULE_0__["NgZone"],
            _angular_core__WEBPACK_IMPORTED_MODULE_0__["ElementRef"],
            _angular_core__WEBPACK_IMPORTED_MODULE_0__["Renderer2"],
            _split_component__WEBPACK_IMPORTED_MODULE_1__["SplitComponent"]])
    ], SplitAreaDirective);
    return SplitAreaDirective;
}());



/***/ }),

/***/ "./src/app/angular-split/components/splitGutter.directive.ts":
/*!*******************************************************************!*\
  !*** ./src/app/angular-split/components/splitGutter.directive.ts ***!
  \*******************************************************************/
/*! exports provided: SplitGutterDirective */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "SplitGutterDirective", function() { return SplitGutterDirective; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};

var SplitGutterDirective = /** @class */ (function () {
    ////
    function SplitGutterDirective(elRef, renderer) {
        this.elRef = elRef;
        this.renderer = renderer;
        ////
        this._disabled = false;
    }
    Object.defineProperty(SplitGutterDirective.prototype, "order", {
        set: function (v) {
            this.renderer.setStyle(this.elRef.nativeElement, 'order', v);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SplitGutterDirective.prototype, "direction", {
        get: function () {
            return this._direction;
        },
        set: function (v) {
            this._direction = v;
            this.refreshStyle();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SplitGutterDirective.prototype, "useTransition", {
        ////
        set: function (v) {
            if (v) {
                this.renderer.setStyle(this.elRef.nativeElement, 'transition', "flex-basis 0.3s");
            }
            else {
                this.renderer.removeStyle(this.elRef.nativeElement, 'transition');
            }
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SplitGutterDirective.prototype, "size", {
        get: function () {
            return this._size;
        },
        set: function (v) {
            this._size = v;
            this.refreshStyle();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SplitGutterDirective.prototype, "color", {
        get: function () {
            return this._color;
        },
        set: function (v) {
            this._color = v;
            this.refreshStyle();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SplitGutterDirective.prototype, "imageH", {
        get: function () {
            return this._imageH;
        },
        set: function (v) {
            this._imageH = v;
            this.refreshStyle();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SplitGutterDirective.prototype, "imageV", {
        get: function () {
            return this._imageV;
        },
        set: function (v) {
            this._imageV = v;
            this.refreshStyle();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SplitGutterDirective.prototype, "disabled", {
        get: function () {
            return this._disabled;
        },
        set: function (v) {
            this._disabled = v;
            this.refreshStyle();
        },
        enumerable: true,
        configurable: true
    });
    SplitGutterDirective.prototype.refreshStyle = function () {
        this.renderer.setStyle(this.elRef.nativeElement, 'flex-basis', this.size + "px");
        // fix safari bug about gutter height when direction is horizontal
        this.renderer.setStyle(this.elRef.nativeElement, 'height', (this.direction === 'vertical') ? this.size + "px" : "100%");
        this.renderer.setStyle(this.elRef.nativeElement, 'background-color', (this.color !== '') ? this.color : "#eeeeee");
        var state = (this.disabled === true) ? 'disabled' : this.direction;
        this.renderer.setStyle(this.elRef.nativeElement, 'background-image', this.getImage(state));
        this.renderer.setStyle(this.elRef.nativeElement, 'cursor', this.getCursor(state));
    };
    SplitGutterDirective.prototype.getCursor = function (state) {
        switch (state) {
            case 'horizontal':
                return 'col-resize';
            case 'vertical':
                return 'row-resize';
            case 'disabled':
                return 'default';
        }
    };
    SplitGutterDirective.prototype.getImage = function (state) {
        switch (state) {
            case 'horizontal':
                return (this.imageH !== '') ? this.imageH : defaultImageH;
            case 'vertical':
                return (this.imageV !== '') ? this.imageV : defaultImageV;
            case 'disabled':
                return '';
        }
    };
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Input"])(),
        __metadata("design:type", Number),
        __metadata("design:paramtypes", [Number])
    ], SplitGutterDirective.prototype, "order", null);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Input"])(),
        __metadata("design:type", String),
        __metadata("design:paramtypes", [String])
    ], SplitGutterDirective.prototype, "direction", null);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Input"])(),
        __metadata("design:type", Boolean),
        __metadata("design:paramtypes", [Boolean])
    ], SplitGutterDirective.prototype, "useTransition", null);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Input"])(),
        __metadata("design:type", Number),
        __metadata("design:paramtypes", [Number])
    ], SplitGutterDirective.prototype, "size", null);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Input"])(),
        __metadata("design:type", String),
        __metadata("design:paramtypes", [String])
    ], SplitGutterDirective.prototype, "color", null);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Input"])(),
        __metadata("design:type", String),
        __metadata("design:paramtypes", [String])
    ], SplitGutterDirective.prototype, "imageH", null);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Input"])(),
        __metadata("design:type", String),
        __metadata("design:paramtypes", [String])
    ], SplitGutterDirective.prototype, "imageV", null);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Input"])(),
        __metadata("design:type", Boolean),
        __metadata("design:paramtypes", [Boolean])
    ], SplitGutterDirective.prototype, "disabled", null);
    SplitGutterDirective = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Directive"])({
            selector: 'split-gutter'
        }),
        __metadata("design:paramtypes", [_angular_core__WEBPACK_IMPORTED_MODULE_0__["ElementRef"],
            _angular_core__WEBPACK_IMPORTED_MODULE_0__["Renderer2"]])
    ], SplitGutterDirective);
    return SplitGutterDirective;
}());

var defaultImageH = 'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAeCAYAAADkftS9AAAAIklEQVQoU2M4c+bMfxAGAgYYmwGrIIiDjrELjpo5aiZeMwF+yNnOs5KSvgAAAABJRU5ErkJggg==")';
var defaultImageV = 'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAFCAMAAABl/6zIAAAABlBMVEUAAADMzMzIT8AyAAAAAXRSTlMAQObYZgAAABRJREFUeAFjYGRkwIMJSeMHlBkOABP7AEGzSuPKAAAAAElFTkSuQmCC")';


/***/ }),

/***/ "./src/app/angular-split/modules/angularSplit.module.ts":
/*!**************************************************************!*\
  !*** ./src/app/angular-split/modules/angularSplit.module.ts ***!
  \**************************************************************/
/*! exports provided: AngularSplitModule */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "AngularSplitModule", function() { return AngularSplitModule; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var _angular_common__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/common */ "./node_modules/@angular/common/fesm5/common.js");
/* harmony import */ var _components_split_component__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../components/split.component */ "./src/app/angular-split/components/split.component.ts");
/* harmony import */ var _components_splitArea_directive__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../components/splitArea.directive */ "./src/app/angular-split/components/splitArea.directive.ts");
/* harmony import */ var _components_splitGutter_directive__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../components/splitGutter.directive */ "./src/app/angular-split/components/splitGutter.directive.ts");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};





var AngularSplitModule = /** @class */ (function () {
    function AngularSplitModule() {
    }
    AngularSplitModule_1 = AngularSplitModule;
    AngularSplitModule.forRoot = function () {
        return {
            ngModule: AngularSplitModule_1,
            providers: []
        };
    };
    AngularSplitModule.forChild = function () {
        return {
            ngModule: AngularSplitModule_1,
            providers: []
        };
    };
    var AngularSplitModule_1;
    AngularSplitModule = AngularSplitModule_1 = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["NgModule"])({
            imports: [
                _angular_common__WEBPACK_IMPORTED_MODULE_1__["CommonModule"]
            ],
            declarations: [
                _components_split_component__WEBPACK_IMPORTED_MODULE_2__["SplitComponent"],
                _components_splitArea_directive__WEBPACK_IMPORTED_MODULE_3__["SplitAreaDirective"],
                _components_splitGutter_directive__WEBPACK_IMPORTED_MODULE_4__["SplitGutterDirective"],
            ],
            exports: [
                _components_split_component__WEBPACK_IMPORTED_MODULE_2__["SplitComponent"],
                _components_splitArea_directive__WEBPACK_IMPORTED_MODULE_3__["SplitAreaDirective"],
            ]
        })
    ], AngularSplitModule);
    return AngularSplitModule;
}());



/***/ }),

/***/ "./src/app/app.component.html":
/*!************************************!*\
  !*** ./src/app/app.component.html ***!
  \************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "<div class=\"simulator-screen\">\n<p-menubar [model]=\"items\">\n    <div style=\"font-size: 16px; line-height: 26px; margin-right: 8px\">\n        16-bit Assembler Simulator\n    </div>\n</p-menubar>\n<a #fileDownload style=\"display: none;\" download=\"source.asm\"></a>\n<input #fileInput type=\"file\" (change)=\"onFileChange($event)\" accept=\".asm\" style=\"display: none;\">\n<div class=\"main-container\">\n  <div class=\"left-pane\" [ngClass]=\"{'with-center-pane': showCentralPane}\">\n    <split direction=\"vertical\" gutterSize=\"2\" (dragEnd)=\"onDragEnd(0, $event)\">\n      <split-area *ngIf=\"config.codePanel.visible\" [size]=\"config.codePanel.size\" order=\"0\">\n        <div style=\"height: 100%; width: 100%; position: relative\">\n          <form style=\"height: 100%; width: 100%\">\n            <textarea #codeTextArea name=\"code\" class=\"source-code\"></textarea>\n          </form>\n          <p-messages></p-messages>\n        </div>\n      </split-area>\n      <split-area *ngIf=\"config.eventsLogPanel.visible\" [size]=\"config.eventsLogPanel.size\" order=\"1\">\n        <div class=\"events-log-viewer-container\">\n          <app-events-log-viewer [isRunning]=\"isRunning\"></app-events-log-viewer>\n        </div>\n      </split-area>\n    </split>\n  </div>\n  <div class=\"center-pane\" *ngIf=\"showCentralPane\">\n    <div class=\"memory-view-container\">\n      <app-memory-view [mapping]=\"mapping\" [displayA]=\"displayA\" [displayB]=\"displayB\" [displayC]=\"displayC\" [displayD]=\"displayD\" (onMemoryCellClick)=\"memoryCellClick($event)\"></app-memory-view>\n    </div>\n  </div>\n  <div class=\"right-pane\">\n    <split direction=\"vertical\" gutterSize=\"2\" (dragEnd)=\"onDragEnd(1, $event)\">\n      <split-area *ngIf=\"config.ioDevicesPanel.visible\" [size]=\"config.ioDevicesPanel.size\" order=\"0\">\n        <p-panel header=\"Input / Output Devices\" styleClass=\"registers-panel\">\n          <div style=\"width:280px;display:inline-block;float:left;text-align:center; padding-top: 10px; padding-bottom: 10px\">\n            <app-visual-display></app-visual-display>\n            <app-textual-display></app-textual-display>\n          </div>\n          <div style=\"width:135px;display:inline-block;text-align:center; padding-top: 10px\">\n            <app-keypad></app-keypad>\n          </div>\n        </p-panel>\n      </split-area>\n      <split-area *ngIf=\"config.cpuRegistersPanel.visible\" [size]=\"config.cpuRegistersPanel.size\" order=\"1\">\n        <app-registers-view (onRegisterClick)=\"toggleDisplayRegister($event)\"></app-registers-view>\n      </split-area>\n      <split-area *ngIf=\"config.memoryPanel.visible\" [size]=\"config.memoryPanel.size\" order=\"2\">\n        <div class=\"memory-view-container\">\n          <app-memory-view [mapping]=\"mapping\" [displayA]=\"displayA\" [displayB]=\"displayB\" [displayC]=\"displayC\" [displayD]=\"displayD\" (onMemoryCellClick)=\"memoryCellClick($event)\"></app-memory-view>\n        </div>\n      </split-area>\n      <split-area *ngIf=\"config.ioRegistersPanel.visible\" [size]=\"config.ioRegistersPanel.size\" order=\"3\">\n        <app-ioregisters-view></app-ioregisters-view>\n      </split-area>\n    </split>\n  </div>\n</div>\n</div>\n"

/***/ }),

/***/ "./src/app/app.component.ts":
/*!**********************************!*\
  !*** ./src/app/app.component.ts ***!
  \**********************************/
/*! exports provided: CPUSpeed, AppComponent */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "CPUSpeed", function() { return CPUSpeed; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "AppComponent", function() { return AppComponent; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var _angular_common_http__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/common/http */ "./node_modules/@angular/common/fesm5/http.js");
/* harmony import */ var _assembler_service__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./assembler.service */ "./src/app/assembler.service.ts");
/* harmony import */ var _memory_service__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./memory.service */ "./src/app/memory.service.ts");
/* harmony import */ var primeng_components_common_messageservice__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! primeng/components/common/messageservice */ "./node_modules/primeng/components/common/messageservice.js");
/* harmony import */ var primeng_components_common_messageservice__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(primeng_components_common_messageservice__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var _cpu_service__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./cpu.service */ "./src/app/cpu.service.ts");
/* harmony import */ var _cpuregs__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./cpuregs */ "./src/app/cpuregs.ts");
/* harmony import */ var rxjs__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! rxjs */ "./node_modules/rxjs/_esm5/index.js");
/* harmony import */ var _irqctrl_service__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./irqctrl.service */ "./src/app/irqctrl.service.ts");
/* harmony import */ var _timer_service__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ./timer.service */ "./src/app/timer.service.ts");
/* harmony import */ var _keypad_keypad_component__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ./keypad/keypad.component */ "./src/app/keypad/keypad.component.ts");
/* harmony import */ var _visual_display_visual_display_component__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ./visual-display/visual-display.component */ "./src/app/visual-display/visual-display.component.ts");
/* harmony import */ var _textual_display_textual_display_component__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! ./textual-display/textual-display.component */ "./src/app/textual-display/textual-display.component.ts");
/* harmony import */ var codemirror__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! codemirror */ "./node_modules/codemirror/lib/codemirror.js");
/* harmony import */ var codemirror__WEBPACK_IMPORTED_MODULE_13___default = /*#__PURE__*/__webpack_require__.n(codemirror__WEBPACK_IMPORTED_MODULE_13__);
/* harmony import */ var _instrset__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(/*! ./instrset */ "./src/app/instrset.ts");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
















var WRAP_CLS = 'CodeMirror-activeline';
var BACK_CLS = 'CodeMirror-activeline-background';
var GUTT_CLS = 'CodeMirror-activeline-gutter';
var CPUSpeed;
(function (CPUSpeed) {
    CPUSpeed[CPUSpeed["_4Hz"] = 0] = "_4Hz";
    CPUSpeed[CPUSpeed["_1kHz"] = 1] = "_1kHz";
    CPUSpeed[CPUSpeed["_64kHz"] = 2] = "_64kHz";
})(CPUSpeed || (CPUSpeed = {}));
var AppComponent = /** @class */ (function () {
    function AppComponent(assemblerService, memoryService, messageService, cpuService, irqCtrlService, timerService, http, renderer, _ngZone, changeDetector) {
        var _this = this;
        this.assemblerService = assemblerService;
        this.memoryService = memoryService;
        this.messageService = messageService;
        this.cpuService = cpuService;
        this.irqCtrlService = irqCtrlService;
        this.timerService = timerService;
        this.http = http;
        this.renderer = renderer;
        this._ngZone = _ngZone;
        this.changeDetector = changeDetector;
        this.title = 'asm-simulator';
        this.displayA = false;
        this.displayB = false;
        this.displayC = false;
        this.displayD = false;
        this.isRunning = false;
        this.resetConfiguration = {
            cpuSpeed: 0,
            memoryVisible: true,
            ioRegistersPanel: {
                visible: false,
                size: 25
            },
            memoryPanel: {
                visible: true,
                size: 25
            },
            cpuRegistersPanel: {
                visible: true,
                size: 25
            },
            ioDevicesPanel: {
                visible: true,
                size: 25
            },
            codePanel: {
                visible: true,
                size: 50
            },
            eventsLogPanel: {
                visible: false,
                size: 50
            }
        };
        this.resetConfig();
        if (window.innerWidth >= 1300) {
            this.showCentralPane = true;
            this.config.memoryPanel.visible = false;
        }
        else {
            this.showCentralPane = false;
            this.config.memoryPanel.visible = true;
        }
        this.speedItems = [
            {
                label: '4 Hz',
                icon: this.config.cpuSpeed === CPUSpeed._4Hz ? 'pi pi-fw pi-check' : undefined,
                command: function (event) {
                    _this.speedItems[_this.config.cpuSpeed].icon = undefined;
                    _this.config.cpuSpeed = CPUSpeed._4Hz;
                    event.item.icon = 'pi pi-fw pi-check';
                }
            },
            {
                label: '1 kHz',
                icon: this.config.cpuSpeed === CPUSpeed._1kHz ? 'pi pi-fw pi-check' : undefined,
                command: function (event) {
                    _this.speedItems[_this.config.cpuSpeed].icon = undefined;
                    _this.config.cpuSpeed = CPUSpeed._1kHz;
                    event.item.icon = 'pi pi-fw pi-check';
                }
            },
            {
                label: '64 kHz',
                icon: this.config.cpuSpeed === CPUSpeed._64kHz ? 'pi pi-fw pi-check' : undefined,
                command: function (event) {
                    _this.speedItems[_this.config.cpuSpeed].icon = undefined;
                    _this.config.cpuSpeed = CPUSpeed._64kHz;
                    event.item.icon = 'pi pi-fw pi-check';
                }
            },
        ];
        this.items = [
            {
                label: 'View',
                items: [
                    {
                        label: 'Memory',
                        icon: this.config.memoryVisible ? 'pi pi-fw pi-check' : undefined,
                        command: function (event) {
                            if (_this.config.memoryVisible === true) {
                                _this.config.memoryVisible = false;
                                event.item.icon = undefined;
                            }
                            else {
                                _this.config.memoryVisible = true;
                                event.item.icon = 'pi pi-fw pi-check';
                            }
                            if (window.innerWidth >= 1300) {
                                _this.showCentralPane = _this.config.memoryVisible;
                                _this.config.memoryPanel.visible = false;
                            }
                            else {
                                _this.showCentralPane = false;
                                _this.config.memoryPanel.visible = _this.config.memoryVisible;
                            }
                        }
                    },
                    {
                        label: 'I/O Registers',
                        icon: this.config.ioRegistersPanel.visible ? 'pi pi-fw pi-check' : undefined,
                        command: function (event) {
                            if (_this.config.ioRegistersPanel.visible === true) {
                                _this.config.ioRegistersPanel.visible = false;
                                event.item.icon = undefined;
                            }
                            else {
                                _this.config.ioRegistersPanel.visible = true;
                                event.item.icon = 'pi pi-fw pi-check';
                            }
                        }
                    }
                ]
            },
            {
                label: 'Speed',
                items: this.speedItems
            },
            {
                label: 'Assemble',
                icon: 'pi pi-fw pi-arrow-right',
                command: function () { return _this.assemble(); }
            },
            {
                label: 'Run',
                icon: 'pi pi-fw pi-play',
                styleClass: 'menubar-button-run',
                command: function (event) {
                    if (_this.isRunning === true) {
                        _this.stop();
                    }
                    else {
                        event.item.icon = 'pi pi-fw pi-stop';
                        event.item.label = 'Stop';
                        _this.run();
                    }
                }
            },
            {
                label: 'Step',
                icon: 'pi pi-fw pi-forward',
                command: function () { return _this.executeStep(); }
            },
            {
                label: 'Reset',
                icon: 'pi pi-fw pi-power-off',
                command: function () { return _this.reset(); }
            }
        ];
    }
    AppComponent.prototype.onResize = function () {
        if (window.innerWidth >= 1300) {
            this.showCentralPane = this.config.memoryVisible;
            this.config.memoryPanel.visible = false;
        }
        else {
            this.showCentralPane = false;
            this.config.memoryPanel.visible = this.config.memoryVisible;
        }
    };
    AppComponent.prototype.pushErrorMessage = function (detail) {
        this.messageService.clear();
        this.messageService.add({ severity: 'error', detail: detail });
    };
    AppComponent.prototype.onFileChange = function (event) {
        var _this = this;
        var file = event.target.files[0];
        var reader = new FileReader();
        reader.onload = function () { return _this.instance.setValue(reader.result); };
        reader.readAsText(file);
    };
    AppComponent.prototype.resetConfig = function () {
        this.config = this.resetConfiguration;
    };
    AppComponent.prototype.updatePanelSizes = function (splitNumber, sizes) {
        if (splitNumber === 0) {
            // We are on the left pane, and there is only one gutter
            this.config.codePanel.size = sizes[0];
            this.config.eventsLogPanel.size = sizes[1];
        }
        else {
            // We are on the right pane
            this.config.ioDevicesPanel.size = sizes[0];
            this.config.cpuRegistersPanel.size = sizes[1];
            if (this.config.memoryPanel.visible === true &&
                this.config.ioRegistersPanel.visible === true) {
                this.config.memoryPanel.size = sizes[2];
                this.config.ioRegistersPanel.size = sizes[3];
            }
            else if (this.config.memoryPanel.visible === true) {
                this.config.memoryPanel.size = sizes[2];
            }
            else if (this.config.ioRegistersPanel.visible === true) {
                this.config.ioRegistersPanel.size = sizes[2];
            }
        }
    };
    AppComponent.prototype.onDragEnd = function (splitNumber, e) {
        var _this = this;
        this._ngZone.run(function () { _this.updatePanelSizes(splitNumber, e.sizes); });
    };
    AppComponent.prototype.setGutterMarker = function (lineNumber) {
        var info = this.instance.lineInfo(lineNumber);
        if (info.gutterMarkers) {
            this.instance.setGutterMarker(lineNumber, 'breakpoints', null);
        }
        else {
            var marker = this.renderer.createElement('div');
            this.renderer.setStyle(marker, 'color', '#822');
            this.renderer.setStyle(marker, 'vertical-align', 'middle');
            this.renderer.setStyle(marker, 'text-align', 'left');
            //this.renderer.setStyle(marker, 'line-height', '20px');
            this.renderer.setStyle(marker, 'font-size', '80%');
            this.renderer.appendChild(marker, this.renderer.createText('●'));
            this.instance.setGutterMarker(lineNumber, 'breakpoints', marker);
        }
    };
    AppComponent.prototype.ngAfterViewInit = function () {
        var _this = this;
        var start = [
            // The regex matches the token, the token property contains the type
            { regex: /"(?:[^\\]|\\.)*?(?:"|$)/, token: 'string' },
            { regex: /0x[0-9a-f]+|0o[0-7]+|b[0-1]+|[-+]?\d+/i,
                token: 'number' },
            { regex: /;.*/, token: 'comment' }
        ];
        for (var _i = 0, _a = ['AH', 'AL', 'BH', 'BL', 'CH', 'CL', 'DH', 'DL',
            'SP', 'A', 'B', 'C', 'D']; _i < _a.length; _i++) {
            var item = _a[_i];
            start.push({ regex: new RegExp(item + '\\b'), token: 'variable-3' });
        }
        start.push({ regex: /DB\b/, token: 'keyword' });
        start.push({ regex: /DW\b/, token: 'keyword' });
        start.push({ regex: /ORG\b/, token: 'keyword' });
        for (var _b = 0, _c = _instrset__WEBPACK_IMPORTED_MODULE_14__["instructionSet"].getMnemonics(); _b < _c.length; _b++) {
            var item = _c[_b];
            start.push({ regex: new RegExp(item + '\\b'), token: 'keyword' });
        }
        start.push({ regex: /([.A-Za-z]\w*)/, token: 'variable-2' });
        codemirror__WEBPACK_IMPORTED_MODULE_13__["defineSimpleMode"]('asm-mode', {
            // The start state contains the rules that are intially used
            start: start,
            meta: {
                lineComment: ';'
            }
        });
        var element = this.codeTextArea.nativeElement;
        this.instance = codemirror__WEBPACK_IMPORTED_MODULE_13__["fromTextArea"](element, {
            lineNumbers: true,
            scrollEditorOnly: true,
            viewportMargin: Infinity,
            mode: 'asm-mode',
            gutters: ['CodeMirror-linenumbers', 'breakpoints']
        });
        this.instance.on('gutterClick', function (cm, n) { return _this.setGutterMarker(n); });
        this.instance.state.activeLine = undefined;
        this.instance.on('beforeSelectionChange', function () {
            if (_this.instance.state.activeLine) {
                _this.instance.removeLineClass(_this.instance.state.activeLine, 'wrap', WRAP_CLS);
                _this.instance.removeLineClass(_this.instance.state.activeLine, 'background', BACK_CLS);
                _this.instance.removeLineClass(_this.instance.state.activeLine, 'gutter', GUTT_CLS);
                _this.instance.state.activeLine = undefined;
            }
        });
        this.defaultCodeTextSize = 16;
        this.codeTextSize = this.defaultCodeTextSize;
        this.instance.getWrapperElement().style["font-size"] = this.codeTextSize + "px";
        var keyMap = {
            "Shift-Ctrl-Up": function () {
                if (_this.codeTextSize < 100) {
                    _this.codeTextSize += 6;
                    var elements = document.querySelectorAll('.breakpoints');
                    var width = Math.round(_this.codeTextSize * 0.6);
                    for (var i = 0; i < elements.length; i++) {
                        var element = elements[i];
                        element.style.width = width + "px";
                    }
                    _this.instance.getWrapperElement().style["font-size"] = _this.codeTextSize + "px";
                    _this.instance.refresh();
                }
            },
            "Shift-Ctrl-Down": function () {
                if (_this.codeTextSize > 10) {
                    _this.codeTextSize -= 6;
                    var elements = document.querySelectorAll('.breakpoints');
                    var width = Math.round(_this.codeTextSize * 0.6);
                    for (var i = 0; i < elements.length; i++) {
                        var element = elements[i];
                        element.style.width = width + "px";
                    }
                    _this.instance.getWrapperElement().style["font-size"] = _this.codeTextSize + "px";
                    _this.instance.refresh();
                }
            }
        };
        this.instance.addKeyMap(keyMap);
        this.instance.refresh();
    };
    AppComponent.prototype.assemble = function () {
        var result;
        try {
            result = this.assemblerService.go(this.instance.getValue());
        }
        catch (e) {
            if (e.line) {
                this.pushErrorMessage(e.line + ": " + e.error);
            }
            else if (e.error) {
                this.pushErrorMessage(e.error);
            }
            else {
                this.pushErrorMessage(e.toString());
            }
            return;
        }
        this.code = result.code;
        this.mapping = result.mapping;
        this.labels = result.labels;
        this.memoryService.storeBytes(0, this.code.length, this.code);
    };
    AppComponent.prototype.scrollToLine = function (line) {
        var clientHeight = this.instance.getScrollInfo().clientHeight;
        var scrollTop = this.instance.getScrollInfo().top;
        var lineCoordinates = this.instance.charCoords({ line: line, ch: 0 }, 'local');
        var topLine = this.instance.coordsChar({ left: 0, top: scrollTop }, 'local').line;
        var bottomLine = this.instance.coordsChar({ left: 0, top: (scrollTop + clientHeight) }, 'local').line;
        if (line <= topLine) {
            this.instance.scrollTo(null, lineCoordinates.top);
        }
        else if (line >= bottomLine) {
            this.instance.scrollTo(null, lineCoordinates.top - clientHeight + 20);
        }
    };
    AppComponent.prototype.markLine = function (line) {
        if (this.instance.state.activeLine !== undefined && this.instance.state.activeLine !== line) {
            this.instance.removeLineClass(this.instance.state.activeLine, 'wrap', WRAP_CLS);
            this.instance.removeLineClass(this.instance.state.activeLine, 'background', BACK_CLS);
            this.instance.removeLineClass(this.instance.state.activeLine, 'gutter', GUTT_CLS);
            this.instance.state.activeLine = undefined;
        }
        if (this.instance.state.activeLine === undefined) {
            this.instance.state.activeLine = line;
            this.instance.addLineClass(this.instance.state.activeLine, 'wrap', WRAP_CLS);
            this.instance.addLineClass(this.instance.state.activeLine, 'background', BACK_CLS);
            this.instance.addLineClass(this.instance.state.activeLine, 'gutter', GUTT_CLS);
        }
    };
    AppComponent.prototype.memoryCellClick = function (address) {
        if (this.mapping && this.mapping.has(address) && this.codeTextArea) {
            var line = this.mapping.get(address);
            this.markLine(line);
            this.scrollToLine(line);
        }
    };
    AppComponent.prototype.executeStep = function () {
        try {
            this.cpuService.step();
            if (this.mapping && this.mapping.has(this.cpuService.IP.silentValue)) {
                var line = this.mapping.get(this.cpuService.IP.silentValue);
                this.markLine(line);
                this.scrollToLine(line);
            }
        }
        catch (e) {
            this.pushErrorMessage(e.message);
        }
    };
    AppComponent.prototype.run = function () {
        var _this = this;
        this.isRunning = true;
        var steps = 1;
        var period = 1;
        switch (this.config.cpuSpeed) {
            case CPUSpeed._4Hz: {
                period = 250;
                break;
            }
            case CPUSpeed._1kHz: {
                period = 32;
                steps = 32;
                break;
            }
            case CPUSpeed._64kHz: {
                period = 32;
                steps = 2048;
                break;
            }
        }
        this.timerSubscription = Object(rxjs__WEBPACK_IMPORTED_MODULE_7__["timer"])(1, period).subscribe(function () {
            try {
                for (var i = 0; i < steps; i++) {
                    _this.cpuService.step();
                    if (_this.mapping && _this.mapping.has(_this.cpuService.IP.silentValue)) {
                        var line = _this.mapping.get(_this.cpuService.IP.silentValue);
                        var info = _this.instance.lineInfo(line);
                        if (info.gutterMarkers) {
                            _this.stop();
                            _this.markLine(line);
                            _this.scrollToLine(line);
                            break;
                        }
                    }
                }
                _this.changeDetector.detectChanges();
            }
            catch (e) {
                _this.pushErrorMessage(e.toString());
                _this.stop();
            }
        });
    };
    AppComponent.prototype.stop = function () {
        this.isRunning = false;
        this.items[3].icon = 'pi pi-fw pi-play';
        this.items[3].label = 'Run';
        if (this.timerSubscription && this.timerSubscription.closed === false) {
            this.timerSubscription.unsubscribe();
        }
    };
    AppComponent.prototype.reset = function () {
        if (this.isRunning === true) {
            this.stop();
        }
        this.mapping = undefined;
        this.cpuService.reset();
        this.memoryService.reset();
        this.irqCtrlService.reset();
        this.timerService.reset();
        this.keypadComponent.reset();
        this.visualDisplayComponent.reset();
        this.textualDisplayComponent.reset();
        this.messageService.clear();
    };
    AppComponent.prototype.setCodeSample = function (sampleNum) {
        var _this = this;
        this.reset();
        this.http.get("assets/samples/sample" + sampleNum + ".asm", { responseType: 'text' })
            .subscribe(function (text) { return _this.instance.setValue(text); });
    };
    AppComponent.prototype.toggleDisplayRegister = function (registerIndex) {
        switch (registerIndex) {
            case _cpuregs__WEBPACK_IMPORTED_MODULE_6__["CPURegisterIndex"].A:
                this.displayA = !this.displayA;
                break;
            case _cpuregs__WEBPACK_IMPORTED_MODULE_6__["CPURegisterIndex"].B:
                this.displayB = !this.displayB;
                break;
            case _cpuregs__WEBPACK_IMPORTED_MODULE_6__["CPURegisterIndex"].C:
                this.displayC = !this.displayC;
                break;
            case _cpuregs__WEBPACK_IMPORTED_MODULE_6__["CPURegisterIndex"].D:
                this.displayD = !this.displayD;
                break;
        }
    };
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["ViewChild"])('codeTextArea'),
        __metadata("design:type", _angular_core__WEBPACK_IMPORTED_MODULE_0__["ElementRef"])
    ], AppComponent.prototype, "codeTextArea", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["ViewChild"])('fileInput'),
        __metadata("design:type", _angular_core__WEBPACK_IMPORTED_MODULE_0__["ElementRef"])
    ], AppComponent.prototype, "fileInput", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["ViewChild"])('fileDownload'),
        __metadata("design:type", _angular_core__WEBPACK_IMPORTED_MODULE_0__["ElementRef"])
    ], AppComponent.prototype, "fileDownload", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["ViewChild"])(_keypad_keypad_component__WEBPACK_IMPORTED_MODULE_10__["KeypadComponent"]),
        __metadata("design:type", _keypad_keypad_component__WEBPACK_IMPORTED_MODULE_10__["KeypadComponent"])
    ], AppComponent.prototype, "keypadComponent", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["ViewChild"])(_visual_display_visual_display_component__WEBPACK_IMPORTED_MODULE_11__["VisualDisplayComponent"]),
        __metadata("design:type", _visual_display_visual_display_component__WEBPACK_IMPORTED_MODULE_11__["VisualDisplayComponent"])
    ], AppComponent.prototype, "visualDisplayComponent", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["ViewChild"])(_textual_display_textual_display_component__WEBPACK_IMPORTED_MODULE_12__["TextualDisplayComponent"]),
        __metadata("design:type", _textual_display_textual_display_component__WEBPACK_IMPORTED_MODULE_12__["TextualDisplayComponent"])
    ], AppComponent.prototype, "textualDisplayComponent", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["HostListener"])('window:resize', ['$event']),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", []),
        __metadata("design:returntype", void 0)
    ], AppComponent.prototype, "onResize", null);
    AppComponent = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"])({
            selector: 'app-root',
            changeDetection: _angular_core__WEBPACK_IMPORTED_MODULE_0__["ChangeDetectionStrategy"].OnPush,
            template: __webpack_require__(/*! ./app.component.html */ "./src/app/app.component.html"),
            providers: [
                primeng_components_common_messageservice__WEBPACK_IMPORTED_MODULE_4__["MessageService"]
            ]
        }),
        __metadata("design:paramtypes", [_assembler_service__WEBPACK_IMPORTED_MODULE_2__["AssemblerService"],
            _memory_service__WEBPACK_IMPORTED_MODULE_3__["MemoryService"],
            primeng_components_common_messageservice__WEBPACK_IMPORTED_MODULE_4__["MessageService"],
            _cpu_service__WEBPACK_IMPORTED_MODULE_5__["CPUService"],
            _irqctrl_service__WEBPACK_IMPORTED_MODULE_8__["IrqCtrlService"],
            _timer_service__WEBPACK_IMPORTED_MODULE_9__["TimerService"],
            _angular_common_http__WEBPACK_IMPORTED_MODULE_1__["HttpClient"],
            _angular_core__WEBPACK_IMPORTED_MODULE_0__["Renderer2"],
            _angular_core__WEBPACK_IMPORTED_MODULE_0__["NgZone"],
            _angular_core__WEBPACK_IMPORTED_MODULE_0__["ChangeDetectorRef"]])
    ], AppComponent);
    return AppComponent;
}());



/***/ }),

/***/ "./src/app/app.module.ts":
/*!*******************************!*\
  !*** ./src/app/app.module.ts ***!
  \*******************************/
/*! exports provided: AppModule */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "AppModule", function() { return AppModule; });
/* harmony import */ var _angular_platform_browser__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/platform-browser */ "./node_modules/@angular/platform-browser/fesm5/platform-browser.js");
/* harmony import */ var _angular_platform_browser_animations__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/platform-browser/animations */ "./node_modules/@angular/platform-browser/fesm5/animations.js");
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var _angular_forms__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @angular/forms */ "./node_modules/@angular/forms/fesm5/forms.js");
/* harmony import */ var _angular_common_http__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! @angular/common/http */ "./node_modules/@angular/common/fesm5/http.js");
/* harmony import */ var primeng_menubar__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! primeng/menubar */ "./node_modules/primeng/menubar.js");
/* harmony import */ var primeng_menubar__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(primeng_menubar__WEBPACK_IMPORTED_MODULE_5__);
/* harmony import */ var primeng_button__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! primeng/button */ "./node_modules/primeng/button.js");
/* harmony import */ var primeng_button__WEBPACK_IMPORTED_MODULE_6___default = /*#__PURE__*/__webpack_require__.n(primeng_button__WEBPACK_IMPORTED_MODULE_6__);
/* harmony import */ var primeng_panel__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! primeng/panel */ "./node_modules/primeng/panel.js");
/* harmony import */ var primeng_panel__WEBPACK_IMPORTED_MODULE_7___default = /*#__PURE__*/__webpack_require__.n(primeng_panel__WEBPACK_IMPORTED_MODULE_7__);
/* harmony import */ var primeng_table__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! primeng/table */ "./node_modules/primeng/table.js");
/* harmony import */ var primeng_table__WEBPACK_IMPORTED_MODULE_8___default = /*#__PURE__*/__webpack_require__.n(primeng_table__WEBPACK_IMPORTED_MODULE_8__);
/* harmony import */ var primeng_togglebutton__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! primeng/togglebutton */ "./node_modules/primeng/togglebutton.js");
/* harmony import */ var primeng_togglebutton__WEBPACK_IMPORTED_MODULE_9___default = /*#__PURE__*/__webpack_require__.n(primeng_togglebutton__WEBPACK_IMPORTED_MODULE_9__);
/* harmony import */ var primeng_multiselect__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! primeng/multiselect */ "./node_modules/primeng/multiselect.js");
/* harmony import */ var primeng_multiselect__WEBPACK_IMPORTED_MODULE_10___default = /*#__PURE__*/__webpack_require__.n(primeng_multiselect__WEBPACK_IMPORTED_MODULE_10__);
/* harmony import */ var primeng_messages__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! primeng/messages */ "./node_modules/primeng/messages.js");
/* harmony import */ var primeng_messages__WEBPACK_IMPORTED_MODULE_11___default = /*#__PURE__*/__webpack_require__.n(primeng_messages__WEBPACK_IMPORTED_MODULE_11__);
/* harmony import */ var primeng_message__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! primeng/message */ "./node_modules/primeng/message.js");
/* harmony import */ var primeng_message__WEBPACK_IMPORTED_MODULE_12___default = /*#__PURE__*/__webpack_require__.n(primeng_message__WEBPACK_IMPORTED_MODULE_12__);
/* harmony import */ var _angular_split_modules_angularSplit_module__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! ./angular-split/modules/angularSplit.module */ "./src/app/angular-split/modules/angularSplit.module.ts");
/* harmony import */ var _app_component__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(/*! ./app.component */ "./src/app/app.component.ts");
/* harmony import */ var _memory_view_memory_view_component__WEBPACK_IMPORTED_MODULE_15__ = __webpack_require__(/*! ./memory-view/memory-view.component */ "./src/app/memory-view/memory-view.component.ts");
/* harmony import */ var _keypad_keypad_component__WEBPACK_IMPORTED_MODULE_16__ = __webpack_require__(/*! ./keypad/keypad.component */ "./src/app/keypad/keypad.component.ts");
/* harmony import */ var _visual_display_visual_display_component__WEBPACK_IMPORTED_MODULE_17__ = __webpack_require__(/*! ./visual-display/visual-display.component */ "./src/app/visual-display/visual-display.component.ts");
/* harmony import */ var _textual_display_textual_display_component__WEBPACK_IMPORTED_MODULE_18__ = __webpack_require__(/*! ./textual-display/textual-display.component */ "./src/app/textual-display/textual-display.component.ts");
/* harmony import */ var _registers_view_registers_view_component__WEBPACK_IMPORTED_MODULE_19__ = __webpack_require__(/*! ./registers-view/registers-view.component */ "./src/app/registers-view/registers-view.component.ts");
/* harmony import */ var _ioregisters_view_ioregisters_view_component__WEBPACK_IMPORTED_MODULE_20__ = __webpack_require__(/*! ./ioregisters-view/ioregisters-view.component */ "./src/app/ioregisters-view/ioregisters-view.component.ts");
/* harmony import */ var _memory_service__WEBPACK_IMPORTED_MODULE_21__ = __webpack_require__(/*! ./memory.service */ "./src/app/memory.service.ts");
/* harmony import */ var _ioregmap_service__WEBPACK_IMPORTED_MODULE_22__ = __webpack_require__(/*! ./ioregmap.service */ "./src/app/ioregmap.service.ts");
/* harmony import */ var _assembler_service__WEBPACK_IMPORTED_MODULE_23__ = __webpack_require__(/*! ./assembler.service */ "./src/app/assembler.service.ts");
/* harmony import */ var _autofocus_directive__WEBPACK_IMPORTED_MODULE_24__ = __webpack_require__(/*! ./autofocus.directive */ "./src/app/autofocus.directive.ts");
/* harmony import */ var _irqctrl_service__WEBPACK_IMPORTED_MODULE_25__ = __webpack_require__(/*! ./irqctrl.service */ "./src/app/irqctrl.service.ts");
/* harmony import */ var _cpu_service__WEBPACK_IMPORTED_MODULE_26__ = __webpack_require__(/*! ./cpu.service */ "./src/app/cpu.service.ts");
/* harmony import */ var _timer_service__WEBPACK_IMPORTED_MODULE_27__ = __webpack_require__(/*! ./timer.service */ "./src/app/timer.service.ts");
/* harmony import */ var _events_log_viewer_events_log_viewer_component__WEBPACK_IMPORTED_MODULE_28__ = __webpack_require__(/*! ./events-log-viewer/events-log-viewer.component */ "./src/app/events-log-viewer/events-log-viewer.component.ts");
/* harmony import */ var _clock_service__WEBPACK_IMPORTED_MODULE_29__ = __webpack_require__(/*! ./clock.service */ "./src/app/clock.service.ts");
/* harmony import */ var _events_log_service__WEBPACK_IMPORTED_MODULE_30__ = __webpack_require__(/*! ./events-log.service */ "./src/app/events-log.service.ts");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};































var AppModule = /** @class */ (function () {
    function AppModule() {
    }
    AppModule = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_2__["NgModule"])({
            declarations: [
                _app_component__WEBPACK_IMPORTED_MODULE_14__["AppComponent"],
                _memory_view_memory_view_component__WEBPACK_IMPORTED_MODULE_15__["MemoryViewComponent"],
                _keypad_keypad_component__WEBPACK_IMPORTED_MODULE_16__["KeypadComponent"],
                _visual_display_visual_display_component__WEBPACK_IMPORTED_MODULE_17__["VisualDisplayComponent"],
                _textual_display_textual_display_component__WEBPACK_IMPORTED_MODULE_18__["TextualDisplayComponent"],
                _registers_view_registers_view_component__WEBPACK_IMPORTED_MODULE_19__["RegistersViewComponent"],
                _ioregisters_view_ioregisters_view_component__WEBPACK_IMPORTED_MODULE_20__["IORegistersViewComponent"],
                _autofocus_directive__WEBPACK_IMPORTED_MODULE_24__["AutofocusDirective"],
                _events_log_viewer_events_log_viewer_component__WEBPACK_IMPORTED_MODULE_28__["EventsLogViewerComponent"]
            ],
            imports: [
                _angular_platform_browser__WEBPACK_IMPORTED_MODULE_0__["BrowserModule"],
                _angular_platform_browser_animations__WEBPACK_IMPORTED_MODULE_1__["BrowserAnimationsModule"],
                _angular_forms__WEBPACK_IMPORTED_MODULE_3__["FormsModule"],
                _angular_common_http__WEBPACK_IMPORTED_MODULE_4__["HttpClientModule"],
                primeng_menubar__WEBPACK_IMPORTED_MODULE_5__["MenubarModule"],
                primeng_button__WEBPACK_IMPORTED_MODULE_6__["ButtonModule"],
                primeng_panel__WEBPACK_IMPORTED_MODULE_7__["PanelModule"],
                primeng_table__WEBPACK_IMPORTED_MODULE_8__["TableModule"],
                primeng_togglebutton__WEBPACK_IMPORTED_MODULE_9__["ToggleButtonModule"],
                primeng_multiselect__WEBPACK_IMPORTED_MODULE_10__["MultiSelectModule"],
                primeng_messages__WEBPACK_IMPORTED_MODULE_11__["MessagesModule"],
                primeng_message__WEBPACK_IMPORTED_MODULE_12__["MessageModule"],
                _angular_split_modules_angularSplit_module__WEBPACK_IMPORTED_MODULE_13__["AngularSplitModule"]
            ],
            providers: [
                _memory_service__WEBPACK_IMPORTED_MODULE_21__["MemoryService"],
                _ioregmap_service__WEBPACK_IMPORTED_MODULE_22__["IORegMapService"],
                _assembler_service__WEBPACK_IMPORTED_MODULE_23__["AssemblerService"],
                _irqctrl_service__WEBPACK_IMPORTED_MODULE_25__["IrqCtrlService"],
                _cpu_service__WEBPACK_IMPORTED_MODULE_26__["CPUService"],
                _timer_service__WEBPACK_IMPORTED_MODULE_27__["TimerService"],
                _clock_service__WEBPACK_IMPORTED_MODULE_29__["ClockService"],
                _events_log_service__WEBPACK_IMPORTED_MODULE_30__["EventsLogService"]
            ],
            bootstrap: [_app_component__WEBPACK_IMPORTED_MODULE_14__["AppComponent"]]
        })
    ], AppModule);
    return AppModule;
}());



/***/ }),

/***/ "./src/app/assembler.service.ts":
/*!**************************************!*\
  !*** ./src/app/assembler.service.ts ***!
  \**************************************/
/*! exports provided: AssemblerService */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "AssemblerService", function() { return AssemblerService; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var rxjs_internal_util_isNumeric__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! rxjs/internal/util/isNumeric */ "./node_modules/rxjs/internal/util/isNumeric.js");
/* harmony import */ var rxjs_internal_util_isNumeric__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(rxjs_internal_util_isNumeric__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _instrset__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./instrset */ "./src/app/instrset.ts");
/* harmony import */ var _cpuregs__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./cpuregs */ "./src/app/cpuregs.ts");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};




/**
 * This regular expression is used to parse the lines of code. The original
 * expression was defined by Marco Schweighauser. This version includes the
 * capability of using escape characters (e.g. \t \x12 \n) within the
 * definition of a string.
 */
var REGEX = /^[\t ]*(?:([.A-Za-z]\w*)[:])?(?:[\t ]*([A-Za-z]{2,5})(?:[\t ]+(\[(\w+((\+|-)\d+)?)\]|\"(?:[^\\"]|\\.)+?\"|\'.+?\'|[.A-Za-z0-9]\w*)(?:[\t ]*[,][\t ]*(\[(\w+((\+|-)\d+)?)\]|\"(?:[^\\"]|\\.)+?\"|\'.+?\'|[.A-Za-z0-9]\w*))?)?)?/;
var OP1_GROUP = 3;
var OP2_GROUP = 7;
// MATCHES: "(+|-)DECIMAL"
var REGEX_DECIMAL = /^[-+]?[0-9]+$/;
// MATCHES: "HEXADECIMAL"
var REGEX_HEXADECIMAL = /^[0-9A-Fa-f]+$/;
// MATCHES: "OCTAL"
var REGEX_OCTAL = /^[0-7]+$/;
// MATCHES: "BINARY"
var REGEX_BINARY = /^[0-1]+$/;
// MATCHES: "(.L)abel"
var REGEX_LABEL = /^[.A-Za-z]\w*$/;
var AssemblerService = /** @class */ (function () {
    function AssemblerService() {
    }
    AssemblerService_1 = AssemblerService;
    // Allowed formats: 200, 200d, 0xA4, 0o48, 101b
    AssemblerService.parseNumber = function (input) {
        if (input.slice(0, 2) === '0x') {
            if (REGEX_HEXADECIMAL.test(input.slice(2)) === true) {
                return parseInt(input.slice(2), 16);
            }
            else {
                throw Error("Invalid hexadecimal number: " + input);
            }
        }
        else if (input.slice(0, 2) === '0o') {
            if (REGEX_OCTAL.test(input.slice(2)) === true) {
                return parseInt(input.slice(2), 8);
            }
            else {
                throw Error("Invalid octal number: " + input);
            }
        }
        else if (input.slice(input.length - 1) === 'b') {
            if (REGEX_BINARY.test(input.slice(0, input.length - 1)) === true) {
                return parseInt(input.slice(0, input.length - 1), 2);
            }
            else {
                throw Error("Invalid binary number: " + input);
            }
        }
        else if (input.slice(input.length - 1) === 'd') {
            if (REGEX_DECIMAL.test(input.slice(0, input.length - 1)) === true) {
                return parseInt(input.slice(0, input.length - 1), 10);
            }
            else {
                throw Error("Invalid decimal number: " + input);
            }
        }
        else if (REGEX_DECIMAL.test(input)) {
            return parseInt(input, 10);
        }
        else {
            throw Error("Invalid number format: " + input);
        }
    };
    // Allowed registers: A, B, C, D, SP
    AssemblerService.parseRegister = function (input) {
        input = input.toUpperCase();
        if (input === 'A') {
            return _cpuregs__WEBPACK_IMPORTED_MODULE_3__["CPURegisterIndex"].A;
        }
        else if (input === 'B') {
            return _cpuregs__WEBPACK_IMPORTED_MODULE_3__["CPURegisterIndex"].B;
        }
        else if (input === 'C') {
            return _cpuregs__WEBPACK_IMPORTED_MODULE_3__["CPURegisterIndex"].C;
        }
        else if (input === 'D') {
            return _cpuregs__WEBPACK_IMPORTED_MODULE_3__["CPURegisterIndex"].D;
        }
        else if (input === 'SP') {
            return _cpuregs__WEBPACK_IMPORTED_MODULE_3__["CPURegisterIndex"].SP;
        }
        else if (input === 'AH') {
            return _cpuregs__WEBPACK_IMPORTED_MODULE_3__["CPURegisterIndex"].AH;
        }
        else if (input === 'AL') {
            return _cpuregs__WEBPACK_IMPORTED_MODULE_3__["CPURegisterIndex"].AL;
        }
        else if (input === 'BH') {
            return _cpuregs__WEBPACK_IMPORTED_MODULE_3__["CPURegisterIndex"].BH;
        }
        else if (input === 'BL') {
            return _cpuregs__WEBPACK_IMPORTED_MODULE_3__["CPURegisterIndex"].BL;
        }
        else if (input === 'CH') {
            return _cpuregs__WEBPACK_IMPORTED_MODULE_3__["CPURegisterIndex"].CH;
        }
        else if (input === 'CL') {
            return _cpuregs__WEBPACK_IMPORTED_MODULE_3__["CPURegisterIndex"].CL;
        }
        else if (input === 'DH') {
            return _cpuregs__WEBPACK_IMPORTED_MODULE_3__["CPURegisterIndex"].DH;
        }
        else if (input === 'DL') {
            return _cpuregs__WEBPACK_IMPORTED_MODULE_3__["CPURegisterIndex"].DL;
        }
        else {
            return undefined;
        }
    };
    AssemblerService.parseOffsetAddressing = function (input) {
        input = input.toUpperCase();
        var m = 0;
        var base = 0;
        if (input[0] === 'A') {
            base = _cpuregs__WEBPACK_IMPORTED_MODULE_3__["CPURegisterIndex"].A;
        }
        else if (input[0] === 'B') {
            base = _cpuregs__WEBPACK_IMPORTED_MODULE_3__["CPURegisterIndex"].B;
        }
        else if (input[0] === 'C') {
            base = _cpuregs__WEBPACK_IMPORTED_MODULE_3__["CPURegisterIndex"].C;
        }
        else if (input[0] === 'D') {
            base = _cpuregs__WEBPACK_IMPORTED_MODULE_3__["CPURegisterIndex"].D;
        }
        else if (input.slice(0, 2) === 'SP') {
            base = _cpuregs__WEBPACK_IMPORTED_MODULE_3__["CPURegisterIndex"].SP;
        }
        else {
            return undefined;
        }
        var offset_start = 1;
        if (base === _cpuregs__WEBPACK_IMPORTED_MODULE_3__["CPURegisterIndex"].SP) {
            offset_start = 2;
        }
        if (input.length === offset_start) {
            return base;
        }
        if (input[offset_start] === '-') {
            m = -1;
        }
        else if (input[offset_start] === '+') {
            m = 1;
        }
        else {
            return undefined;
        }
        var offset = m * parseInt(input.slice(offset_start + 1), 10);
        if (offset < -128 || offset > 127) {
            throw Error('offset must be a value between -128...+127');
        }
        if (offset < 0) {
            offset = 256 + offset; // two's complement representation in 8-bit
        }
        return (offset << 8) + base; // shift offset 8 bits right and add code for register
    };
    // Allowed: Register addressing, Label or Number
    AssemblerService.parseAddressItem = function (input) {
        // First we check if it is a register addressing
        var register = AssemblerService_1.parseOffsetAddressing(input);
        if (register !== undefined) {
            return { type: _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGADDRESS, value: register };
        }
        var label = AssemblerService_1.parseLabel(input);
        if (label !== undefined) {
            return { type: _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].ADDRESS, value: label };
        }
        var value = AssemblerService_1.parseNumber(input);
        if (isNaN(value)) {
            throw Error("Not a number nor a valid register addressing: " + value);
        }
        return { type: _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].ADDRESS, value: value };
    };
    // Allowed: Register, Label or Number
    AssemblerService.parseNumericItem = function (input) {
        var register = AssemblerService_1.parseRegister(input);
        if (register !== undefined) {
            return { type: _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER, value: register };
        }
        var label = AssemblerService_1.parseLabel(input);
        if (label !== undefined) {
            return { type: _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].NUMBER, value: label };
        }
        var value = AssemblerService_1.parseNumber(input);
        if (isNaN(value)) {
            throw Error("Not a number nor a valid register: " + value);
        }
        return { type: _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].NUMBER, value: value };
    };
    AssemblerService.parseLabel = function (input) {
        return REGEX_LABEL.exec(input) ? input : undefined;
    };
    AssemblerService.checkOperandTypeValue = function (operandType, value) {
        switch (operandType) {
            case _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].WORD:
                if (Object(rxjs_internal_util_isNumeric__WEBPACK_IMPORTED_MODULE_1__["isNumeric"])(value) && (value < 0 || value > 65535)) {
                    throw Error('Operand must have a value between 0-65536');
                }
                break;
            case _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].BYTE:
                if (Object(rxjs_internal_util_isNumeric__WEBPACK_IMPORTED_MODULE_1__["isNumeric"])(value)) {
                    if (value < 0 || value > 255) {
                        throw Error('Operand must have a value between 0-255');
                    }
                }
                else {
                    throw Error('Operand must have a value between 0-255');
                }
                break;
            case _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_8BITS:
                if (Object(_cpuregs__WEBPACK_IMPORTED_MODULE_3__["getRegisterSize"])(value) !== 8) {
                    throw Error('Invalid register. Instruction requires an 8-bit register operand');
                }
                break;
            case _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_16BITS:
                if (Object(_cpuregs__WEBPACK_IMPORTED_MODULE_3__["getRegisterSize"])(value) !== 16) {
                    throw Error('Invalid register. Instruction requires a 16-bit register operand');
                }
                break;
        }
        return operandType;
    };
    AssemblerService.getValue = function (input) {
        switch (input.slice(0, 1)) {
            case '[': // [number] or [register]
                var address = input.slice(1, input.length - 1);
                return AssemblerService_1.parseAddressItem(address);
            case '"': // "String"
                var text = input.slice(1, input.length - 1)
                    .replace(/\\n/, '\n')
                    .replace(/\\t/, '\t')
                    .replace(/\\r/, '\r')
                    .replace(/\\b/, '\b')
                    .replace(/\\'/, '\'')
                    .replace(/\\"/, '\"')
                    .replace(/\\x([0-9a-fA-F]{2})/g, function (m, c) {
                    return String.fromCharCode(parseInt(c, 16));
                });
                var chars = [];
                for (var i = 0, l = text.length; i < l; i++) {
                    chars.push(text.charCodeAt(i));
                }
                return { type: _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].ARRAY, value: chars };
            case '\'': // 'C'
                var character = input.slice(1, input.length - 1);
                if (character.length > 1) {
                    throw Error('Only one character is allowed. Use a string instead');
                }
                return { type: _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].BYTE, value: character.charCodeAt(0) };
            default: // REGISTER, NUMBER or LABEL
                return AssemblerService_1.parseNumericItem(input);
        }
    };
    AssemblerService.prototype.addLabel = function (label) {
        var upperLabel = label.toUpperCase();
        if (this.labels.has(upperLabel)) {
            throw Error("Duplicated label: " + label);
        }
        if (upperLabel === 'A' || upperLabel === 'B' || upperLabel === 'C' || upperLabel === 'D' ||
            upperLabel === 'AH' || upperLabel === 'AL' || upperLabel === 'BH' || upperLabel === 'BL' ||
            upperLabel === 'CH' || upperLabel === 'CL' || upperLabel === 'DH' || upperLabel === 'DL' ||
            upperLabel === 'SP' || upperLabel === 'SR') {
            throw Error("Label contains keyword: " + upperLabel);
        }
        this.labels.set(upperLabel, this.code.length);
    };
    AssemblerService.prototype.storeWordIntoCode = function (value, index) {
        var msb = (value & 0xFF00) >>> 8;
        var lsb = (value & 0x00FF);
        this.code[index] = msb;
        this.code[index + 1] = lsb;
    };
    AssemblerService.prototype.storeLabelIntoCode = function (value, index) {
        this.code[index] = value;
        this.code[index + 1] = 0;
    };
    AssemblerService.prototype.pushOperandToCode = function (item) {
        switch (item.type) {
            case _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].WORD:
            case _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].NUMBER: /* "NUMBER" at this point is a label */
            case _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].ADDRESS:
            case _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGADDRESS:
                /* It can be a number OR a label */
                if (Object(rxjs_internal_util_isNumeric__WEBPACK_IMPORTED_MODULE_1__["isNumeric"])(item.value)) {
                    /* It is a number */
                    this.storeWordIntoCode(item.value, this.code.length);
                }
                else {
                    /* It is a label, we have to let space for the real word */
                    this.storeLabelIntoCode(item.value, this.code.length);
                }
                break;
            case _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_8BITS:
            case _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_16BITS:
            case _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].BYTE:
                this.code.push(item.value);
                break;
        }
    };
    AssemblerService.prototype.go = function (input) {
        this.code = [];
        this.mapping = new Map();
        this.labels = new Map();
        var lines = input.split('\n');
        for (var i = 0, l = lines.length; i < l; i++) {
            var match = REGEX.exec(lines[i]);
            if (match[1] === undefined && match[2] === undefined) {
                // Check if line starts with a comment otherwise the line contains an error and can not be parsed
                var line = lines[i].trim();
                if (line !== '' && line.slice(0, 1) !== ';') {
                    throw { error: 'Syntax error', line: i + 1 };
                }
                continue;
            }
            if (match[1] !== undefined) {
                this.addLabel(match[1]);
            }
            if (match[2] !== undefined) {
                var instr = match[2].toUpperCase();
                var p1 = void 0, p2 = void 0, instructionSpec = void 0;
                // Start parsing instructions (except DB, for it is not a real instruction)
                if (instr === 'DB') {
                    try {
                        p1 = AssemblerService_1.getValue(match[OP1_GROUP]);
                    }
                    catch (e) {
                        throw { error: e.toString(), line: i + 1 };
                    }
                    if (p1.type === _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].NUMBER) {
                        p1.type = AssemblerService_1.checkOperandTypeValue(_instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].BYTE, p1.value);
                        this.pushOperandToCode(p1);
                    }
                    else if (p1.type === _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].ARRAY) {
                        for (var j = 0, k = p1.value.length; j < k; j++) {
                            this.code.push(p1.value[j]);
                        }
                    }
                    else {
                        throw { error: 'DB does not support this operand', line: i + 1 };
                    }
                    continue;
                }
                else if (instr === 'DW') {
                    try {
                        p1 = AssemblerService_1.getValue(match[OP1_GROUP]);
                    }
                    catch (e) {
                        throw { error: e.toString(), line: i + 1 };
                    }
                    if (p1.type === _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].NUMBER) {
                        p1.type = AssemblerService_1.checkOperandTypeValue(_instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].WORD, p1.value);
                        this.pushOperandToCode(p1);
                    }
                    else {
                        throw { error: 'DW does not support this operand', line: i + 1 };
                    }
                    continue;
                }
                else if (instr === 'ORG') {
                    try {
                        p1 = AssemblerService_1.getValue(match[OP1_GROUP]);
                    }
                    catch (e) {
                        throw { error: e.toString(), line: i + 1 };
                    }
                    if (p1.type === _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].NUMBER) {
                        var offset = p1.value - this.code.length;
                        if (offset < 0) {
                            throw { error: 'ORG cannot set an address that already has been superseded', line: i + 1 };
                        }
                        this.code = this.code.concat(Array(offset).fill(0));
                    }
                    else {
                        throw { error: 'ORG does not support this operand', line: i + 1 };
                    }
                    continue;
                }
                this.mapping.set(this.code.length, i);
                if (match[OP1_GROUP] !== undefined) {
                    try {
                        p1 = AssemblerService_1.getValue(match[OP1_GROUP]);
                    }
                    catch (e) {
                        throw { error: e.toString(), line: i + 1 };
                    }
                    if (match[OP2_GROUP] !== undefined) {
                        try {
                            p2 = AssemblerService_1.getValue(match[OP2_GROUP]);
                        }
                        catch (e) {
                            throw { error: e.toString(), line: i + 1 };
                        }
                    }
                }
                try {
                    instructionSpec = _instrset__WEBPACK_IMPORTED_MODULE_2__["instructionSet"].getInstruction(instr, (p1) ? p1.type : undefined, (p2) ? p2.type : undefined);
                    if (p1) {
                        p1.type = AssemblerService_1.checkOperandTypeValue(instructionSpec.operand1, p1.value);
                    }
                    if (p2) {
                        p2.type = AssemblerService_1.checkOperandTypeValue(instructionSpec.operand2, p2.value);
                    }
                }
                catch (e) {
                    throw { error: e.toString(), line: i + 1 };
                }
                this.code.push(instructionSpec.opcode);
                if (p1) {
                    this.pushOperandToCode(p1);
                }
                if (p2) {
                    this.pushOperandToCode(p2);
                }
            }
        }
        // Replace labels
        for (var i = 0, l = this.code.length; i < l; i++) {
            if (Object(rxjs_internal_util_isNumeric__WEBPACK_IMPORTED_MODULE_1__["isNumeric"])(this.code[i]) === false) {
                var upperLabel = this.code[i].toString().toUpperCase();
                if (this.labels.has(upperLabel)) {
                    this.storeWordIntoCode(this.labels.get(upperLabel), i);
                }
                else {
                    throw { error: "Undefined label: " + this.code[i] };
                }
            }
        }
        return { code: this.code, mapping: this.mapping, labels: this.labels };
    };
    var AssemblerService_1;
    AssemblerService = AssemblerService_1 = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Injectable"])(),
        __metadata("design:paramtypes", [])
    ], AssemblerService);
    return AssemblerService;
}());



/***/ }),

/***/ "./src/app/autofocus.directive.ts":
/*!****************************************!*\
  !*** ./src/app/autofocus.directive.ts ***!
  \****************************************/
/*! exports provided: AutofocusDirective */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "AutofocusDirective", function() { return AutofocusDirective; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};

var AutofocusDirective = /** @class */ (function () {
    function AutofocusDirective(el) {
        this.el = el;
    }
    AutofocusDirective.prototype.ngAfterViewInit = function () {
        this.el.nativeElement.focus();
    };
    AutofocusDirective = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Directive"])({
            selector: '[appAutofocus]'
        }),
        __metadata("design:paramtypes", [_angular_core__WEBPACK_IMPORTED_MODULE_0__["ElementRef"]])
    ], AutofocusDirective);
    return AutofocusDirective;
}());



/***/ }),

/***/ "./src/app/clock.service.ts":
/*!**********************************!*\
  !*** ./src/app/clock.service.ts ***!
  \**********************************/
/*! exports provided: ClockService */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ClockService", function() { return ClockService; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var rxjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! rxjs */ "./node_modules/rxjs/_esm5/index.js");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};


var ClockService = /** @class */ (function () {
    function ClockService() {
        this.clockConsumeTicksSource = new rxjs__WEBPACK_IMPORTED_MODULE_1__["Subject"]();
        this.ticks = 0;
        this.clockConsumeTicks$ = this.clockConsumeTicksSource.asObservable();
    }
    ClockService.prototype.consumeTicks = function (ticks) {
        this.ticks += ticks;
        this.clockConsumeTicksSource.next(ticks);
    };
    ClockService.prototype.getClock = function () {
        return this.ticks;
    };
    ClockService = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Injectable"])(),
        __metadata("design:paramtypes", [])
    ], ClockService);
    return ClockService;
}());



/***/ }),

/***/ "./src/app/cpu.service.ts":
/*!********************************!*\
  !*** ./src/app/cpu.service.ts ***!
  \********************************/
/*! exports provided: ControlUnitOperationType, ControlUnitOperation, CPUService */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ControlUnitOperationType", function() { return ControlUnitOperationType; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ControlUnitOperation", function() { return ControlUnitOperation; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "CPUService", function() { return CPUService; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var rxjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! rxjs */ "./node_modules/rxjs/_esm5/index.js");
/* harmony import */ var _instrset__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./instrset */ "./src/app/instrset.ts");
/* harmony import */ var _memory_service__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./memory.service */ "./src/app/memory.service.ts");
/* harmony import */ var _ioregmap_service__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./ioregmap.service */ "./src/app/ioregmap.service.ts");
/* harmony import */ var _clock_service__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./clock.service */ "./src/app/clock.service.ts");
/* harmony import */ var _exceptions__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./exceptions */ "./src/app/exceptions.ts");
/* harmony import */ var _utils__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./utils */ "./src/app/utils.ts");
/* harmony import */ var _events_log_service__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./events-log.service */ "./src/app/events-log.service.ts");
/* harmony import */ var _cpuregs__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ./cpuregs */ "./src/app/cpuregs.ts");
/* harmony import */ var _alu__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ./alu */ "./src/app/alu.ts");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};











var IRQ_VECTOR_ADDRESS = 0x0003;
var SYSCALL_VECTOR_ADDRESS = 0x0006;
var EXCEPTION_VECTOR_ADDRESS = 0x0009;
var ControlUnitOperationType;
(function (ControlUnitOperationType) {
    ControlUnitOperationType[ControlUnitOperationType["RESET"] = 0] = "RESET";
    ControlUnitOperationType[ControlUnitOperationType["FETCH_OPCODE"] = 1] = "FETCH_OPCODE";
    ControlUnitOperationType[ControlUnitOperationType["DECODE"] = 2] = "DECODE";
    ControlUnitOperationType[ControlUnitOperationType["FETCH_OPERANDS"] = 3] = "FETCH_OPERANDS";
    ControlUnitOperationType[ControlUnitOperationType["RESOLVE_REGADDRESS"] = 4] = "RESOLVE_REGADDRESS";
    ControlUnitOperationType[ControlUnitOperationType["EXECUTE"] = 5] = "EXECUTE";
    ControlUnitOperationType[ControlUnitOperationType["CPU_FAULT"] = 6] = "CPU_FAULT";
    ControlUnitOperationType[ControlUnitOperationType["HALTED"] = 7] = "HALTED";
    ControlUnitOperationType[ControlUnitOperationType["WAKE_UP"] = 8] = "WAKE_UP";
    ControlUnitOperationType[ControlUnitOperationType["IRQ_RAISE_LEVEL"] = 9] = "IRQ_RAISE_LEVEL";
    ControlUnitOperationType[ControlUnitOperationType["IRQ_LOWER_LEVEL"] = 10] = "IRQ_LOWER_LEVEL";
})(ControlUnitOperationType || (ControlUnitOperationType = {}));
var ControlUnitOperationState;
(function (ControlUnitOperationState) {
    ControlUnitOperationState[ControlUnitOperationState["IN_PROGRESS"] = 0] = "IN_PROGRESS";
    ControlUnitOperationState[ControlUnitOperationState["FINISHED"] = 1] = "FINISHED";
})(ControlUnitOperationState || (ControlUnitOperationState = {}));
var ControlUnitOperation = /** @class */ (function () {
    function ControlUnitOperation(operationType, data, state) {
        this.operationType = operationType;
        this.data = data;
        this.state = state;
    }
    ControlUnitOperation.prototype.toString = function () {
        var ret, params;
        switch (this.operationType) {
            case ControlUnitOperationType.RESET:
                ret = "CU: Reset control unit";
                break;
            case ControlUnitOperationType.FETCH_OPCODE:
                params = this.data;
                ret = "CU: Fetch opcode from [0x" + _utils__WEBPACK_IMPORTED_MODULE_7__["Utils"].pad(params.address, 16, 4) + "]";
                break;
            case ControlUnitOperationType.DECODE:
                params = this.data;
                ret = "CU: Decode opcode 0x" + _utils__WEBPACK_IMPORTED_MODULE_7__["Utils"].pad(params.opcode, 16, 2);
                break;
            case ControlUnitOperationType.FETCH_OPERANDS:
                params = this.data;
                if (params.operand1Type === undefined && params.operand2Type === undefined) {
                    ret = "CU: Instruction {0x" + _utils__WEBPACK_IMPORTED_MODULE_7__["Utils"].pad(params.opcode, 16, 2) + ": " + _instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"][params.opcode] + "} has no operands";
                }
                else if (params.operand2Type === undefined) {
                    ret = "CU: Fetch operand " + _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"][params.operand1Type] + " from address [0x" + _utils__WEBPACK_IMPORTED_MODULE_7__["Utils"].pad(params.address, 16, 4) + "]";
                }
                else {
                    ret = "CU: Fetch operands (" + _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"][params.operand1Type] + ", " +
                        (_instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"][params.operand2Type] + ") from address [0x" + _utils__WEBPACK_IMPORTED_MODULE_7__["Utils"].pad(params.address, 16, 4) + "]");
                }
                break;
            case ControlUnitOperationType.RESOLVE_REGADDRESS:
                params = this.data;
                ret = "CU: Resolve indirect address [" + _cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"][params.register];
                ret += (params.offset >= 0) ? "+" + params.offset + "]" : params.offset + "]";
                break;
            case ControlUnitOperationType.EXECUTE:
                params = this.data;
                ret = "CU: Execute instruction {0x" + _utils__WEBPACK_IMPORTED_MODULE_7__["Utils"].pad(params.opcode, 16, 2) + ": " + _instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"][params.opcode] + "}";
                if (params.operand1Type !== undefined) {
                    if (params.operand1Type === _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].BYTE) {
                        ret += " (0x" + _utils__WEBPACK_IMPORTED_MODULE_7__["Utils"].pad(params.operand1Value, 16, 2);
                    }
                    else if (params.operand1Type === _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_8BITS ||
                        params.operand1Type === _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_16BITS) {
                        ret += " (0x" + _utils__WEBPACK_IMPORTED_MODULE_7__["Utils"].pad(params.operand1Value, 16, 2) + ": " + _cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"][params.operand1Value];
                    }
                    else {
                        ret += " (0x" + _utils__WEBPACK_IMPORTED_MODULE_7__["Utils"].pad(params.operand1Value, 16, 4);
                    }
                }
                else {
                    break;
                }
                if (params.operand2Type !== undefined) {
                    if (params.operand2Type === _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].BYTE) {
                        ret += ", 0x" + _utils__WEBPACK_IMPORTED_MODULE_7__["Utils"].pad(params.operand2Value, 16, 2) + ")";
                    }
                    else if (params.operand2Type === _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_8BITS ||
                        params.operand2Type === _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_16BITS) {
                        ret += ", 0x" + _utils__WEBPACK_IMPORTED_MODULE_7__["Utils"].pad(params.operand2Value, 16, 2) + ": " + _cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"][params.operand2Value] + ")";
                    }
                    else {
                        ret += ", 0x" + _utils__WEBPACK_IMPORTED_MODULE_7__["Utils"].pad(params.operand2Value, 16, 4) + ")";
                    }
                }
                else {
                    ret += ")";
                }
                break;
            case ControlUnitOperationType.HALTED:
                ret = "CU: CPU in halt mode";
                break;
            case ControlUnitOperationType.WAKE_UP:
                ret = "CU: CPU leaving halt mode";
                break;
            case ControlUnitOperationType.CPU_FAULT:
                ret = "CU: CPU in fault mode";
                break;
            case ControlUnitOperationType.IRQ_RAISE_LEVEL:
                ret = "CU: Risen CPU interrupt level signal";
                break;
            case ControlUnitOperationType.IRQ_LOWER_LEVEL:
                ret = "CU: Lowered CPU interrupt level signal";
                break;
            default:
                break;
        }
        return ret;
    };
    return ControlUnitOperation;
}());

var CPUService = /** @class */ (function () {
    function CPUService(memoryService, clockService, ioRegMapService, eventsLogService) {
        var _this = this;
        this.memoryService = memoryService;
        this.clockService = clockService;
        this.ioRegMapService = ioRegMapService;
        this.eventsLogService = eventsLogService;
        this.registersBank = new Map();
        this.cpuRegisterOperationSource = new rxjs__WEBPACK_IMPORTED_MODULE_1__["Subject"]();
        this.aluOperationSource = new rxjs__WEBPACK_IMPORTED_MODULE_1__["Subject"]();
        this.controlUnitOperationSource = new rxjs__WEBPACK_IMPORTED_MODULE_1__["Subject"]();
        this.nextIP = 0;
        this.interruptInput = 0;
        this.isHalted = false;
        this.isFault = false;
        var registerA = new _cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPUGeneralPurposeRegister"]('A', _cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].A, _cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].AH, _cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].AL, 0, function (op) { return _this.publishRegisterOperation(op); }, 'General Purpose Register A');
        this.registersBank.set(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].A, registerA);
        this.registersBank.set(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].AH, registerA);
        this.registersBank.set(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].AL, registerA);
        var registerB = new _cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPUGeneralPurposeRegister"]('B', _cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].B, _cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].BH, _cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].BL, 0, function (op) { return _this.publishRegisterOperation(op); }, 'General Purpose Register B');
        this.registersBank.set(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].B, registerB);
        this.registersBank.set(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].BH, registerB);
        this.registersBank.set(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].BL, registerB);
        var registerC = new _cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPUGeneralPurposeRegister"]('C', _cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].C, _cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].CH, _cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].CL, 0, function (op) { return _this.publishRegisterOperation(op); }, 'General Purpose Register C');
        this.registersBank.set(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].C, registerC);
        this.registersBank.set(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].CH, registerC);
        this.registersBank.set(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].CL, registerC);
        var registerD = new _cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPUGeneralPurposeRegister"]('D', _cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].D, _cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].DH, _cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].DL, 0, function (op) { return _this.publishRegisterOperation(op); }, 'General Purpose Register D');
        this.registersBank.set(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].D, registerD);
        this.registersBank.set(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].DH, registerD);
        this.registersBank.set(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].DL, registerD);
        this.userSP = new _cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegister"]('USP', _cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].USP, 0, function (op) { return _this.publishRegisterOperation(op); }, 'User Stack Pointer Register');
        this.supervisorSP = new _cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegister"]('SSP', _cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].SSP, 0, function (op) { return _this.publishRegisterOperation(op); }, 'Supervisor Stack Pointer Register');
        this.registersBank.set(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].SP, this.supervisorSP);
        this.registersBank.set(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].USP, this.userSP);
        this.registersBank.set(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].SSP, this.supervisorSP);
        this.registersBank.set(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].IP, new _cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegister"]('IP', _cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].IP, 0, function (op) { return _this.publishRegisterOperation(op); }, 'Instruction Pointer Register'));
        var statusRegister = new _cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPUStatusRegister"]('SR', _cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].SR, 0x8000, function (op) { return _this.publishRegisterOperation(op); }, 'Status Register');
        this.registersBank.set(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].SR, statusRegister);
        this.cpuRegisterOperation$ = this.cpuRegisterOperationSource.asObservable();
        this.cpuRegisterOperationSubscription = this.cpuRegisterOperation$.subscribe(function (cpuRegisterOperation) { return _this.processCPURegisterOperation(cpuRegisterOperation); });
        this.aluOperation$ = this.aluOperationSource.asObservable();
        this.controlUnitOperation$ = this.controlUnitOperationSource.asObservable();
        this.alu = new _alu__WEBPACK_IMPORTED_MODULE_10__["ArithmeticLogicUnit"](statusRegister, function (op) { return _this.publishALUOperation(op); });
    }
    CPUService_1 = CPUService;
    CPUService.is16bitsGPR = function (index) {
        return (index === _cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].A ||
            index === _cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].B ||
            index === _cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].C ||
            index === _cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].D);
    };
    CPUService.is16bitsGPRorSP = function (index) {
        return (CPUService_1.is16bitsGPR(index) || index === _cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].SP);
    };
    CPUService.is8bitsGPR = function (index) {
        return (index === _cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].AH ||
            index === _cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].AL ||
            index === _cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].BH ||
            index === _cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].BL ||
            index === _cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].CH ||
            index === _cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].CL ||
            index === _cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].DH ||
            index === _cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].DL);
    };
    CPUService.getByteFrom8bitsGPR = function (index) {
        var byte;
        switch (index) {
            case _cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].AH:
            case _cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].BH:
            case _cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].CH:
            case _cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].DH:
                byte = 'high';
                break;
            case _cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].AL:
            case _cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].BL:
            case _cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].CL:
            case _cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].DL:
                byte = 'low';
                break;
        }
        return byte;
    };
    CPUService.prototype.publishRegisterOperation = function (operation) {
        this.eventsLogService.log(operation);
        this.cpuRegisterOperationSource.next(operation);
    };
    CPUService.prototype.publishALUOperation = function (operation) {
        this.eventsLogService.log(operation);
        this.aluOperationSource.next(operation);
    };
    CPUService.prototype.publishControlUnitOperation = function (operation, flushGroups) {
        if (flushGroups === void 0) { flushGroups = false; }
        this.eventsLogService.log(operation, flushGroups);
        this.controlUnitOperationSource.next(operation);
    };
    CPUService.prototype.publishControlUnitOperationStart = function (operation) {
        operation.state = ControlUnitOperationState.IN_PROGRESS;
        this.eventsLogService.startEventGroup(operation);
        this.controlUnitOperationSource.next(operation);
    };
    CPUService.prototype.publishControlUnitOperationEnd = function (operation) {
        operation.state = ControlUnitOperationState.FINISHED;
        this.eventsLogService.endEventGroup(operation);
        this.controlUnitOperationSource.next(operation);
    };
    CPUService.prototype.operationWriteRegister = function (index, value) {
        if (index === _cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].SR) {
            if ((value & (1 << _cpuregs__WEBPACK_IMPORTED_MODULE_9__["SRBit"].HALT)) !== 0 && this.isHalted === false) {
                // The system was halted from within the CU by executing HLT
                this.isHalted = true;
                this.publishControlUnitOperation(new ControlUnitOperation(ControlUnitOperationType.HALTED), true);
            }
        }
    };
    CPUService.prototype.operationWriteBit = function (index, bitNumber, value) {
        if (index === _cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].SR) {
            if (bitNumber === _cpuregs__WEBPACK_IMPORTED_MODULE_9__["SRBit"].HALT && value === 1 && this.isHalted === false) {
                this.isHalted = true;
                this.publishControlUnitOperation(new ControlUnitOperation(ControlUnitOperationType.HALTED), true);
            }
        }
    };
    CPUService.prototype.processCPURegisterOperation = function (cpuRegisterOperation) {
        switch (cpuRegisterOperation.operationType) {
            case _cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterOperationType"].WRITE:
                this.operationWriteRegister(cpuRegisterOperation.data.index, cpuRegisterOperation.data.value);
                break;
            case _cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterOperationType"].WRITE_BIT:
                this.operationWriteBit(cpuRegisterOperation.data.index, cpuRegisterOperation.data.bitNumber, cpuRegisterOperation.data.value);
                break;
        }
    };
    CPUService.prototype.getRegistersBank = function () {
        return this.registersBank;
    };
    Object.defineProperty(CPUService.prototype, "SP", {
        get: function () {
            return this.registersBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].SP);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CPUService.prototype, "IP", {
        get: function () {
            return this.registersBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].IP);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CPUService.prototype, "SR", {
        get: function () {
            return this.registersBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].SR);
        },
        enumerable: true,
        configurable: true
    });
    CPUService.prototype.pushByte = function (value) {
        var currentSP = this.SP.value;
        this.memoryService.storeByte(currentSP, value, (this.SR.supervisor === 1 ? _memory_service__WEBPACK_IMPORTED_MODULE_3__["MemoryAccessActor"].CPU_SUPERVISOR : _memory_service__WEBPACK_IMPORTED_MODULE_3__["MemoryAccessActor"].CPU_USER));
        this.SP.value = currentSP - 1;
    };
    CPUService.prototype.pushWord = function (value) {
        var currentSP = this.SP.value;
        this.memoryService.storeWord(currentSP - 1, value, (this.SR.supervisor === 1 ? _memory_service__WEBPACK_IMPORTED_MODULE_3__["MemoryAccessActor"].CPU_SUPERVISOR : _memory_service__WEBPACK_IMPORTED_MODULE_3__["MemoryAccessActor"].CPU_USER));
        this.SP.value = currentSP - 2;
    };
    CPUService.prototype.popByte = function () {
        var currentSP = this.SP.value;
        var value = this.memoryService.loadByte(currentSP + 1);
        this.SP.value = currentSP + 1;
        return value;
    };
    CPUService.prototype.popWord = function () {
        var currentSP = this.SP.value;
        var value = this.memoryService.loadWord(currentSP + 1);
        this.SP.value = currentSP + 2;
        return value;
    };
    CPUService.prototype.toInterruptHandler = function () {
        var currentSR = this.SR.value;
        var currentIP = this.IP.value;
        var currentSP = this.SP.value;
        if ((currentSR & 0x8000) === 0) {
            /* We are coming from user mode */
            this.SR.supervisor = 1;
            this.registersBank.set(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].SP, this.supervisorSP);
        }
        try {
            this.pushWord(currentSR);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].STACK_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value);
        }
        try {
            this.pushWord(currentSP);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].STACK_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value);
        }
        try {
            this.pushWord(currentIP);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].STACK_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value);
        }
        this.IP.value = IRQ_VECTOR_ADDRESS;
        this.SR.irqMask = 0;
    };
    CPUService.prototype.raiseInterrupt = function () {
        if (this.isFault === true) {
            throw Error('CPU in FAULT mode: reset required');
        }
        var operation;
        this.interruptInput = 1;
        operation = new ControlUnitOperation(ControlUnitOperationType.IRQ_RAISE_LEVEL);
        this.publishControlUnitOperation(operation);
        if (this.SR.irqMask === 1) {
            operation = new ControlUnitOperation(ControlUnitOperationType.WAKE_UP);
            this.publishControlUnitOperationStart(operation);
            this.isHalted = false;
            this.SR.halt = 0;
            this.publishControlUnitOperationEnd(operation);
            try {
                this.toInterruptHandler();
            }
            catch (e) {
                this.SR.fault = 1;
                this.isFault = true;
                this.publishControlUnitOperation(new ControlUnitOperation(ControlUnitOperationType.CPU_FAULT));
            }
        }
    };
    CPUService.prototype.lowerInterrupt = function () {
        this.interruptInput = 0;
        this.publishControlUnitOperation(new ControlUnitOperation(ControlUnitOperationType.IRQ_LOWER_LEVEL));
    };
    CPUService.prototype.reset = function () {
        var operation = new ControlUnitOperation(ControlUnitOperationType.RESET);
        this.publishControlUnitOperationStart(operation);
        this.registersBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].A).value = this.registersBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].A).resetValue;
        this.registersBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].B).value = this.registersBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].B).resetValue;
        this.registersBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].C).value = this.registersBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].C).resetValue;
        this.registersBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].D).value = this.registersBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].D).resetValue;
        this.registersBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].IP).value = this.registersBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].IP).resetValue;
        this.isHalted = false;
        this.isFault = false;
        this.registersBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].SR).value = this.registersBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].SR).resetValue;
        this.userSP.value = this.userSP.resetValue;
        this.supervisorSP.value = this.supervisorSP.resetValue;
        this.registersBank.set(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].SP, this.supervisorSP);
        this.interruptInput = 0;
        this.publishControlUnitOperationEnd(operation);
    };
    CPUService.prototype.fetchAndDecode = function (args) {
        var opcode, parameters, operation;
        parameters = {
            address: this.nextIP
        };
        operation = new ControlUnitOperation(ControlUnitOperationType.FETCH_OPCODE, parameters);
        this.publishControlUnitOperationStart(operation);
        try {
            opcode = this.memoryService.loadByte(this.nextIP);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].INSTRUCTION_FETCH_ERROR, "Error when fetching instruction at " + this.nextIP, this.IP.value, this.SP.value, this.SR.value);
        }
        this.publishControlUnitOperationEnd(operation);
        this.nextIP += 1;
        parameters = {
            opcode: opcode
        };
        this.publishControlUnitOperation(new ControlUnitOperation(ControlUnitOperationType.DECODE, parameters));
        var instruction = _instrset__WEBPACK_IMPORTED_MODULE_2__["instructionSet"].getInstructionFromOpCode(opcode);
        if (instruction === undefined) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].UNKNOWN_OPCODE, "Invalid opcode: " + opcode, this.IP.value, this.SP.value, this.SR.value);
        }
        parameters = {
            opcode: instruction.opcode,
            address: this.nextIP,
            operand1Type: instruction.operand1,
            operand2Type: instruction.operand2
        };
        operation = new ControlUnitOperation(ControlUnitOperationType.FETCH_OPERANDS, parameters);
        this.publishControlUnitOperationStart(operation);
        var byte, word, register, regaddress, offset, address;
        switch (instruction.operand1) {
            case _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].BYTE:
                try {
                    byte = this.memoryService.loadByte(this.nextIP);
                }
                catch (e) {
                    throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].INSTRUCTION_FETCH_ERROR, "Error when fetching instruction at " + this.nextIP, this.IP.value, this.SP.value, this.SR.value);
                }
                args.push(byte);
                this.nextIP += 1;
                break;
            case _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_8BITS:
            case _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_16BITS:
                try {
                    register = this.memoryService.loadByte(this.nextIP);
                }
                catch (e) {
                    throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].INSTRUCTION_FETCH_ERROR, "Error when fetching instruction at " + this.nextIP, this.IP.value, this.SP.value, this.SR.value);
                }
                args.push(register);
                this.nextIP += 1;
                break;
            case _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].WORD:
            case _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].ADDRESS:
                try {
                    word = this.memoryService.loadWord(this.nextIP);
                }
                catch (e) {
                    throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].INSTRUCTION_FETCH_ERROR, "Error when fetching instruction at " + this.nextIP, this.IP.value, this.SP.value, this.SR.value);
                }
                args.push(word);
                this.nextIP += 2;
                break;
            case _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGADDRESS:
                try {
                    regaddress = this.memoryService.loadWord(this.nextIP);
                }
                catch (e) {
                    throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].INSTRUCTION_FETCH_ERROR, "Error when fetching instruction at " + this.nextIP, this.IP.value, this.SP.value, this.SR.value);
                }
                offset = (regaddress & 0xFF00) >>> 8;
                register = (regaddress & 0x00FF);
                if (offset > 127) {
                    offset = offset - 256;
                }
                parameters = {
                    register: register,
                    offset: offset
                };
                this.publishControlUnitOperation(new ControlUnitOperation(ControlUnitOperationType.RESOLVE_REGADDRESS, parameters));
                if (CPUService_1.is16bitsGPRorSP(register) === false) {
                    throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + register + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
                }
                address = this.registersBank.get(register).value + offset;
                args.push(address);
                this.nextIP += 2;
                break;
            default:
                break;
        }
        switch (instruction.operand2) {
            case _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].BYTE:
                try {
                    byte = this.memoryService.loadByte(this.nextIP);
                }
                catch (e) {
                    throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].INSTRUCTION_FETCH_ERROR, "Error when fetching instruction at " + this.nextIP, this.IP.value, this.SP.value, this.SR.value);
                }
                args.push(byte);
                this.nextIP += 1;
                break;
            case _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_8BITS:
            case _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_16BITS:
                try {
                    register = this.memoryService.loadByte(this.nextIP);
                }
                catch (e) {
                    throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].INSTRUCTION_FETCH_ERROR, "Error when fetching instruction at " + this.nextIP, this.IP.value, this.SP.value, this.SR.value);
                }
                args.push(register);
                this.nextIP += 1;
                break;
            case _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].WORD:
            case _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].ADDRESS:
                try {
                    word = this.memoryService.loadWord(this.nextIP);
                }
                catch (e) {
                    throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].INSTRUCTION_FETCH_ERROR, "Error when fetching instruction at " + this.nextIP, this.IP.value, this.SP.value, this.SR.value);
                }
                args.push(word);
                this.nextIP += 2;
                break;
            case _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGADDRESS:
                try {
                    regaddress = this.memoryService.loadWord(this.nextIP);
                }
                catch (e) {
                    throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].INSTRUCTION_FETCH_ERROR, "Error when fetching instruction at " + this.nextIP, this.IP.value, this.SP.value, this.SR.value);
                }
                offset = (regaddress & 0xFF00) >>> 8;
                register = (regaddress & 0x00FF);
                if (offset > 127) {
                    offset = offset - 256;
                }
                parameters = {
                    register: register,
                    offset: offset
                };
                this.publishControlUnitOperation(new ControlUnitOperation(ControlUnitOperationType.RESOLVE_REGADDRESS, parameters));
                if (CPUService_1.is16bitsGPRorSP(register) === false) {
                    throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + register + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
                }
                address = this.registersBank.get(register).value + offset;
                args.push(address);
                this.nextIP += 2;
                break;
        }
        this.publishControlUnitOperationEnd(operation);
        return instruction;
    };
    CPUService.prototype.step = function () {
        if (this.isFault === true) {
            throw Error('CPU in FAULT mode: reset required');
        }
        else if (this.isHalted === true) {
            this.clockService.consumeTicks(1);
            return;
        }
        this.nextIP = this.IP.value;
        var operation;
        try {
            var args = [];
            var instruction = this.fetchAndDecode(args);
            var parameters = {
                opcode: instruction.opcode,
                operand1Type: instruction.operand1,
                operand1Value: args[0],
                operand2Type: instruction.operand2,
                operand2Value: args[1]
            };
            operation = new ControlUnitOperation(ControlUnitOperationType.EXECUTE, parameters);
            this.publishControlUnitOperationStart(operation);
            if (this[instruction.methodName].apply(this, args) === true) {
                this.publishControlUnitOperationEnd(operation);
                this.IP.value = this.nextIP;
            }
            else {
                this.publishControlUnitOperationEnd(operation);
            }
            this.clockService.consumeTicks(1);
        }
        catch (e) {
            if (e instanceof _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"] && this.SR.supervisor === 0) {
                if (operation) {
                    this.publishControlUnitOperationEnd(operation);
                }
                this.SR.supervisor = 1;
                this.registersBank.set(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].SP, this.supervisorSP);
                try {
                    this.pushWord(e.SR);
                    this.pushWord(e.SP);
                    this.pushWord(e.IP);
                    if (e.type === _exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].MEMORY_ACCESS_ERROR) {
                        this.pushWord(e.memoryAddress);
                    }
                    this.pushWord(e.type);
                }
                catch (e) {
                    this.SR.fault = 1;
                    this.isFault = true;
                    this.publishControlUnitOperation(new ControlUnitOperation(ControlUnitOperationType.CPU_FAULT));
                    throw Error("Exception occurred while creating the exception frame: " + e.message);
                }
                this.IP.value = EXCEPTION_VECTOR_ADDRESS;
            }
            else if (e instanceof _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"]) {
                this.SR.fault = 1;
                this.isFault = true;
                this.publishControlUnitOperation(new ControlUnitOperation(ControlUnitOperationType.CPU_FAULT));
                throw Error("Exception occurred while in supervisor mode: " + e.message);
            }
            else {
                this.SR.fault = 1;
                this.isFault = true;
                this.publishControlUnitOperation(new ControlUnitOperation(ControlUnitOperationType.CPU_FAULT));
                throw e;
            }
        }
    };
    CPUService.prototype.instrHLT = function () {
        this.SR.halt = 1;
        return false;
    };
    CPUService.prototype.instrMOV_REG16_TO_REG16 = function (toRegister, fromRegister) {
        if (CPUService_1.is16bitsGPRorSP(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        if (CPUService_1.is16bitsGPRorSP(fromRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid second operand: register index " + fromRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        this.registersBank.get(toRegister).value = this.registersBank.get(fromRegister).value;
        return true;
    };
    CPUService.prototype.instrMOV_ADDRESS_TO_REG16 = function (toRegister, fromAddress) {
        if (CPUService_1.is16bitsGPRorSP(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var word;
        try {
            word = this.memoryService.loadWord(fromAddress);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].MEMORY_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }
        this.registersBank.get(toRegister).value = word;
        return true;
    };
    CPUService.prototype.instrMOV_REGADDRESS_TO_REG16 = function (toRegister, fromAddress) {
        if (CPUService_1.is16bitsGPRorSP(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        this.registersBank.get(toRegister).value = this.memoryService.loadWord(fromAddress);
        return true;
    };
    CPUService.prototype.instrMOV_REG16_TO_ADDRESS = function (toAddress, fromRegister) {
        if (CPUService_1.is16bitsGPRorSP(fromRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid second operand: register index " + fromRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        try {
            this.memoryService.storeWord(toAddress, this.registersBank.get(fromRegister).value, (this.SR.supervisor === 1 ? _memory_service__WEBPACK_IMPORTED_MODULE_3__["MemoryAccessActor"].CPU_SUPERVISOR : _memory_service__WEBPACK_IMPORTED_MODULE_3__["MemoryAccessActor"].CPU_USER));
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].MEMORY_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value, toAddress);
        }
        return true;
    };
    CPUService.prototype.instrMOV_REG16_TO_REGADDRESS = function (toAddress, fromRegister) {
        if (CPUService_1.is16bitsGPRorSP(fromRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid second operand: register index " + fromRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        try {
            this.memoryService.storeWord(toAddress, this.registersBank.get(fromRegister).value, (this.SR.supervisor === 1 ? _memory_service__WEBPACK_IMPORTED_MODULE_3__["MemoryAccessActor"].CPU_SUPERVISOR : _memory_service__WEBPACK_IMPORTED_MODULE_3__["MemoryAccessActor"].CPU_USER));
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].MEMORY_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value, toAddress);
        }
        return true;
    };
    CPUService.prototype.instrMOV_WORD_TO_REG16 = function (toRegister, word) {
        if (CPUService_1.is16bitsGPRorSP(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        this.registersBank.get(toRegister).value = word;
        return true;
    };
    CPUService.prototype.instrMOV_WORD_TO_ADDRESS = function (toAddress, word) {
        try {
            this.memoryService.storeWord(toAddress, word, (this.SR.supervisor === 1 ? _memory_service__WEBPACK_IMPORTED_MODULE_3__["MemoryAccessActor"].CPU_SUPERVISOR : _memory_service__WEBPACK_IMPORTED_MODULE_3__["MemoryAccessActor"].CPU_USER));
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].MEMORY_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value, toAddress);
        }
        return true;
    };
    CPUService.prototype.instrMOV_WORD_TO_REGADDRESS = function (toAddress, word) {
        try {
            this.memoryService.storeWord(toAddress, word, (this.SR.supervisor === 1 ? _memory_service__WEBPACK_IMPORTED_MODULE_3__["MemoryAccessActor"].CPU_SUPERVISOR : _memory_service__WEBPACK_IMPORTED_MODULE_3__["MemoryAccessActor"].CPU_USER));
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].MEMORY_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value, toAddress);
        }
        return true;
    };
    CPUService.prototype.instrMOVB_REG8_TO_REG8 = function (toRegister, fromRegister) {
        if (CPUService_1.is8bitsGPR(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        if (CPUService_1.is8bitsGPR(fromRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid second operand: register index " + fromRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var byteToRegister = CPUService_1.getByteFrom8bitsGPR(toRegister);
        var byteFromRegister = CPUService_1.getByteFrom8bitsGPR(fromRegister);
        this.registersBank.get(toRegister)[byteToRegister] = this.registersBank.get(fromRegister)[byteFromRegister];
        return true;
    };
    CPUService.prototype.instrMOVB_ADDRESS_TO_REG8 = function (toRegister, fromAddress) {
        if (CPUService_1.is8bitsGPR(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var byteToRegister = CPUService_1.getByteFrom8bitsGPR(toRegister);
        var byte;
        try {
            byte = this.memoryService.loadByte(fromAddress);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].MEMORY_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }
        this.registersBank.get(toRegister)[byteToRegister] = byte;
        return true;
    };
    CPUService.prototype.instrMOVB_REGADDRESS_TO_REG8 = function (toRegister, fromAddress) {
        if (CPUService_1.is8bitsGPR(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var byteToRegister = CPUService_1.getByteFrom8bitsGPR(toRegister);
        var byte;
        try {
            byte = this.memoryService.loadByte(fromAddress);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].MEMORY_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }
        this.registersBank.get(toRegister)[byteToRegister] = byte;
        return true;
    };
    CPUService.prototype.instrMOVB_REG8_TO_ADDRESS = function (toAddress, fromRegister) {
        if (CPUService_1.is8bitsGPR(fromRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid second operand: register index " + fromRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var byteFromRegister = CPUService_1.getByteFrom8bitsGPR(fromRegister);
        try {
            this.memoryService.storeByte(toAddress, this.registersBank.get(fromRegister)[byteFromRegister], (this.SR.supervisor === 1 ? _memory_service__WEBPACK_IMPORTED_MODULE_3__["MemoryAccessActor"].CPU_SUPERVISOR : _memory_service__WEBPACK_IMPORTED_MODULE_3__["MemoryAccessActor"].CPU_USER));
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].MEMORY_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value, toAddress);
        }
        return true;
    };
    CPUService.prototype.instrMOVB_REG8_TO_REGADDRESS = function (toAddress, fromRegister) {
        if (CPUService_1.is8bitsGPR(fromRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid second operand: register index " + fromRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var byteFromRegister = CPUService_1.getByteFrom8bitsGPR(fromRegister);
        try {
            this.memoryService.storeByte(toAddress, this.registersBank.get(fromRegister)[byteFromRegister], (this.SR.supervisor === 1 ? _memory_service__WEBPACK_IMPORTED_MODULE_3__["MemoryAccessActor"].CPU_SUPERVISOR : _memory_service__WEBPACK_IMPORTED_MODULE_3__["MemoryAccessActor"].CPU_USER));
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].MEMORY_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value, toAddress);
        }
        return true;
    };
    CPUService.prototype.instrMOVB_BYTE_TO_REG8 = function (toRegister, byte) {
        if (CPUService_1.is8bitsGPR(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var byteToRegister = CPUService_1.getByteFrom8bitsGPR(toRegister);
        this.registersBank.get(toRegister)[byteToRegister] = byte;
        return true;
    };
    CPUService.prototype.instrMOVB_BYTE_TO_ADDRESS = function (toAddress, byte) {
        try {
            this.memoryService.storeByte(toAddress, byte, (this.SR.supervisor === 1 ? _memory_service__WEBPACK_IMPORTED_MODULE_3__["MemoryAccessActor"].CPU_SUPERVISOR : _memory_service__WEBPACK_IMPORTED_MODULE_3__["MemoryAccessActor"].CPU_USER));
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].MEMORY_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value, toAddress);
        }
        return true;
    };
    CPUService.prototype.instrMOVB_BYTE_TO_REGADDRESS = function (toAddress, byte) {
        try {
            this.memoryService.storeByte(toAddress, byte, (this.SR.supervisor === 1 ? _memory_service__WEBPACK_IMPORTED_MODULE_3__["MemoryAccessActor"].CPU_SUPERVISOR : _memory_service__WEBPACK_IMPORTED_MODULE_3__["MemoryAccessActor"].CPU_USER));
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].MEMORY_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value, toAddress);
        }
        return true;
    };
    CPUService.prototype.instrADD_REG16_TO_REG16 = function (toRegister, fromRegister) {
        if (CPUService_1.is16bitsGPRorSP(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        if (CPUService_1.is16bitsGPRorSP(fromRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid second operand: register index " + fromRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        this.registersBank.get(toRegister).value =
            this.alu.performAddition16Bits(this.registersBank.get(toRegister).value, this.registersBank.get(fromRegister).value);
        return true;
    };
    CPUService.prototype.instrADD_REGADDRESS_TO_REG16 = function (toRegister, fromAddress) {
        if (CPUService_1.is16bitsGPRorSP(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var word;
        try {
            word = this.memoryService.loadWord(fromAddress);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].MEMORY_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }
        this.registersBank.get(toRegister).value =
            this.alu.performAddition16Bits(this.registersBank.get(toRegister).value, word);
        return true;
    };
    CPUService.prototype.instrADD_ADDRESS_TO_REG16 = function (toRegister, fromAddress) {
        if (CPUService_1.is16bitsGPRorSP(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var word;
        try {
            word = this.memoryService.loadWord(fromAddress);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].MEMORY_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }
        this.registersBank.get(toRegister).value =
            this.alu.performAddition16Bits(this.registersBank.get(toRegister).value, word);
        return true;
    };
    CPUService.prototype.instrADD_WORD_TO_REG16 = function (toRegister, word) {
        if (CPUService_1.is16bitsGPRorSP(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        this.registersBank.get(toRegister).value =
            this.alu.performAddition16Bits(this.registersBank.get(toRegister).value, word);
        return true;
    };
    CPUService.prototype.instrADDB_REG8_TO_REG8 = function (toRegister, fromRegister) {
        if (CPUService_1.is8bitsGPR(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        if (CPUService_1.is8bitsGPR(fromRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid second operand: register index " + fromRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var byteToRegister = CPUService_1.getByteFrom8bitsGPR(toRegister);
        var byteFromRegister = CPUService_1.getByteFrom8bitsGPR(fromRegister);
        this.registersBank.get(toRegister)[byteToRegister] =
            this.alu.performAddition8Bits(this.registersBank.get(toRegister)[byteToRegister], this.registersBank.get(fromRegister)[byteFromRegister]);
        return true;
    };
    CPUService.prototype.instrADDB_REGADDRESS_TO_REG8 = function (toRegister, fromAddress) {
        if (CPUService_1.is8bitsGPR(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var byteToRegister = CPUService_1.getByteFrom8bitsGPR(toRegister);
        var byte;
        try {
            byte = this.memoryService.loadByte(fromAddress);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].MEMORY_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }
        this.registersBank.get(toRegister)[byteToRegister] =
            this.alu.performAddition8Bits(this.registersBank.get(toRegister)[byteToRegister], byte);
        return true;
    };
    CPUService.prototype.instrADDB_ADDRESS_TO_REG8 = function (toRegister, fromAddress) {
        if (CPUService_1.is8bitsGPR(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var byteToRegister = CPUService_1.getByteFrom8bitsGPR(toRegister);
        var byte;
        try {
            byte = this.memoryService.loadByte(fromAddress);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].MEMORY_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }
        this.registersBank.get(toRegister)[byteToRegister] =
            this.alu.performAddition8Bits(this.registersBank.get(toRegister)[byteToRegister], byte);
        return true;
    };
    CPUService.prototype.instrADDB_BYTE_TO_REG = function (toRegister, byte) {
        if (CPUService_1.is8bitsGPR(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var byteToRegister = CPUService_1.getByteFrom8bitsGPR(toRegister);
        this.registersBank.get(toRegister)[byteToRegister] =
            this.alu.performAddition8Bits(this.registersBank.get(toRegister)[byteToRegister], byte);
        return true;
    };
    CPUService.prototype.instrSUB_REG16_FROM_REG16 = function (toRegister, fromRegister) {
        if (CPUService_1.is16bitsGPRorSP(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        if (CPUService_1.is16bitsGPRorSP(fromRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid second operand: register index " + fromRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        this.registersBank.get(toRegister).value =
            this.alu.performSubstraction16Bits(this.registersBank.get(toRegister).value, this.registersBank.get(fromRegister).value);
        return true;
    };
    CPUService.prototype.instrSUB_REGADDRESS_FROM_REG16 = function (toRegister, fromAddress) {
        if (CPUService_1.is16bitsGPRorSP(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var word;
        try {
            word = this.memoryService.loadWord(fromAddress);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].MEMORY_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }
        this.registersBank.get(toRegister).value =
            this.alu.performSubstraction16Bits(this.registersBank.get(toRegister).value, word);
        return true;
    };
    CPUService.prototype.instrSUB_ADDRESS_FROM_REG16 = function (toRegister, fromAddress) {
        if (CPUService_1.is16bitsGPRorSP(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var word;
        try {
            word = this.memoryService.loadWord(fromAddress);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].MEMORY_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }
        this.registersBank.get(toRegister).value =
            this.alu.performSubstraction16Bits(this.registersBank.get(toRegister).value, word);
        return true;
    };
    CPUService.prototype.instrSUB_WORD_FROM_REG16 = function (toRegister, word) {
        if (CPUService_1.is16bitsGPRorSP(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        this.registersBank.get(toRegister).value =
            this.alu.performSubstraction16Bits(this.registersBank.get(toRegister).value, word);
        return true;
    };
    CPUService.prototype.instrSUBB_REG8_FROM_REG8 = function (toRegister, fromRegister) {
        if (CPUService_1.is8bitsGPR(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        if (CPUService_1.is8bitsGPR(fromRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid second operand: register index " + fromRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var byteToRegister = CPUService_1.getByteFrom8bitsGPR(toRegister);
        var byteFromRegister = CPUService_1.getByteFrom8bitsGPR(fromRegister);
        this.registersBank.get(toRegister)[byteToRegister] =
            this.alu.performSubstraction8Bits(this.registersBank.get(toRegister)[byteToRegister], this.registersBank.get(fromRegister)[byteFromRegister]);
        return true;
    };
    CPUService.prototype.instrSUBB_REGADDRESS_FROM_REG8 = function (toRegister, fromAddress) {
        if (CPUService_1.is8bitsGPR(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var byteToRegister = CPUService_1.getByteFrom8bitsGPR(toRegister);
        var byte;
        try {
            byte = this.memoryService.loadByte(fromAddress);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].MEMORY_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }
        this.registersBank.get(toRegister)[byteToRegister] =
            this.alu.performSubstraction8Bits(this.registersBank.get(toRegister)[byteToRegister], byte);
        return true;
    };
    CPUService.prototype.instrSUBB_ADDRESS_FROM_REG8 = function (toRegister, fromAddress) {
        if (CPUService_1.is8bitsGPR(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var byteToRegister = CPUService_1.getByteFrom8bitsGPR(toRegister);
        var byte;
        try {
            byte = this.memoryService.loadByte(fromAddress);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].MEMORY_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }
        this.registersBank.get(toRegister)[byteToRegister] =
            this.alu.performSubstraction8Bits(this.registersBank.get(toRegister)[byteToRegister], byte);
        return true;
    };
    CPUService.prototype.instrSUBB_BYTE_FROM_REG8 = function (toRegister, byte) {
        if (CPUService_1.is8bitsGPR(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var byteToRegister = CPUService_1.getByteFrom8bitsGPR(toRegister);
        this.registersBank.get(toRegister)[byteToRegister] =
            this.alu.performSubstraction8Bits(this.registersBank.get(toRegister)[byteToRegister], byte);
        return true;
    };
    CPUService.prototype.instrINC_REG16 = function (toRegister) {
        if (CPUService_1.is16bitsGPRorSP(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        this.registersBank.get(toRegister).value =
            this.alu.performAddition16Bits(this.registersBank.get(toRegister).value, 1);
        return true;
    };
    CPUService.prototype.instrINCB_REG8 = function (toRegister) {
        if (CPUService_1.is8bitsGPR(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var byteToRegister = CPUService_1.getByteFrom8bitsGPR(toRegister);
        this.registersBank.get(toRegister)[byteToRegister] =
            this.alu.performAddition8Bits(this.registersBank.get(toRegister)[byteToRegister], 1);
        return true;
    };
    CPUService.prototype.instrDEC_REG16 = function (toRegister) {
        if (CPUService_1.is16bitsGPRorSP(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        this.registersBank.get(toRegister).value =
            this.alu.performSubstraction16Bits(this.registersBank.get(toRegister).value, 1);
        return true;
    };
    CPUService.prototype.instrDECB_REG8 = function (toRegister) {
        if (CPUService_1.is8bitsGPR(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var byteToRegister = CPUService_1.getByteFrom8bitsGPR(toRegister);
        this.registersBank.get(toRegister)[byteToRegister] =
            this.alu.performSubstraction8Bits(this.registersBank.get(toRegister)[byteToRegister], 1);
        return true;
    };
    CPUService.prototype.instrCMP_REG16_WITH_REG16 = function (toRegister, fromRegister) {
        if (CPUService_1.is16bitsGPRorSP(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        if (CPUService_1.is16bitsGPRorSP(fromRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid second operand: register index " + fromRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        this.alu.performSubstraction16Bits(this.registersBank.get(toRegister).value, this.registersBank.get(fromRegister).value);
        return true;
    };
    CPUService.prototype.instrCMP_REGADDRESS_WITH_REG16 = function (toRegister, fromAddress) {
        if (CPUService_1.is16bitsGPRorSP(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var word;
        try {
            word = this.memoryService.loadWord(fromAddress);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].MEMORY_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }
        this.alu.performSubstraction16Bits(this.registersBank.get(toRegister).value, word);
        return true;
    };
    CPUService.prototype.instrCMP_ADDRESS_WITH_REG16 = function (toRegister, fromAddress) {
        if (CPUService_1.is16bitsGPRorSP(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var word;
        try {
            word = this.memoryService.loadWord(fromAddress);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].MEMORY_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }
        this.alu.performSubstraction16Bits(this.registersBank.get(toRegister).value, word);
        return true;
    };
    CPUService.prototype.instrCMP_WORD_WITH_REG16 = function (toRegister, word) {
        if (CPUService_1.is16bitsGPRorSP(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        this.alu.performSubstraction16Bits(this.registersBank.get(toRegister).value, word);
        return true;
    };
    CPUService.prototype.instrCMPB_REG8_WITH_REG8 = function (toRegister, fromRegister) {
        if (CPUService_1.is8bitsGPR(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        if (CPUService_1.is8bitsGPR(fromRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid second operand: register index " + fromRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var byteToRegister = CPUService_1.getByteFrom8bitsGPR(toRegister);
        var byteFromRegister = CPUService_1.getByteFrom8bitsGPR(fromRegister);
        this.alu.performSubstraction8Bits(this.registersBank.get(toRegister)[byteToRegister], this.registersBank.get(fromRegister)[byteFromRegister]);
        return true;
    };
    CPUService.prototype.instrCMPB_REGADDRESS_WITH_REG8 = function (toRegister, fromAddress) {
        if (CPUService_1.is8bitsGPR(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var byteToRegister = CPUService_1.getByteFrom8bitsGPR(toRegister);
        var byte;
        try {
            byte = this.memoryService.loadByte(fromAddress);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].MEMORY_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }
        this.alu.performSubstraction8Bits(this.registersBank.get(toRegister)[byteToRegister], byte);
        return true;
    };
    CPUService.prototype.instrCMPB_ADDRESS_WITH_REG8 = function (toRegister, fromAddress) {
        if (CPUService_1.is8bitsGPR(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var byteToRegister = CPUService_1.getByteFrom8bitsGPR(toRegister);
        var byte;
        try {
            byte = this.memoryService.loadByte(fromAddress);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].MEMORY_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }
        this.alu.performSubstraction8Bits(this.registersBank.get(toRegister)[byteToRegister], byte);
        return true;
    };
    CPUService.prototype.instrCMPB_BYTE_WITH_REG8 = function (toRegister, byte) {
        if (CPUService_1.is8bitsGPR(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var byteToRegister = CPUService_1.getByteFrom8bitsGPR(toRegister);
        this.alu.performSubstraction8Bits(this.registersBank.get(toRegister)[byteToRegister], byte);
        return true;
    };
    CPUService.prototype.instrJMP_REGADDRESS = function (toAddress) {
        this.IP.value = toAddress;
        return false;
    };
    CPUService.prototype.instrJMP_ADDRESS = function (toAddress) {
        this.IP.value = toAddress;
        return false;
    };
    CPUService.prototype.instrJC_REGADDRESS = function (toAddress) {
        if (this.SR.carry === 1) {
            this.IP.value = toAddress;
            return false;
        }
        else {
            return true;
        }
    };
    CPUService.prototype.instrJC_ADDRESS = function (toAddress) {
        if (this.SR.carry === 1) {
            this.IP.value = toAddress;
            return false;
        }
        else {
            return true;
        }
    };
    CPUService.prototype.instrJNC_REGADDRESS = function (toAddress) {
        if (this.SR.carry === 0) {
            this.IP.value = toAddress;
            return false;
        }
        else {
            return true;
        }
    };
    CPUService.prototype.instrJNC_ADDRESS = function (toAddress) {
        if (this.SR.carry === 0) {
            this.IP.value = toAddress;
            return false;
        }
        else {
            return true;
        }
    };
    CPUService.prototype.instrJZ_REGADDRESS = function (toAddress) {
        if (this.SR.zero === 1) {
            this.IP.value = toAddress;
            return false;
        }
        else {
            return true;
        }
    };
    CPUService.prototype.instrJZ_ADDRESS = function (toAddress) {
        if (this.SR.zero === 1) {
            this.IP.value = toAddress;
            return false;
        }
        else {
            return true;
        }
    };
    CPUService.prototype.instrJNZ_REGADDRESS = function (toAddress) {
        if (this.SR.zero === 0) {
            this.IP.value = toAddress;
            return false;
        }
        else {
            return true;
        }
    };
    CPUService.prototype.instrJNZ_ADDRESS = function (toAddress) {
        if (this.SR.zero === 0) {
            this.IP.value = toAddress;
            return false;
        }
        else {
            return true;
        }
    };
    CPUService.prototype.instrJA_REGADDRESS = function (toAddress) {
        if ((this.SR.carry === 0) && (this.SR.zero === 0)) {
            this.IP.value = toAddress;
            return false;
        }
        else {
            return true;
        }
    };
    CPUService.prototype.instrJA_ADDRESS = function (toAddress) {
        if ((this.SR.carry === 0) && (this.SR.zero === 0)) {
            this.IP.value = toAddress;
            return false;
        }
        else {
            return true;
        }
    };
    CPUService.prototype.instrJNA_REGADDRESS = function (toAddress) {
        if ((this.SR.carry === 1) || (this.SR.zero === 1)) {
            this.IP.value = toAddress;
            return false;
        }
        else {
            return true;
        }
    };
    CPUService.prototype.instrJNA_ADDRESS = function (toAddress) {
        if ((this.SR.carry === 1) || (this.SR.zero === 1)) {
            this.IP.value = toAddress;
            return false;
        }
        else {
            return true;
        }
    };
    CPUService.prototype.instrPUSH_REG16 = function (toRegister) {
        if (CPUService_1.is16bitsGPRorSP(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        try {
            this.pushWord(this.registersBank.get(toRegister).value);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].STACK_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value);
        }
        return true;
    };
    CPUService.prototype.instrPUSH_REGADDRESS = function (toAddress) {
        var word;
        try {
            word = this.memoryService.loadWord(toAddress);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].MEMORY_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value, toAddress);
        }
        try {
            this.pushWord(word);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].STACK_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value);
        }
        return true;
    };
    CPUService.prototype.instrPUSH_ADDRESS = function (toAddress) {
        var word;
        try {
            word = this.memoryService.loadWord(toAddress);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].MEMORY_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value, toAddress);
        }
        try {
            this.pushWord(word);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].STACK_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value);
        }
        return true;
    };
    CPUService.prototype.instrPUSH_WORD = function (word) {
        try {
            this.pushWord(word);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].STACK_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value);
        }
        return true;
    };
    CPUService.prototype.instrPUSHB_REG8 = function (toRegister) {
        if (CPUService_1.is8bitsGPR(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var byteToRegister = CPUService_1.getByteFrom8bitsGPR(toRegister);
        try {
            this.pushByte(this.registersBank.get(toRegister)[byteToRegister]);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].STACK_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value);
        }
        return true;
    };
    CPUService.prototype.instrPUSHB_REGADDRESS = function (toAddress) {
        var byte;
        try {
            byte = this.memoryService.loadByte(toAddress);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].MEMORY_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value, toAddress);
        }
        try {
            this.pushByte(byte);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].STACK_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value);
        }
        return true;
    };
    CPUService.prototype.instrPUSHB_ADDRESS = function (toAddress) {
        var byte;
        try {
            byte = this.memoryService.loadByte(toAddress);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].MEMORY_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value, toAddress);
        }
        try {
            this.pushByte(byte);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].STACK_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value);
        }
        return true;
    };
    CPUService.prototype.instrPUSHB_BYTE = function (byte) {
        try {
            this.pushByte(byte);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].STACK_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value);
        }
        return true;
    };
    CPUService.prototype.instrPOP_REG16 = function (toRegister) {
        if (CPUService_1.is16bitsGPRorSP(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var word;
        try {
            word = this.popWord();
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].STACK_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value);
        }
        this.registersBank.get(toRegister).value = word;
        return true;
    };
    CPUService.prototype.instrPOPB_REG8 = function (toRegister) {
        if (CPUService_1.is8bitsGPR(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var byteToRegister = CPUService_1.getByteFrom8bitsGPR(toRegister);
        var byte;
        try {
            byte = this.popByte();
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].STACK_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value);
        }
        this.registersBank.get(toRegister)[byteToRegister] = byte;
        return true;
    };
    CPUService.prototype.instrCALL_REGADDRESS = function (toAddress) {
        try {
            this.pushWord(this.nextIP);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].STACK_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value);
        }
        this.IP.value = toAddress;
        return false;
    };
    CPUService.prototype.instrCALL_ADDRESS = function (toAddress) {
        try {
            this.pushWord(this.nextIP);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].STACK_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value);
        }
        this.IP.value = toAddress;
        return false;
    };
    CPUService.prototype.instrRET = function () {
        var newIP;
        try {
            newIP = this.popWord();
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].STACK_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value);
        }
        this.IP.value = newIP;
        return false;
    };
    CPUService.prototype.instrMUL_REG = function (toRegister) {
        if (CPUService_1.is16bitsGPRorSP(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        this.registersBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].A).value =
            this.alu.performMultiplication16Bits(this.registersBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].A).value, this.registersBank.get(toRegister).value);
        return true;
    };
    CPUService.prototype.instrMUL_REGADDRESS = function (toAddress) {
        var word;
        try {
            word = this.memoryService.loadWord(toAddress);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].MEMORY_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value, toAddress);
        }
        this.registersBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].A).value =
            this.alu.performMultiplication16Bits(this.registersBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].A).value, word);
        return true;
    };
    CPUService.prototype.instrMUL_ADDRESS = function (toAddress) {
        var word;
        try {
            word = this.memoryService.loadWord(toAddress);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].MEMORY_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value, toAddress);
        }
        this.registersBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].A).value =
            this.alu.performMultiplication16Bits(this.registersBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].A).value, word);
        return true;
    };
    CPUService.prototype.instrMUL_WORD = function (word) {
        this.registersBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].A).value =
            this.alu.performMultiplication16Bits(this.registersBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].A).value, word);
        return true;
    };
    CPUService.prototype.instrMULB_REG8 = function (toRegister) {
        if (CPUService_1.is8bitsGPR(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var byteToRegister = CPUService_1.getByteFrom8bitsGPR(toRegister);
        this.registersBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].A)['low'] =
            this.alu.performMultiplication8Bits(this.registersBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].A)['low'], this.registersBank.get(toRegister)[byteToRegister]);
        return true;
    };
    CPUService.prototype.instrMULB_REGADDRESS = function (toAddress) {
        var byte;
        try {
            byte = this.memoryService.loadByte(toAddress);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].MEMORY_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value, toAddress);
        }
        this.registersBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].A)['low'] =
            this.alu.performMultiplication8Bits(this.registersBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].A)['low'], byte);
        return true;
    };
    CPUService.prototype.instrMULB_ADDRESS = function (toAddress) {
        var byte;
        try {
            byte = this.memoryService.loadByte(toAddress);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].MEMORY_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value, toAddress);
        }
        this.registersBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].A)['low'] =
            this.alu.performMultiplication8Bits(this.registersBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].A)['low'], byte);
        return true;
    };
    CPUService.prototype.instrMULB_WORD = function (byte) {
        this.registersBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].A)['low'] =
            this.alu.performMultiplication8Bits(this.registersBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].A)['low'], byte);
        return true;
    };
    CPUService.prototype.instrDIV_REG16 = function (toRegister) {
        if (CPUService_1.is16bitsGPRorSP(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        try {
            this.registersBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].A).value =
                this.alu.performDivision16Bits(this.registersBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].A).value, this.registersBank.get(toRegister).value);
        }
        catch (error) {
            /* There is only one type of ALU error */
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].DIVIDE_BY_ZERO, error.message, this.IP.value, this.SP.value, this.SR.value);
        }
        return true;
    };
    CPUService.prototype.instrDIV_REGADDRESS = function (toAddress) {
        var word;
        try {
            word = this.memoryService.loadWord(toAddress);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].MEMORY_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value, toAddress);
        }
        try {
            this.registersBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].A).value =
                this.alu.performDivision16Bits(this.registersBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].A).value, word);
        }
        catch (error) {
            /* There is only one type of ALU error */
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].DIVIDE_BY_ZERO, error.message, this.IP.value, this.SP.value, this.SR.value);
        }
        return true;
    };
    CPUService.prototype.instrDIV_ADDRESS = function (toAddress) {
        var word;
        try {
            word = this.memoryService.loadWord(toAddress);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].MEMORY_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value, toAddress);
        }
        try {
            this.registersBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].A).value =
                this.alu.performDivision16Bits(this.registersBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].A).value, word);
        }
        catch (error) {
            /* There is only one type of ALU error */
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].DIVIDE_BY_ZERO, error.message, this.IP.value, this.SP.value, this.SR.value);
        }
        return true;
    };
    CPUService.prototype.instrDIV_WORD = function (word) {
        try {
            this.registersBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].A).value =
                this.alu.performDivision16Bits(this.registersBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].A).value, word);
        }
        catch (error) {
            /* There is only one type of ALU error */
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].DIVIDE_BY_ZERO, error.message, this.IP.value, this.SP.value, this.SR.value);
        }
        return true;
    };
    CPUService.prototype.instrDIVB_REG8 = function (toRegister) {
        if (CPUService_1.is16bitsGPRorSP(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var byteToRegister = CPUService_1.getByteFrom8bitsGPR(toRegister);
        try {
            this.registersBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].A)['low'] =
                this.alu.performDivision8Bits(this.registersBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].A)['low'], this.registersBank.get(toRegister)[byteToRegister]);
        }
        catch (error) {
            /* There is only one type of ALU error */
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].DIVIDE_BY_ZERO, error.message, this.IP.value, this.SP.value, this.SR.value);
        }
        return true;
    };
    CPUService.prototype.instrDIVB_REGADDRESS = function (toAddress) {
        var byte;
        try {
            byte = this.memoryService.loadByte(toAddress);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].MEMORY_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value, toAddress);
        }
        try {
            this.registersBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].A)['low'] =
                this.alu.performDivision8Bits(this.registersBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].A)['low'], byte);
        }
        catch (error) {
            /* There is only one type of ALU error */
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].DIVIDE_BY_ZERO, error.message, this.IP.value, this.SP.value, this.SR.value);
        }
        return true;
    };
    CPUService.prototype.instrDIVB_ADDRESS = function (toAddress) {
        var byte;
        try {
            byte = this.memoryService.loadByte(toAddress);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].MEMORY_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value, toAddress);
        }
        try {
            this.registersBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].A)['low'] =
                this.alu.performDivision8Bits(this.registersBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].A)['low'], byte);
        }
        catch (error) {
            /* There is only one type of ALU error */
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].DIVIDE_BY_ZERO, error.message, this.IP.value, this.SP.value, this.SR.value);
        }
        return true;
    };
    CPUService.prototype.instrDIV_BYTE = function (byte) {
        try {
            this.registersBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].A)['low'] =
                this.alu.performDivision8Bits(this.registersBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].A)['low'], byte);
        }
        catch (error) {
            /* There is only one type of ALU error */
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].DIVIDE_BY_ZERO, error.message, this.IP.value, this.SP.value, this.SR.value);
        }
        return true;
    };
    CPUService.prototype.instrAND_REG16_WITH_REG16 = function (toRegister, fromRegister) {
        if (CPUService_1.is16bitsGPRorSP(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        if (CPUService_1.is16bitsGPRorSP(fromRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid second operand: register index " + fromRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        this.registersBank.get(toRegister).value =
            this.alu.performBitwiseAND16Bits(this.registersBank.get(toRegister).value, this.registersBank.get(fromRegister).value);
        return true;
    };
    CPUService.prototype.instrAND_REGADDRESS_WITH_REG16 = function (toRegister, fromAddress) {
        if (CPUService_1.is16bitsGPRorSP(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var word;
        try {
            word = this.memoryService.loadWord(fromAddress);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].MEMORY_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }
        this.registersBank.get(toRegister).value =
            this.alu.performBitwiseAND16Bits(this.registersBank.get(toRegister).value, word);
        return true;
    };
    CPUService.prototype.instrAND_ADDRESS_WITH_REG16 = function (toRegister, fromAddress) {
        if (CPUService_1.is16bitsGPRorSP(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var word;
        try {
            word = this.memoryService.loadWord(fromAddress);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].MEMORY_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }
        this.registersBank.get(toRegister).value =
            this.alu.performBitwiseAND16Bits(this.registersBank.get(toRegister).value, word);
        return true;
    };
    CPUService.prototype.instrAND_WORD_WITH_REG = function (toRegister, word) {
        if (CPUService_1.is16bitsGPRorSP(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        this.registersBank.get(toRegister).value =
            this.alu.performBitwiseAND16Bits(this.registersBank.get(toRegister).value, word);
        return true;
    };
    CPUService.prototype.instrANDB_REG8_WITH_REG8 = function (toRegister, fromRegister) {
        if (CPUService_1.is8bitsGPR(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        if (CPUService_1.is8bitsGPR(fromRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid second operand: register index " + fromRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var byteToRegister = CPUService_1.getByteFrom8bitsGPR(toRegister);
        var byteFromRegister = CPUService_1.getByteFrom8bitsGPR(fromRegister);
        this.registersBank.get(toRegister)[byteToRegister] =
            this.alu.performBitwiseAND8Bits(this.registersBank.get(toRegister)[byteToRegister], this.registersBank.get(fromRegister)[byteFromRegister]);
        return true;
    };
    CPUService.prototype.instrANDB_REGADDRESS_WITH_REG8 = function (toRegister, fromAddress) {
        if (CPUService_1.is8bitsGPR(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var byteToRegister = CPUService_1.getByteFrom8bitsGPR(toRegister);
        var byte;
        try {
            byte = this.memoryService.loadByte(fromAddress);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].MEMORY_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }
        this.registersBank.get(toRegister)[byteToRegister] =
            this.alu.performBitwiseAND8Bits(this.registersBank.get(toRegister)[byteToRegister], byte);
        return true;
    };
    CPUService.prototype.instrANDB_ADDRESS_WITH_REG8 = function (toRegister, fromAddress) {
        if (CPUService_1.is8bitsGPR(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var byteToRegister = CPUService_1.getByteFrom8bitsGPR(toRegister);
        var byte;
        try {
            byte = this.memoryService.loadByte(fromAddress);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].MEMORY_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }
        this.registersBank.get(toRegister)[byteToRegister] =
            this.alu.performBitwiseAND8Bits(this.registersBank.get(toRegister)[byteToRegister], byte);
        return true;
    };
    CPUService.prototype.instrAND_BYTE_WITH_REG8 = function (toRegister, byte) {
        if (CPUService_1.is8bitsGPR(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var byteToRegister = CPUService_1.getByteFrom8bitsGPR(toRegister);
        this.registersBank.get(toRegister)[byteToRegister] =
            this.alu.performBitwiseAND8Bits(this.registersBank.get(toRegister)[byteToRegister], byte);
        return true;
    };
    CPUService.prototype.instrOR_REG16_WITH_REG16 = function (toRegister, fromRegister) {
        if (CPUService_1.is16bitsGPRorSP(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        if (CPUService_1.is16bitsGPRorSP(fromRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid second operand: register index " + fromRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        this.registersBank.get(toRegister).value =
            this.alu.performBitwiseOR16Bits(this.registersBank.get(toRegister).value, this.registersBank.get(fromRegister).value);
        return true;
    };
    CPUService.prototype.instrOR_REGADDRESS_WITH_REG16 = function (toRegister, fromAddress) {
        if (CPUService_1.is16bitsGPRorSP(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var word;
        try {
            word = this.memoryService.loadWord(fromAddress);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].MEMORY_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }
        this.registersBank.get(toRegister).value =
            this.alu.performBitwiseOR16Bits(this.registersBank.get(toRegister).value, word);
        return true;
    };
    CPUService.prototype.instrOR_ADDRESS_WITH_REG16 = function (toRegister, fromAddress) {
        if (CPUService_1.is16bitsGPRorSP(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var word;
        try {
            word = this.memoryService.loadWord(fromAddress);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].MEMORY_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }
        this.registersBank.get(toRegister).value =
            this.alu.performBitwiseOR16Bits(this.registersBank.get(toRegister).value, word);
        return true;
    };
    CPUService.prototype.instrOR_WORD_WITH_REG = function (toRegister, word) {
        if (CPUService_1.is16bitsGPRorSP(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        this.registersBank.get(toRegister).value =
            this.alu.performBitwiseOR16Bits(this.registersBank.get(toRegister).value, word);
        return true;
    };
    CPUService.prototype.instrORB_REG8_WITH_REG8 = function (toRegister, fromRegister) {
        if (CPUService_1.is8bitsGPR(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        if (CPUService_1.is8bitsGPR(fromRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid second operand: register index " + fromRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var byteToRegister = CPUService_1.getByteFrom8bitsGPR(toRegister);
        var byteFromRegister = CPUService_1.getByteFrom8bitsGPR(fromRegister);
        this.registersBank.get(toRegister)[byteToRegister] =
            this.alu.performBitwiseOR8Bits(this.registersBank.get(toRegister)[byteToRegister], this.registersBank.get(fromRegister)[byteFromRegister]);
        return true;
    };
    CPUService.prototype.instrORB_REGADDRESS_WITH_REG8 = function (toRegister, fromAddress) {
        if (CPUService_1.is8bitsGPR(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var byteToRegister = CPUService_1.getByteFrom8bitsGPR(toRegister);
        var byte;
        try {
            byte = this.memoryService.loadByte(fromAddress);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].MEMORY_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }
        this.registersBank.get(toRegister)[byteToRegister] =
            this.alu.performBitwiseOR8Bits(this.registersBank.get(toRegister)[byteToRegister], byte);
        return true;
    };
    CPUService.prototype.instrORB_ADDRESS_WITH_REG8 = function (toRegister, fromAddress) {
        if (CPUService_1.is8bitsGPR(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var byteToRegister = CPUService_1.getByteFrom8bitsGPR(toRegister);
        var byte;
        try {
            byte = this.memoryService.loadByte(fromAddress);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].MEMORY_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }
        this.registersBank.get(toRegister)[byteToRegister] =
            this.alu.performBitwiseOR8Bits(this.registersBank.get(toRegister)[byteToRegister], byte);
        return true;
    };
    CPUService.prototype.instrORB_BYTE_WITH_REG8 = function (toRegister, byte) {
        if (CPUService_1.is8bitsGPR(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var byteToRegister = CPUService_1.getByteFrom8bitsGPR(toRegister);
        this.registersBank.get(toRegister)[byteToRegister] =
            this.alu.performBitwiseOR8Bits(this.registersBank.get(toRegister)[byteToRegister], byte);
        return true;
    };
    CPUService.prototype.instrXOR_REG16_WITH_REG16 = function (toRegister, fromRegister) {
        if (CPUService_1.is16bitsGPRorSP(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        if (CPUService_1.is16bitsGPRorSP(fromRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid second operand: register index " + fromRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        this.registersBank.get(toRegister).value =
            this.alu.performBitwiseXOR16Bits(this.registersBank.get(toRegister).value, this.registersBank.get(fromRegister).value);
        return true;
    };
    CPUService.prototype.instrXOR_REGADDRESS_WITH_REG16 = function (toRegister, fromAddress) {
        if (CPUService_1.is16bitsGPRorSP(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var word;
        try {
            word = this.memoryService.loadWord(fromAddress);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].MEMORY_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }
        this.registersBank.get(toRegister).value =
            this.alu.performBitwiseXOR16Bits(this.registersBank.get(toRegister).value, word);
        return true;
    };
    CPUService.prototype.instrXOR_ADDRESS_WITH_REG16 = function (toRegister, fromAddress) {
        if (CPUService_1.is16bitsGPRorSP(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var word;
        try {
            word = this.memoryService.loadWord(fromAddress);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].MEMORY_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }
        this.registersBank.get(toRegister).value =
            this.alu.performBitwiseXOR16Bits(this.registersBank.get(toRegister).value, word);
        return true;
    };
    CPUService.prototype.instrXOR_WORD_WITH_REG16 = function (toRegister, word) {
        if (CPUService_1.is16bitsGPRorSP(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        this.registersBank.get(toRegister).value =
            this.alu.performBitwiseXOR16Bits(this.registersBank.get(toRegister).value, word);
        return true;
    };
    CPUService.prototype.instrXORB_REG8_WITH_REG8 = function (toRegister, fromRegister) {
        if (CPUService_1.is8bitsGPR(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        if (CPUService_1.is8bitsGPR(fromRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid second operand: register index " + fromRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var byteToRegister = CPUService_1.getByteFrom8bitsGPR(toRegister);
        var byteFromRegister = CPUService_1.getByteFrom8bitsGPR(fromRegister);
        this.registersBank.get(toRegister)[byteToRegister] =
            this.alu.performBitwiseXOR8Bits(this.registersBank.get(toRegister)[byteToRegister], this.registersBank.get(fromRegister)[byteFromRegister]);
        return true;
    };
    CPUService.prototype.instrXORB_REGADDRESS_WITH_REG8 = function (toRegister, fromAddress) {
        if (CPUService_1.is8bitsGPR(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var byteToRegister = CPUService_1.getByteFrom8bitsGPR(toRegister);
        var byte;
        try {
            byte = this.memoryService.loadByte(fromAddress);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].MEMORY_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }
        this.registersBank.get(toRegister)[byteToRegister] =
            this.alu.performBitwiseXOR8Bits(this.registersBank.get(toRegister)[byteToRegister], byte);
        return true;
    };
    CPUService.prototype.instrXORB_ADDRESS_WITH_REG8 = function (toRegister, fromAddress) {
        if (CPUService_1.is8bitsGPR(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var byteToRegister = CPUService_1.getByteFrom8bitsGPR(toRegister);
        var byte;
        try {
            byte = this.memoryService.loadByte(fromAddress);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].MEMORY_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }
        this.registersBank.get(toRegister)[byteToRegister] =
            this.alu.performBitwiseXOR8Bits(this.registersBank.get(toRegister)[byteToRegister], byte);
        return true;
    };
    CPUService.prototype.instrXORB_BYTE_WITH_REG8 = function (toRegister, byte) {
        if (CPUService_1.is8bitsGPR(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var byteToRegister = CPUService_1.getByteFrom8bitsGPR(toRegister);
        this.registersBank.get(toRegister)[byteToRegister] =
            this.alu.performBitwiseXOR8Bits(this.registersBank.get(toRegister)[byteToRegister], byte);
        return true;
    };
    CPUService.prototype.instrNOT_REG16 = function (toRegister) {
        if (CPUService_1.is16bitsGPRorSP(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        this.registersBank.get(toRegister).value =
            this.alu.performBitwiseNOT16Bits(this.registersBank.get(toRegister).value);
        return true;
    };
    CPUService.prototype.instrNOT_REG8 = function (toRegister) {
        if (CPUService_1.is8bitsGPR(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var byteToRegister = CPUService_1.getByteFrom8bitsGPR(toRegister);
        this.registersBank.get(toRegister)[byteToRegister] =
            this.alu.performBitwiseNOT8Bits(this.registersBank.get(toRegister)[byteToRegister]);
        return true;
    };
    CPUService.prototype.instrSHL_REG_WITH_REG = function (toRegister, fromRegister) {
        if (CPUService_1.is16bitsGPRorSP(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        if (CPUService_1.is16bitsGPRorSP(fromRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid second operand: register index " + fromRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        this.registersBank.get(toRegister).value =
            this.alu.performBitshiftLeft16Bits(this.registersBank.get(toRegister).value, this.registersBank.get(fromRegister).value);
        return true;
    };
    CPUService.prototype.instrSHL_REGADDRESS_WITH_REG16 = function (toRegister, fromAddress) {
        if (CPUService_1.is16bitsGPRorSP(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var word;
        try {
            word = this.memoryService.loadWord(fromAddress);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].MEMORY_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }
        this.registersBank.get(toRegister).value =
            this.alu.performBitshiftLeft16Bits(this.registersBank.get(toRegister).value, word);
        return true;
    };
    CPUService.prototype.instrSHL_ADDRESS_WITH_REG16 = function (toRegister, fromAddress) {
        if (CPUService_1.is16bitsGPRorSP(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var word;
        try {
            word = this.memoryService.loadWord(fromAddress);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].MEMORY_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }
        this.registersBank.get(toRegister).value =
            this.alu.performBitshiftLeft16Bits(this.registersBank.get(toRegister).value, word);
        return true;
    };
    CPUService.prototype.instrSHL_WORD_WITH_REG16 = function (toRegister, word) {
        if (CPUService_1.is16bitsGPRorSP(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        this.registersBank.get(toRegister).value =
            this.alu.performBitshiftLeft16Bits(this.registersBank.get(toRegister).value, word);
        return true;
    };
    CPUService.prototype.instrSHLB_REG8_WITH_REG8 = function (toRegister, fromRegister) {
        if (CPUService_1.is8bitsGPR(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        if (CPUService_1.is8bitsGPR(fromRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid second operand: register index " + fromRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var byteToRegister = CPUService_1.getByteFrom8bitsGPR(toRegister);
        var byteFromRegister = CPUService_1.getByteFrom8bitsGPR(fromRegister);
        this.registersBank.get(toRegister)[byteToRegister] =
            this.alu.performBitshiftLeft8Bits(this.registersBank.get(toRegister)[byteToRegister], this.registersBank.get(fromRegister)[byteFromRegister]);
        return true;
    };
    CPUService.prototype.instrSHLB_REGADDRESS_WITH_REG8 = function (toRegister, fromAddress) {
        if (CPUService_1.is8bitsGPR(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var byteToRegister = CPUService_1.getByteFrom8bitsGPR(toRegister);
        var byte;
        try {
            byte = this.memoryService.loadByte(fromAddress);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].MEMORY_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }
        this.registersBank.get(toRegister)[byteToRegister] =
            this.alu.performBitshiftLeft8Bits(this.registersBank.get(toRegister)[byteToRegister], byte);
        return true;
    };
    CPUService.prototype.instrSHLB_ADDRESS_WITH_REG8 = function (toRegister, fromAddress) {
        if (CPUService_1.is8bitsGPR(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var byteToRegister = CPUService_1.getByteFrom8bitsGPR(toRegister);
        var byte;
        try {
            byte = this.memoryService.loadByte(fromAddress);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].MEMORY_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }
        this.registersBank.get(toRegister)[byteToRegister] =
            this.alu.performBitshiftLeft8Bits(this.registersBank.get(toRegister)[byteToRegister], byte);
        return true;
    };
    CPUService.prototype.instrSHLB_BYTE_WITH_REG8 = function (toRegister, byte) {
        if (CPUService_1.is8bitsGPR(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var byteToRegister = CPUService_1.getByteFrom8bitsGPR(toRegister);
        this.registersBank.get(toRegister)[byteToRegister] =
            this.alu.performBitshiftLeft8Bits(this.registersBank.get(toRegister)[byteToRegister], byte);
        return true;
    };
    CPUService.prototype.instrSHR_REG_WITH_REG16 = function (toRegister, fromRegister) {
        if (CPUService_1.is16bitsGPRorSP(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        if (CPUService_1.is16bitsGPRorSP(fromRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid second operand: register index " + fromRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        this.registersBank.get(toRegister).value =
            this.alu.performBitshiftRight16Bits(this.registersBank.get(toRegister).value, this.registersBank.get(fromRegister).value);
        return true;
    };
    CPUService.prototype.instrSHR_REGADDRESS_WITH_REG16 = function (toRegister, fromAddress) {
        if (CPUService_1.is16bitsGPRorSP(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var word;
        try {
            word = this.memoryService.loadWord(fromAddress);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].MEMORY_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }
        this.registersBank.get(toRegister).value =
            this.alu.performBitshiftRight16Bits(this.registersBank.get(toRegister).value, word);
        return true;
    };
    CPUService.prototype.instrSHR_ADDRESS_WITH_REG16 = function (toRegister, fromAddress) {
        if (CPUService_1.is16bitsGPRorSP(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var word;
        try {
            word = this.memoryService.loadWord(fromAddress);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].MEMORY_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }
        this.registersBank.get(toRegister).value =
            this.alu.performBitshiftRight16Bits(this.registersBank.get(toRegister).value, word);
        return true;
    };
    CPUService.prototype.instrSHR_WORD_WITH_REG16 = function (toRegister, word) {
        if (CPUService_1.is16bitsGPRorSP(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        this.registersBank.get(toRegister).value =
            this.alu.performBitshiftRight16Bits(this.registersBank.get(toRegister).value, word);
        return true;
    };
    CPUService.prototype.instrSHRB_REG8_WITH_REG8 = function (toRegister, fromRegister) {
        if (CPUService_1.is8bitsGPR(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        if (CPUService_1.is8bitsGPR(fromRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid second operand: register index " + fromRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var byteToRegister = CPUService_1.getByteFrom8bitsGPR(toRegister);
        var byteFromRegister = CPUService_1.getByteFrom8bitsGPR(fromRegister);
        this.registersBank.get(toRegister)[byteToRegister] =
            this.alu.performBitshiftRight8Bits(this.registersBank.get(toRegister)[byteToRegister], this.registersBank.get(fromRegister)[byteFromRegister]);
        return true;
    };
    CPUService.prototype.instrSHRB_REGADDRESS_WITH_REG8 = function (toRegister, fromAddress) {
        if (CPUService_1.is8bitsGPR(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var byteToRegister = CPUService_1.getByteFrom8bitsGPR(toRegister);
        var byte;
        try {
            byte = this.memoryService.loadByte(fromAddress);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].MEMORY_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }
        this.registersBank.get(toRegister)[byteToRegister] =
            this.alu.performBitshiftRight8Bits(this.registersBank.get(toRegister)[byteToRegister], byte);
        return true;
    };
    CPUService.prototype.instrSHRB_ADDRESS_WITH_REG8 = function (toRegister, fromAddress) {
        if (CPUService_1.is8bitsGPR(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var byteToRegister = CPUService_1.getByteFrom8bitsGPR(toRegister);
        var byte;
        try {
            byte = this.memoryService.loadByte(fromAddress);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].MEMORY_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }
        this.registersBank.get(toRegister)[byteToRegister] =
            this.alu.performBitshiftRight8Bits(this.registersBank.get(toRegister)[byteToRegister], byte);
        return true;
    };
    CPUService.prototype.instrSHRB_BYTE_WITH_REG8 = function (toRegister, byte) {
        if (CPUService_1.is8bitsGPR(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var byteToRegister = CPUService_1.getByteFrom8bitsGPR(toRegister);
        this.registersBank.get(toRegister)[byteToRegister] =
            this.alu.performBitshiftRight8Bits(this.registersBank.get(toRegister)[byteToRegister], byte);
        return true;
    };
    CPUService.prototype.instrCLI = function () {
        if (this.SR.supervisor === 0) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid use of CLI when in user mode", this.IP.value, this.SP.value, this.SR.value);
        }
        this.SR.irqMask = 0;
        if (this.interruptInput === 1) {
            this.toInterruptHandler();
            return false;
        }
        return true;
    };
    CPUService.prototype.instrSTI = function () {
        if (this.SR.supervisor === 0) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid use of STI when in user mode", this.IP.value, this.SP.value, this.SR.value);
        }
        this.SR.irqMask = 1;
        return true;
    };
    CPUService.prototype.instrIRET = function () {
        if (this.SR.supervisor === 0) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid use of privileged instruction when in user mode", this.IP.value, this.SP.value, this.SR.value);
        }
        var newIP, newSP, newSR;
        try {
            newIP = this.popWord();
            newSP = this.popWord();
            newSR = this.popWord();
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].STACK_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value);
        }
        this.IP.value = newIP;
        this.SR.value = newSR;
        if ((newSR & 0x8000) === 0) {
            /* We are going to go back to user mode */
            this.registersBank.set(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].SP, this.userSP);
            this.SP.value = newSP;
        }
        /* If we are going back to supervisor mode, there is no need for updating the SP */
        /* Oops! We are going back to handle another IRQ */
        if (this.SR.irqMask === 1 && this.interruptInput === 1) {
            this.toInterruptHandler();
        }
        return false;
    };
    CPUService.prototype.instrSVC = function () {
        if (this.SR.supervisor === 1) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid use of SVC when in supervisor mode", this.IP.value, this.SP.value, this.SR.value);
        }
        var currentSR = this.SR.value;
        this.SR.supervisor = 1;
        this.registersBank.set(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].SP, this.supervisorSP);
        try {
            this.pushWord(currentSR);
            this.pushWord(this.userSP.value);
            this.pushWord(this.nextIP);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].STACK_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value);
        }
        this.IP.value = SYSCALL_VECTOR_ADDRESS;
        return false;
    };
    CPUService.prototype.instrIN_REG16 = function (toRegister) {
        if (this.SR.supervisor === 0) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid use of STI when in user mode", this.IP.value, this.SP.value, this.SR.value);
        }
        if (CPUService_1.is16bitsGPRorSP(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var register_address = this.registersBank.get(toRegister).value;
        this.registersBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].A).value =
            this.ioRegMapService.load(register_address);
        return true;
    };
    CPUService.prototype.instrIN_REGADDRESS = function (toAddress) {
        if (this.SR.supervisor === 0) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid use of STI when in user mode", this.IP.value, this.SP.value, this.SR.value);
        }
        var register_address;
        try {
            register_address = this.memoryService.loadWord(toAddress);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].MEMORY_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value, toAddress);
        }
        this.registersBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].A).value =
            this.ioRegMapService.load(register_address);
        return true;
    };
    CPUService.prototype.instrIN_ADDRESS = function (toAddress) {
        if (this.SR.supervisor === 0) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid use of STI when in user mode", this.IP.value, this.SP.value, this.SR.value);
        }
        var register_address;
        try {
            register_address = this.memoryService.loadWord(toAddress);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].MEMORY_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value, toAddress);
        }
        this.registersBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].A).value =
            this.ioRegMapService.load(register_address);
        return true;
    };
    CPUService.prototype.instrIN_WORD = function (word) {
        if (this.SR.supervisor === 0) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid use of STI when in user mode", this.IP.value, this.SP.value, this.SR.value);
        }
        this.registersBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].A).value =
            this.ioRegMapService.load(word);
        return true;
    };
    CPUService.prototype.instrOUT_REG16 = function (toRegister) {
        if (this.SR.supervisor === 0) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid use of STI when in user mode", this.IP.value, this.SP.value, this.SR.value);
        }
        if (CPUService_1.is16bitsGPRorSP(toRegister) === false) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid first operand: register index " + toRegister + " out of bounds", this.IP.value, this.SP.value, this.SR.value);
        }
        var register_address = this.registersBank.get(toRegister).value;
        var value = this.registersBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].A).value;
        this.ioRegMapService.store(register_address, value);
        return true;
    };
    CPUService.prototype.instrOUT_REGADDRESS = function (toAddress) {
        if (this.SR.supervisor === 0) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid use of STI when in user mode", this.IP.value, this.SP.value, this.SR.value);
        }
        var register_address;
        try {
            register_address = this.memoryService.loadWord(toAddress);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].MEMORY_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value, toAddress);
        }
        var value = this.registersBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].A).value;
        this.ioRegMapService.store(register_address, value);
        return true;
    };
    CPUService.prototype.instrOUT_ADDRESS = function (toAddress) {
        if (this.SR.supervisor === 0) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid use of STI when in user mode", this.IP.value, this.SP.value, this.SR.value);
        }
        var register_address;
        try {
            register_address = this.memoryService.loadWord(toAddress);
        }
        catch (e) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].MEMORY_ACCESS_ERROR, e.message, this.IP.value, this.SP.value, this.SR.value, toAddress);
        }
        var value = this.registersBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].A).value;
        this.ioRegMapService.store(register_address, value);
        return true;
    };
    CPUService.prototype.instrOUT_WORD = function (word) {
        if (this.SR.supervisor === 0) {
            throw new _exceptions__WEBPACK_IMPORTED_MODULE_6__["Exception"](_exceptions__WEBPACK_IMPORTED_MODULE_6__["ExceptionType"].ILLEGAL_INSTRUCTION, "Invalid use of STI when in user mode", this.IP.value, this.SP.value, this.SR.value);
        }
        var value = this.registersBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_9__["CPURegisterIndex"].A).value;
        this.ioRegMapService.store(word, value);
        return true;
    };
    var CPUService_1;
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].HLT, 'HLT'),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", []),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrHLT", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].MOV_REG16_TO_REG16, 'MOV', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_16BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_16BITS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrMOV_REG16_TO_REG16", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].MOV_ADDRESS_TO_REG16, 'MOV', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_16BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].ADDRESS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrMOV_ADDRESS_TO_REG16", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].MOV_REGADDRESS_TO_REG16, 'MOV', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_16BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGADDRESS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrMOV_REGADDRESS_TO_REG16", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].MOV_REG16_TO_ADDRESS, 'MOV', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].ADDRESS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_16BITS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrMOV_REG16_TO_ADDRESS", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].MOV_REG16_TO_REGADDRESS, 'MOV', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGADDRESS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_16BITS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrMOV_REG16_TO_REGADDRESS", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].MOV_WORD_TO_REG16, 'MOV', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_16BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].WORD),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrMOV_WORD_TO_REG16", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].MOV_WORD_TO_ADDRESS, 'MOV', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].ADDRESS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].WORD),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrMOV_WORD_TO_ADDRESS", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].MOV_WORD_TO_REGADDRESS, 'MOV', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGADDRESS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].WORD),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrMOV_WORD_TO_REGADDRESS", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].MOVB_REG8_TO_REG8, 'MOVB', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_8BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_8BITS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrMOVB_REG8_TO_REG8", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].MOVB_ADDRESS_TO_REG8, 'MOVB', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_8BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].ADDRESS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrMOVB_ADDRESS_TO_REG8", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].MOVB_REGADDRESS_TO_REG8, 'MOVB', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_8BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGADDRESS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrMOVB_REGADDRESS_TO_REG8", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].MOVB_REG8_TO_ADDRESS, 'MOVB', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].ADDRESS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_8BITS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrMOVB_REG8_TO_ADDRESS", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].MOVB_REG8_TO_REGADDRESS, 'MOVB', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGADDRESS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_8BITS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrMOVB_REG8_TO_REGADDRESS", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].MOVB_BYTE_TO_REG8, 'MOVB', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_8BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].BYTE),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrMOVB_BYTE_TO_REG8", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].MOVB_BYTE_TO_ADDRESS, 'MOVB', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].ADDRESS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].BYTE),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrMOVB_BYTE_TO_ADDRESS", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].MOVB_BYTE_TO_REGADDRESS, 'MOVB', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGADDRESS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].BYTE),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrMOVB_BYTE_TO_REGADDRESS", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].ADD_REG16_TO_REG16, 'ADD', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_16BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_16BITS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrADD_REG16_TO_REG16", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].ADD_REGADDRESS_TO_REG16, 'ADD', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_16BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGADDRESS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrADD_REGADDRESS_TO_REG16", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].ADD_ADDRESS_TO_REG16, 'ADD', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_16BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].ADDRESS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrADD_ADDRESS_TO_REG16", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].ADD_WORD_TO_REG16, 'ADD', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_16BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].WORD),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrADD_WORD_TO_REG16", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].ADDB_REG8_TO_REG8, 'ADDB', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_8BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_8BITS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrADDB_REG8_TO_REG8", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].ADDB_REGADDRESS_TO_REG8, 'ADDB', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_8BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGADDRESS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrADDB_REGADDRESS_TO_REG8", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].ADDB_ADDRESS_TO_REG8, 'ADDB', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_8BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].ADDRESS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrADDB_ADDRESS_TO_REG8", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].ADDB_BYTE_TO_REG8, 'ADDB', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_8BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].BYTE),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrADDB_BYTE_TO_REG", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].SUB_REG16_FROM_REG16, 'SUB', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_16BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_16BITS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrSUB_REG16_FROM_REG16", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].SUB_REGADDRESS_FROM_REG16, 'SUB', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_16BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGADDRESS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrSUB_REGADDRESS_FROM_REG16", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].SUB_ADDRESS_FROM_REG16, 'SUB', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_16BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].ADDRESS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrSUB_ADDRESS_FROM_REG16", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].SUB_WORD_FROM_REG16, 'SUB', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_16BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].WORD),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrSUB_WORD_FROM_REG16", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].SUBB_REG8_FROM_REG8, 'SUBB', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_8BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_8BITS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrSUBB_REG8_FROM_REG8", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].SUBB_REGADDRESS_FROM_REG8, 'SUBB', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_8BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGADDRESS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrSUBB_REGADDRESS_FROM_REG8", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].SUBB_ADDRESS_FROM_REG8, 'SUBB', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_8BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].ADDRESS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrSUBB_ADDRESS_FROM_REG8", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].SUBB_BYTE_FROM_REG8, 'SUBB', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_8BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].BYTE),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrSUBB_BYTE_FROM_REG8", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].INC_REG16, 'INC', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_16BITS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrINC_REG16", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].INCB_REG8, 'INCB', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_8BITS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrINCB_REG8", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].DEC_REG16, 'DEC', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_16BITS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrDEC_REG16", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].DECB_REG8, 'DECB', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_8BITS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrDECB_REG8", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].CMP_REG16_WITH_REG16, 'CMP', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_16BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_16BITS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrCMP_REG16_WITH_REG16", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].CMP_REGADDRESS_WITH_REG16, 'CMP', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_16BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGADDRESS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrCMP_REGADDRESS_WITH_REG16", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].CMP_ADDRESS_WITH_REG16, 'CMP', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_16BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].ADDRESS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrCMP_ADDRESS_WITH_REG16", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].CMP_WORD_WITH_REG16, 'CMP', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_16BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].WORD),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrCMP_WORD_WITH_REG16", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].CMPB_REG8_WITH_REG8, 'CMPB', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_8BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_8BITS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrCMPB_REG8_WITH_REG8", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].CMPB_REGADDRESS_WITH_REG8, 'CMPB', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_8BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGADDRESS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrCMPB_REGADDRESS_WITH_REG8", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].CMPB_ADDRESS_WITH_REG8, 'CMPB', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_8BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].ADDRESS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrCMPB_ADDRESS_WITH_REG8", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].CMPB_BYTE_WITH_REG8, 'CMPB', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_8BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].BYTE),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrCMPB_BYTE_WITH_REG8", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].JMP_REGADDRESS, 'JMP', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGADDRESS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrJMP_REGADDRESS", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].JMP_ADDRESS, 'JMP', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].WORD),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrJMP_ADDRESS", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].JC_REGADDRESS, 'JC', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGADDRESS, undefined, ['JB', 'JNAE']),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrJC_REGADDRESS", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].JC_ADDRESS, 'JC', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].WORD, undefined, ['JB', 'JNAE']),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrJC_ADDRESS", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].JNC_REGADDRESS, 'JNC', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGADDRESS, undefined, ['JNB', 'JAE']),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrJNC_REGADDRESS", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].JNC_ADDRESS, 'JNC', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].WORD, undefined, ['JNB', 'JAE']),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrJNC_ADDRESS", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].JZ_REGADDRESS, 'JZ', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGADDRESS, undefined, ['JE']),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrJZ_REGADDRESS", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].JZ_ADDRESS, 'JZ', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].WORD, undefined, ['JE']),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrJZ_ADDRESS", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].JNZ_REGADDRESS, 'JNZ', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGADDRESS, undefined, ['JNE']),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrJNZ_REGADDRESS", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].JNZ_ADDRESS, 'JNZ', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].WORD, undefined, ['JNE']),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrJNZ_ADDRESS", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].JA_REGADDRESS, 'JA', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGADDRESS, undefined, ['JNBE']),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrJA_REGADDRESS", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].JA_ADDRESS, 'JA', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].WORD, undefined, ['JNBE']),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrJA_ADDRESS", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].JNA_REGADDRESS, 'JNA', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGADDRESS, undefined, ['JBE']),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrJNA_REGADDRESS", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].JNA_ADDRESS, 'JNA', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].WORD, undefined, ['JBE']),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrJNA_ADDRESS", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].PUSH_REG16, 'PUSH', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_16BITS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrPUSH_REG16", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].PUSH_REGADDRESS, 'PUSH', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGADDRESS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrPUSH_REGADDRESS", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].PUSH_ADDRESS, 'PUSH', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].ADDRESS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrPUSH_ADDRESS", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].PUSH_WORD, 'PUSH', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].WORD),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrPUSH_WORD", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].PUSHB_REG8, 'PUSHB', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_8BITS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrPUSHB_REG8", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].PUSHB_REGADDRESS, 'PUSHB', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGADDRESS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrPUSHB_REGADDRESS", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].PUSHB_ADDRESS, 'PUSHB', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].ADDRESS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrPUSHB_ADDRESS", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].PUSHB_BYTE, 'PUSHB', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].BYTE),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrPUSHB_BYTE", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].POP_REG16, 'POP', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_16BITS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrPOP_REG16", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].POPB_REG8, 'POPB', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_8BITS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrPOPB_REG8", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].CALL_REGADDRESS, 'CALL', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGADDRESS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrCALL_REGADDRESS", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].CALL_ADDRESS, 'CALL', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].WORD),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrCALL_ADDRESS", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].RET, 'RET'),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", []),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrRET", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].MUL_REG16, 'MUL', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_16BITS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrMUL_REG", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].MUL_REGADDRESS, 'MUL', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGADDRESS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrMUL_REGADDRESS", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].MUL_ADDRESS, 'MUL', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].ADDRESS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrMUL_ADDRESS", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].MUL_WORD, 'MUL', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].WORD),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrMUL_WORD", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].MULB_REG8, 'MULB', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_8BITS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrMULB_REG8", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].MULB_REGADDRESS, 'MULB', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGADDRESS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrMULB_REGADDRESS", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].MULB_ADDRESS, 'MULB', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].ADDRESS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrMULB_ADDRESS", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].MULB_BYTE, 'MULB', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].BYTE),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrMULB_WORD", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].DIV_REG16, 'DIV', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_16BITS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrDIV_REG16", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].DIV_REGADDRESS, 'DIV', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGADDRESS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrDIV_REGADDRESS", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].DIV_ADDRESS, 'DIV', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].ADDRESS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrDIV_ADDRESS", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].DIV_WORD, 'DIV', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].WORD),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrDIV_WORD", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].DIVB_REG8, 'DIVB', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_8BITS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrDIVB_REG8", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].DIVB_REGADDRESS, 'DIVB', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGADDRESS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrDIVB_REGADDRESS", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].DIVB_ADDRESS, 'DIVB', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].ADDRESS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrDIVB_ADDRESS", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].DIVB_BYTE, 'DIVB', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].BYTE),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrDIV_BYTE", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].AND_REG16_WITH_REG16, 'AND', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_16BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_16BITS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrAND_REG16_WITH_REG16", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].AND_REGADDRESS_WITH_REG16, 'AND', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_16BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGADDRESS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrAND_REGADDRESS_WITH_REG16", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].AND_ADDRESS_WITH_REG16, 'AND', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_16BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].ADDRESS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrAND_ADDRESS_WITH_REG16", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].AND_WORD_WITH_REG16, 'AND', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_16BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].WORD),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrAND_WORD_WITH_REG", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].ANDB_REG8_WITH_REG8, 'ANDB', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_8BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_8BITS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrANDB_REG8_WITH_REG8", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].ANDB_REGADDRESS_WITH_REG8, 'ANDB', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_8BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGADDRESS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrANDB_REGADDRESS_WITH_REG8", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].ANDB_ADDRESS_WITH_REG8, 'ANDB', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_8BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].ADDRESS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrANDB_ADDRESS_WITH_REG8", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].ANDB_BYTE_WITH_REG8, 'ANDB', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_8BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].BYTE),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrAND_BYTE_WITH_REG8", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].OR_REG16_WITH_REG16, 'OR', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_16BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_16BITS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrOR_REG16_WITH_REG16", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].OR_REGADDRESS_WITH_REG16, 'OR', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_16BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGADDRESS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrOR_REGADDRESS_WITH_REG16", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].OR_ADDRESS_WITH_REG16, 'OR', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_16BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].ADDRESS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrOR_ADDRESS_WITH_REG16", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].OR_WORD_WITH_REG16, 'OR', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_16BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].WORD),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrOR_WORD_WITH_REG", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].ORB_REG8_WITH_REG8, 'ORB', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_8BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_8BITS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrORB_REG8_WITH_REG8", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].ORB_REGADDRESS_WITH_REG8, 'ORB', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_8BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGADDRESS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrORB_REGADDRESS_WITH_REG8", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].ORB_ADDRESS_WITH_REG8, 'ORB', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_8BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].ADDRESS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrORB_ADDRESS_WITH_REG8", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].ORB_BYTE_WITH_REG8, 'ORB', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_8BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].BYTE),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrORB_BYTE_WITH_REG8", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].XOR_REG16_WITH_REG16, 'XOR', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_16BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_16BITS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrXOR_REG16_WITH_REG16", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].XOR_REGADDRESS_WITH_REG16, 'XOR', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_16BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGADDRESS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrXOR_REGADDRESS_WITH_REG16", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].XOR_ADDRESS_WITH_REG16, 'XOR', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_16BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].ADDRESS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrXOR_ADDRESS_WITH_REG16", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].XOR_WORD_WITH_REG16, 'XOR', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_16BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].WORD),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrXOR_WORD_WITH_REG16", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].XORB_REG8_WITH_REG8, 'XORB', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_8BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_8BITS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrXORB_REG8_WITH_REG8", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].XORB_REGADDRESS_WITH_REG8, 'XORB', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_8BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGADDRESS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrXORB_REGADDRESS_WITH_REG8", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].XORB_ADDRESS_WITH_REG8, 'XORB', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_8BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].ADDRESS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrXORB_ADDRESS_WITH_REG8", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].XORB_BYTE_WITH_REG8, 'XORB', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_8BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].BYTE),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrXORB_BYTE_WITH_REG8", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].NOT_REG16, 'NOT', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_16BITS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrNOT_REG16", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].NOTB_REG8, 'NOTB', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_8BITS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrNOT_REG8", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].SHL_REG16_WITH_REG16, 'SHL', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_16BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_16BITS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrSHL_REG_WITH_REG", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].SHL_REGADDRESS_WITH_REG16, 'SHL', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_16BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGADDRESS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrSHL_REGADDRESS_WITH_REG16", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].SHL_ADDRESS_WITH_REG16, 'SHL', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_16BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].ADDRESS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrSHL_ADDRESS_WITH_REG16", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].SHL_WORD_WITH_REG16, 'SHL', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_16BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].WORD),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrSHL_WORD_WITH_REG16", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].SHLB_REG8_WITH_REG8, 'SHLB', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_8BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_8BITS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrSHLB_REG8_WITH_REG8", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].SHLB_REGADDRESS_WITH_REG8, 'SHLB', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_16BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGADDRESS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrSHLB_REGADDRESS_WITH_REG8", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].SHLB_ADDRESS_WITH_REG8, 'SHLB', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_8BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].ADDRESS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrSHLB_ADDRESS_WITH_REG8", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].SHLB_BYTE_WITH_REG8, 'SHLB', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_8BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].BYTE),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrSHLB_BYTE_WITH_REG8", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].SHR_REG16_WITH_REG16, 'SHR', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_16BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_16BITS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrSHR_REG_WITH_REG16", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].SHR_REGADDRESS_WITH_REG16, 'SHR', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_16BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGADDRESS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrSHR_REGADDRESS_WITH_REG16", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].SHR_ADDRESS_WITH_REG16, 'SHR', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_16BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].ADDRESS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrSHR_ADDRESS_WITH_REG16", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].SHR_WORD_WITH_REG16, 'SHR', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_16BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].WORD),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrSHR_WORD_WITH_REG16", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].SHRB_REG8_WITH_REG8, 'SHRB', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_8BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_8BITS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrSHRB_REG8_WITH_REG8", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].SHRB_REGADDRESS_WITH_REG8, 'SHRB', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_8BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGADDRESS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrSHRB_REGADDRESS_WITH_REG8", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].SHRB_ADDRESS_WITH_REG8, 'SHRB', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_8BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].ADDRESS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrSHRB_ADDRESS_WITH_REG8", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].SHRB_BYTE_WITH_REG8, 'SHRB', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_8BITS, _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].BYTE),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrSHRB_BYTE_WITH_REG8", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].CLI, 'CLI'),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", []),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrCLI", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].STI, 'STI'),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", []),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrSTI", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].IRET, 'IRET', undefined, undefined, ['SRET']),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", []),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrIRET", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].SVC, 'SVC'),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", []),
        __metadata("design:returntype", Boolean)
    ], CPUService.prototype, "instrSVC", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].IN_REG16, 'IN', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_16BITS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number]),
        __metadata("design:returntype", void 0)
    ], CPUService.prototype, "instrIN_REG16", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].IN_REGADDRESS, 'IN', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGADDRESS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number]),
        __metadata("design:returntype", void 0)
    ], CPUService.prototype, "instrIN_REGADDRESS", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].IN_ADDRESS, 'IN', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].ADDRESS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number]),
        __metadata("design:returntype", void 0)
    ], CPUService.prototype, "instrIN_ADDRESS", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].IN_WORD, 'IN', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].WORD),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number]),
        __metadata("design:returntype", void 0)
    ], CPUService.prototype, "instrIN_WORD", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].OUT_REG16, 'OUT', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGISTER_16BITS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number]),
        __metadata("design:returntype", void 0)
    ], CPUService.prototype, "instrOUT_REG16", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].OUT_REGADDRESS, 'OUT', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].REGADDRESS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number]),
        __metadata("design:returntype", void 0)
    ], CPUService.prototype, "instrOUT_REGADDRESS", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].OUT_ADDRESS, 'OUT', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].ADDRESS),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number]),
        __metadata("design:returntype", void 0)
    ], CPUService.prototype, "instrOUT_ADDRESS", null);
    __decorate([
        Object(_instrset__WEBPACK_IMPORTED_MODULE_2__["Instruction"])(_instrset__WEBPACK_IMPORTED_MODULE_2__["OpCode"].OUT_WORD, 'OUT', _instrset__WEBPACK_IMPORTED_MODULE_2__["OperandType"].WORD),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number]),
        __metadata("design:returntype", void 0)
    ], CPUService.prototype, "instrOUT_WORD", null);
    CPUService = CPUService_1 = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Injectable"])(),
        __metadata("design:paramtypes", [_memory_service__WEBPACK_IMPORTED_MODULE_3__["MemoryService"],
            _clock_service__WEBPACK_IMPORTED_MODULE_5__["ClockService"],
            _ioregmap_service__WEBPACK_IMPORTED_MODULE_4__["IORegMapService"],
            _events_log_service__WEBPACK_IMPORTED_MODULE_8__["EventsLogService"]])
    ], CPUService);
    return CPUService;
}());



/***/ }),

/***/ "./src/app/cpuregs.ts":
/*!****************************!*\
  !*** ./src/app/cpuregs.ts ***!
  \****************************/
/*! exports provided: SRBit, CPURegisterIndex, getRegisterSize, CPURegisterOperationType, CPURegisterOperation, CPURegister, CPUGeneralPurposeRegister, CPUStatusRegister */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "SRBit", function() { return SRBit; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "CPURegisterIndex", function() { return CPURegisterIndex; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "getRegisterSize", function() { return getRegisterSize; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "CPURegisterOperationType", function() { return CPURegisterOperationType; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "CPURegisterOperation", function() { return CPURegisterOperation; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "CPURegister", function() { return CPURegister; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "CPUGeneralPurposeRegister", function() { return CPUGeneralPurposeRegister; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "CPUStatusRegister", function() { return CPUStatusRegister; });
/* harmony import */ var _utils__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./utils */ "./src/app/utils.ts");
var __extends = (undefined && undefined.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();

var SRBit;
(function (SRBit) {
    SRBit[SRBit["HALT"] = 0] = "HALT";
    SRBit[SRBit["FAULT"] = 1] = "FAULT";
    SRBit[SRBit["ZERO"] = 2] = "ZERO";
    SRBit[SRBit["CARRY"] = 3] = "CARRY";
    SRBit[SRBit["IRQMASK"] = 4] = "IRQMASK";
    SRBit[SRBit["SUPERVISOR"] = 15] = "SUPERVISOR";
})(SRBit || (SRBit = {}));
var CPURegisterIndex;
(function (CPURegisterIndex) {
    CPURegisterIndex[CPURegisterIndex["A"] = 0] = "A";
    CPURegisterIndex[CPURegisterIndex["B"] = 1] = "B";
    CPURegisterIndex[CPURegisterIndex["C"] = 2] = "C";
    CPURegisterIndex[CPURegisterIndex["D"] = 3] = "D";
    CPURegisterIndex[CPURegisterIndex["SP"] = 4] = "SP";
    CPURegisterIndex[CPURegisterIndex["USP"] = 5] = "USP";
    CPURegisterIndex[CPURegisterIndex["SSP"] = 6] = "SSP";
    CPURegisterIndex[CPURegisterIndex["IP"] = 7] = "IP";
    CPURegisterIndex[CPURegisterIndex["SR"] = 8] = "SR";
    CPURegisterIndex[CPURegisterIndex["AH"] = 9] = "AH";
    CPURegisterIndex[CPURegisterIndex["AL"] = 10] = "AL";
    CPURegisterIndex[CPURegisterIndex["BH"] = 11] = "BH";
    CPURegisterIndex[CPURegisterIndex["BL"] = 12] = "BL";
    CPURegisterIndex[CPURegisterIndex["CH"] = 13] = "CH";
    CPURegisterIndex[CPURegisterIndex["CL"] = 14] = "CL";
    CPURegisterIndex[CPURegisterIndex["DH"] = 15] = "DH";
    CPURegisterIndex[CPURegisterIndex["DL"] = 16] = "DL";
})(CPURegisterIndex || (CPURegisterIndex = {}));
function getRegisterSize(index) {
    var size;
    switch (index) {
        case CPURegisterIndex.A:
        case CPURegisterIndex.B:
        case CPURegisterIndex.C:
        case CPURegisterIndex.D:
        case CPURegisterIndex.SP:
        case CPURegisterIndex.USP:
        case CPURegisterIndex.SSP:
        case CPURegisterIndex.IP:
        case CPURegisterIndex.SR:
            size = 16;
            break;
        case CPURegisterIndex.AH:
        case CPURegisterIndex.AL:
        case CPURegisterIndex.BH:
        case CPURegisterIndex.BL:
        case CPURegisterIndex.CH:
        case CPURegisterIndex.CL:
        case CPURegisterIndex.DH:
        case CPURegisterIndex.DL:
            size = 8;
            break;
    }
    return size;
}
var CPURegisterOperationType;
(function (CPURegisterOperationType) {
    CPURegisterOperationType[CPURegisterOperationType["READ"] = 1] = "READ";
    CPURegisterOperationType[CPURegisterOperationType["WRITE"] = 2] = "WRITE";
    CPURegisterOperationType[CPURegisterOperationType["READ_BIT"] = 3] = "READ_BIT";
    CPURegisterOperationType[CPURegisterOperationType["WRITE_BIT"] = 4] = "WRITE_BIT";
})(CPURegisterOperationType || (CPURegisterOperationType = {}));
var CPURegisterOperation = /** @class */ (function () {
    function CPURegisterOperation(operationType, data) {
        this.operationType = operationType;
        this.data = data;
    }
    CPURegisterOperation.prototype.toString = function () {
        var ret, params, pad;
        switch (this.operationType) {
            case CPURegisterOperationType.READ:
                params = this.data;
                pad = getRegisterSize(params.index) / 4;
                ret = "REG: Read register 0x" + _utils__WEBPACK_IMPORTED_MODULE_0__["Utils"].pad(params.index, 16, 2) + ": " + CPURegisterIndex[params.index] + " " +
                    ("=> 0x" + _utils__WEBPACK_IMPORTED_MODULE_0__["Utils"].pad(params.value, 16, pad));
                break;
            case CPURegisterOperationType.WRITE:
                params = this.data;
                pad = getRegisterSize(params.index) / 4;
                var size = getRegisterSize(params.index) === 1 ? 'byte' : 'word';
                ret = "REG: Write " + size + " 0x" + _utils__WEBPACK_IMPORTED_MODULE_0__["Utils"].pad(params.value, 16, pad) + " to register " +
                    (" 0x" + _utils__WEBPACK_IMPORTED_MODULE_0__["Utils"].pad(params.index, 16, 2) + ": " + CPURegisterIndex[params.index]);
                break;
            case CPURegisterOperationType.READ_BIT:
                params = this.data;
                if (params.index === CPURegisterIndex.SR) {
                    ret = "REG: Read bit " + params.bitNumber + ": " + SRBit[params.bitNumber] + " of Status Register (SR) " +
                        ("=> " + params.value);
                }
                else {
                    ret = "REG: Read bit " + params.bitNumber + " of register " +
                        ("0x" + _utils__WEBPACK_IMPORTED_MODULE_0__["Utils"].pad(params.index, 16, 2) + ": " + CPURegisterIndex[params.index] + " ") +
                        ("=> " + params.value);
                }
                break;
            case CPURegisterOperationType.WRITE_BIT:
                params = this.data;
                var op = params.value === 0 ? 'Clear' : 'Set';
                if (params.index === CPURegisterIndex.SR) {
                    ret = "REG: " + op + " bit " + params.bitNumber + ": " + SRBit[params.bitNumber] + " of Status Register (SR)";
                }
                else {
                    ret = "REG: " + op + " bit " + params.bitNumber + " of register " +
                        ("0x" + _utils__WEBPACK_IMPORTED_MODULE_0__["Utils"].pad(params.index, 16, 2) + ": " + CPURegisterIndex[params.index]);
                }
                break;
        }
        return ret;
    };
    return CPURegisterOperation;
}());

var CPURegister = /** @class */ (function () {
    function CPURegister(name, index, resetValue, publishRegisterOperation, description) {
        this.name = name;
        this.description = description;
        this.index = index;
        this.resetValue = resetValue;
        this._value = resetValue;
        this.publishRegisterOperation = publishRegisterOperation;
    }
    CPURegister.prototype.publishWriteBit = function (index, bitNumber, newBitValue) {
        if (this.publishRegisterOperation) {
            var parameters = {
                index: index,
                bitNumber: bitNumber,
                value: newBitValue
            };
            this.publishRegisterOperation(new CPURegisterOperation(CPURegisterOperationType.WRITE_BIT, parameters));
        }
    };
    CPURegister.prototype.publishReadBit = function (index, bitNumber, readBitValue) {
        if (this.publishRegisterOperation) {
            var parameters = {
                index: index,
                bitNumber: bitNumber,
                value: readBitValue
            };
            this.publishRegisterOperation(new CPURegisterOperation(CPURegisterOperationType.READ_BIT, parameters));
        }
    };
    CPURegister.prototype.publishWriteValue = function (index, newValue) {
        if (this.publishRegisterOperation) {
            var parameters = {
                index: index,
                value: newValue
            };
            this.publishRegisterOperation(new CPURegisterOperation(CPURegisterOperationType.WRITE, parameters));
        }
    };
    CPURegister.prototype.publishReadValue = function (index, readValue) {
        if (this.publishRegisterOperation) {
            var parameters = {
                index: index,
                value: readValue
            };
            this.publishRegisterOperation(new CPURegisterOperation(CPURegisterOperationType.READ, parameters));
        }
    };
    Object.defineProperty(CPURegister.prototype, "value", {
        get: function () {
            this.publishReadValue(this.index, this._value);
            return this._value;
        },
        set: function (newValue) {
            this._value = newValue;
            this.publishWriteValue(this.index, newValue);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CPURegister.prototype, "silentValue", {
        get: function () {
            return this._value;
        },
        enumerable: true,
        configurable: true
    });
    return CPURegister;
}());

var CPUGeneralPurposeRegister = /** @class */ (function (_super) {
    __extends(CPUGeneralPurposeRegister, _super);
    function CPUGeneralPurposeRegister(name, index, indexHigh, indexLow, resetValue, publishRegisterOperation, description) {
        var _this = _super.call(this, name, index, resetValue, publishRegisterOperation, description) || this;
        _this.indexHigh = indexHigh;
        _this.indexLow = indexLow;
        return _this;
    }
    Object.defineProperty(CPUGeneralPurposeRegister.prototype, "low", {
        get: function () {
            var readValue = this._value & 0x00FF;
            this.publishReadValue(this.indexLow, readValue);
            return readValue;
        },
        set: function (newValue) {
            this._value = (this._value & 0xFF00) + newValue;
            this.publishWriteValue(this.indexLow, newValue);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CPUGeneralPurposeRegister.prototype, "high", {
        get: function () {
            var readValue = (this._value & 0xFF00) >>> 8;
            this.publishReadValue(this.indexHigh, readValue);
            return readValue;
        },
        set: function (newValue) {
            this._value = (this._value & 0x00FF) + (newValue << 8);
            this.publishWriteValue(this.indexHigh, newValue);
        },
        enumerable: true,
        configurable: true
    });
    return CPUGeneralPurposeRegister;
}(CPURegister));

var CPUStatusRegister = /** @class */ (function (_super) {
    __extends(CPUStatusRegister, _super);
    function CPUStatusRegister(name, index, initialValue, publishRegisterOperation, description) {
        var _this = _super.call(this, name, index, initialValue, publishRegisterOperation, description) || this;
        _this._halt = 0;
        _this._fault = 0;
        _this._zero = 0;
        _this._carry = 0;
        _this._irqMask = 0;
        _this._supervisor = 0;
        if ((initialValue & (1 << SRBit.HALT)) !== 0) {
            _this._halt = 1;
        }
        if ((initialValue & (1 << SRBit.FAULT)) !== 0) {
            _this._fault = 1;
        }
        if ((initialValue & (1 << SRBit.ZERO)) !== 0) {
            _this._zero = 1;
        }
        if ((initialValue & (1 << SRBit.CARRY)) !== 0) {
            _this._carry = 1;
        }
        if ((initialValue & (1 << SRBit.IRQMASK)) !== 0) {
            _this._irqMask = 1;
        }
        if ((initialValue & (1 << SRBit.SUPERVISOR)) !== 0) {
            _this._supervisor = 1;
        }
        return _this;
    }
    Object.defineProperty(CPUStatusRegister.prototype, "value", {
        get: function () {
            this.publishReadValue(this.index, this._value);
            return this._value;
        },
        set: function (newValue) {
            if ((newValue & (1 << SRBit.HALT)) !== 0) {
                this._halt = 1;
            }
            else {
                this._halt = 0;
            }
            if ((newValue & (1 << SRBit.FAULT)) !== 0) {
                this._fault = 1;
            }
            else {
                this._fault = 0;
            }
            if ((newValue & (1 << SRBit.ZERO)) !== 0) {
                this._zero = 1;
            }
            else {
                this._zero = 0;
            }
            if ((newValue & (1 << SRBit.CARRY)) !== 0) {
                this._carry = 1;
            }
            else {
                this._carry = 0;
            }
            if ((newValue & (1 << SRBit.IRQMASK)) !== 0) {
                this._irqMask = 1;
            }
            else {
                this._irqMask = 0;
            }
            if ((newValue & (1 << SRBit.SUPERVISOR)) !== 0) {
                this._supervisor = 1;
            }
            else {
                this._supervisor = 0;
            }
            this._value = newValue;
            this.publishWriteValue(this.index, newValue);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CPUStatusRegister.prototype, "halt", {
        get: function () {
            this.publishReadBit(this.index, SRBit.HALT, this._halt);
            return this._halt;
        },
        set: function (newValue) {
            if (newValue === 0) {
                this._halt = 0;
                this._value &= ~(1 << SRBit.HALT);
            }
            else {
                this._halt = 1;
                this._value |= (1 << SRBit.HALT);
            }
            this.publishWriteBit(this.index, SRBit.HALT, this._halt);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CPUStatusRegister.prototype, "fault", {
        get: function () {
            this.publishReadBit(this.index, SRBit.FAULT, this._fault);
            return this._fault;
        },
        set: function (newValue) {
            if (newValue === 0) {
                this._fault = 0;
                this._value &= ~(1 << SRBit.FAULT);
            }
            else {
                this._fault = 1;
                this._value |= (1 << SRBit.FAULT);
            }
            this.publishWriteBit(this.index, SRBit.FAULT, this._fault);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CPUStatusRegister.prototype, "zero", {
        get: function () {
            this.publishReadBit(this.index, SRBit.ZERO, this._zero);
            return this._zero;
        },
        set: function (newValue) {
            if (newValue === 0) {
                this._zero = 0;
                this._value &= ~(1 << SRBit.ZERO);
            }
            else {
                this._zero = 1;
                this._value |= (1 << SRBit.ZERO);
            }
            this.publishWriteBit(this.index, SRBit.ZERO, this._zero);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CPUStatusRegister.prototype, "carry", {
        get: function () {
            this.publishReadBit(this.index, SRBit.CARRY, this._carry);
            return this._carry;
        },
        set: function (newValue) {
            if (newValue === 0) {
                this._carry = 0;
                this._value &= ~(1 << SRBit.CARRY);
            }
            else {
                this._carry = 1;
                this._value |= (1 << SRBit.CARRY);
            }
            this.publishWriteBit(this.index, SRBit.CARRY, this._carry);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CPUStatusRegister.prototype, "irqMask", {
        get: function () {
            this.publishReadBit(this.index, SRBit.IRQMASK, this._irqMask);
            return this._irqMask;
        },
        set: function (newValue) {
            if (newValue === 0) {
                this._irqMask = 0;
                this._value &= ~(1 << SRBit.IRQMASK);
            }
            else {
                this._irqMask = 1;
                this._value |= (1 << SRBit.IRQMASK);
            }
            this.publishWriteBit(this.index, SRBit.IRQMASK, this._irqMask);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CPUStatusRegister.prototype, "supervisor", {
        get: function () {
            this.publishReadBit(this.index, SRBit.SUPERVISOR, this._supervisor);
            return this._supervisor;
        },
        set: function (newValue) {
            if (newValue === 0) {
                this._supervisor = 0;
                this._value &= ~(1 << SRBit.SUPERVISOR);
            }
            else {
                this._supervisor = 1;
                this._value |= (1 << SRBit.SUPERVISOR);
            }
            this.publishWriteBit(this.index, SRBit.SUPERVISOR, this._supervisor);
        },
        enumerable: true,
        configurable: true
    });
    return CPUStatusRegister;
}(CPURegister));



/***/ }),

/***/ "./src/app/events-log-viewer/events-log-viewer.component.html":
/*!********************************************************************!*\
  !*** ./src/app/events-log-viewer/events-log-viewer.component.html ***!
  \********************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "<p-panel styleClass=\"ioregisters-panel\">\n  <p-header>\n    <div class=\"ui-helper-clearfix\">\n      <span class=\"ui-panel-title\" style=\"display:inline-block\">Events Log</span>\n      <div class=\"panel-header-btn-group\">\n      <p-multiSelect [disabled]=\"!enableLogging\" appendTo=\"body\" defaultLabel=\"Logging Sources\" [displaySelectedLabel]=\"false\" [showHeader]=\"false\" [options]=\"loggingSources\" [(ngModel)]=\"selectedSources\" styleClass=\"ui-multiselect-small\">\n      </p-multiSelect>\n      <p-toggleButton [(ngModel)]=\"enableLogging\" onLabel=\"Enabled\" offLabel=\"Disabled\" styleClass=\"ui-button-small\"></p-toggleButton>\n      <p-button label=\"Clear\" (onClick)=\"clearLogLines()\" styleClass=\"ui-button-small\"></p-button>\n      </div>\n    </div>\n  </p-header>\n\n<div #logLinesContainer class=\"list-group events-log-list\">\n  <div #logLinesItems *ngFor=\"let i of logLines\" class=\"list-group-item source-code event\" [ngClass]=\"i.style\">\n    {{i.text}}\n  </div>\n</div>\n<div [ngClass]=\"{'muted': isRunning === true || enableLogging === false}\">\n</div>\n</p-panel>\n"

/***/ }),

/***/ "./src/app/events-log-viewer/events-log-viewer.component.ts":
/*!******************************************************************!*\
  !*** ./src/app/events-log-viewer/events-log-viewer.component.ts ***!
  \******************************************************************/
/*! exports provided: EventsLogViewerComponent */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "EventsLogViewerComponent", function() { return EventsLogViewerComponent; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var _events_log_service__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../events-log.service */ "./src/app/events-log.service.ts");
/* harmony import */ var _memory_service__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../memory.service */ "./src/app/memory.service.ts");
/* harmony import */ var _cpu_service__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../cpu.service */ "./src/app/cpu.service.ts");
/* harmony import */ var _alu__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../alu */ "./src/app/alu.ts");
/* harmony import */ var _cpuregs__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../cpuregs */ "./src/app/cpuregs.ts");
/* harmony import */ var _ioregmap_service__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../ioregmap.service */ "./src/app/ioregmap.service.ts");
/* harmony import */ var _irqctrl_service__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../irqctrl.service */ "./src/app/irqctrl.service.ts");
/* harmony import */ var _timer_service__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../timer.service */ "./src/app/timer.service.ts");
/* harmony import */ var _visual_display_visual_display_component__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ../visual-display/visual-display.component */ "./src/app/visual-display/visual-display.component.ts");
/* harmony import */ var _textual_display_textual_display_component__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ../textual-display/textual-display.component */ "./src/app/textual-display/textual-display.component.ts");
/* harmony import */ var _keypad_keypad_component__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ../keypad/keypad.component */ "./src/app/keypad/keypad.component.ts");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};












var LogLine = /** @class */ (function () {
    function LogLine(text, style) {
        this.text = text;
        this.style = style;
    }
    return LogLine;
}());
var EventsLogViewerComponent = /** @class */ (function () {
    function EventsLogViewerComponent(eventsLogService) {
        this.eventsLogService = eventsLogService;
        this.enableLogging = false;
        this.selectedSources = [
            'ControlUnit', 'CPURegisters', 'ALU',
            'Memory', 'IORegisters', 'IRQController',
            'Timer', 'TextualDisplay', 'VisualDisplay',
            'Keypad'
        ];
        this.logLines = [];
        this.eventGroups = [];
        this.loggingSources = [
            {
                label: 'Control Unit',
                value: 'ControlUnit'
            },
            {
                label: 'CPU Registers',
                value: 'CPURegisters'
            },
            {
                label: 'Arithmetic Logic Unit',
                value: 'ALU'
            },
            {
                label: 'Memory',
                value: 'Memory'
            },
            {
                label: 'I/O Registers',
                value: 'IORegisters'
            },
            {
                label: 'IRQ Controller',
                value: 'IRQController'
            },
            {
                label: 'Timer',
                value: 'Timer'
            },
            {
                label: 'Textual Display',
                value: 'TextualDisplay'
            },
            {
                label: 'Visual Display',
                value: 'VisualDisplay'
            },
            {
                label: 'Keypad',
                value: 'Keypad'
            },
        ];
    }
    EventsLogViewerComponent_1 = EventsLogViewerComponent;
    EventsLogViewerComponent.getStyle = function (systemEvent) {
        var ret;
        if (systemEvent instanceof _memory_service__WEBPACK_IMPORTED_MODULE_2__["MemoryOperation"]) {
            ret = 'memory-event';
        }
        else if (systemEvent instanceof _cpu_service__WEBPACK_IMPORTED_MODULE_3__["ControlUnitOperation"]) {
            ret = 'control-unit-event';
        }
        else if (systemEvent instanceof _alu__WEBPACK_IMPORTED_MODULE_4__["ALUOperation"]) {
            ret = 'aluevent';
        }
        else if (systemEvent instanceof _cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterOperation"]) {
            ret = 'cpuregister-event';
        }
        else if (systemEvent instanceof _ioregmap_service__WEBPACK_IMPORTED_MODULE_6__["IORegisterOperation"]) {
            ret = 'ioregister-event';
        }
        else if (systemEvent instanceof _irqctrl_service__WEBPACK_IMPORTED_MODULE_7__["IrqCtrlOperation"]) {
            ret = 'irq-ctrl-event';
        }
        else if (systemEvent instanceof _timer_service__WEBPACK_IMPORTED_MODULE_8__["TimerOperation"]) {
            ret = 'timer-event';
        }
        else if (systemEvent instanceof _visual_display_visual_display_component__WEBPACK_IMPORTED_MODULE_9__["VisualDisplayOperation"]) {
            ret = 'visual-display-event';
        }
        else if (systemEvent instanceof _textual_display_textual_display_component__WEBPACK_IMPORTED_MODULE_10__["TextualDisplayOperation"]) {
            ret = 'textual-display-event';
        }
        else if (systemEvent instanceof _keypad_keypad_component__WEBPACK_IMPORTED_MODULE_11__["KeypadOperation"]) {
            ret = 'keypad-event';
        }
        return ret;
    };
    EventsLogViewerComponent.prototype.ngAfterViewInit = function () {
        var _this = this;
        this.logLinesItems.changes.subscribe(function () { return _this.scrollToBottom(); });
        this.eventsLogService.eventsLog$.subscribe(function (loggedEvent) { return _this.processLoggedEvent(loggedEvent); });
    };
    EventsLogViewerComponent.prototype.clearLogLines = function () {
        this.logLines = [];
    };
    EventsLogViewerComponent.prototype.scrollToBottom = function () {
        var element = this.logLinesContainer.nativeElement;
        try {
            element.scrollTop = element.scrollHeight;
        }
        catch (error) { }
    };
    EventsLogViewerComponent.prototype.getTextLine = function (loggedEvent) {
        return loggedEvent.time + ": " + '----'.repeat(this.eventGroups.length) + " " +
            ("" + loggedEvent.systemEvent.toString());
    };
    EventsLogViewerComponent.prototype.isEventEnabled = function (systemEvent) {
        var ret = false;
        if (systemEvent instanceof _memory_service__WEBPACK_IMPORTED_MODULE_2__["MemoryOperation"] && this.selectedSources.includes('Memory') && (systemEvent.operationType !== _memory_service__WEBPACK_IMPORTED_MODULE_2__["MemoryOperationType"].RESET &&
            systemEvent.operationType !== _memory_service__WEBPACK_IMPORTED_MODULE_2__["MemoryOperationType"].ADD_REGION &&
            systemEvent.operationType !== _memory_service__WEBPACK_IMPORTED_MODULE_2__["MemoryOperationType"].STORE_BYTES)) {
            ret = true;
        }
        else if (systemEvent instanceof _cpu_service__WEBPACK_IMPORTED_MODULE_3__["ControlUnitOperation"] && this.selectedSources.includes('ControlUnit')) {
            ret = true;
        }
        else if (systemEvent instanceof _alu__WEBPACK_IMPORTED_MODULE_4__["ALUOperation"] && this.selectedSources.includes('ALU')) {
            ret = true;
        }
        else if (systemEvent instanceof _cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterOperation"] && this.selectedSources.includes('CPURegisters')) {
            ret = true;
        }
        else if (systemEvent instanceof _ioregmap_service__WEBPACK_IMPORTED_MODULE_6__["IORegisterOperation"] && this.selectedSources.includes('IORegisters') &&
            (systemEvent.operationType !== _ioregmap_service__WEBPACK_IMPORTED_MODULE_6__["IORegisterOperationType"].ADD_REGISTER)) {
            ret = true;
        }
        else if (systemEvent instanceof _irqctrl_service__WEBPACK_IMPORTED_MODULE_7__["IrqCtrlOperation"] && this.selectedSources.includes('IRQController')) {
            ret = true;
        }
        else if (systemEvent instanceof _timer_service__WEBPACK_IMPORTED_MODULE_8__["TimerOperation"] && this.selectedSources.includes('Timer')) {
            ret = true;
        }
        else if (systemEvent instanceof _visual_display_visual_display_component__WEBPACK_IMPORTED_MODULE_9__["VisualDisplayOperation"] && this.selectedSources.includes('VisualDisplay')) {
            ret = true;
        }
        else if (systemEvent instanceof _textual_display_textual_display_component__WEBPACK_IMPORTED_MODULE_10__["TextualDisplayOperation"] && this.selectedSources.includes('TextualDisplay')) {
            ret = true;
        }
        else if (systemEvent instanceof _keypad_keypad_component__WEBPACK_IMPORTED_MODULE_11__["KeypadOperation"] && this.selectedSources.includes('Keypad')) {
            ret = true;
        }
        return ret;
    };
    EventsLogViewerComponent.prototype.pushNewLine = function (loggedEvent) {
        if (this.isEventEnabled(loggedEvent.systemEvent)) {
            var newLine = new LogLine(this.getTextLine(loggedEvent), EventsLogViewerComponent_1.getStyle(loggedEvent.systemEvent));
            this.logLines.push(newLine);
        }
    };
    EventsLogViewerComponent.prototype.processLoggedEvent = function (loggedEvent) {
        if (this.isRunning === true || this.enableLogging === false) {
            return;
        }
        if (loggedEvent.flushGroups === true) {
            this.eventGroups = [];
        }
        if (loggedEvent.systemEvent instanceof _events_log_service__WEBPACK_IMPORTED_MODULE_1__["SystemEventGroupMark"]) {
            var groupMark = loggedEvent.systemEvent;
            var systemEvent = groupMark.systemEvent;
            if (this.isEventEnabled(systemEvent) && groupMark.startGroup === true) {
                this.pushNewLine({ time: loggedEvent.time, systemEvent: systemEvent, flushGroups: false });
                this.eventGroups.push(systemEvent);
            }
            else {
                this.eventGroups.splice(this.eventGroups.indexOf(systemEvent));
            }
        }
        else {
            this.pushNewLine(loggedEvent);
        }
    };
    var EventsLogViewerComponent_1;
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Input"])(),
        __metadata("design:type", Boolean)
    ], EventsLogViewerComponent.prototype, "isRunning", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["ViewChild"])('logLinesContainer'),
        __metadata("design:type", _angular_core__WEBPACK_IMPORTED_MODULE_0__["ElementRef"])
    ], EventsLogViewerComponent.prototype, "logLinesContainer", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["ViewChildren"])('logLinesItems'),
        __metadata("design:type", _angular_core__WEBPACK_IMPORTED_MODULE_0__["QueryList"])
    ], EventsLogViewerComponent.prototype, "logLinesItems", void 0);
    EventsLogViewerComponent = EventsLogViewerComponent_1 = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"])({
            selector: 'app-events-log-viewer',
            template: __webpack_require__(/*! ./events-log-viewer.component.html */ "./src/app/events-log-viewer/events-log-viewer.component.html")
        }),
        __metadata("design:paramtypes", [_events_log_service__WEBPACK_IMPORTED_MODULE_1__["EventsLogService"]])
    ], EventsLogViewerComponent);
    return EventsLogViewerComponent;
}());



/***/ }),

/***/ "./src/app/events-log.service.ts":
/*!***************************************!*\
  !*** ./src/app/events-log.service.ts ***!
  \***************************************/
/*! exports provided: SystemEventGroupMark, EventsLogService */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "SystemEventGroupMark", function() { return SystemEventGroupMark; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "EventsLogService", function() { return EventsLogService; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var rxjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! rxjs */ "./node_modules/rxjs/_esm5/index.js");
/* harmony import */ var _clock_service__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./clock.service */ "./src/app/clock.service.ts");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};



var SystemEventGroupMark = /** @class */ (function () {
    function SystemEventGroupMark(startGroup, systemEvent) {
        this.startGroup = startGroup;
        this.systemEvent = systemEvent;
    }
    SystemEventGroupMark.prototype.toString = function () {
        return "-- event group mark --";
    };
    return SystemEventGroupMark;
}());

var EventsLogService = /** @class */ (function () {
    function EventsLogService(clockService) {
        this.clockService = clockService;
        this.eventsLogSource = new rxjs__WEBPACK_IMPORTED_MODULE_1__["Subject"]();
        this.eventsLog$ = this.eventsLogSource.asObservable();
    }
    EventsLogService.prototype.log = function (systemEvent, flushGroups) {
        if (flushGroups === void 0) { flushGroups = false; }
        var loggedEvent = {
            time: this.clockService.getClock(),
            systemEvent: systemEvent,
            flushGroups: flushGroups
        };
        this.eventsLogSource.next(loggedEvent);
    };
    EventsLogService.prototype.startEventGroup = function (systemEvent) {
        var eventGroupMark = new SystemEventGroupMark(true, systemEvent);
        this.log(eventGroupMark);
    };
    EventsLogService.prototype.endEventGroup = function (systemEvent) {
        var eventGroupMark = new SystemEventGroupMark(false, systemEvent);
        this.log(eventGroupMark);
    };
    EventsLogService = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Injectable"])(),
        __metadata("design:paramtypes", [_clock_service__WEBPACK_IMPORTED_MODULE_2__["ClockService"]])
    ], EventsLogService);
    return EventsLogService;
}());



/***/ }),

/***/ "./src/app/exceptions.ts":
/*!*******************************!*\
  !*** ./src/app/exceptions.ts ***!
  \*******************************/
/*! exports provided: ExceptionType, Exception */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ExceptionType", function() { return ExceptionType; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "Exception", function() { return Exception; });
var ExceptionType;
(function (ExceptionType) {
    ExceptionType[ExceptionType["DIVIDE_BY_ZERO"] = 0] = "DIVIDE_BY_ZERO";
    ExceptionType[ExceptionType["INSTRUCTION_FETCH_ERROR"] = 1] = "INSTRUCTION_FETCH_ERROR";
    ExceptionType[ExceptionType["MEMORY_ACCESS_ERROR"] = 2] = "MEMORY_ACCESS_ERROR";
    ExceptionType[ExceptionType["UNKNOWN_OPCODE"] = 3] = "UNKNOWN_OPCODE";
    ExceptionType[ExceptionType["ILLEGAL_INSTRUCTION"] = 4] = "ILLEGAL_INSTRUCTION";
    ExceptionType[ExceptionType["STACK_ACCESS_ERROR"] = 5] = "STACK_ACCESS_ERROR";
})(ExceptionType || (ExceptionType = {}));
var Exception = /** @class */ (function () {
    function Exception(type, message, IP, SP, SR, memoryAddress) {
        this.type = type;
        this.message = message;
        this.IP = IP;
        this.SP = SP;
        this.SR = SR;
        this.memoryAddress = memoryAddress;
    }
    return Exception;
}());



/***/ }),

/***/ "./src/app/instrset.ts":
/*!*****************************!*\
  !*** ./src/app/instrset.ts ***!
  \*****************************/
/*! exports provided: OpCode, OperandType, InstructionSpec, InstructionSet, instructionSet, Instruction */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "OpCode", function() { return OpCode; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "OperandType", function() { return OperandType; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "InstructionSpec", function() { return InstructionSpec; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "InstructionSet", function() { return InstructionSet; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "instructionSet", function() { return instructionSet; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "Instruction", function() { return Instruction; });
var OpCode;
(function (OpCode) {
    OpCode[OpCode["HLT"] = 0] = "HLT";
    OpCode[OpCode["MOV_REG16_TO_REG16"] = 1] = "MOV_REG16_TO_REG16";
    OpCode[OpCode["MOV_REGADDRESS_TO_REG16"] = 2] = "MOV_REGADDRESS_TO_REG16";
    OpCode[OpCode["MOV_ADDRESS_TO_REG16"] = 3] = "MOV_ADDRESS_TO_REG16";
    OpCode[OpCode["MOV_REG16_TO_REGADDRESS"] = 4] = "MOV_REG16_TO_REGADDRESS";
    OpCode[OpCode["MOV_REG16_TO_ADDRESS"] = 5] = "MOV_REG16_TO_ADDRESS";
    OpCode[OpCode["MOV_WORD_TO_REG16"] = 6] = "MOV_WORD_TO_REG16";
    OpCode[OpCode["MOV_WORD_TO_REGADDRESS"] = 7] = "MOV_WORD_TO_REGADDRESS";
    OpCode[OpCode["MOV_WORD_TO_ADDRESS"] = 8] = "MOV_WORD_TO_ADDRESS";
    OpCode[OpCode["MOVB_REG8_TO_REG8"] = 9] = "MOVB_REG8_TO_REG8";
    OpCode[OpCode["MOVB_REGADDRESS_TO_REG8"] = 10] = "MOVB_REGADDRESS_TO_REG8";
    OpCode[OpCode["MOVB_ADDRESS_TO_REG8"] = 11] = "MOVB_ADDRESS_TO_REG8";
    OpCode[OpCode["MOVB_REG8_TO_REGADDRESS"] = 12] = "MOVB_REG8_TO_REGADDRESS";
    OpCode[OpCode["MOVB_REG8_TO_ADDRESS"] = 13] = "MOVB_REG8_TO_ADDRESS";
    OpCode[OpCode["MOVB_BYTE_TO_REG8"] = 14] = "MOVB_BYTE_TO_REG8";
    OpCode[OpCode["MOVB_BYTE_TO_REGADDRESS"] = 15] = "MOVB_BYTE_TO_REGADDRESS";
    OpCode[OpCode["MOVB_BYTE_TO_ADDRESS"] = 16] = "MOVB_BYTE_TO_ADDRESS";
    OpCode[OpCode["ADD_REG16_TO_REG16"] = 17] = "ADD_REG16_TO_REG16";
    OpCode[OpCode["ADD_REGADDRESS_TO_REG16"] = 18] = "ADD_REGADDRESS_TO_REG16";
    OpCode[OpCode["ADD_ADDRESS_TO_REG16"] = 19] = "ADD_ADDRESS_TO_REG16";
    OpCode[OpCode["ADD_WORD_TO_REG16"] = 20] = "ADD_WORD_TO_REG16";
    OpCode[OpCode["ADDB_REG8_TO_REG8"] = 21] = "ADDB_REG8_TO_REG8";
    OpCode[OpCode["ADDB_REGADDRESS_TO_REG8"] = 22] = "ADDB_REGADDRESS_TO_REG8";
    OpCode[OpCode["ADDB_ADDRESS_TO_REG8"] = 23] = "ADDB_ADDRESS_TO_REG8";
    OpCode[OpCode["ADDB_BYTE_TO_REG8"] = 24] = "ADDB_BYTE_TO_REG8";
    OpCode[OpCode["SUB_REG16_FROM_REG16"] = 25] = "SUB_REG16_FROM_REG16";
    OpCode[OpCode["SUB_REGADDRESS_FROM_REG16"] = 26] = "SUB_REGADDRESS_FROM_REG16";
    OpCode[OpCode["SUB_ADDRESS_FROM_REG16"] = 27] = "SUB_ADDRESS_FROM_REG16";
    OpCode[OpCode["SUB_WORD_FROM_REG16"] = 28] = "SUB_WORD_FROM_REG16";
    OpCode[OpCode["SUBB_REG8_FROM_REG8"] = 29] = "SUBB_REG8_FROM_REG8";
    OpCode[OpCode["SUBB_REGADDRESS_FROM_REG8"] = 30] = "SUBB_REGADDRESS_FROM_REG8";
    OpCode[OpCode["SUBB_ADDRESS_FROM_REG8"] = 31] = "SUBB_ADDRESS_FROM_REG8";
    OpCode[OpCode["SUBB_BYTE_FROM_REG8"] = 32] = "SUBB_BYTE_FROM_REG8";
    OpCode[OpCode["INC_REG16"] = 33] = "INC_REG16";
    OpCode[OpCode["INCB_REG8"] = 34] = "INCB_REG8";
    OpCode[OpCode["DEC_REG16"] = 35] = "DEC_REG16";
    OpCode[OpCode["DECB_REG8"] = 36] = "DECB_REG8";
    OpCode[OpCode["CMP_REG16_WITH_REG16"] = 37] = "CMP_REG16_WITH_REG16";
    OpCode[OpCode["CMP_REGADDRESS_WITH_REG16"] = 38] = "CMP_REGADDRESS_WITH_REG16";
    OpCode[OpCode["CMP_ADDRESS_WITH_REG16"] = 39] = "CMP_ADDRESS_WITH_REG16";
    OpCode[OpCode["CMP_WORD_WITH_REG16"] = 40] = "CMP_WORD_WITH_REG16";
    OpCode[OpCode["CMPB_REG8_WITH_REG8"] = 41] = "CMPB_REG8_WITH_REG8";
    OpCode[OpCode["CMPB_REGADDRESS_WITH_REG8"] = 42] = "CMPB_REGADDRESS_WITH_REG8";
    OpCode[OpCode["CMPB_ADDRESS_WITH_REG8"] = 43] = "CMPB_ADDRESS_WITH_REG8";
    OpCode[OpCode["CMPB_BYTE_WITH_REG8"] = 44] = "CMPB_BYTE_WITH_REG8";
    OpCode[OpCode["JMP_REGADDRESS"] = 45] = "JMP_REGADDRESS";
    OpCode[OpCode["JMP_ADDRESS"] = 46] = "JMP_ADDRESS";
    OpCode[OpCode["JC_REGADDRESS"] = 47] = "JC_REGADDRESS";
    OpCode[OpCode["JC_ADDRESS"] = 48] = "JC_ADDRESS";
    OpCode[OpCode["JNC_REGADDRESS"] = 49] = "JNC_REGADDRESS";
    OpCode[OpCode["JNC_ADDRESS"] = 50] = "JNC_ADDRESS";
    OpCode[OpCode["JZ_REGADDRESS"] = 51] = "JZ_REGADDRESS";
    OpCode[OpCode["JZ_ADDRESS"] = 52] = "JZ_ADDRESS";
    OpCode[OpCode["JNZ_REGADDRESS"] = 53] = "JNZ_REGADDRESS";
    OpCode[OpCode["JNZ_ADDRESS"] = 54] = "JNZ_ADDRESS";
    OpCode[OpCode["JA_REGADDRESS"] = 55] = "JA_REGADDRESS";
    OpCode[OpCode["JA_ADDRESS"] = 56] = "JA_ADDRESS";
    OpCode[OpCode["JNA_REGADDRESS"] = 57] = "JNA_REGADDRESS";
    OpCode[OpCode["JNA_ADDRESS"] = 58] = "JNA_ADDRESS";
    OpCode[OpCode["PUSH_REG16"] = 59] = "PUSH_REG16";
    OpCode[OpCode["PUSH_REGADDRESS"] = 60] = "PUSH_REGADDRESS";
    OpCode[OpCode["PUSH_ADDRESS"] = 61] = "PUSH_ADDRESS";
    OpCode[OpCode["PUSH_WORD"] = 62] = "PUSH_WORD";
    OpCode[OpCode["PUSHB_REG8"] = 63] = "PUSHB_REG8";
    OpCode[OpCode["PUSHB_REGADDRESS"] = 64] = "PUSHB_REGADDRESS";
    OpCode[OpCode["PUSHB_ADDRESS"] = 65] = "PUSHB_ADDRESS";
    OpCode[OpCode["PUSHB_BYTE"] = 66] = "PUSHB_BYTE";
    OpCode[OpCode["POP_REG16"] = 67] = "POP_REG16";
    OpCode[OpCode["POPB_REG8"] = 68] = "POPB_REG8";
    OpCode[OpCode["CALL_REGADDRESS"] = 69] = "CALL_REGADDRESS";
    OpCode[OpCode["CALL_ADDRESS"] = 70] = "CALL_ADDRESS";
    OpCode[OpCode["RET"] = 71] = "RET";
    OpCode[OpCode["MUL_REG16"] = 72] = "MUL_REG16";
    OpCode[OpCode["MUL_REGADDRESS"] = 73] = "MUL_REGADDRESS";
    OpCode[OpCode["MUL_ADDRESS"] = 74] = "MUL_ADDRESS";
    OpCode[OpCode["MUL_WORD"] = 75] = "MUL_WORD";
    OpCode[OpCode["MULB_REG8"] = 76] = "MULB_REG8";
    OpCode[OpCode["MULB_REGADDRESS"] = 77] = "MULB_REGADDRESS";
    OpCode[OpCode["MULB_ADDRESS"] = 78] = "MULB_ADDRESS";
    OpCode[OpCode["MULB_BYTE"] = 79] = "MULB_BYTE";
    OpCode[OpCode["DIV_REG16"] = 80] = "DIV_REG16";
    OpCode[OpCode["DIV_REGADDRESS"] = 81] = "DIV_REGADDRESS";
    OpCode[OpCode["DIV_ADDRESS"] = 82] = "DIV_ADDRESS";
    OpCode[OpCode["DIV_WORD"] = 83] = "DIV_WORD";
    OpCode[OpCode["DIVB_REG8"] = 84] = "DIVB_REG8";
    OpCode[OpCode["DIVB_REGADDRESS"] = 85] = "DIVB_REGADDRESS";
    OpCode[OpCode["DIVB_ADDRESS"] = 86] = "DIVB_ADDRESS";
    OpCode[OpCode["DIVB_BYTE"] = 87] = "DIVB_BYTE";
    OpCode[OpCode["AND_REG16_WITH_REG16"] = 88] = "AND_REG16_WITH_REG16";
    OpCode[OpCode["AND_REGADDRESS_WITH_REG16"] = 89] = "AND_REGADDRESS_WITH_REG16";
    OpCode[OpCode["AND_ADDRESS_WITH_REG16"] = 90] = "AND_ADDRESS_WITH_REG16";
    OpCode[OpCode["AND_WORD_WITH_REG16"] = 91] = "AND_WORD_WITH_REG16";
    OpCode[OpCode["ANDB_REG8_WITH_REG8"] = 92] = "ANDB_REG8_WITH_REG8";
    OpCode[OpCode["ANDB_REGADDRESS_WITH_REG8"] = 93] = "ANDB_REGADDRESS_WITH_REG8";
    OpCode[OpCode["ANDB_ADDRESS_WITH_REG8"] = 94] = "ANDB_ADDRESS_WITH_REG8";
    OpCode[OpCode["ANDB_BYTE_WITH_REG8"] = 95] = "ANDB_BYTE_WITH_REG8";
    OpCode[OpCode["OR_REG16_WITH_REG16"] = 96] = "OR_REG16_WITH_REG16";
    OpCode[OpCode["OR_REGADDRESS_WITH_REG16"] = 97] = "OR_REGADDRESS_WITH_REG16";
    OpCode[OpCode["OR_ADDRESS_WITH_REG16"] = 98] = "OR_ADDRESS_WITH_REG16";
    OpCode[OpCode["OR_WORD_WITH_REG16"] = 99] = "OR_WORD_WITH_REG16";
    OpCode[OpCode["ORB_REG8_WITH_REG8"] = 100] = "ORB_REG8_WITH_REG8";
    OpCode[OpCode["ORB_REGADDRESS_WITH_REG8"] = 101] = "ORB_REGADDRESS_WITH_REG8";
    OpCode[OpCode["ORB_ADDRESS_WITH_REG8"] = 102] = "ORB_ADDRESS_WITH_REG8";
    OpCode[OpCode["ORB_BYTE_WITH_REG8"] = 103] = "ORB_BYTE_WITH_REG8";
    OpCode[OpCode["XOR_REG16_WITH_REG16"] = 104] = "XOR_REG16_WITH_REG16";
    OpCode[OpCode["XOR_REGADDRESS_WITH_REG16"] = 105] = "XOR_REGADDRESS_WITH_REG16";
    OpCode[OpCode["XOR_ADDRESS_WITH_REG16"] = 106] = "XOR_ADDRESS_WITH_REG16";
    OpCode[OpCode["XOR_WORD_WITH_REG16"] = 107] = "XOR_WORD_WITH_REG16";
    OpCode[OpCode["XORB_REG8_WITH_REG8"] = 108] = "XORB_REG8_WITH_REG8";
    OpCode[OpCode["XORB_REGADDRESS_WITH_REG8"] = 109] = "XORB_REGADDRESS_WITH_REG8";
    OpCode[OpCode["XORB_ADDRESS_WITH_REG8"] = 110] = "XORB_ADDRESS_WITH_REG8";
    OpCode[OpCode["XORB_BYTE_WITH_REG8"] = 111] = "XORB_BYTE_WITH_REG8";
    OpCode[OpCode["NOT_REG16"] = 112] = "NOT_REG16";
    OpCode[OpCode["NOTB_REG8"] = 113] = "NOTB_REG8";
    OpCode[OpCode["SHL_REG16_WITH_REG16"] = 114] = "SHL_REG16_WITH_REG16";
    OpCode[OpCode["SHL_REGADDRESS_WITH_REG16"] = 115] = "SHL_REGADDRESS_WITH_REG16";
    OpCode[OpCode["SHL_ADDRESS_WITH_REG16"] = 116] = "SHL_ADDRESS_WITH_REG16";
    OpCode[OpCode["SHL_WORD_WITH_REG16"] = 117] = "SHL_WORD_WITH_REG16";
    OpCode[OpCode["SHLB_REG8_WITH_REG8"] = 118] = "SHLB_REG8_WITH_REG8";
    OpCode[OpCode["SHLB_REGADDRESS_WITH_REG8"] = 119] = "SHLB_REGADDRESS_WITH_REG8";
    OpCode[OpCode["SHLB_ADDRESS_WITH_REG8"] = 120] = "SHLB_ADDRESS_WITH_REG8";
    OpCode[OpCode["SHLB_BYTE_WITH_REG8"] = 121] = "SHLB_BYTE_WITH_REG8";
    OpCode[OpCode["SHR_REG16_WITH_REG16"] = 122] = "SHR_REG16_WITH_REG16";
    OpCode[OpCode["SHR_REGADDRESS_WITH_REG16"] = 123] = "SHR_REGADDRESS_WITH_REG16";
    OpCode[OpCode["SHR_ADDRESS_WITH_REG16"] = 124] = "SHR_ADDRESS_WITH_REG16";
    OpCode[OpCode["SHR_WORD_WITH_REG16"] = 125] = "SHR_WORD_WITH_REG16";
    OpCode[OpCode["SHRB_REG8_WITH_REG8"] = 126] = "SHRB_REG8_WITH_REG8";
    OpCode[OpCode["SHRB_REGADDRESS_WITH_REG8"] = 127] = "SHRB_REGADDRESS_WITH_REG8";
    OpCode[OpCode["SHRB_ADDRESS_WITH_REG8"] = 128] = "SHRB_ADDRESS_WITH_REG8";
    OpCode[OpCode["SHRB_BYTE_WITH_REG8"] = 129] = "SHRB_BYTE_WITH_REG8";
    OpCode[OpCode["CLI"] = 130] = "CLI";
    OpCode[OpCode["STI"] = 131] = "STI";
    OpCode[OpCode["IRET"] = 132] = "IRET";
    OpCode[OpCode["SVC"] = 133] = "SVC";
    OpCode[OpCode["SRET"] = 134] = "SRET";
    OpCode[OpCode["IN_REG16"] = 135] = "IN_REG16";
    OpCode[OpCode["IN_REGADDRESS"] = 136] = "IN_REGADDRESS";
    OpCode[OpCode["IN_ADDRESS"] = 137] = "IN_ADDRESS";
    OpCode[OpCode["IN_WORD"] = 138] = "IN_WORD";
    OpCode[OpCode["OUT_REG16"] = 139] = "OUT_REG16";
    OpCode[OpCode["OUT_REGADDRESS"] = 140] = "OUT_REGADDRESS";
    OpCode[OpCode["OUT_ADDRESS"] = 141] = "OUT_ADDRESS";
    OpCode[OpCode["OUT_WORD"] = 142] = "OUT_WORD";
})(OpCode || (OpCode = {}));
var OperandType;
(function (OperandType) {
    OperandType[OperandType["REGISTER"] = -3] = "REGISTER";
    OperandType[OperandType["ARRAY"] = -2] = "ARRAY";
    OperandType[OperandType["NUMBER"] = -1] = "NUMBER";
    OperandType[OperandType["BYTE"] = 0] = "BYTE";
    OperandType[OperandType["WORD"] = 1] = "WORD";
    OperandType[OperandType["REGISTER_8BITS"] = 2] = "REGISTER_8BITS";
    OperandType[OperandType["REGISTER_16BITS"] = 3] = "REGISTER_16BITS";
    OperandType[OperandType["ADDRESS"] = 4] = "ADDRESS";
    OperandType[OperandType["REGADDRESS"] = 5] = "REGADDRESS";
})(OperandType || (OperandType = {}));
var InstructionSpec = /** @class */ (function () {
    function InstructionSpec(opcode, mnemonic, methodName, operand1, operand2, aliases) {
        this.opcode = opcode;
        this.mnemonic = mnemonic;
        this.methodName = methodName;
        this.operand1 = operand1;
        this.operand2 = operand2;
        this.aliases = aliases;
        this.bytes = 1;
        switch (this.operand1) {
            case undefined:
                break;
            case OperandType.REGISTER_8BITS:
            case OperandType.REGISTER_16BITS:
            case OperandType.BYTE:
                this.bytes += 1;
                break;
            case OperandType.REGADDRESS:
            case OperandType.ADDRESS:
            case OperandType.WORD:
                this.bytes += 2;
                break;
            default:
                throw Error("Invalid type for the first operand");
        }
        switch (this.operand2) {
            case undefined:
                break;
            case OperandType.REGISTER_8BITS:
            case OperandType.REGISTER_16BITS:
            case OperandType.BYTE:
                this.bytes += 1;
                break;
            case OperandType.REGADDRESS:
            case OperandType.ADDRESS:
            case OperandType.WORD:
                this.bytes += 2;
                break;
            default:
                throw Error("Invalid type for the first operand");
        }
    }
    return InstructionSpec;
}());

var InstructionSet = /** @class */ (function () {
    function InstructionSet() {
        this.instructionsMap = new Map();
        this.mnemonicsMap = new Map();
    }
    InstructionSet.normalizeOperand = function (operand) {
        switch (operand) {
            case OperandType.BYTE:
            case OperandType.WORD:
                return OperandType.NUMBER;
            case OperandType.REGISTER_8BITS:
            case OperandType.REGISTER_16BITS:
                return OperandType.REGISTER;
            default:
                return operand;
        }
    };
    InstructionSet.prototype.getMnemonics = function () {
        return Array.from(this.mnemonicsMap.keys());
    };
    InstructionSet.prototype.getInstruction = function (mnemonic, operand1, operand2) {
        var mnemonicInstructions = this.mnemonicsMap.get(mnemonic);
        if (mnemonicInstructions === undefined) {
            throw Error("Invalid instruction " + mnemonic);
        }
        for (var _i = 0, mnemonicInstructions_1 = mnemonicInstructions; _i < mnemonicInstructions_1.length; _i++) {
            var instr = mnemonicInstructions_1[_i];
            var lookupOperand1 = InstructionSet.normalizeOperand(operand1);
            var lookupOperand2 = InstructionSet.normalizeOperand(operand2);
            var instrOperand1 = InstructionSet.normalizeOperand(instr.operand1);
            var instrOperand2 = InstructionSet.normalizeOperand(instr.operand2);
            if (instrOperand1 === lookupOperand1 &&
                instrOperand2 === lookupOperand2) {
                return instr;
            }
        }
        throw Error(mnemonic + " does not support these operands");
    };
    InstructionSet.prototype.getInstructionFromOpCode = function (opcode) {
        return this.instructionsMap.get(opcode);
    };
    InstructionSet.prototype.addInstruction = function (opcode, mnemonic, methodName, operand1, operand2, aliases) {
        if (this.instructionsMap.has(opcode)) {
            throw Error("OPCODE " + OpCode[opcode] + " was already in the instruction set");
        }
        if (operand1 < 0 || operand1 > OperandType.REGADDRESS) {
            throw Error("Operand type (" + OperandType[operand1] + ") is not valid");
        }
        if (operand2 < 0 || operand2 > OperandType.REGADDRESS) {
            throw Error("Operand type (" + OperandType[operand2] + ") is not valid");
        }
        var newInstruction = new InstructionSpec(opcode, mnemonic, methodName, operand1, operand2, aliases);
        var mnemonics = [mnemonic];
        if (aliases) {
            for (var _i = 0, aliases_1 = aliases; _i < aliases_1.length; _i++) {
                var mn = aliases_1[_i];
                mnemonics.push(mn);
            }
        }
        for (var _a = 0, mnemonics_1 = mnemonics; _a < mnemonics_1.length; _a++) {
            var mn = mnemonics_1[_a];
            var mnemonicInstructions = this.mnemonicsMap.get(mn);
            if (mnemonicInstructions === undefined) {
                mnemonicInstructions = [];
                this.mnemonicsMap.set(mn, mnemonicInstructions);
            }
            else {
                for (var _b = 0, mnemonicInstructions_2 = mnemonicInstructions; _b < mnemonicInstructions_2.length; _b++) {
                    var instr = mnemonicInstructions_2[_b];
                    var newOperand1 = InstructionSet.normalizeOperand(newInstruction.operand1);
                    var newOperand2 = InstructionSet.normalizeOperand(newInstruction.operand2);
                    var instrOperand1 = InstructionSet.normalizeOperand(instr.operand1);
                    var instrOperand2 = InstructionSet.normalizeOperand(instr.operand2);
                    if (instrOperand1 === newOperand1 &&
                        instrOperand2 === newOperand2) {
                        throw Error("Instruction " + mn + " with operands " +
                            ("(" + OperandType[instrOperand1] + ") (" + OperandType[instrOperand2] + ") is already in the set"));
                    }
                }
            }
            this.instructionsMap.set(opcode, newInstruction);
            mnemonicInstructions.push(newInstruction);
        }
    };
    return InstructionSet;
}());

var instructionSet = new InstructionSet();
function Instruction(opcode, mnemonic, operand1, operand2, aliases) {
    var instructionArguments = 0;
    switch (operand1) {
        case undefined:
            break;
        case OperandType.REGISTER_8BITS:
        case OperandType.REGISTER_16BITS:
        case OperandType.ADDRESS:
        case OperandType.WORD:
        case OperandType.BYTE:
        case OperandType.REGADDRESS:
            instructionArguments += 1;
            break;
        default:
            throw Error("Invalid type for the first operand");
    }
    switch (operand2) {
        case undefined:
            break;
        case OperandType.REGISTER_8BITS:
        case OperandType.REGISTER_16BITS:
        case OperandType.ADDRESS:
        case OperandType.WORD:
        case OperandType.BYTE:
        case OperandType.REGADDRESS:
            instructionArguments += 1;
            break;
        default:
            throw Error("Invalid type for the second operand");
    }
    function installInstruction(target, propertyKey) {
        if (target[propertyKey].length !== instructionArguments) {
            throw Error("Invalid number of arguments of function " + propertyKey + "(): " +
                (instructionArguments + " where required and " + target[propertyKey].length + " where provided"));
        }
        instructionSet.addInstruction(opcode, mnemonic, propertyKey, operand1, operand2, aliases);
    }
    return installInstruction;
}


/***/ }),

/***/ "./src/app/ioregisters-view/ioregisters-view.component.html":
/*!******************************************************************!*\
  !*** ./src/app/ioregisters-view/ioregisters-view.component.html ***!
  \******************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "<p-panel header=\"Input / Output Registers\" styleClass=\"ioregisters-panel\">\n  <div class=\"ioregisters-container\">\n    <p-table [value]=\"registerAddresses.sort()\">\n  <ng-template pTemplate=\"header\">\n    <tr>\n      <th>Address</th>\n      <th>Name</th>\n      <th>Value</th>\n    </tr>\n  </ng-template>\n  <ng-template pTemplate=\"body\" let-address>\n    <tr class=\"source-code\">\n      <td>{{registersViewMap.get(address).strAddress}}</td>\n      <td title=\"{{registersViewMap.get(address).description}}\">{{registersViewMap.get(address).name}}</td>\n      <td>{{registersViewMap.get(address).strValue}}</td>\n    </tr>\n  </ng-template>\n</p-table>\n  </div>\n</p-panel>\n"

/***/ }),

/***/ "./src/app/ioregisters-view/ioregisters-view.component.ts":
/*!****************************************************************!*\
  !*** ./src/app/ioregisters-view/ioregisters-view.component.ts ***!
  \****************************************************************/
/*! exports provided: IORegistersViewComponent */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "IORegistersViewComponent", function() { return IORegistersViewComponent; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var _ioregmap_service__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../ioregmap.service */ "./src/app/ioregmap.service.ts");
/* harmony import */ var _utils__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../utils */ "./src/app/utils.ts");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};



var IORegisterView = /** @class */ (function () {
    function IORegisterView(name, address, initialValue, description) {
        if (initialValue === void 0) { initialValue = 0; }
        this.name = name;
        this.description = description;
        this._address = address;
        this._strAddress = _utils__WEBPACK_IMPORTED_MODULE_2__["Utils"].pad(address, 16, 4);
        this._value = initialValue;
        this._strValue = _utils__WEBPACK_IMPORTED_MODULE_2__["Utils"].pad(initialValue, 16, 4);
    }
    Object.defineProperty(IORegisterView.prototype, "value", {
        get: function () {
            return this._value;
        },
        set: function (newValue) {
            this._strValue = _utils__WEBPACK_IMPORTED_MODULE_2__["Utils"].pad(newValue, 16, 4);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(IORegisterView.prototype, "strValue", {
        get: function () {
            return this._strValue;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(IORegisterView.prototype, "address", {
        get: function () {
            return this._address;
        },
        set: function (newAddress) {
            this._strAddress = _utils__WEBPACK_IMPORTED_MODULE_2__["Utils"].pad(newAddress, 16, 4);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(IORegisterView.prototype, "strAddress", {
        get: function () {
            return this._strAddress;
        },
        enumerable: true,
        configurable: true
    });
    return IORegisterView;
}());
var IORegistersViewComponent = /** @class */ (function () {
    function IORegistersViewComponent(ioRegMapService) {
        var _this = this;
        this.ioRegMapService = ioRegMapService;
        this.registersViewMap = new Map();
        this.registerAddresses = [];
        var registersMap = this.ioRegMapService.getRegistersMap();
        registersMap.forEach(function (register, address) {
            _this.operationAddRegister(register.name, register.address, register.value, register.description);
        });
        this.ioRegisterOperationSubscription = this.ioRegMapService.ioRegisterOperation$.subscribe(function (ioRegisterOperation) { return _this.processIORegisterOperation(ioRegisterOperation); });
    }
    IORegistersViewComponent.prototype.ngOnInit = function () {
    };
    IORegistersViewComponent.prototype.ngOnDestroy = function () {
        this.ioRegisterOperationSubscription.unsubscribe();
    };
    IORegistersViewComponent.prototype.operationAddRegister = function (name, address, initialValue, description) {
        if (initialValue === void 0) { initialValue = 0; }
        var registerView = new IORegisterView(name, address, initialValue, description);
        this.registersViewMap.set(address, registerView);
        this.registerAddresses.push(address);
    };
    IORegistersViewComponent.prototype.operationWriteRegister = function (address, value) {
        var registerView = this.registersViewMap.get(address);
        if (registerView) {
            registerView.value = value;
        }
    };
    IORegistersViewComponent.prototype.processIORegisterOperation = function (ioRegisterOperation) {
        switch (ioRegisterOperation.operationType) {
            case _ioregmap_service__WEBPACK_IMPORTED_MODULE_1__["IORegisterOperationType"].ADD_REGISTER:
                this.operationAddRegister(ioRegisterOperation.data.name, ioRegisterOperation.data.address, ioRegisterOperation.data.initialValue, ioRegisterOperation.data.description);
                break;
            case _ioregmap_service__WEBPACK_IMPORTED_MODULE_1__["IORegisterOperationType"].WRITE:
                this.operationWriteRegister(ioRegisterOperation.data.address, ioRegisterOperation.data.value);
                break;
        }
    };
    IORegistersViewComponent = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"])({
            selector: 'app-ioregisters-view',
            template: __webpack_require__(/*! ./ioregisters-view.component.html */ "./src/app/ioregisters-view/ioregisters-view.component.html")
        }),
        __metadata("design:paramtypes", [_ioregmap_service__WEBPACK_IMPORTED_MODULE_1__["IORegMapService"]])
    ], IORegistersViewComponent);
    return IORegistersViewComponent;
}());



/***/ }),

/***/ "./src/app/ioregmap.service.ts":
/*!*************************************!*\
  !*** ./src/app/ioregmap.service.ts ***!
  \*************************************/
/*! exports provided: IORegisterType, IORegisterOperationType, IORegisterOperation, IORegister, IORegMapService */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "IORegisterType", function() { return IORegisterType; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "IORegisterOperationType", function() { return IORegisterOperationType; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "IORegisterOperation", function() { return IORegisterOperation; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "IORegister", function() { return IORegister; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "IORegMapService", function() { return IORegMapService; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var rxjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! rxjs */ "./node_modules/rxjs/_esm5/index.js");
/* harmony import */ var _events_log_service__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./events-log.service */ "./src/app/events-log.service.ts");
/* harmony import */ var _utils__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./utils */ "./src/app/utils.ts");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};




var IORegisterType;
(function (IORegisterType) {
    IORegisterType[IORegisterType["READ_WRITE"] = 1] = "READ_WRITE";
    IORegisterType[IORegisterType["READ_ONLY"] = 2] = "READ_ONLY";
})(IORegisterType || (IORegisterType = {}));
var IORegisterOperationType;
(function (IORegisterOperationType) {
    IORegisterOperationType[IORegisterOperationType["READ"] = 0] = "READ";
    IORegisterOperationType[IORegisterOperationType["WRITE"] = 1] = "WRITE";
    IORegisterOperationType[IORegisterOperationType["ADD_REGISTER"] = 2] = "ADD_REGISTER";
})(IORegisterOperationType || (IORegisterOperationType = {}));
var IORegisterOperation = /** @class */ (function () {
    function IORegisterOperation(operationType, data) {
        this.operationType = operationType;
        this.data = data;
    }
    IORegisterOperation.prototype.toString = function () {
        var ret, params;
        switch (this.operationType) {
            case IORegisterOperationType.READ:
                params = this.data;
                ret = "IOREG: Read register " + params.name + " [0x" + _utils__WEBPACK_IMPORTED_MODULE_3__["Utils"].pad(params.address, 16, 4) + "] => 0x" + _utils__WEBPACK_IMPORTED_MODULE_3__["Utils"].pad(params.value, 16, 2);
                break;
            case IORegisterOperationType.WRITE:
                params = this.data;
                ret = "IOREG: Write word 0x" + _utils__WEBPACK_IMPORTED_MODULE_3__["Utils"].pad(params.value, 16, 4) + " to register " + params.name + " " +
                    ("[0x" + _utils__WEBPACK_IMPORTED_MODULE_3__["Utils"].pad(params.address, 16, 4) + "]");
                break;
            case IORegisterOperationType.ADD_REGISTER:
                params = this.data;
                ret = "IOREG: Add register " + params.name + " at address 0x" + _utils__WEBPACK_IMPORTED_MODULE_3__["Utils"].pad(params.address, 16, 4);
                break;
        }
        return ret;
    };
    return IORegisterOperation;
}());

var IORegister = /** @class */ (function () {
    function IORegister(name, address, initialValue, registerType, publishIORegisterOperation, description) {
        if (initialValue === void 0) { initialValue = 0; }
        if (registerType === void 0) { registerType = IORegisterType.READ_WRITE; }
        this.name = name;
        this.description = description;
        this.address = address;
        this.registerType = registerType;
        this.value = initialValue;
        this.publishIORegisterOperation = publishIORegisterOperation;
    }
    return IORegister;
}());

var IORegMapService = /** @class */ (function () {
    function IORegMapService(eventLogService) {
        this.eventLogService = eventLogService;
        this.registersMap = new Map();
        this.lastAccess = -1;
        this.ioRegisterOperationSource = new rxjs__WEBPACK_IMPORTED_MODULE_1__["Subject"]();
        this.ioRegisterOperation$ = this.ioRegisterOperationSource.asObservable();
    }
    IORegMapService.prototype.publishIORegisterOperation = function (operation) {
        this.eventLogService.log(operation);
        this.ioRegisterOperationSource.next(operation);
    };
    IORegMapService.prototype.getRegistersMap = function () {
        return this.registersMap;
    };
    IORegMapService.prototype.addRegister = function (name, address, initialValue, registerType, publishIORegisterOperation, description) {
        if (initialValue === void 0) { initialValue = 0; }
        if (registerType === void 0) { registerType = IORegisterType.READ_WRITE; }
        /* We need to check that the address is within limits [0, 65535] */
        if (address < 0 || address > 65535) {
            throw Error("Invalid addresses: " + address);
        }
        /* Then we need to check that the address is not already in use */
        if (this.registersMap.has(address) === true) {
            throw Error("Address " + address + " is already in use");
        }
        var ioRegister = new IORegister(name, address, initialValue, registerType, publishIORegisterOperation, description);
        this.registersMap.set(address, ioRegister);
        var parameters = {
            name: name,
            address: address,
            description: description,
            registerType: registerType,
            initialValue: initialValue,
        };
        this.publishIORegisterOperation(new IORegisterOperation(IORegisterOperationType.ADD_REGISTER, parameters));
        return address;
    };
    IORegMapService.prototype.load = function (address, publish) {
        if (publish === void 0) { publish = true; }
        var register = this.registersMap.get(address);
        if (register === undefined) {
            throw Error("Invalid register address " + address);
        }
        this.lastAccess = address;
        var parameters = {
            name: register.name,
            address: address,
            value: register.value
        };
        var operation = new IORegisterOperation(IORegisterOperationType.READ, parameters);
        this.publishIORegisterOperation(operation);
        if (register.publishIORegisterOperation !== undefined && publish === true) {
            register.publishIORegisterOperation(operation);
        }
        return register.value;
    };
    IORegMapService.prototype.store = function (address, value, isInstruction, publish) {
        if (isInstruction === void 0) { isInstruction = true; }
        if (publish === void 0) { publish = true; }
        var register = this.registersMap.get(address);
        if (register === undefined) {
            throw Error("Invalid register address " + address);
        }
        if (register.registerType === IORegisterType.READ_ONLY && isInstruction === true) {
            throw Error("Invalid storage into read-only register " + address);
        }
        this.lastAccess = address;
        register.value = value;
        var parameters = {
            name: register.name,
            address: address,
            value: value
        };
        var operation = new IORegisterOperation(IORegisterOperationType.WRITE, parameters);
        this.publishIORegisterOperation(operation);
        if (register.publishIORegisterOperation !== undefined && publish === true) {
            register.publishIORegisterOperation(operation);
        }
    };
    IORegMapService = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Injectable"])(),
        __metadata("design:paramtypes", [_events_log_service__WEBPACK_IMPORTED_MODULE_2__["EventsLogService"]])
    ], IORegMapService);
    return IORegMapService;
}());



/***/ }),

/***/ "./src/app/irqctrl.service.ts":
/*!************************************!*\
  !*** ./src/app/irqctrl.service.ts ***!
  \************************************/
/*! exports provided: IrqCtrlOperationType, IrqCtrlOperation, IrqCtrlService */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "IrqCtrlOperationType", function() { return IrqCtrlOperationType; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "IrqCtrlOperation", function() { return IrqCtrlOperation; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "IrqCtrlService", function() { return IrqCtrlService; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var rxjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! rxjs */ "./node_modules/rxjs/_esm5/index.js");
/* harmony import */ var _ioregmap_service__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./ioregmap.service */ "./src/app/ioregmap.service.ts");
/* harmony import */ var _cpu_service__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./cpu.service */ "./src/app/cpu.service.ts");
/* harmony import */ var _events_log_service__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./events-log.service */ "./src/app/events-log.service.ts");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};





var IRQMASK_REGISTER_ADDRESS = 0;
var IRQSTATUS_REGISTER_ADDRESS = 1;
var IRQEOI_REGISTER_ADDRESS = 2;
var IrqCtrlOperationType;
(function (IrqCtrlOperationType) {
    IrqCtrlOperationType[IrqCtrlOperationType["RESET"] = 0] = "RESET";
    IrqCtrlOperationType[IrqCtrlOperationType["MASK_IRQ"] = 1] = "MASK_IRQ";
    IrqCtrlOperationType[IrqCtrlOperationType["UNMASK_IRQ"] = 2] = "UNMASK_IRQ";
    IrqCtrlOperationType[IrqCtrlOperationType["END_OF_IRQ"] = 3] = "END_OF_IRQ";
    IrqCtrlOperationType[IrqCtrlOperationType["IRQ_TRIGGER_EDGE"] = 4] = "IRQ_TRIGGER_EDGE";
    IrqCtrlOperationType[IrqCtrlOperationType["IRQ_RAISE_LEVEL"] = 5] = "IRQ_RAISE_LEVEL";
    IrqCtrlOperationType[IrqCtrlOperationType["IRQ_LOWER_LEVEL"] = 6] = "IRQ_LOWER_LEVEL";
})(IrqCtrlOperationType || (IrqCtrlOperationType = {}));
var IrqCtrlOperationState;
(function (IrqCtrlOperationState) {
    IrqCtrlOperationState[IrqCtrlOperationState["IN_PROGRESS"] = 0] = "IN_PROGRESS";
    IrqCtrlOperationState[IrqCtrlOperationState["FINISHED"] = 1] = "FINISHED";
})(IrqCtrlOperationState || (IrqCtrlOperationState = {}));
var IrqCtrlOperation = /** @class */ (function () {
    function IrqCtrlOperation(operationType, data, state) {
        this.operationType = operationType;
        this.data = data;
        this.state = state;
    }
    IrqCtrlOperation.prototype.toString = function () {
        var ret;
        switch (this.operationType) {
            case IrqCtrlOperationType.RESET:
                ret = "IRQC: Reset control unit";
                break;
            case IrqCtrlOperationType.MASK_IRQ:
                ret = "IRQC: Masked interrupt " + this.data.irqNumber;
                break;
            case IrqCtrlOperationType.UNMASK_IRQ:
                ret = "IRQC: Unmasked interrupt " + this.data.irqNumber;
                break;
            case IrqCtrlOperationType.END_OF_IRQ:
                ret = "IRQC: Signalled end of interrupt " + this.data.irqNumber;
                break;
            case IrqCtrlOperationType.IRQ_TRIGGER_EDGE:
                ret = "IRQC: Signalled edge-triggered interrupt " + this.data.irqNumber;
                break;
            case IrqCtrlOperationType.IRQ_RAISE_LEVEL:
                ret = "IRQC: Risen level-triggered interrupt " + this.data.irqNumber;
                break;
            case IrqCtrlOperationType.IRQ_LOWER_LEVEL:
                ret = "IRQC: Lowered level-triggered interrupt " + this.data.irqNumber;
                break;
            default:
                break;
        }
        return ret;
    };
    return IrqCtrlOperation;
}());

var IrqCtrlService = /** @class */ (function () {
    function IrqCtrlService(ioRegMapService, cpuService, eventsLogService) {
        var _this = this;
        this.ioRegMapService = ioRegMapService;
        this.cpuService = cpuService;
        this.eventsLogService = eventsLogService;
        this.irqMaskRegister = 0; // IRQMASK register (address: 0x0000)
        this.irqStatusRegister = 0; // IRQSTATUS register (address: 0x0001)
        this.irqLevelRegister = 0; // IRQLEVEL register (internal)
        this.interruptOutput = false;
        this.irqCtrlOperationSource = new rxjs__WEBPACK_IMPORTED_MODULE_1__["Subject"]();
        ioRegMapService.addRegister('IRQMASK', IRQMASK_REGISTER_ADDRESS, 0, _ioregmap_service__WEBPACK_IMPORTED_MODULE_2__["IORegisterType"].READ_WRITE, function (op) { return _this.processRegisterOperation(op); }, 'Interrupt Controller Mask Register');
        ioRegMapService.addRegister('IRQSTATUS', IRQSTATUS_REGISTER_ADDRESS, 0, _ioregmap_service__WEBPACK_IMPORTED_MODULE_2__["IORegisterType"].READ_ONLY, function (op) { return _this.processRegisterOperation(op); }, 'Interrupt Controller Status Register');
        ioRegMapService.addRegister('IRQEOI', IRQEOI_REGISTER_ADDRESS, 0, _ioregmap_service__WEBPACK_IMPORTED_MODULE_2__["IORegisterType"].READ_WRITE, function (op) { return _this.processRegisterOperation(op); }, 'End of Interrupt Register');
        this.irqCtrlOperation$ = this.irqCtrlOperationSource.asObservable();
    }
    IrqCtrlService_1 = IrqCtrlService;
    IrqCtrlService.getNewSets = function (previousValue, newValue) {
        var ret = [];
        var changes = previousValue ^ newValue;
        for (var i = 0; i < 16; i++) {
            if (((previousValue & (1 << i)) === 0) && ((changes & (1 << i)) !== 0)) {
                ret.push(i);
            }
        }
        return ret;
    };
    IrqCtrlService.getNewClears = function (previousValue, newValue) {
        var ret = [];
        var changes = previousValue ^ newValue;
        for (var i = 0; i < 16; i++) {
            if (((previousValue & (1 << i)) !== 0) && ((changes & (1 << i)) !== 0)) {
                ret.push(i);
            }
        }
        return ret;
    };
    IrqCtrlService.prototype.publishIrqCtrlOperation = function (operation, flushGroups) {
        if (flushGroups === void 0) { flushGroups = false; }
        this.eventsLogService.log(operation, flushGroups);
        this.irqCtrlOperationSource.next(operation);
    };
    IrqCtrlService.prototype.publishIrqCtrlOperationStart = function (operation) {
        operation.state = IrqCtrlOperationState.IN_PROGRESS;
        this.eventsLogService.startEventGroup(operation);
        this.irqCtrlOperationSource.next(operation);
    };
    IrqCtrlService.prototype.publishIrqCtrlOperationEnd = function (operation) {
        operation.state = IrqCtrlOperationState.FINISHED;
        this.eventsLogService.endEventGroup(operation);
        this.irqCtrlOperationSource.next(operation);
    };
    IrqCtrlService.prototype.processWriteOperation = function (address, value) {
        var _this = this;
        var clears;
        switch (address) {
            case IRQMASK_REGISTER_ADDRESS:
                var sets = IrqCtrlService_1.getNewSets(this.irqMaskRegister, value);
                clears = IrqCtrlService_1.getNewClears(this.irqMaskRegister, value);
                sets.forEach(function (irqNumber) {
                    _this.publishIrqCtrlOperation(new IrqCtrlOperation(IrqCtrlOperationType.UNMASK_IRQ, { irqNumber: irqNumber }));
                });
                clears.forEach(function (irqNumber) {
                    _this.publishIrqCtrlOperation(new IrqCtrlOperation(IrqCtrlOperationType.MASK_IRQ, { irqNumber: irqNumber }));
                });
                this.irqMaskRegister = value;
                break;
            case IRQSTATUS_REGISTER_ADDRESS:
                break;
            case IRQEOI_REGISTER_ADDRESS:
                var previousStatus = this.irqStatusRegister;
                this.irqStatusRegister ^= value;
                this.irqStatusRegister |= this.irqLevelRegister;
                clears = IrqCtrlService_1.getNewClears(previousStatus, this.irqStatusRegister);
                clears.forEach(function (irqNumber) {
                    _this.publishIrqCtrlOperation(new IrqCtrlOperation(IrqCtrlOperationType.END_OF_IRQ, { irqNumber: irqNumber }));
                });
                this.ioRegMapService.store(IRQSTATUS_REGISTER_ADDRESS, this.irqStatusRegister, false, false);
                break;
        }
        if ((this.irqStatusRegister & this.irqMaskRegister) !== 0) {
            if (this.interruptOutput === false) {
                this.interruptOutput = true;
                this.cpuService.raiseInterrupt();
            }
        }
        else if (this.interruptOutput === true) {
            this.interruptOutput = false;
            this.cpuService.lowerInterrupt();
        }
    };
    IrqCtrlService.prototype.processRegisterOperation = function (ioRegisterOperation) {
        switch (ioRegisterOperation.operationType) {
            case _ioregmap_service__WEBPACK_IMPORTED_MODULE_2__["IORegisterOperationType"].READ:
                break;
            case _ioregmap_service__WEBPACK_IMPORTED_MODULE_2__["IORegisterOperationType"].WRITE:
                this.processWriteOperation(ioRegisterOperation.data.address, ioRegisterOperation.data.value);
                break;
        }
    };
    IrqCtrlService.prototype.raiseHardwareInterrupt = function (irqNumber) {
        if (irqNumber < 0 || irqNumber > 15 || isNaN(irqNumber)) {
            throw Error("Invalid interrupt number " + irqNumber);
        }
        this.irqLevelRegister |= (1 << irqNumber);
        this.irqStatusRegister |= (1 << irqNumber);
        var operation = new IrqCtrlOperation(IrqCtrlOperationType.IRQ_RAISE_LEVEL, { irqNumber: irqNumber });
        this.publishIrqCtrlOperationStart(operation);
        this.ioRegMapService.store(IRQSTATUS_REGISTER_ADDRESS, this.irqStatusRegister, false, false);
        this.publishIrqCtrlOperationEnd(operation);
        if (((this.irqStatusRegister & this.irqMaskRegister) !== 0) &&
            (this.interruptOutput === false)) {
            this.interruptOutput = true;
            this.cpuService.raiseInterrupt();
        }
    };
    IrqCtrlService.prototype.lowerHardwareInterrupt = function (irqNumber) {
        if (irqNumber < 0 || irqNumber > 15 || isNaN(irqNumber)) {
            throw Error("Invalid interrupt number " + irqNumber);
        }
        this.irqLevelRegister &= ~(1 << irqNumber);
        this.publishIrqCtrlOperation(new IrqCtrlOperation(IrqCtrlOperationType.IRQ_LOWER_LEVEL, { irqNumber: irqNumber }));
    };
    IrqCtrlService.prototype.triggerHardwareInterrupt = function (irqNumber) {
        if (irqNumber < 0 || irqNumber > 15 || isNaN(irqNumber)) {
            throw Error("Invalid interrupt number " + irqNumber);
        }
        this.irqStatusRegister |= (1 << irqNumber);
        var operation = new IrqCtrlOperation(IrqCtrlOperationType.IRQ_TRIGGER_EDGE, { irqNumber: irqNumber });
        this.publishIrqCtrlOperationStart(operation);
        this.ioRegMapService.store(IRQSTATUS_REGISTER_ADDRESS, this.irqStatusRegister, false, false);
        this.publishIrqCtrlOperationEnd(operation);
        if (((this.irqStatusRegister & this.irqMaskRegister) !== 0) &&
            (this.interruptOutput === false)) {
            this.interruptOutput = true;
            this.cpuService.raiseInterrupt();
        }
    };
    IrqCtrlService.prototype.reset = function () {
        var operation = new IrqCtrlOperation(IrqCtrlOperationType.RESET);
        this.publishIrqCtrlOperationStart(operation);
        this.irqMaskRegister = 0; // IRQMASK register (address: 0x0000)
        this.irqStatusRegister = 0; // IRQSTATUS register (address: 0x0001)
        this.irqLevelRegister = 0; // IRQLEVEL register (internal)
        this.ioRegMapService.store(IRQMASK_REGISTER_ADDRESS, 0, false, false);
        this.ioRegMapService.store(IRQSTATUS_REGISTER_ADDRESS, 0, false, false);
        this.ioRegMapService.store(IRQEOI_REGISTER_ADDRESS, 0, false, false);
        this.interruptOutput = false;
        this.publishIrqCtrlOperationEnd(operation);
    };
    var IrqCtrlService_1;
    IrqCtrlService = IrqCtrlService_1 = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Injectable"])(),
        __metadata("design:paramtypes", [_ioregmap_service__WEBPACK_IMPORTED_MODULE_2__["IORegMapService"], _cpu_service__WEBPACK_IMPORTED_MODULE_3__["CPUService"],
            _events_log_service__WEBPACK_IMPORTED_MODULE_4__["EventsLogService"]])
    ], IrqCtrlService);
    return IrqCtrlService;
}());



/***/ }),

/***/ "./src/app/keypad/keypad.component.html":
/*!**********************************************!*\
  !*** ./src/app/keypad/keypad.component.html ***!
  \**********************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "<div class=\"input-keypad\">\n  <div class=\"input-btn-row\">\n    <p-button styleClass=\"ui-button-secondary input-btn\" label=\"7\" id=\"input7\" (click)=\"processKey('7')\"></p-button><p-button styleClass=\"ui-button-secondary input-btn\" label=\"8\" id=\"input8\" (click)=\"processKey('8')\"></p-button><p-button styleClass=\"ui-button-secondary input-btn\" label=\"9\" id=\"input9\" (click)=\"processKey('9')\"></p-button>\n  </div>\n  <div class=\"input-btn-row\">\n    <p-button styleClass=\"ui-button-secondary input-btn\" label=\"4\" id=\"input4\" (click)=\"processKey('4')\"></p-button><p-button styleClass=\"ui-button-secondary input-btn\" label=\"5\" id=\"input5\" (click)=\"processKey('5')\"></p-button><p-button styleClass=\"ui-button-secondary input-btn\" label=\"6\" id=\"input6\" (click)=\"processKey('6')\"></p-button>\n  </div>\n  <div class=\"input-btn-row\">\n    <p-button styleClass=\"ui-button-secondary input-btn\" label=\"1\" id=\"input1\" (click)=\"processKey('1')\"></p-button><p-button styleClass=\"ui-button-secondary input-btn\" label=\"2\" id=\"input2\" (click)=\"processKey('2')\"></p-button><p-button styleClass=\"ui-button-secondary input-btn\" label=\"3\" id=\"input3\" (click)=\"processKey('3')\"></p-button>\n  </div>\n  <div class=\"input-btn-row\">\n    <p-button styleClass=\"ui-button-secondary input-btn\" label=\"*\" id=\"inputAsterisk\" (click)=\"processKey('*')\"></p-button><p-button styleClass=\"ui-button-secondary input-btn\" label=\"0\" id=\"input0\" (click)=\"processKey('0')\"></p-button><p-button styleClass=\"ui-button-secondary input-btn\" label=\"+\" id=\"inputHash\" (click)=\"processKey('+')\"></p-button>\n  </div>\n  <div class=\"input-btn-row\">\n    <input class=\"input-key-press\" value=\"keyboard\" (keypress)=\"processKeyboard($event)\">\n  </div>\n</div>"

/***/ }),

/***/ "./src/app/keypad/keypad.component.ts":
/*!********************************************!*\
  !*** ./src/app/keypad/keypad.component.ts ***!
  \********************************************/
/*! exports provided: KeypadOperationType, KeypadOperation, KeypadComponent */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "KeypadOperationType", function() { return KeypadOperationType; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "KeypadOperation", function() { return KeypadOperation; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "KeypadComponent", function() { return KeypadComponent; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var _irqctrl_service__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../irqctrl.service */ "./src/app/irqctrl.service.ts");
/* harmony import */ var _ioregmap_service__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../ioregmap.service */ "./src/app/ioregmap.service.ts");
/* harmony import */ var rxjs__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! rxjs */ "./node_modules/rxjs/_esm5/index.js");
/* harmony import */ var _events_log_service__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../events-log.service */ "./src/app/events-log.service.ts");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};





var KPDSTATUS_REGISTER_ADDRESS = 5;
var KPDDATA_REGISTER_ADDRESS = 6;
var KeypadOperationType;
(function (KeypadOperationType) {
    KeypadOperationType[KeypadOperationType["RESET"] = 0] = "RESET";
    KeypadOperationType[KeypadOperationType["KEY_PRESSED"] = 1] = "KEY_PRESSED";
    KeypadOperationType[KeypadOperationType["OVERLOAD"] = 2] = "OVERLOAD";
    KeypadOperationType[KeypadOperationType["DATA_READ"] = 3] = "DATA_READ";
})(KeypadOperationType || (KeypadOperationType = {}));
var KeypadOperationState;
(function (KeypadOperationState) {
    KeypadOperationState[KeypadOperationState["IN_PROGRESS"] = 0] = "IN_PROGRESS";
    KeypadOperationState[KeypadOperationState["FINISHED"] = 1] = "FINISHED";
})(KeypadOperationState || (KeypadOperationState = {}));
var KeypadOperation = /** @class */ (function () {
    function KeypadOperation(operationType, data, state) {
        this.operationType = operationType;
        this.data = data;
        this.state = state;
    }
    KeypadOperation.prototype.toString = function () {
        var ret;
        switch (this.operationType) {
            case KeypadOperationType.RESET:
                ret = "KPD: Reset keypad";
                break;
            case KeypadOperationType.KEY_PRESSED:
                ret = "KPD: Key pressed -> " + this.data.value;
                break;
            case KeypadOperationType.OVERLOAD:
                ret = "KPD: Overload on pressing new key";
                break;
            case KeypadOperationType.DATA_READ:
                ret = "KPD: Clear status on KPDDATA register read";
                break;
            default:
                break;
        }
        return ret;
    };
    return KeypadOperation;
}());

var KeypadComponent = /** @class */ (function () {
    function KeypadComponent(ioRegMapService, irqCtrlService, eventsLogService) {
        this.ioRegMapService = ioRegMapService;
        this.irqCtrlService = irqCtrlService;
        this.eventsLogService = eventsLogService;
        this.kpdStatusRegister = 0; // KPDSTATUS register (address: 0x0002)
        this.kpdDataRegister = 0;
        this.interruptOutput = false;
        this.keypadOperationSource = new rxjs__WEBPACK_IMPORTED_MODULE_3__["Subject"]();
        this.keypadOperation$ = this.keypadOperationSource.asObservable();
    }
    KeypadComponent.prototype.publishKeypadOperation = function (operation, flushGroups) {
        if (flushGroups === void 0) { flushGroups = false; }
        this.eventsLogService.log(operation, flushGroups);
        this.keypadOperationSource.next(operation);
    };
    KeypadComponent.prototype.publishKeypadOperationStart = function (operation) {
        operation.state = KeypadOperationState.IN_PROGRESS;
        this.eventsLogService.startEventGroup(operation);
        this.keypadOperationSource.next(operation);
    };
    KeypadComponent.prototype.publishKeypadOperationEnd = function (operation) {
        operation.state = KeypadOperationState.FINISHED;
        this.eventsLogService.endEventGroup(operation);
        this.keypadOperationSource.next(operation);
    };
    KeypadComponent.prototype.ngOnInit = function () {
        var _this = this;
        this.ioRegMapService.addRegister('KPDSTATUS', KPDSTATUS_REGISTER_ADDRESS, 0, _ioregmap_service__WEBPACK_IMPORTED_MODULE_2__["IORegisterType"].READ_ONLY, function (op) { return _this.processRegisterOperation(op); }, 'Keypad Status Register');
        this.ioRegMapService.addRegister('KPDDATA', KPDDATA_REGISTER_ADDRESS, 0, _ioregmap_service__WEBPACK_IMPORTED_MODULE_2__["IORegisterType"].READ_ONLY, function (op) { return _this.processRegisterOperation(op); }, 'Keypad Data Register');
    };
    KeypadComponent.prototype.processReadOperation = function (address) {
        switch (address) {
            case KPDSTATUS_REGISTER_ADDRESS:
                break;
            case KPDDATA_REGISTER_ADDRESS:
                this.kpdStatusRegister = 0;
                var operation = new KeypadOperation(KeypadOperationType.DATA_READ);
                this.publishKeypadOperationStart(operation);
                this.ioRegMapService.store(KPDSTATUS_REGISTER_ADDRESS, 0, false, false);
                this.publishKeypadOperationEnd(operation);
                if (this.interruptOutput === true) {
                    this.interruptOutput = false;
                    this.irqCtrlService.lowerHardwareInterrupt(0);
                }
                break;
        }
    };
    KeypadComponent.prototype.processRegisterOperation = function (ioRegisterOperation) {
        switch (ioRegisterOperation.operationType) {
            case _ioregmap_service__WEBPACK_IMPORTED_MODULE_2__["IORegisterOperationType"].READ:
                this.processReadOperation(ioRegisterOperation.data.address);
                break;
            case _ioregmap_service__WEBPACK_IMPORTED_MODULE_2__["IORegisterOperationType"].WRITE:
                break;
        }
    };
    KeypadComponent.prototype.processKey = function (key) {
        var operation;
        if (this.kpdStatusRegister === 0) {
            this.kpdDataRegister = key.charCodeAt(0);
            this.kpdStatusRegister = 1;
            operation = new KeypadOperation(KeypadOperationType.KEY_PRESSED, { value: key.charCodeAt(0) });
            this.publishKeypadOperationStart(operation);
            this.ioRegMapService.store(KPDDATA_REGISTER_ADDRESS, key.charCodeAt(0), false, false);
            this.ioRegMapService.store(KPDSTATUS_REGISTER_ADDRESS, 1, false, false);
            this.publishKeypadOperationEnd(operation);
        }
        else {
            this.kpdStatusRegister = 3;
            operation = new KeypadOperation(KeypadOperationType.OVERLOAD);
            this.publishKeypadOperationStart(operation);
            this.ioRegMapService.store(KPDSTATUS_REGISTER_ADDRESS, 3, false, false);
            this.publishKeypadOperationEnd(operation);
        }
        if (((this.kpdStatusRegister & 0x1) !== 0) && (this.interruptOutput === false)) {
            this.interruptOutput = true;
            this.irqCtrlService.raiseHardwareInterrupt(0);
        }
    };
    KeypadComponent.prototype.processKeyboard = function (event) {
        this.processKey(String.fromCharCode(event.charCode));
        event.preventDefault();
    };
    KeypadComponent.prototype.reset = function () {
        var operation = new KeypadOperation(KeypadOperationType.RESET);
        this.publishKeypadOperationStart(operation);
        this.kpdStatusRegister = 0;
        this.kpdDataRegister = 0;
        this.interruptOutput = false;
        this.ioRegMapService.store(KPDSTATUS_REGISTER_ADDRESS, 0, false, false);
        this.ioRegMapService.store(KPDDATA_REGISTER_ADDRESS, 0, false, false);
        this.publishKeypadOperationEnd(operation);
    };
    KeypadComponent = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"])({
            selector: 'app-keypad',
            template: __webpack_require__(/*! ./keypad.component.html */ "./src/app/keypad/keypad.component.html")
        }),
        __metadata("design:paramtypes", [_ioregmap_service__WEBPACK_IMPORTED_MODULE_2__["IORegMapService"],
            _irqctrl_service__WEBPACK_IMPORTED_MODULE_1__["IrqCtrlService"],
            _events_log_service__WEBPACK_IMPORTED_MODULE_4__["EventsLogService"]])
    ], KeypadComponent);
    return KeypadComponent;
}());



/***/ }),

/***/ "./src/app/memory-view/memory-view.component.html":
/*!********************************************************!*\
  !*** ./src/app/memory-view/memory-view.component.html ***!
  \********************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "<p-panel styleClass=\"memory-view-panel\">\n  <p-header>\n    <div class=\"ui-helper-clearfix\">\n      <span class=\"ui-panel-title\" style=\"display:inline-block;\">Memory</span>\n      <div class=\"panel-header-btn-group\">\n        <p-toggleButton [(ngModel)]=\"splitMemoryArea\" onLabel=\"Split\" offLabel=\"Split\" styleClass=\"ui-button-small\"></p-toggleButton>\n      </div>\n    </div>\n  </p-header>\n<div class=\"memory-map\">\n  <div class=\"text-muted memory-index-lsb-bar\">\n    <div *ngFor=\"let i of memoryColsIndexes\" class=\"memory-index-lsb\"><small>{{i}}</small></div>\n  </div>\n  <div class=\"memory-area\" [ngClass]=\"{'splitted-top': splitMemoryArea}\">\n    <div class=\"text-muted memory-index-msb-bar\">\n      <div class=\"memory-index-msb\" *ngFor=\"let i of memoryRowsIndexes\"><small>{{i}}</small></div>\n    </div>\n    <div class=\"source-code memory-content\">\n      <div class=\"memory-block\"  *ngFor=\"let i of memoryCellViews; let j = index\" (click)=\"memoryCellClick($event, 0, j)\" [ngClass]=\"i.style\">\n        <div *ngIf=\"editingCell[0] !== j && i.isInstruction === false\">\n          <small>{{i.strValue}}</small>\n        </div>\n        <a *ngIf=\"editingCell[0] !== j && i.isInstruction === true\">\n          <small>{{i.strValue}}</small>\n        </a>\n        <input class=\"memory-cell-input\" *ngIf=\"editingCell[0] === j\" appAutofocus [(ngModel)]=\"newCellValue\" (keyup.escape)=\"editingCell[0] = -1\" (keyup.enter)=\"setCellValue(0, j)\" (blur)=\"editingCell[0] = -1\" title=\"New cell value\">\n      </div>\n    </div>\n  </div>\n  <div class=\"memory-area splitted-bottom\" *ngIf=\"splitMemoryArea\">\n    <div class=\"text-muted memory-index-msb-bar\">\n      <div class=\"memory-index-msb\" *ngFor=\"let i of memoryRowsIndexes\"><small>{{i}}</small></div>\n    </div>\n    <div class=\"source-code memory-content\">\n      <div class=\"memory-block\"  *ngFor=\"let i of memoryCellViews; let j = index\" (click)=\"memoryCellClick($event, 1, j)\" [ngClass]=\"i.style\">\n        <div *ngIf=\"editingCell[1] !== j && i.isInstruction === false\">\n          <small>{{i.strValue}}</small>\n        </div>\n        <a *ngIf=\"editingCell[1] !== j && i.isInstruction === true\">\n          <small>{{i.strValue}}</small>\n        </a>\n        <input class=\"memory-cell-input\" *ngIf=\"editingCell[1] === j\" appAutofocus [(ngModel)]=\"newCellValue\" (keyup.escape)=\"editingCell[1] = -1\" (keyup.enter)=\"setCellValue(1, j)\" (blur)=\"editingCell[1] = -1\" title=\"New cell value\">\n      </div>\n    </div>\n  </div>\n  <p-messages></p-messages>\n</div>\n</p-panel>\n"

/***/ }),

/***/ "./src/app/memory-view/memory-view.component.ts":
/*!******************************************************!*\
  !*** ./src/app/memory-view/memory-view.component.ts ***!
  \******************************************************/
/*! exports provided: MemoryViewComponent */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "MemoryViewComponent", function() { return MemoryViewComponent; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var _memory_service__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../memory.service */ "./src/app/memory.service.ts");
/* harmony import */ var primeng_components_common_messageservice__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! primeng/components/common/messageservice */ "./node_modules/primeng/components/common/messageservice.js");
/* harmony import */ var primeng_components_common_messageservice__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(primeng_components_common_messageservice__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _utils__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../utils */ "./src/app/utils.ts");
/* harmony import */ var _cpu_service__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../cpu.service */ "./src/app/cpu.service.ts");
/* harmony import */ var _cpuregs__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../cpuregs */ "./src/app/cpuregs.ts");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};






var MemoryProtectionUnitView = /** @class */ (function () {
    function MemoryProtectionUnitView(isActive, startAddress, endAddress, blockProtect, supervisorMode, userMode) {
        if (isActive === void 0) { isActive = false; }
        if (startAddress === void 0) { startAddress = 0; }
        if (endAddress === void 0) { endAddress = 0xFFFF; }
        if (blockProtect === void 0) { blockProtect = true; }
        if (supervisorMode === void 0) { supervisorMode = true; }
        if (userMode === void 0) { userMode = true; }
        this.isActive = isActive;
        this.startAddress = startAddress;
        this.endAddress = endAddress;
        this.blockProtect = blockProtect;
        this.supervisorMode = supervisorMode;
        this.userMode = userMode;
    }
    MemoryProtectionUnitView.prototype.checkMemoryCell = function (address, isSupervisorMode) {
        /* If the unit is inactive, then all accesses are allowed.
         * Also, if the user is a device, then the memory protection does not apply */
        if (this.isActive === false) {
            return true;
        }
        /* If blockProtect is set, then the protected memory is WITHIN the limits */
        if (this.blockProtect === true && address >= this.startAddress && address <= this.endAddress) {
            /* We must check the access */
            if (isSupervisorMode && this.supervisorMode === false) {
                return false;
            }
            else {
            }
            return !(isSupervisorMode === false && this.userMode === false);
        }
        else if (this.blockProtect === false && (address < this.startAddress || address > this.endAddress)) {
            /* We must check the access */
            if (isSupervisorMode === true && this.supervisorMode === false) {
                return false;
            }
            else {
                return !(isSupervisorMode === false && this.userMode === false);
            }
        }
        else {
            return true;
        }
    };
    return MemoryProtectionUnitView;
}());
var MemoryCellView = /** @class */ (function () {
    function MemoryCellView(address, initialValue, supervisorEnabled, userEnabled, initialStyle, isInstruction) {
        if (initialValue === void 0) { initialValue = 0; }
        if (supervisorEnabled === void 0) { supervisorEnabled = true; }
        if (userEnabled === void 0) { userEnabled = true; }
        if (isInstruction === void 0) { isInstruction = false; }
        this.isMemoryRegion = false;
        this.style = initialStyle;
        this._value = initialValue;
        this._strValue = _utils__WEBPACK_IMPORTED_MODULE_3__["Utils"].pad(initialValue, 16, 2);
        this.address = address;
        this.isInstruction = isInstruction;
        this.supervisorEnabled = supervisorEnabled;
        this.userEnabled = userEnabled;
    }
    Object.defineProperty(MemoryCellView.prototype, "value", {
        get: function () {
            return this._value;
        },
        set: function (newValue) {
            this._value = newValue;
            this._strValue = _utils__WEBPACK_IMPORTED_MODULE_3__["Utils"].pad(newValue, 16, 2);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MemoryCellView.prototype, "strValue", {
        get: function () {
            return this._strValue;
        },
        enumerable: true,
        configurable: true
    });
    return MemoryCellView;
}());
var CPURegisterPointer = /** @class */ (function () {
    function CPURegisterPointer(index, initialValue) {
        this.index = index;
        this.value = initialValue;
    }
    return CPURegisterPointer;
}());
var MemoryViewComponent = /** @class */ (function () {
    function MemoryViewComponent(memoryService, cpuService, messageService) {
        var _this = this;
        this.memoryService = memoryService;
        this.cpuService = cpuService;
        this.messageService = messageService;
        this.onMemoryCellClick = new _angular_core__WEBPACK_IMPORTED_MODULE_0__["EventEmitter"]();
        this.splitMemoryArea = false;
        this.memoryRegionViews = new Map();
        this.memoryColsIndexes = [];
        this.memoryRowsIndexes = [];
        this.editingCell = [-1, -1];
        this.sspCells = [];
        this.uspCells = [];
        this.registerPointers = new Map();
        this.size = memoryService.getSize();
        this.createIndexes();
        this.memoryCellViews = new Array(this.size);
        for (var i = 0; i < this.size; i++) {
            this.memoryCellViews[i] = new MemoryCellView(i, this.memoryService.memoryCells[i].dataValue);
        }
        var registerBank = this.cpuService.getRegistersBank();
        var registerAPointer = new CPURegisterPointer(_cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].A, registerBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].A).value);
        this.registerPointers.set(_cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].A, registerAPointer);
        this.registerPointers.set(_cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].AH, registerAPointer);
        this.registerPointers.set(_cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].AL, registerAPointer);
        var registerBPointer = new CPURegisterPointer(_cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].B, registerBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].B).value);
        this.registerPointers.set(_cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].B, registerBPointer);
        this.registerPointers.set(_cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].BH, registerBPointer);
        this.registerPointers.set(_cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].BL, registerBPointer);
        var registerCPointer = new CPURegisterPointer(_cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].C, registerBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].C).value);
        this.registerPointers.set(_cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].C, registerCPointer);
        this.registerPointers.set(_cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].CH, registerCPointer);
        this.registerPointers.set(_cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].CL, registerCPointer);
        var registerDPointer = new CPURegisterPointer(_cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].D, registerBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].D).value);
        this.registerPointers.set(_cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].D, registerDPointer);
        this.registerPointers.set(_cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].DH, registerDPointer);
        this.registerPointers.set(_cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].DL, registerDPointer);
        var registerSSPPointer = new CPURegisterPointer(_cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].SSP, registerBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].SSP).value);
        this.registerPointers.set(_cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].SSP, registerSSPPointer);
        var registerUSPPointer = new CPURegisterPointer(_cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].USP, registerBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].USP).value);
        this.registerPointers.set(_cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].USP, registerUSPPointer);
        var registerIPPointer = new CPURegisterPointer(_cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].IP, registerBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].IP).value);
        this.registerPointers.set(_cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].IP, registerIPPointer);
        this.registerSR = registerBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].SR).value;
        this.updateCellStyle(registerIPPointer.value);
        this.updateCellStyle(registerSSPPointer.value);
        this.updateCellStyle(registerUSPPointer.value);
        for (var _i = 0, _a = Array.from(this.memoryService.memoryRegions.keys()); _i < _a.length; _i++) {
            var key = _a[_i];
            var region = this.memoryService.memoryRegions.get(key);
            for (var i = region.startAddress, j = 0; i <= region.endAddress; i++, j++) {
                this.memoryCellViews[i].isMemoryRegion = true;
                this.memoryCellViews[i].memoryRegionStyle =
                    region.name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
                this.updateCellStyle(i);
            }
            this.memoryRegionViews.set(region.regionID, { 'startAddress': region.startAddress, 'endAddress': region.endAddress });
        }
        var protUnit = this.memoryService.protectionUnit;
        this.protectionUnit = new MemoryProtectionUnitView(protUnit.isActive, protUnit.startAddress, protUnit.endAddress, protUnit.blockProtect, protUnit.supervisorMode, protUnit.userMode);
        if (this.protectionUnit.isActive === true) {
            for (var i = 0; i < this.size; i++) {
                this.memoryCellViews[i].supervisorEnabled = this.protectionUnit.checkMemoryCell(i, true);
                this.memoryCellViews[i].userEnabled = this.protectionUnit.checkMemoryCell(i, false);
                this.updateCellStyle(i);
            }
        }
        this.memoryOperationSubscription = this.memoryService.memoryOperation$.subscribe(function (memoryOperation) { return _this.processMemoryOperation(memoryOperation); });
        this.cpuRegisterOperationSubscription = this.cpuService.cpuRegisterOperation$.subscribe(function (cpuRegisterOperation) { return _this.processCPURegisterOperation(cpuRegisterOperation); });
    }
    MemoryViewComponent.prototype.createIndexes = function () {
        for (var _i = 0, _a = Array.from({ length: 16 }, function (value, key) { return key; }); _i < _a.length; _i++) {
            var i = _a[_i];
            this.memoryColsIndexes.push(_utils__WEBPACK_IMPORTED_MODULE_3__["Utils"].pad(i, 16, 1));
        }
        for (var _b = 0, _c = Array.from({ length: this.memoryService.getSize() / 16 }, function (value, key) { return key; }); _b < _c.length; _b++) {
            var i = _c[_b];
            this.memoryRowsIndexes.push(_utils__WEBPACK_IMPORTED_MODULE_3__["Utils"].pad(i, 16, 3));
        }
    };
    MemoryViewComponent.prototype.pushErrorMessage = function (detail) {
        this.messageService.clear();
        this.messageService.add({ severity: 'error', detail: detail });
    };
    MemoryViewComponent.prototype.ngOnDestroy = function () {
        this.memoryOperationSubscription.unsubscribe();
    };
    MemoryViewComponent.prototype.operationAddRegion = function (regionID, name, startAddress, endAddress, initialValues) {
        for (var i = startAddress, j = 0; i <= endAddress; i++, j++) {
            this.memoryCellViews[i].value = initialValues ? initialValues[j] : 0;
            this.memoryCellViews[i].isMemoryRegion = true;
            this.memoryCellViews[i].memoryRegionStyle =
                name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
            this.updateCellStyle(i);
        }
        this.memoryRegionViews.set(regionID, { 'startAddress': startAddress, 'endAddress': endAddress });
    };
    MemoryViewComponent.prototype.operationWriteByte = function (address, value) {
        this.memoryCellViews[address].value = value;
    };
    MemoryViewComponent.prototype.operationWriteWord = function (address, value) {
        this.memoryCellViews[address].value = (value & 0xFF00) >>> 8;
        this.memoryCellViews[address + 1].value = (value & 0x00FF);
    };
    MemoryViewComponent.prototype.operationWriteCells = function (initialAddress, size, values) {
        for (var i = initialAddress, j = 0; i < initialAddress + size; i++, j++) {
            this.memoryCellViews[i].value = values ? values[j] : 0;
        }
    };
    MemoryViewComponent.prototype.operationReset = function () {
        var _this = this;
        for (var i = 0; i < this.size; i++) {
            this.memoryCellViews[i].supervisorEnabled = true;
            this.memoryCellViews[i].userEnabled = true;
            if (this.memoryCellViews[i].isMemoryRegion === false) {
                this.memoryCellViews[i].value = 0;
                this.updateCellStyle(i);
            }
        }
        // And we have to flush the stack
        var previousStackedCells = this.sspCells;
        this.sspCells = [];
        previousStackedCells.forEach(function (cell) { return _this.updateCellStyle(cell); });
        previousStackedCells = this.uspCells;
        this.uspCells = [];
        previousStackedCells.forEach(function (cell) { return _this.updateCellStyle(cell); });
    };
    MemoryViewComponent.prototype.operationWriteRegister = function (index, value) {
        var display;
        if (index === _cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].SR) {
            var previousMode = this.isSupervisorMode();
            this.registerSR = value;
            if (previousMode !== this.isSupervisorMode()) {
                for (var i = 0; i < this.size; i++) {
                    this.updateCellStyle(i);
                }
            }
            return;
        }
        var registerPointer = this.registerPointers.get(index);
        var previousRegisterPointer = registerPointer.value;
        if (index === _cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].SSP ||
            index === _cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].USP) {
            registerPointer.value = value;
            var cells = void 0;
            switch (index) {
                case _cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].SSP:
                    cells = this.sspCells;
                    break;
                case _cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].USP:
                    cells = this.uspCells;
                    break;
            }
            if (value > previousRegisterPointer) {
                /* The pointer has advanced (e.g. POP), so we have to
                 * clear all the cells from the original pointer to the new
                 * value */
                for (var i = 1; previousRegisterPointer + i <= value; i++) {
                    cells.splice(cells.indexOf(previousRegisterPointer + i), 1);
                    this.updateCellStyle(previousRegisterPointer + i);
                }
                this.updateCellStyle(previousRegisterPointer);
            }
            else if (value < previousRegisterPointer) {
                /* The pointer has receeded (e.g. PUSH), so we have to include
                 * all the cells from the original value to the new one */
                for (var i = 0; previousRegisterPointer - i !== value; i++) {
                    cells.push(previousRegisterPointer - i);
                    this.updateCellStyle(previousRegisterPointer - i);
                }
                this.updateCellStyle(value);
            }
        }
        switch (index) {
            case _cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].AH:
            case _cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].BH:
            case _cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].CH:
            case _cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].DH:
                registerPointer.value = (previousRegisterPointer & 0x00FF) + (value << 8);
                break;
            case _cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].AL:
            case _cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].BL:
            case _cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].CL:
            case _cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].DL:
                registerPointer.value = (previousRegisterPointer & 0xFF00) + value;
                break;
            default:
                registerPointer.value = value;
                break;
        }
        switch (index) {
            case _cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].A:
            case _cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].AH:
            case _cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].AL:
                display = this.displayA;
                break;
            case _cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].B:
            case _cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].BH:
            case _cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].BL:
                display = this.displayB;
                break;
            case _cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].C:
            case _cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].CH:
            case _cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].CL:
                display = this.displayC;
                break;
            case _cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].D:
            case _cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].DH:
            case _cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].DL:
                display = this.displayD;
                break;
            default:
                display = true;
                break;
        }
        if (display === true) {
            if (previousRegisterPointer >= 0 && previousRegisterPointer < this.size) {
                this.updateCellStyle(previousRegisterPointer);
            }
            this.updateCellStyle(registerPointer.value);
        }
    };
    MemoryViewComponent.prototype.operationWriteBit = function (index, bitNumber, value) {
        if (index === _cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].SR) {
            var previousMode = this.isSupervisorMode();
            if (value === 0) {
                this.registerSR &= ~(1 << bitNumber);
            }
            else {
                this.registerSR |= (1 << bitNumber);
            }
            if (previousMode !== this.isSupervisorMode()) {
                for (var i = 0; i < this.size; i++) {
                    this.updateCellStyle(i);
                }
            }
        }
    };
    MemoryViewComponent.prototype.operationChangeMemoryProtection = function (isActive, startAddress, endAddress, blockProtect, supervisorMode, userMode) {
        var previouslyActive = this.protectionUnit.isActive;
        this.protectionUnit.isActive = isActive;
        this.protectionUnit.startAddress = startAddress;
        this.protectionUnit.endAddress = endAddress;
        this.protectionUnit.blockProtect = blockProtect;
        this.protectionUnit.supervisorMode = supervisorMode;
        this.protectionUnit.userMode = userMode;
        if (isActive === false && previouslyActive === true) {
            for (var i = 0; i < this.size; i++) {
                this.memoryCellViews[i].supervisorEnabled = true;
                this.memoryCellViews[i].userEnabled = true;
                this.updateCellStyle(i);
            }
        }
        else if (isActive === true) {
            for (var i = 0; i < this.size; i++) {
                this.memoryCellViews[i].supervisorEnabled = this.protectionUnit.checkMemoryCell(i, true);
                this.memoryCellViews[i].userEnabled = this.protectionUnit.checkMemoryCell(i, false);
                this.updateCellStyle(i);
            }
        }
    };
    MemoryViewComponent.prototype.processCPURegisterOperation = function (cpuRegisterOperation) {
        switch (cpuRegisterOperation.operationType) {
            case _cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterOperationType"].WRITE:
                this.operationWriteRegister(cpuRegisterOperation.data.index, cpuRegisterOperation.data.value);
                break;
            case _cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterOperationType"].WRITE_BIT:
                this.operationWriteBit(cpuRegisterOperation.data.index, cpuRegisterOperation.data.bitNumber, cpuRegisterOperation.data.value);
                break;
            default:
                break;
        }
    };
    MemoryViewComponent.prototype.processMemoryOperation = function (memoryOperation) {
        switch (memoryOperation.operationType) {
            case _memory_service__WEBPACK_IMPORTED_MODULE_1__["MemoryOperationType"].ADD_REGION:
                this.operationAddRegion(memoryOperation.data.regionID, memoryOperation.data.name, memoryOperation.data.startAddress, memoryOperation.data.endAddress, memoryOperation.data.initialValues);
                break;
            case _memory_service__WEBPACK_IMPORTED_MODULE_1__["MemoryOperationType"].CHANGE_MEMPROT:
                this.operationChangeMemoryProtection(memoryOperation.data.isActive, memoryOperation.data.startAddress, memoryOperation.data.endAddress, memoryOperation.data.blockProtect, memoryOperation.data.supervisorMode, memoryOperation.data.userMode);
                break;
            case _memory_service__WEBPACK_IMPORTED_MODULE_1__["MemoryOperationType"].STORE_BYTE:
                this.operationWriteByte(memoryOperation.data.address, memoryOperation.data.value);
                break;
            case _memory_service__WEBPACK_IMPORTED_MODULE_1__["MemoryOperationType"].STORE_BYTES:
                this.operationWriteCells(memoryOperation.data.initialAddress, memoryOperation.data.size, memoryOperation.data.values);
                break;
            case _memory_service__WEBPACK_IMPORTED_MODULE_1__["MemoryOperationType"].STORE_WORD:
                this.operationWriteWord(memoryOperation.data.address, memoryOperation.data.value);
                break;
            case _memory_service__WEBPACK_IMPORTED_MODULE_1__["MemoryOperationType"].RESET:
                this.operationReset();
                break;
            default:
                break;
        }
    };
    MemoryViewComponent.prototype.setCellValue = function (view, address) {
        try {
            this.memoryService.storeByte(address, parseInt(this.newCellValue, 16), _memory_service__WEBPACK_IMPORTED_MODULE_1__["MemoryAccessActor"].DEVICE);
            if (this.memoryCellViews[address].isInstruction === true) {
                this.memoryCellViews[address].isInstruction = false;
                this.updateCellStyle(address);
            }
        }
        catch (e) {
            this.pushErrorMessage(e.toString());
        }
        this.editingCell[view] = -1;
    };
    MemoryViewComponent.prototype.isSupervisorMode = function () {
        return ((this.registerSR & 0x8000) !== 0);
    };
    MemoryViewComponent.prototype.updateCellStyle = function (address) {
        /* Order of styling:
         * - instruction pointer >
         * - stack pointer >
         * - register A pointer >
         * - register B pointer >
         * - register C pointer >
         * - register D pointer >
         * - stack
         * - mapped instruction >
         * - region
         * - access
         */
        if (address < 0 || address >= this.size) {
            return;
        }
        this.memoryCellViews[address].style = '';
        if (this.memoryCellViews[address].memoryRegionStyle !== undefined) {
            this.memoryCellViews[address].style = this.memoryCellViews[address].memoryRegionStyle;
        }
        if (this.memoryCellViews[address].isInstruction === true) {
            this.memoryCellViews[address].style = 'instr-bg';
        }
        if (this.uspCells.indexOf(address) !== -1) {
            this.memoryCellViews[address].style = 'usp-stack-bg';
        }
        if (this.sspCells.indexOf(address) !== -1) {
            this.memoryCellViews[address].style = 'ssp-stack-bg';
        }
        if (this.displayD === true &&
            this.registerPointers.get(_cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].D).value === address) {
            this.memoryCellViews[address].style = 'marker marker-d';
        }
        if (this.displayC === true &&
            this.registerPointers.get(_cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].C).value === address) {
            this.memoryCellViews[address].style = 'marker marker-c';
        }
        if (this.displayB === true &&
            this.registerPointers.get(_cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].B).value === address) {
            this.memoryCellViews[address].style = 'marker marker-b';
        }
        if (this.displayA === true &&
            this.registerPointers.get(_cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].A).value === address) {
            this.memoryCellViews[address].style = 'marker marker-a';
        }
        if (this.registerPointers.get(_cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].USP).value === address && !this.isSupervisorMode()) {
            this.memoryCellViews[address].style = 'marker marker-usp';
        }
        if (this.registerPointers.get(_cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].SSP).value === address && this.isSupervisorMode()) {
            this.memoryCellViews[address].style = 'marker marker-ssp';
        }
        if (this.registerPointers.get(_cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].IP).value === address) {
            this.memoryCellViews[address].style = 'marker marker-ip';
        }
        if (this.isSupervisorMode() === true) {
            this.memoryCellViews[address].style += (this.memoryCellViews[address].supervisorEnabled === false) ? ' muted' : '';
        }
        else {
            this.memoryCellViews[address].style += (this.memoryCellViews[address].userEnabled === false) ? ' muted' : '';
        }
    };
    MemoryViewComponent.prototype.ngOnChanges = function (changes) {
        if ('mapping' in changes) {
            /* We need to undo the previous assignment */
            var previousMapping = changes['mapping'].previousValue;
            if (previousMapping) {
                for (var _i = 0, _a = Array.from(previousMapping.keys()); _i < _a.length; _i++) {
                    var i = _a[_i];
                    this.memoryCellViews[i].isInstruction = false;
                    this.updateCellStyle(i);
                }
            }
            var currentMapping = changes['mapping'].currentValue;
            if (currentMapping) {
                for (var _b = 0, _c = Array.from(currentMapping.keys()); _b < _c.length; _b++) {
                    var i = _c[_b];
                    this.memoryCellViews[i].isInstruction = true;
                    this.updateCellStyle(i);
                }
            }
        }
        if ('displayA' in changes) {
            this.updateCellStyle(this.registerPointers.get(_cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].A).value);
        }
        if ('displayB' in changes) {
            this.updateCellStyle(this.registerPointers.get(_cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].B).value);
        }
        if ('displayC' in changes) {
            this.updateCellStyle(this.registerPointers.get(_cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].C).value);
        }
        if ('displayD' in changes) {
            this.updateCellStyle(this.registerPointers.get(_cpuregs__WEBPACK_IMPORTED_MODULE_5__["CPURegisterIndex"].D).value);
        }
    };
    MemoryViewComponent.prototype.memoryCellClick = function (event, view, address) {
        if (event.ctrlKey || event.metaKey) {
            this.editingCell[view] = address;
            this.newCellValue = this.memoryCellViews[address].strValue;
        }
        else {
            this.onMemoryCellClick.emit(address);
        }
    };
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Input"])(),
        __metadata("design:type", Map)
    ], MemoryViewComponent.prototype, "mapping", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Input"])(),
        __metadata("design:type", Boolean)
    ], MemoryViewComponent.prototype, "displayA", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Input"])(),
        __metadata("design:type", Boolean)
    ], MemoryViewComponent.prototype, "displayB", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Input"])(),
        __metadata("design:type", Boolean)
    ], MemoryViewComponent.prototype, "displayC", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Input"])(),
        __metadata("design:type", Boolean)
    ], MemoryViewComponent.prototype, "displayD", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Output"])(),
        __metadata("design:type", Object)
    ], MemoryViewComponent.prototype, "onMemoryCellClick", void 0);
    MemoryViewComponent = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"])({
            selector: 'app-memory-view',
            template: __webpack_require__(/*! ./memory-view.component.html */ "./src/app/memory-view/memory-view.component.html"),
            providers: [
                primeng_components_common_messageservice__WEBPACK_IMPORTED_MODULE_2__["MessageService"]
            ]
        }),
        __metadata("design:paramtypes", [_memory_service__WEBPACK_IMPORTED_MODULE_1__["MemoryService"],
            _cpu_service__WEBPACK_IMPORTED_MODULE_4__["CPUService"],
            primeng_components_common_messageservice__WEBPACK_IMPORTED_MODULE_2__["MessageService"]])
    ], MemoryViewComponent);
    return MemoryViewComponent;
}());



/***/ }),

/***/ "./src/app/memory.service.ts":
/*!***********************************!*\
  !*** ./src/app/memory.service.ts ***!
  \***********************************/
/*! exports provided: MemoryAccessActor, MemoryOperationType, MemoryOperation, MemoryRegion, MemoryService */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "MemoryAccessActor", function() { return MemoryAccessActor; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "MemoryOperationType", function() { return MemoryOperationType; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "MemoryOperation", function() { return MemoryOperation; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "MemoryRegion", function() { return MemoryRegion; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "MemoryService", function() { return MemoryService; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var rxjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! rxjs */ "./node_modules/rxjs/_esm5/index.js");
/* harmony import */ var _ioregmap_service__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./ioregmap.service */ "./src/app/ioregmap.service.ts");
/* harmony import */ var _utils__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./utils */ "./src/app/utils.ts");
/* harmony import */ var _events_log_service__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./events-log.service */ "./src/app/events-log.service.ts");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};





var MEMPTSTART_REGISTER_ADDRESS = 7;
var MEMPTEND_REGISTER_ADDRESS = 8;
var MemoryAccessActor;
(function (MemoryAccessActor) {
    MemoryAccessActor[MemoryAccessActor["DEVICE"] = 0] = "DEVICE";
    MemoryAccessActor[MemoryAccessActor["CPU_SUPERVISOR"] = 1] = "CPU_SUPERVISOR";
    MemoryAccessActor[MemoryAccessActor["CPU_USER"] = 2] = "CPU_USER";
})(MemoryAccessActor || (MemoryAccessActor = {}));
var MemoryProtectionUnit = /** @class */ (function () {
    function MemoryProtectionUnit(isActive, startAddress, endAddress, blockProtect, supervisorMode, userMode) {
        if (isActive === void 0) { isActive = false; }
        if (startAddress === void 0) { startAddress = 0; }
        if (endAddress === void 0) { endAddress = 0xFFFF; }
        if (blockProtect === void 0) { blockProtect = true; }
        if (supervisorMode === void 0) { supervisorMode = true; }
        if (userMode === void 0) { userMode = true; }
        this.isActive = isActive;
        this.startAddress = startAddress;
        this.endAddress = endAddress;
        this.blockProtect = blockProtect;
        this.supervisorMode = supervisorMode;
        this.userMode = userMode;
        this._startRegister = this.startAddress & 0xFFF0;
        if (this.isActive === true) {
            this._startRegister |= 0x0001;
        }
        if (this.blockProtect === true) {
            this._startRegister |= 0x0002;
        }
        if (this.userMode === true) {
            this._startRegister |= 0x0004;
        }
        if (this.supervisorMode === true) {
            this._startRegister |= 0x0008;
        }
        this._endRegister = this.endAddress;
    }
    Object.defineProperty(MemoryProtectionUnit.prototype, "startRegister", {
        get: function () {
            return this._startRegister;
        },
        set: function (newValue) {
            this._startRegister = newValue;
            this.startAddress = (newValue & 0xFFF0);
            this.isActive = ((newValue & 0x0001) !== 0);
            this.blockProtect = ((newValue & 0x0002) !== 0);
            this.userMode = ((newValue & 0x0004) !== 0);
            this.supervisorMode = ((newValue & 0x0008) !== 0);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MemoryProtectionUnit.prototype, "endRegister", {
        get: function () {
            return this._endRegister;
        },
        set: function (newValue) {
            this._endRegister = newValue;
            this.endAddress = newValue;
        },
        enumerable: true,
        configurable: true
    });
    MemoryProtectionUnit.prototype.checkMemoryAccess = function (address, actor) {
        /* If the unit is inactive, then all accesses are allowed.
         * Also, if the user is a device, then the memory protection does not apply */
        if (this.isActive === false || actor === MemoryAccessActor.DEVICE) {
            return true;
        }
        /* If blockProtect is set, then the protected memory is WITHIN the limits */
        if (this.blockProtect === true && address >= this.startAddress && address <= this.endAddress) {
            /* We must check the access */
            if (actor === MemoryAccessActor.CPU_SUPERVISOR && this.supervisorMode === false) {
                return false;
            }
            else {
            }
            return !(actor === MemoryAccessActor.CPU_USER && this.userMode === false);
        }
        else if (this.blockProtect === false && (address < this.startAddress || address > this.endAddress)) {
            /* We must check the access */
            if (actor === MemoryAccessActor.CPU_SUPERVISOR && this.supervisorMode === false) {
                return false;
            }
            else {
                return !(actor === MemoryAccessActor.CPU_USER && this.userMode === false);
            }
        }
        else {
            return true;
        }
    };
    return MemoryProtectionUnit;
}());
var MemoryOperationType;
(function (MemoryOperationType) {
    MemoryOperationType[MemoryOperationType["RESET"] = 0] = "RESET";
    MemoryOperationType[MemoryOperationType["LOAD_BYTE"] = 1] = "LOAD_BYTE";
    MemoryOperationType[MemoryOperationType["STORE_BYTE"] = 2] = "STORE_BYTE";
    MemoryOperationType[MemoryOperationType["STORE_BYTES"] = 3] = "STORE_BYTES";
    MemoryOperationType[MemoryOperationType["LOAD_WORD"] = 4] = "LOAD_WORD";
    MemoryOperationType[MemoryOperationType["STORE_WORD"] = 5] = "STORE_WORD";
    MemoryOperationType[MemoryOperationType["ADD_REGION"] = 6] = "ADD_REGION";
    MemoryOperationType[MemoryOperationType["CHANGE_MEMPROT"] = 7] = "CHANGE_MEMPROT";
})(MemoryOperationType || (MemoryOperationType = {}));
var MemoryOperationState;
(function (MemoryOperationState) {
    MemoryOperationState[MemoryOperationState["IN_PROGRESS"] = 0] = "IN_PROGRESS";
    MemoryOperationState[MemoryOperationState["FINISHED"] = 1] = "FINISHED";
})(MemoryOperationState || (MemoryOperationState = {}));
var MemoryOperation = /** @class */ (function () {
    function MemoryOperation(operationType, data) {
        this.operationType = operationType;
        this.data = data;
    }
    MemoryOperation.prototype.toString = function () {
        var ret, params;
        switch (this.operationType) {
            case MemoryOperationType.RESET:
                ret = "MEM: Reset memory";
                break;
            case MemoryOperationType.LOAD_BYTE:
                params = this.data;
                ret = "MEM: Load byte from [0x" + _utils__WEBPACK_IMPORTED_MODULE_3__["Utils"].pad(params.address, 16, 4) + "] => 0x" + _utils__WEBPACK_IMPORTED_MODULE_3__["Utils"].pad(params.value, 16, 2);
                break;
            case MemoryOperationType.STORE_BYTE:
                params = this.data;
                ret = "MEM: Store byte 0x" + _utils__WEBPACK_IMPORTED_MODULE_3__["Utils"].pad(params.value, 16, 2) + " at [0x" + _utils__WEBPACK_IMPORTED_MODULE_3__["Utils"].pad(params.address, 16, 4) + "]";
                break;
            case MemoryOperationType.STORE_BYTES:
                params = this.data;
                if (params.values) {
                    ret = "MEM: Store " + params.size + " bytes at [0x" + _utils__WEBPACK_IMPORTED_MODULE_3__["Utils"].pad(params.initialAddress, 16, 4) + "]";
                }
                else {
                    ret = "MEM: Clear " + params.size + " bytes at [0x" + _utils__WEBPACK_IMPORTED_MODULE_3__["Utils"].pad(params.initialAddress, 16, 4) + "]";
                }
                break;
            case MemoryOperationType.LOAD_WORD:
                params = this.data;
                ret = "MEM: Load word from [0x" + _utils__WEBPACK_IMPORTED_MODULE_3__["Utils"].pad(params.address, 16, 4) + "] => 0x" + _utils__WEBPACK_IMPORTED_MODULE_3__["Utils"].pad(params.value, 16, 4);
                break;
            case MemoryOperationType.STORE_WORD:
                params = this.data;
                ret = "MEM: Store word 0x" + _utils__WEBPACK_IMPORTED_MODULE_3__["Utils"].pad(params.value, 16, 4) + " at [0x" + _utils__WEBPACK_IMPORTED_MODULE_3__["Utils"].pad(params.address, 16, 4) + "]";
                break;
            case MemoryOperationType.ADD_REGION:
                params = this.data;
                ret = "MEM: Add region " + params.name + " at addresses " +
                    ("[0x" + _utils__WEBPACK_IMPORTED_MODULE_3__["Utils"].pad(params.startAddress, 16, 4) + ", 0x" + _utils__WEBPACK_IMPORTED_MODULE_3__["Utils"].pad(params.endAddress, 16, 4) + "]");
                break;
            case MemoryOperationType.CHANGE_MEMPROT:
                params = this.data;
                if (params.isActive === true) {
                    ret = "MEM: Enabled protection unit with mode " + (params.blockProtect === true ? "block " : "segment ") +
                        "with permissions " +
                        (params.supervisorMode === true ? "S" : "-") +
                        (params.supervisorMode === true ? "U" : "-") + " at addresses " +
                        ("[0x" + _utils__WEBPACK_IMPORTED_MODULE_3__["Utils"].pad(params.startAddress, 16, 4) + ", 0x" + _utils__WEBPACK_IMPORTED_MODULE_3__["Utils"].pad(params.endAddress, 16, 4) + "]");
                }
                else {
                    ret = "MEM: Disabled protection unit";
                }
                break;
            default:
                break;
        }
        return ret;
    };
    return MemoryOperation;
}());

var MemoryCell = /** @class */ (function () {
    function MemoryCell(address, initialValue, memoryRegion) {
        if (initialValue === void 0) { initialValue = 0; }
        this.address = address;
        this.dataValue = initialValue;
        this.memoryRegion = memoryRegion;
    }
    return MemoryCell;
}());
/**
 * Memory region class.
 */
var MemoryRegion = /** @class */ (function () {
    function MemoryRegion(regionID, name, startAddress, endAddress, publishMemoryOperation) {
        this.lastAccess = -1;
        this.regionID = regionID;
        this.name = name;
        this.startAddress = startAddress;
        this.endAddress = endAddress;
        this.publishMemoryOperation = publishMemoryOperation;
        this.size = endAddress - startAddress + 1;
    }
    return MemoryRegion;
}());

var MemoryService = /** @class */ (function () {
    function MemoryService(ioRegMapService, eventsLogService) {
        var _this = this;
        this.ioRegMapService = ioRegMapService;
        this.eventsLogService = eventsLogService;
        this.size = 4096;
        this.lastAccess = -1;
        this.memoryRegions = new Map();
        this.memoryOperationSource = new rxjs__WEBPACK_IMPORTED_MODULE_1__["Subject"]();
        this.protectionUnit = new MemoryProtectionUnit();
        this.memoryCells = Array(this.size);
        for (var i = 0; i < this.size; i++) {
            this.memoryCells[i] = new MemoryCell(i);
        }
        ioRegMapService.addRegister('MEMPTSTART', MEMPTSTART_REGISTER_ADDRESS, this.protectionUnit.startRegister, _ioregmap_service__WEBPACK_IMPORTED_MODULE_2__["IORegisterType"].READ_WRITE, function (op) { return _this.processRegisterOperation(op); }, 'Memory Protection Unit Start Register');
        ioRegMapService.addRegister('MEMPTEND', MEMPTEND_REGISTER_ADDRESS, this.protectionUnit.endRegister, _ioregmap_service__WEBPACK_IMPORTED_MODULE_2__["IORegisterType"].READ_WRITE, function (op) { return _this.processRegisterOperation(op); }, 'Memory Protection Unit End Register');
        this.memoryOperation$ = this.memoryOperationSource.asObservable();
    }
    MemoryService.prototype.getSize = function () {
        return this.size;
    };
    MemoryService.prototype.publishMemoryOperation = function (operation) {
        this.eventsLogService.log(operation);
        this.memoryOperationSource.next(operation);
    };
    MemoryService.prototype.publishMemoryOperationStart = function (operation) {
        operation.state = MemoryOperationState.IN_PROGRESS;
        this.eventsLogService.startEventGroup(operation);
        this.memoryOperationSource.next(operation);
    };
    MemoryService.prototype.publishMemoryOperationEnd = function (operation) {
        operation.state = MemoryOperationState.FINISHED;
        this.eventsLogService.endEventGroup(operation);
        this.memoryOperationSource.next(operation);
    };
    MemoryService.prototype.addMemoryRegion = function (name, startAddress, endAddress, initialValues, publishMemoryOperation) {
        /* We need to first check that startAddress and endAddress are valid, i.e.:
           - startAddress >= 0 AND endAddress < size AND
           - startAddress <= endAddress
         */
        if (startAddress < 0 || endAddress >= this.size || startAddress >= endAddress) {
            throw Error("Invalid addresses: (" + startAddress + ", " + endAddress + ")");
        }
        if (initialValues && (initialValues.length !== (endAddress - startAddress + 1))) {
            throw Error("Invalid size of the array of initial values: " + initialValues.length);
        }
        /* Now we need to check if the selected memory region overlaps with a previously
           existing one. */
        /* The overlapping will happen iff:
           1) new startAddress == any previously existing region's startAddress OR
           2) new endAddress == any previously existing region's endAddress OR
           3) ((new startAddress < any previously existing region's startAddress) AND
               (new endAddress >= any previously existing region's startAddress)) OR
           4) ((new startAddress > any previously existing region's startAddress) AND
               (new startAddress <= any previously existing region's endAddress))
         */
        for (var _i = 0, _a = Array.from(this.memoryRegions.values()); _i < _a.length; _i++) {
            var memoryRegion = _a[_i];
            if ((startAddress === memoryRegion.startAddress) ||
                (endAddress === memoryRegion.endAddress) ||
                ((startAddress < memoryRegion.startAddress) &&
                    (endAddress >= memoryRegion.startAddress)) ||
                ((startAddress > memoryRegion.startAddress) &&
                    (startAddress <= memoryRegion.endAddress))) {
                throw Error("New region (" + startAddress + ", " + endAddress + ") overlaps with " +
                    ("a existing one (" + memoryRegion.startAddress + ", " + memoryRegion.endAddress + ")"));
            }
        }
        /* Next step: obtain a new unused memory region ID */
        var newID;
        for (;;) {
            newID = Math.random().toString(36).substring(8);
            if (this.memoryRegions.has(newID) === false) {
                break;
            }
        }
        /* Now we can insert the new memory region */
        var newMemoryRegion = new MemoryRegion(newID, name, startAddress, endAddress, publishMemoryOperation);
        this.memoryRegions.set(newID, newMemoryRegion);
        for (var i = startAddress, j = 0; i <= endAddress; i++, j++) {
            this.memoryCells[i].dataValue = initialValues ? initialValues[j] : 0;
            this.memoryCells[i].memoryRegion = newMemoryRegion;
        }
        var parameters = {
            regionID: newID,
            name: name,
            startAddress: startAddress,
            endAddress: endAddress,
            initialValues: initialValues
        };
        this.publishMemoryOperation(new MemoryOperation(MemoryOperationType.ADD_REGION, parameters));
        return newID;
    };
    MemoryService.prototype.loadByte = function (address, publish) {
        if (publish === void 0) { publish = true; }
        if (address < 0 || address > this.size) {
            throw Error('Memory access violation at ' + address);
        }
        this.lastAccess = address;
        var parameters = {
            address: address,
            value: this.memoryCells[address].dataValue
        };
        var operation = new MemoryOperation(MemoryOperationType.LOAD_BYTE, parameters);
        this.publishMemoryOperation(operation);
        if (this.memoryCells[address].memoryRegion) {
            this.memoryCells[address].memoryRegion.lastAccess = address;
            if (this.memoryCells[address].memoryRegion.publishMemoryOperation && publish === true) {
                this.memoryCells[address].memoryRegion.publishMemoryOperation(operation);
            }
        }
        return this.memoryCells[address].dataValue;
    };
    MemoryService.prototype.storeByte = function (address, value, actor, publish) {
        if (publish === void 0) { publish = true; }
        if (address < 0 || address > this.size) {
            throw Error("Memory access violation at " + address);
        }
        if (isNaN(value)) {
            throw Error('Invalid value (Nan)');
        }
        if (value < 0 || value > 255) {
            throw Error("Invalid data value " + value);
        }
        if (this.protectionUnit.checkMemoryAccess(address, actor) === false) {
            throw Error("Invalid storage into protected cell " + address);
        }
        this.lastAccess = address;
        this.memoryCells[address].dataValue = value;
        var parameters = {
            address: address,
            value: value
        };
        var operation = new MemoryOperation(MemoryOperationType.STORE_BYTE, parameters);
        this.publishMemoryOperation(operation);
        if (this.memoryCells[address].memoryRegion) {
            this.memoryCells[address].memoryRegion.lastAccess = address;
            if (this.memoryCells[address].memoryRegion.publishMemoryOperation && publish === true) {
                this.memoryCells[address].memoryRegion.publishMemoryOperation(operation);
            }
        }
    };
    MemoryService.prototype.storeBytes = function (initialAddress, size, values) {
        if (initialAddress < 0 || (initialAddress + size) > this.size) {
            throw Error("Memory access violation at (" + initialAddress + ", " + (initialAddress + size));
        }
        if (values) {
            for (var i = 0; i < values.length; i++) {
                if (values[i] < 0 || values[i] > 255) {
                    throw Error("Invalid data value [" + i + "]: " + values[i]);
                }
            }
        }
        for (var i = 0; i < size; i++) {
            this.memoryCells[initialAddress + i].dataValue = values ? values[i] : 0;
        }
        this.lastAccess = initialAddress + size;
        var parameters = {
            initialAddress: initialAddress,
            size: size,
            values: values
        };
        this.publishMemoryOperation(new MemoryOperation(MemoryOperationType.STORE_BYTES, parameters));
    };
    MemoryService.prototype.loadWord = function (address, publish) {
        if (publish === void 0) { publish = true; }
        if (address < 0 || address >= this.size) {
            throw Error('Memory access violation at ' + address);
        }
        this.lastAccess = address;
        var word = (this.memoryCells[address].dataValue << 8) +
            (this.memoryCells[address + 1].dataValue);
        var parameters = {
            address: address,
            value: word
        };
        var operation = new MemoryOperation(MemoryOperationType.LOAD_WORD, parameters);
        this.publishMemoryOperation(operation);
        if (this.memoryCells[address].memoryRegion) {
            this.memoryCells[address].memoryRegion.lastAccess = address;
            if (this.memoryCells[address].memoryRegion.publishMemoryOperation && publish === true) {
                this.memoryCells[address].memoryRegion.publishMemoryOperation(operation);
            }
        }
        return word;
    };
    MemoryService.prototype.storeWord = function (address, value, actor, publish) {
        if (publish === void 0) { publish = true; }
        if (address < 0 || address >= this.size) {
            throw Error("Memory access violation at " + address);
        }
        if (isNaN(value)) {
            throw Error('Invalid value (Nan)');
        }
        if (value < 0 || value > 65535) {
            throw Error("Invalid data value " + value);
        }
        if (this.protectionUnit.checkMemoryAccess(address, actor) === false ||
            this.protectionUnit.checkMemoryAccess(address + 1, actor) === false) {
            throw Error("Invalid storage into protected cell " + address);
        }
        this.lastAccess = address;
        var msb = (value & 0xFF00) >>> 8;
        var lsb = (value & 0x00FF);
        this.memoryCells[address].dataValue = msb;
        this.memoryCells[address + 1].dataValue = lsb;
        var parameters = {
            address: address,
            value: value
        };
        var operation = new MemoryOperation(MemoryOperationType.STORE_WORD, parameters);
        this.publishMemoryOperation(operation);
        if (this.memoryCells[address].memoryRegion) {
            this.memoryCells[address].memoryRegion.lastAccess = address;
            if (this.memoryCells[address].memoryRegion.publishMemoryOperation && publish === true) {
                this.memoryCells[address].memoryRegion.publishMemoryOperation(operation);
            }
        }
    };
    MemoryService.prototype.processWriteOperation = function (address, value) {
        switch (address) {
            case MEMPTSTART_REGISTER_ADDRESS:
                this.protectionUnit.startRegister = value;
                break;
            case MEMPTEND_REGISTER_ADDRESS:
                this.protectionUnit.endRegister = value;
                break;
        }
        var parameters = {
            isActive: this.protectionUnit.isActive,
            blockProtect: this.protectionUnit.blockProtect,
            startAddress: this.protectionUnit.startAddress,
            endAddress: this.protectionUnit.endAddress,
            supervisorMode: this.protectionUnit.supervisorMode,
            userMode: this.protectionUnit.userMode
        };
        this.publishMemoryOperation(new MemoryOperation(MemoryOperationType.CHANGE_MEMPROT, parameters));
    };
    MemoryService.prototype.processRegisterOperation = function (ioRegisterOperation) {
        switch (ioRegisterOperation.operationType) {
            case _ioregmap_service__WEBPACK_IMPORTED_MODULE_2__["IORegisterOperationType"].READ:
                break;
            case _ioregmap_service__WEBPACK_IMPORTED_MODULE_2__["IORegisterOperationType"].WRITE:
                this.processWriteOperation(ioRegisterOperation.data.address, ioRegisterOperation.data.value);
                break;
        }
    };
    MemoryService.prototype.reset = function () {
        var operation = new MemoryOperation(MemoryOperationType.RESET);
        this.publishMemoryOperationStart(operation);
        this.lastAccess = -1;
        for (var i = 0; i < this.memoryCells.length; i++) {
            if (this.memoryCells[i].memoryRegion === undefined) {
                this.memoryCells[i].dataValue = 0;
            }
        }
        this.protectionUnit.startRegister = 0x000E;
        this.protectionUnit.endRegister = 0xFFFF;
        this.ioRegMapService.store(MEMPTSTART_REGISTER_ADDRESS, 0x000E, false, false);
        this.ioRegMapService.store(MEMPTEND_REGISTER_ADDRESS, 0xFFFF, false, false);
        this.publishMemoryOperationEnd(operation);
    };
    MemoryService = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Injectable"])(),
        __metadata("design:paramtypes", [_ioregmap_service__WEBPACK_IMPORTED_MODULE_2__["IORegMapService"],
            _events_log_service__WEBPACK_IMPORTED_MODULE_4__["EventsLogService"]])
    ], MemoryService);
    return MemoryService;
}());



/***/ }),

/***/ "./src/app/registers-view/registers-view.component.html":
/*!**************************************************************!*\
  !*** ./src/app/registers-view/registers-view.component.html ***!
  \**************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "<div class=\"registers-container\">\n  <p-panel header=\"CPU Registers\" styleClass=\"registers-panel\">\n    <div class=\"registers-content\">\n      <div class=\"register-line\">\n        <div class=\"register\" (click)=\"toggleDisplayRegister(0)\">\n          <div class=\"register-name cursor-pointer\" title=\"General Purpose Register A\"><span>A</span></div>\n          <div class=\"source-code register-value-byte cursor-pointer\" [ngClass]=\"{ 'marker marker-a': displayA }\"><span>{{A.strValue}}</span></div>\n        </div>\n        <div class=\"register\" (click)=\"toggleDisplayRegister(1)\">\n          <div class=\"register-name cursor-pointer\" title=\"General Purpose Register B\"><span>B </span></div>\n          <div class=\"source-code register-value-byte cursor-pointer\" [ngClass]=\"{ 'marker marker-b': displayB }\"><span>{{B.strValue}}</span></div>\n        </div>\n        <div class=\"register\" (click)=\"toggleDisplayRegister(2)\">\n          <div class=\"register-name cursor-pointer\" title=\"General Purpose Register C\"><span>C </span></div>\n          <div class=\"source-code register-value-byte cursor-pointer\" [ngClass]=\"{ 'marker marker-c': displayC }\"><span>{{C.strValue}}</span></div>\n        </div>\n        <div class=\"register\" (click)=\"toggleDisplayRegister(3)\">\n          <div class=\"register-name cursor-pointer\" title=\"General Purpose Register D\"><span>D </span></div>\n          <div class=\"source-code register-value-byte cursor-pointer\" [ngClass]=\"{ 'marker marker-d': displayD }\"><span>{{D.strValue}}</span></div>\n        </div>\n      </div>\n      <div class=\"register-line\" style=\"float: left; width: 169px\">\n        <div class=\"register\" style=\"margin-right: 5px\">\n          <div class=\"register-name\" title=\"Instruction Pointer Register\"><span>IP </span></div>\n          <div class=\"source-code register-value-byte marker marker-ip\"><span>{{IP.strValue}}</span></div>\n        </div>\n        <div class=\"register sp-register\" style=\"margin-right:0\">\n          <div class=\"register-name sp-register-name\" [ngClass]=\"{'text-muted': !isSupervisorMode()}\" title=\"Supervisor Stack Pointer Register\"><span>SP </span></div>\n          <div class=\"source-code register-value-byte\" [ngClass]=\"{'marker marker-ssp': isSupervisorMode(), 'text-muted': !isSupervisorMode()}\">{{SSP.strValue}}</div>\n        </div>\n        <div class=\"register sp-register\" style=\"margin-left:80px; margin-right: 0; margin-top: 4px; visibility: hidden;\">\n          <div class=\"register-name sp-register-name\" [ngClass]=\"{'text-muted': isSupervisorMode()}\" title=\"User Stack Pointer Register\"><span>USP </span></div>\n          <div class=\"source-code register-value-byte\" [ngClass]=\"{'marker marker-usp': !isSupervisorMode(), 'text-muted': isSupervisorMode()}\"><span>{{USP.strValue}}</span></div>\n        </div>\n      </div>\n      <div class=\"register-line\" style=\"height: 45px; display: inline-block\">\n        <div class=\"status-register\">\n          <div class=\"register-name\" style=\"padding-left:8px;padding-right:5px;padding-bottom:26px;margin-right:6px;width:34px\" title=\"Status Register\"><span>SR </span></div>\n          <div class=\"source-code status-register-bit\">\n            <div class=\"status-register-bit-label\" style=\"font-weight:700;\" title=\"Supervisor Mode Bit\"><small class=\"very-small\">S </small></div>\n            <div class=\"status-register-bit-value\"><span>{{SR.bitField[15]}}</span></div>\n          </div>\n          <div class=\"source-code status-register-bit\">\n            <div class=\"status-register-bit-label\"><small class=\"very-small\">-</small></div>\n            <div class=\"status-register-bit-value\"><span>0</span></div>\n          </div>\n          <div class=\"source-code status-register-bit\">\n            <div class=\"status-register-bit-label\"><small class=\"very-small\">-</small></div>\n            <div class=\"status-register-bit-value\"><span>0</span></div>\n          </div>\n          <div class=\"source-code status-register-bit\">\n            <div class=\"status-register-bit-label\"><small class=\"very-small\">-</small></div>\n            <div class=\"status-register-bit-value\"><span>0</span></div>\n          </div>\n          <div class=\"source-code status-register-bit\">\n            <div class=\"status-register-bit-label\"><small class=\"very-small\">-</small></div>\n            <div class=\"status-register-bit-value\"><span>0</span></div>\n          </div>\n          <div class=\"source-code status-register-bit\">\n            <div class=\"status-register-bit-label\"><small class=\"very-small\">-</small></div>\n            <div class=\"status-register-bit-value\"><span>0</span></div>\n          </div>\n          <div class=\"source-code status-register-bit\">\n            <div class=\"status-register-bit-label\"><small class=\"very-small\">-</small></div>\n            <div class=\"status-register-bit-value\"><span>0</span></div>\n          </div>\n          <div class=\"source-code status-register-bit\">\n            <div class=\"status-register-bit-label\"><small class=\"very-small\">-</small></div>\n            <div class=\"status-register-bit-value\"><span>0</span></div>\n          </div>\n          <div class=\"source-code status-register-bit\">\n            <div class=\"status-register-bit-label\"><small class=\"very-small\">-</small></div>\n            <div class=\"status-register-bit-value\"><span>0</span></div>\n          </div>\n          <div class=\"source-code status-register-bit\">\n            <div class=\"status-register-bit-label\"><small class=\"very-small\">-</small></div>\n            <div class=\"status-register-bit-value\"><span>0</span></div>\n          </div>\n          <div class=\"source-code status-register-bit\">\n            <div class=\"status-register-bit-label\"><small class=\"very-small\">- </small></div>\n            <div class=\"status-register-bit-value\"><span>0</span></div>\n          </div>\n          <div class=\"source-code status-register-bit\">\n            <div class=\"status-register-bit-label\" style=\"font-weight:700;\" title=\"Interrupt Mask Bit\"><small class=\"very-small\">M </small></div>\n            <div class=\"status-register-bit-value\"><span>{{SR.bitField[4]}}</span></div>\n          </div>\n          <div class=\"source-code status-register-bit\">\n            <div class=\"status-register-bit-label\" style=\"font-weight:700;\" title=\"Carry Flag Bit\"><small class=\"very-small\">C </small></div>\n            <div class=\"status-register-bit-value\"><span>{{SR.bitField[3]}}</span></div>\n          </div>\n          <div class=\"source-code status-register-bit\">\n            <div class=\"status-register-bit-label\" style=\"font-weight:700;\" title=\"Zero Flag Bit\"><small class=\"very-small\">Z </small></div>\n            <div class=\"status-register-bit-value\"><span>{{SR.bitField[2]}}</span></div>\n          </div>\n          <div class=\"source-code status-register-bit\">\n            <div class=\"status-register-bit-label\" style=\"font-weight:700;\" title=\"Fault Flag Bit\"><small class=\"very-small\">F </small></div>\n            <div class=\"status-register-bit-value\"><span>{{SR.bitField[1]}}</span></div>\n          </div>\n          <div class=\"source-code status-register-bit\">\n            <div class=\"status-register-bit-label\" style=\"font-weight:700;\" title=\"CPU Halt Bit\"><small class=\"very-small\">H </small></div>\n            <div class=\"status-register-bit-value\"><span>{{SR.bitField[0]}}</span></div>\n          </div>\n        </div>\n      </div>\n    </div>\n  </p-panel>\n</div>\n"

/***/ }),

/***/ "./src/app/registers-view/registers-view.component.ts":
/*!************************************************************!*\
  !*** ./src/app/registers-view/registers-view.component.ts ***!
  \************************************************************/
/*! exports provided: RegistersViewComponent */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "RegistersViewComponent", function() { return RegistersViewComponent; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var _utils__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../utils */ "./src/app/utils.ts");
/* harmony import */ var _cpu_service__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../cpu.service */ "./src/app/cpu.service.ts");
/* harmony import */ var _cpuregs__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../cpuregs */ "./src/app/cpuregs.ts");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};




var CPURegisterView = /** @class */ (function () {
    function CPURegisterView(name, initialValue, description) {
        if (initialValue === void 0) { initialValue = 0; }
        this.bitField = new Array(16);
        this.name = name;
        this.description = description;
        this._value = initialValue;
        this._strValue = _utils__WEBPACK_IMPORTED_MODULE_1__["Utils"].pad(initialValue, 16, 4);
        for (var i = 0; i < 16; i++) {
            if ((initialValue & (1 << i)) === (1 << i)) {
                this.bitField[i] = 1;
            }
            else {
                this.bitField[i] = 0;
            }
        }
    }
    Object.defineProperty(CPURegisterView.prototype, "value", {
        get: function () {
            return this._value;
        },
        set: function (newValue) {
            this._strValue = _utils__WEBPACK_IMPORTED_MODULE_1__["Utils"].pad(newValue, 16, 4);
            this._value = newValue;
            for (var i = 0; i < 16; i++) {
                if ((newValue & (1 << i)) === (1 << i)) {
                    this.bitField[i] = 1;
                }
                else {
                    this.bitField[i] = 0;
                }
            }
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CPURegisterView.prototype, "strValue", {
        get: function () {
            return this._strValue;
        },
        enumerable: true,
        configurable: true
    });
    return CPURegisterView;
}());
var RegistersViewComponent = /** @class */ (function () {
    function RegistersViewComponent(cpuService) {
        var _this = this;
        this.cpuService = cpuService;
        this.displayA = false;
        this.displayB = false;
        this.displayC = false;
        this.displayD = false;
        this.onRegisterClick = new _angular_core__WEBPACK_IMPORTED_MODULE_0__["EventEmitter"]();
        this.registersMap = new Map();
        var registerBank = this.cpuService.getRegistersBank();
        var register = registerBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_3__["CPURegisterIndex"].A);
        this.A = new CPURegisterView(register.name, register.value, register.description);
        this.registersMap.set(_cpuregs__WEBPACK_IMPORTED_MODULE_3__["CPURegisterIndex"].A, this.A);
        this.registersMap.set(_cpuregs__WEBPACK_IMPORTED_MODULE_3__["CPURegisterIndex"].AH, this.A);
        this.registersMap.set(_cpuregs__WEBPACK_IMPORTED_MODULE_3__["CPURegisterIndex"].AL, this.A);
        register = registerBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_3__["CPURegisterIndex"].B);
        this.B = new CPURegisterView(register.name, register.value, register.description);
        this.registersMap.set(_cpuregs__WEBPACK_IMPORTED_MODULE_3__["CPURegisterIndex"].B, this.B);
        this.registersMap.set(_cpuregs__WEBPACK_IMPORTED_MODULE_3__["CPURegisterIndex"].BH, this.B);
        this.registersMap.set(_cpuregs__WEBPACK_IMPORTED_MODULE_3__["CPURegisterIndex"].BL, this.B);
        register = registerBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_3__["CPURegisterIndex"].C);
        this.C = new CPURegisterView(register.name, register.value, register.description);
        this.registersMap.set(_cpuregs__WEBPACK_IMPORTED_MODULE_3__["CPURegisterIndex"].C, this.C);
        this.registersMap.set(_cpuregs__WEBPACK_IMPORTED_MODULE_3__["CPURegisterIndex"].CH, this.C);
        this.registersMap.set(_cpuregs__WEBPACK_IMPORTED_MODULE_3__["CPURegisterIndex"].CL, this.C);
        register = registerBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_3__["CPURegisterIndex"].D);
        this.D = new CPURegisterView(register.name, register.value, register.description);
        this.registersMap.set(_cpuregs__WEBPACK_IMPORTED_MODULE_3__["CPURegisterIndex"].D, this.D);
        this.registersMap.set(_cpuregs__WEBPACK_IMPORTED_MODULE_3__["CPURegisterIndex"].DH, this.D);
        this.registersMap.set(_cpuregs__WEBPACK_IMPORTED_MODULE_3__["CPURegisterIndex"].DL, this.D);
        register = registerBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_3__["CPURegisterIndex"].IP);
        this.IP = new CPURegisterView(register.name, register.value, register.description);
        this.registersMap.set(_cpuregs__WEBPACK_IMPORTED_MODULE_3__["CPURegisterIndex"].IP, this.IP);
        register = registerBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_3__["CPURegisterIndex"].SSP);
        this.SSP = new CPURegisterView(register.name, register.value, register.description);
        this.registersMap.set(_cpuregs__WEBPACK_IMPORTED_MODULE_3__["CPURegisterIndex"].SSP, this.SSP);
        register = registerBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_3__["CPURegisterIndex"].USP);
        this.USP = new CPURegisterView(register.name, register.value, register.description);
        this.registersMap.set(_cpuregs__WEBPACK_IMPORTED_MODULE_3__["CPURegisterIndex"].USP, this.USP);
        register = registerBank.get(_cpuregs__WEBPACK_IMPORTED_MODULE_3__["CPURegisterIndex"].SR);
        this.SR = new CPURegisterView(register.name, register.value, register.description);
        this.registersMap.set(_cpuregs__WEBPACK_IMPORTED_MODULE_3__["CPURegisterIndex"].SR, this.SR);
        this.cpuRegisterOperationSubscription = this.cpuService.cpuRegisterOperation$.subscribe(function (cpuRegisterOperation) { return _this.processCPURegisterOperation(cpuRegisterOperation); });
    }
    RegistersViewComponent.prototype.ngOnInit = function () {
    };
    RegistersViewComponent.prototype.ngOnDestroy = function () {
        this.cpuRegisterOperationSubscription.unsubscribe();
    };
    RegistersViewComponent.prototype.isSupervisorMode = function () {
        return ((this.SR.value & 0x8000) !== 0);
    };
    RegistersViewComponent.prototype.operationWriteRegister = function (index, value) {
        var registerView = this.registersMap.get(index);
        switch (index) {
            case _cpuregs__WEBPACK_IMPORTED_MODULE_3__["CPURegisterIndex"].AH:
            case _cpuregs__WEBPACK_IMPORTED_MODULE_3__["CPURegisterIndex"].BH:
            case _cpuregs__WEBPACK_IMPORTED_MODULE_3__["CPURegisterIndex"].CH:
            case _cpuregs__WEBPACK_IMPORTED_MODULE_3__["CPURegisterIndex"].DH:
                registerView.value = (registerView.value & 0x00FF) + (value << 8);
                break;
            case _cpuregs__WEBPACK_IMPORTED_MODULE_3__["CPURegisterIndex"].AL:
            case _cpuregs__WEBPACK_IMPORTED_MODULE_3__["CPURegisterIndex"].BL:
            case _cpuregs__WEBPACK_IMPORTED_MODULE_3__["CPURegisterIndex"].CL:
            case _cpuregs__WEBPACK_IMPORTED_MODULE_3__["CPURegisterIndex"].DL:
                registerView.value = (registerView.value & 0xFF00) + value;
                break;
            default:
                registerView.value = value;
                break;
        }
    };
    RegistersViewComponent.prototype.operationWriteBit = function (index, bitNumber, value) {
        var registerView = this.registersMap.get(index);
        if (value === 0) {
            registerView.value &= ~(1 << bitNumber);
        }
        else {
            registerView.value |= (1 << bitNumber);
        }
    };
    RegistersViewComponent.prototype.processCPURegisterOperation = function (cpuRegisterOperation) {
        switch (cpuRegisterOperation.operationType) {
            case _cpuregs__WEBPACK_IMPORTED_MODULE_3__["CPURegisterOperationType"].WRITE:
                this.operationWriteRegister(cpuRegisterOperation.data.index, cpuRegisterOperation.data.value);
                break;
            case _cpuregs__WEBPACK_IMPORTED_MODULE_3__["CPURegisterOperationType"].WRITE_BIT:
                this.operationWriteBit(cpuRegisterOperation.data.index, cpuRegisterOperation.data.bitNumber, cpuRegisterOperation.data.value);
                break;
            default:
                break;
        }
    };
    RegistersViewComponent.prototype.toggleDisplayRegister = function (registerIndex) {
        switch (registerIndex) {
            case _cpuregs__WEBPACK_IMPORTED_MODULE_3__["CPURegisterIndex"].A:
                this.displayA = !this.displayA;
                this.onRegisterClick.next(_cpuregs__WEBPACK_IMPORTED_MODULE_3__["CPURegisterIndex"].A);
                break;
            case _cpuregs__WEBPACK_IMPORTED_MODULE_3__["CPURegisterIndex"].B:
                this.displayB = !this.displayB;
                this.onRegisterClick.next(_cpuregs__WEBPACK_IMPORTED_MODULE_3__["CPURegisterIndex"].B);
                break;
            case _cpuregs__WEBPACK_IMPORTED_MODULE_3__["CPURegisterIndex"].C:
                this.displayC = !this.displayC;
                this.onRegisterClick.next(_cpuregs__WEBPACK_IMPORTED_MODULE_3__["CPURegisterIndex"].C);
                break;
            case _cpuregs__WEBPACK_IMPORTED_MODULE_3__["CPURegisterIndex"].D:
                this.displayD = !this.displayD;
                this.onRegisterClick.next(_cpuregs__WEBPACK_IMPORTED_MODULE_3__["CPURegisterIndex"].D);
                break;
        }
    };
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Output"])(),
        __metadata("design:type", Object)
    ], RegistersViewComponent.prototype, "onRegisterClick", void 0);
    RegistersViewComponent = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"])({
            selector: 'app-registers-view',
            template: __webpack_require__(/*! ./registers-view.component.html */ "./src/app/registers-view/registers-view.component.html")
        }),
        __metadata("design:paramtypes", [_cpu_service__WEBPACK_IMPORTED_MODULE_2__["CPUService"]])
    ], RegistersViewComponent);
    return RegistersViewComponent;
}());



/***/ }),

/***/ "./src/app/textual-display/textual-display.component.html":
/*!****************************************************************!*\
  !*** ./src/app/textual-display/textual-display.component.html ***!
  \****************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "<div class=\"source-code output-display\">\n  <div *ngFor=\"let i of textCellViews\" class=\"output-char\"><span>{{i.strValue}}</span></div>\n</div>\n"

/***/ }),

/***/ "./src/app/textual-display/textual-display.component.ts":
/*!**************************************************************!*\
  !*** ./src/app/textual-display/textual-display.component.ts ***!
  \**************************************************************/
/*! exports provided: TextualDisplayOperationType, TextualDisplayOperation, TextualDisplayComponent */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "TextualDisplayOperationType", function() { return TextualDisplayOperationType; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "TextualDisplayOperation", function() { return TextualDisplayOperation; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "TextualDisplayComponent", function() { return TextualDisplayComponent; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var rxjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! rxjs */ "./node_modules/rxjs/_esm5/index.js");
/* harmony import */ var _memory_service__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../memory.service */ "./src/app/memory.service.ts");
/* harmony import */ var _utils__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../utils */ "./src/app/utils.ts");
/* harmony import */ var _events_log_service__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../events-log.service */ "./src/app/events-log.service.ts");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};





function getStrValue(value) {
    var character = String.fromCharCode(value);
    if (character.trim() === '') {
        return '\u00A0\u00A0';
    }
    else {
        return character;
    }
}
var TextCellView = /** @class */ (function () {
    function TextCellView(address, initialValue) {
        if (initialValue === void 0) { initialValue = 0; }
        this._value = initialValue;
        this._strValue = String.fromCharCode(initialValue);
        this.address = address;
    }
    Object.defineProperty(TextCellView.prototype, "value", {
        get: function () {
            return this._value;
        },
        set: function (newValue) {
            this._value = newValue;
            this._strValue = getStrValue(newValue);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TextCellView.prototype, "strValue", {
        get: function () {
            return this._strValue;
        },
        enumerable: true,
        configurable: true
    });
    return TextCellView;
}());
var TextualDisplayOperationType;
(function (TextualDisplayOperationType) {
    TextualDisplayOperationType[TextualDisplayOperationType["RESET"] = 0] = "RESET";
    TextualDisplayOperationType[TextualDisplayOperationType["WRITE_CHAR"] = 1] = "WRITE_CHAR";
})(TextualDisplayOperationType || (TextualDisplayOperationType = {}));
var TextualDisplayOperationState;
(function (TextualDisplayOperationState) {
    TextualDisplayOperationState[TextualDisplayOperationState["IN_PROGRESS"] = 0] = "IN_PROGRESS";
    TextualDisplayOperationState[TextualDisplayOperationState["FINISHED"] = 1] = "FINISHED";
})(TextualDisplayOperationState || (TextualDisplayOperationState = {}));
var TextualDisplayOperation = /** @class */ (function () {
    function TextualDisplayOperation(operationType, data, state) {
        this.operationType = operationType;
        this.data = data;
        this.state = state;
    }
    TextualDisplayOperation.prototype.toString = function () {
        var ret;
        switch (this.operationType) {
            case TextualDisplayOperationType.RESET:
                ret = "TDPL: Reset textual display";
                break;
            case TextualDisplayOperationType.WRITE_CHAR:
                ret = "TDPL: Write character " + this.data.value + ": '" + this.data.strValue + "' into cell [" + _utils__WEBPACK_IMPORTED_MODULE_3__["Utils"].pad(this.data.cell, 16, 2) + "]";
                break;
            default:
                break;
        }
        return ret;
    };
    return TextualDisplayOperation;
}());

var TextualDisplayComponent = /** @class */ (function () {
    function TextualDisplayComponent(memoryService, eventsLogService) {
        var _this = this;
        this.memoryService = memoryService;
        this.eventsLogService = eventsLogService;
        this.textCellViews = new Array(32);
        this.textualDisplayOperationSource = new rxjs__WEBPACK_IMPORTED_MODULE_1__["Subject"]();
        for (var i = 0; i < 32; i++) {
            this.textCellViews[i] = new TextCellView(i, 0);
        }
        this.memoryService.addMemoryRegion('TextualDisplayRegion', 0xEE0, 0xEFF, undefined, function (op) { return _this.processMemoryOperation(op); });
        this.textualDisplayOperationSource$ = this.textualDisplayOperationSource.asObservable();
        this.textualDisplayOperationSource$.subscribe(function (textualDisplayOperation) { return _this.processTextualDisplayOperation(textualDisplayOperation); });
    }
    TextualDisplayComponent.prototype.publishTextualDisplayOperation = function (operation) {
        this.eventsLogService.log(operation);
        this.textualDisplayOperationSource.next(operation);
    };
    TextualDisplayComponent.prototype.fillCharacter = function (index, value) {
        this.textCellViews[index].value = value;
    };
    TextualDisplayComponent.prototype.operationStoreByte = function (address, value) {
        var parameters = {
            cell: address - 0xEE0,
            value: value,
            strValue: getStrValue(value)
        };
        this.publishTextualDisplayOperation(new TextualDisplayOperation(TextualDisplayOperationType.WRITE_CHAR, parameters));
    };
    TextualDisplayComponent.prototype.operationStoreWord = function (address, value) {
        var msb = (value & 0xFF00) >>> 8;
        var lsb = (value & 0x00FF);
        var parameters = {
            cell: address - 0xEE0,
            value: msb,
            strValue: getStrValue(msb)
        };
        this.publishTextualDisplayOperation(new TextualDisplayOperation(TextualDisplayOperationType.WRITE_CHAR, parameters));
        if ((address + 1) <= 0xEFF) {
            parameters.cell = address - 0xEE0 + 1;
            parameters.value = lsb;
            parameters.strValue = getStrValue(lsb);
            this.publishTextualDisplayOperation(new TextualDisplayOperation(TextualDisplayOperationType.WRITE_CHAR, parameters));
        }
    };
    TextualDisplayComponent.prototype.processTextualDisplayOperation = function (textualDisplayOperation) {
        switch (textualDisplayOperation.operationType) {
            case TextualDisplayOperationType.WRITE_CHAR:
                var params = textualDisplayOperation.data;
                this.fillCharacter(params.cell, params.value);
                break;
            default:
                break;
        }
    };
    TextualDisplayComponent.prototype.processMemoryOperation = function (memoryOperation) {
        switch (memoryOperation.operationType) {
            case _memory_service__WEBPACK_IMPORTED_MODULE_2__["MemoryOperationType"].STORE_BYTE:
                this.operationStoreByte(memoryOperation.data.address, memoryOperation.data.value);
                break;
            case _memory_service__WEBPACK_IMPORTED_MODULE_2__["MemoryOperationType"].STORE_WORD:
                this.operationStoreWord(memoryOperation.data.address, memoryOperation.data.value);
                break;
            default:
                break;
        }
    };
    TextualDisplayComponent.prototype.reset = function () {
        this.publishTextualDisplayOperation(new TextualDisplayOperation(TextualDisplayOperationType.RESET));
        for (var i = 0; i < this.textCellViews.length; i++) {
            this.textCellViews[i].value = 0;
        }
        this.memoryService.storeBytes(0xEE0, 32);
    };
    TextualDisplayComponent = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"])({
            selector: 'app-textual-display',
            template: __webpack_require__(/*! ./textual-display.component.html */ "./src/app/textual-display/textual-display.component.html")
        }),
        __metadata("design:paramtypes", [_memory_service__WEBPACK_IMPORTED_MODULE_2__["MemoryService"],
            _events_log_service__WEBPACK_IMPORTED_MODULE_4__["EventsLogService"]])
    ], TextualDisplayComponent);
    return TextualDisplayComponent;
}());



/***/ }),

/***/ "./src/app/timer.service.ts":
/*!**********************************!*\
  !*** ./src/app/timer.service.ts ***!
  \**********************************/
/*! exports provided: TimerOperationType, TimerOperation, TimerService */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "TimerOperationType", function() { return TimerOperationType; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "TimerOperation", function() { return TimerOperation; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "TimerService", function() { return TimerService; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var _irqctrl_service__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./irqctrl.service */ "./src/app/irqctrl.service.ts");
/* harmony import */ var _ioregmap_service__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./ioregmap.service */ "./src/app/ioregmap.service.ts");
/* harmony import */ var rxjs__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! rxjs */ "./node_modules/rxjs/_esm5/index.js");
/* harmony import */ var _clock_service__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./clock.service */ "./src/app/clock.service.ts");
/* harmony import */ var _utils__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./utils */ "./src/app/utils.ts");
/* harmony import */ var _events_log_service__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./events-log.service */ "./src/app/events-log.service.ts");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};







var TMRPRELOAD_REGISTER_ADDRESS = 3;
var TMRCOUNTER_REGISTER_ADDRESS = 4;
var TimerState;
(function (TimerState) {
    TimerState[TimerState["RESET"] = 0] = "RESET";
    TimerState[TimerState["PRELOAD"] = 1] = "PRELOAD";
    TimerState[TimerState["RUNNING"] = 2] = "RUNNING";
    TimerState[TimerState["DEPLETED"] = 3] = "DEPLETED";
})(TimerState || (TimerState = {}));
var TimerOperationType;
(function (TimerOperationType) {
    TimerOperationType[TimerOperationType["RESET"] = 0] = "RESET";
    TimerOperationType[TimerOperationType["TIMER_PRELOAD"] = 1] = "TIMER_PRELOAD";
    TimerOperationType[TimerOperationType["TIMER_COUNTDOWN"] = 2] = "TIMER_COUNTDOWN";
    TimerOperationType[TimerOperationType["TIMER_DEPLETED"] = 3] = "TIMER_DEPLETED";
})(TimerOperationType || (TimerOperationType = {}));
var TimerOperationState;
(function (TimerOperationState) {
    TimerOperationState[TimerOperationState["IN_PROGRESS"] = 0] = "IN_PROGRESS";
    TimerOperationState[TimerOperationState["FINISHED"] = 1] = "FINISHED";
})(TimerOperationState || (TimerOperationState = {}));
var TimerOperation = /** @class */ (function () {
    function TimerOperation(operationType, data, state) {
        this.operationType = operationType;
        this.data = data;
        this.state = state;
    }
    TimerOperation.prototype.toString = function () {
        var ret;
        switch (this.operationType) {
            case TimerOperationType.RESET:
                ret = "TMR: Reset timer unit";
                break;
            case TimerOperationType.TIMER_PRELOAD:
                ret = "TMR: Timer preload with value 0x" + _utils__WEBPACK_IMPORTED_MODULE_5__["Utils"].pad(this.data.value, 16, 4);
                break;
            case TimerOperationType.TIMER_COUNTDOWN:
                ret = "TMR: Timer countdown -> 0x" + _utils__WEBPACK_IMPORTED_MODULE_5__["Utils"].pad(this.data.value, 16, 4);
                break;
            case TimerOperationType.TIMER_DEPLETED:
                ret = "TMR: Timer depleted";
                break;
            default:
                break;
        }
        return ret;
    };
    return TimerOperation;
}());

var TimerService = /** @class */ (function () {
    function TimerService(ioRegMapService, irqCtrlService, clockService, eventsLogService) {
        var _this = this;
        this.ioRegMapService = ioRegMapService;
        this.irqCtrlService = irqCtrlService;
        this.clockService = clockService;
        this.eventsLogService = eventsLogService;
        this.state = TimerState.RESET;
        this.timerPreloadRegister = 0; // TMRPRELD register (address: 0x0005)
        this.timerCounterRegister = 0; // TMRCTR register (address: 0x0006)
        this.timerOperationSource = new rxjs__WEBPACK_IMPORTED_MODULE_3__["Subject"]();
        ioRegMapService.addRegister('TMRPRELOAD', TMRPRELOAD_REGISTER_ADDRESS, 0, _ioregmap_service__WEBPACK_IMPORTED_MODULE_2__["IORegisterType"].READ_WRITE, function (op) { return _this.processRegisterOperation(op); }, 'Timer Preload Register');
        ioRegMapService.addRegister('TMRCOUNTER', TMRCOUNTER_REGISTER_ADDRESS, 0, _ioregmap_service__WEBPACK_IMPORTED_MODULE_2__["IORegisterType"].READ_ONLY, function (op) { return _this.processRegisterOperation(op); }, 'Timer counter Register');
        this.timerOperation$ = this.timerOperationSource.asObservable();
        this.clockConsumeTicksSubscription = this.clockService.clockConsumeTicks$.subscribe(function (ticks) { return _this.processClockConsumeTicks(ticks); });
    }
    TimerService.prototype.publishTimerOperation = function (operation, flushGroups) {
        if (flushGroups === void 0) { flushGroups = false; }
        this.eventsLogService.log(operation, flushGroups);
        this.timerOperationSource.next(operation);
    };
    TimerService.prototype.publishTimerOperationStart = function (operation) {
        operation.state = TimerOperationState.IN_PROGRESS;
        this.eventsLogService.startEventGroup(operation);
        this.timerOperationSource.next(operation);
    };
    TimerService.prototype.publishTimerOperationEnd = function (operation) {
        operation.state = TimerOperationState.FINISHED;
        this.eventsLogService.endEventGroup(operation);
        this.timerOperationSource.next(operation);
    };
    TimerService.prototype.processWriteOperation = function (address, value) {
        switch (address) {
            case TMRPRELOAD_REGISTER_ADDRESS:
                this.timerPreloadRegister = value;
                this.timerCounterRegister = value;
                this.state = TimerState.PRELOAD;
                var operation = new TimerOperation(TimerOperationType.TIMER_PRELOAD, { value: value });
                this.publishTimerOperationStart(operation);
                this.ioRegMapService.store(TMRCOUNTER_REGISTER_ADDRESS, value, false, false);
                this.publishTimerOperationEnd(operation);
                break;
            case TMRCOUNTER_REGISTER_ADDRESS:
                break;
        }
    };
    TimerService.prototype.processRegisterOperation = function (ioRegisterOperation) {
        switch (ioRegisterOperation.operationType) {
            case _ioregmap_service__WEBPACK_IMPORTED_MODULE_2__["IORegisterOperationType"].READ:
                break;
            case _ioregmap_service__WEBPACK_IMPORTED_MODULE_2__["IORegisterOperationType"].WRITE:
                this.processWriteOperation(ioRegisterOperation.data.address, ioRegisterOperation.data.value);
                break;
        }
    };
    TimerService.prototype.processClockConsumeTicks = function (ticks) {
        var operation;
        switch (this.state) {
            case TimerState.RESET:
                break;
            case TimerState.PRELOAD:
                this.state = TimerState.RUNNING;
                break;
            case TimerState.RUNNING:
                this.timerCounterRegister -= ticks;
                operation = new TimerOperation(TimerOperationType.TIMER_COUNTDOWN, { value: this.timerCounterRegister });
                this.publishTimerOperationStart(operation);
                this.ioRegMapService.store(TMRCOUNTER_REGISTER_ADDRESS, this.timerCounterRegister, false, false);
                this.publishTimerOperationEnd(operation);
                if (this.timerCounterRegister === 0) {
                    this.state = TimerState.DEPLETED;
                    this.publishTimerOperation(new TimerOperation(TimerOperationType.TIMER_DEPLETED));
                    this.irqCtrlService.triggerHardwareInterrupt(1);
                }
                break;
            case TimerState.DEPLETED:
                this.timerCounterRegister = this.timerPreloadRegister;
                operation = new TimerOperation(TimerOperationType.TIMER_PRELOAD, { value: this.timerPreloadRegister });
                this.publishTimerOperationStart(operation);
                this.ioRegMapService.store(TMRCOUNTER_REGISTER_ADDRESS, this.timerCounterRegister, false, false);
                this.publishTimerOperationEnd(operation);
                this.state = TimerState.RUNNING;
                break;
        }
    };
    TimerService.prototype.reset = function () {
        var operation = new TimerOperation(TimerOperationType.RESET);
        this.publishTimerOperationStart(operation);
        this.state = TimerState.RESET;
        this.timerPreloadRegister = 0;
        this.timerCounterRegister = 0;
        this.ioRegMapService.store(TMRPRELOAD_REGISTER_ADDRESS, 0, false, false);
        this.ioRegMapService.store(TMRCOUNTER_REGISTER_ADDRESS, 0, false, false);
        this.publishTimerOperationEnd(operation);
    };
    TimerService = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Injectable"])(),
        __metadata("design:paramtypes", [_ioregmap_service__WEBPACK_IMPORTED_MODULE_2__["IORegMapService"],
            _irqctrl_service__WEBPACK_IMPORTED_MODULE_1__["IrqCtrlService"],
            _clock_service__WEBPACK_IMPORTED_MODULE_4__["ClockService"],
            _events_log_service__WEBPACK_IMPORTED_MODULE_6__["EventsLogService"]])
    ], TimerService);
    return TimerService;
}());



/***/ }),

/***/ "./src/app/utils.ts":
/*!**************************!*\
  !*** ./src/app/utils.ts ***!
  \**************************/
/*! exports provided: Utils */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "Utils", function() { return Utils; });
var Utils = /** @class */ (function () {
    function Utils() {
    }
    Utils.pad = function (n, radix, width, zeroChar) {
        if (zeroChar === void 0) { zeroChar = '0'; }
        var num = n.toString(radix).toUpperCase();
        return num.length >= width ? num : new Array(width - num.length + 1).join(zeroChar) + num;
    };
    return Utils;
}());



/***/ }),

/***/ "./src/app/visual-display/visual-display.component.html":
/*!**************************************************************!*\
  !*** ./src/app/visual-display/visual-display.component.html ***!
  \**************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "<div class=\"visual-output\">\n  <canvas #display width=\"192px\" height=\"192px\" style=\"background-color: black;\"></canvas>\n</div>\n"

/***/ }),

/***/ "./src/app/visual-display/visual-display.component.ts":
/*!************************************************************!*\
  !*** ./src/app/visual-display/visual-display.component.ts ***!
  \************************************************************/
/*! exports provided: VisualDisplayOperationType, VisualDisplayOperation, VisualDisplayComponent */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "VisualDisplayOperationType", function() { return VisualDisplayOperationType; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "VisualDisplayOperation", function() { return VisualDisplayOperation; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "VisualDisplayComponent", function() { return VisualDisplayComponent; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var rxjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! rxjs */ "./node_modules/rxjs/_esm5/index.js");
/* harmony import */ var _memory_service__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../memory.service */ "./src/app/memory.service.ts");
/* harmony import */ var _utils__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../utils */ "./src/app/utils.ts");
/* harmony import */ var _events_log_service__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../events-log.service */ "./src/app/events-log.service.ts");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};





var COLOR_PALETTE = [
    '#000000', '#000055', '#0000AA', '#0000FF', '#002400', '#002455', '#0024AA', '#0024FF',
    '#004800', '#004855', '#0048AA', '#0048FF', '#006C00', '#006C55', '#006CAA', '#006CFF',
    '#009000', '#009055', '#0090AA', '#0090FF', '#00B400', '#00B455', '#00B4AA', '#00B4FF',
    '#00D800', '#00D855', '#00D8AA', '#00D8FF', '#00FC00', '#00FC55', '#00FCAA', '#00FCFF',
    '#240000', '#240055', '#2400AA', '#2400FF', '#242400', '#242455', '#2424AA', '#2424FF',
    '#244800', '#244855', '#2448AA', '#2448FF', '#246C00', '#246C55', '#246CAA', '#246CFF',
    '#249000', '#249055', '#2490AA', '#2490FF', '#24B400', '#24B455', '#24B4AA', '#24B4FF',
    '#24D800', '#24D855', '#24D8AA', '#24D8FF', '#24FC00', '#24FC55', '#24FCAA', '#24FCFF',
    '#480000', '#480055', '#4800AA', '#4800FF', '#482400', '#482455', '#4824AA', '#4824FF',
    '#484800', '#484855', '#4848AA', '#4848FF', '#486C00', '#486C55', '#486CAA', '#486CFF',
    '#489000', '#489055', '#4890AA', '#4890FF', '#48B400', '#48B455', '#48B4AA', '#48B4FF',
    '#48D800', '#48D855', '#48D8AA', '#48D8FF', '#48FC00', '#48FC55', '#48FCAA', '#48FCFF',
    '#6C0000', '#6C0055', '#6C00AA', '#6C00FF', '#6C2400', '#6C2455', '#6C24AA', '#6C24FF',
    '#6C4800', '#6C4855', '#6C48AA', '#6C48FF', '#6C6C00', '#6C6C55', '#6C6CAA', '#6C6CFF',
    '#6C9000', '#6C9055', '#6C90AA', '#6C90FF', '#6CB400', '#6CB455', '#6CB4AA', '#6CB4FF',
    '#6CD800', '#6CD855', '#6CD8AA', '#6CD8FF', '#6CFC00', '#6CFC55', '#6CFCAA', '#6CFCFF',
    '#900000', '#900055', '#9000AA', '#9000FF', '#902400', '#902455', '#9024AA', '#9024FF',
    '#904800', '#904855', '#9048AA', '#9048FF', '#906C00', '#906C55', '#906CAA', '#906CFF',
    '#909000', '#909055', '#9090AA', '#9090FF', '#90B400', '#90B455', '#90B4AA', '#90B4FF',
    '#90D800', '#90D855', '#90D8AA', '#90D8FF', '#90FC00', '#90FC55', '#90FCAA', '#90FCFF',
    '#B40000', '#B40055', '#B400AA', '#B400FF', '#B42400', '#B42455', '#B424AA', '#B424FF',
    '#B44800', '#B44855', '#B448AA', '#B448FF', '#B46C00', '#B46C55', '#B46CAA', '#B46CFF',
    '#B49000', '#B49055', '#B490AA', '#B490FF', '#B4B400', '#B4B455', '#B4B4AA', '#B4B4FF',
    '#B4D800', '#B4D855', '#B4D8AA', '#B4D8FF', '#B4FC00', '#B4FC55', '#B4FCAA', '#B4FCFF',
    '#D80000', '#D80055', '#D800AA', '#D800FF', '#D82400', '#D82455', '#D824AA', '#D824FF',
    '#D84800', '#D84855', '#D848AA', '#D848FF', '#D86C00', '#D86C55', '#D86CAA', '#D86CFF',
    '#D89000', '#D89055', '#D890AA', '#D890FF', '#D8B400', '#D8B455', '#D8B4AA', '#D8B4FF',
    '#D8D800', '#D8D855', '#D8D8AA', '#D8D8FF', '#D8FC00', '#D8FC55', '#D8FCAA', '#D8FCFF',
    '#FC0000', '#FC0055', '#FC00AA', '#FC00FF', '#FC2400', '#FC2455', '#FC24AA', '#FC24FF',
    '#FC4800', '#FC4855', '#FC48AA', '#FC48FF', '#FC6C00', '#FC6C55', '#FC6CAA', '#FC6CFF',
    '#FC9000', '#FC9055', '#FC90AA', '#FC90FF', '#FCB400', '#FCB455', '#FCB4AA', '#FCB4FF',
    '#FCD800', '#FCD855', '#FCD8AA', '#FCD8FF', '#FCFC00', '#FCFC55', '#FCFCAA', '#FFFFFF',
];
var RECTX = 12;
var RECTY = 12;
var VisualDisplayOperationType;
(function (VisualDisplayOperationType) {
    VisualDisplayOperationType[VisualDisplayOperationType["RESET"] = 0] = "RESET";
    VisualDisplayOperationType[VisualDisplayOperationType["WRITE_PIXEL"] = 1] = "WRITE_PIXEL";
})(VisualDisplayOperationType || (VisualDisplayOperationType = {}));
var VisualDisplayOperationState;
(function (VisualDisplayOperationState) {
    VisualDisplayOperationState[VisualDisplayOperationState["IN_PROGRESS"] = 0] = "IN_PROGRESS";
    VisualDisplayOperationState[VisualDisplayOperationState["FINISHED"] = 1] = "FINISHED";
})(VisualDisplayOperationState || (VisualDisplayOperationState = {}));
var VisualDisplayOperation = /** @class */ (function () {
    function VisualDisplayOperation(operationType, data, state) {
        this.operationType = operationType;
        this.data = data;
        this.state = state;
    }
    VisualDisplayOperation.prototype.toString = function () {
        var ret;
        switch (this.operationType) {
            case VisualDisplayOperationType.RESET:
                ret = "VDPL: Reset visual display";
                break;
            case VisualDisplayOperationType.WRITE_PIXEL:
                ret = "VDPL: Write pixel " + this.data.pixel + " (x: " + this.data.coordX + ", y: " + this.data.coordY + ") " +
                    ("with color 0x" + _utils__WEBPACK_IMPORTED_MODULE_3__["Utils"].pad(this.data.color, 16, 2));
                break;
            default:
                break;
        }
        return ret;
    };
    return VisualDisplayOperation;
}());

var VisualDisplayComponent = /** @class */ (function () {
    function VisualDisplayComponent(memoryService, eventsLogService) {
        var _this = this;
        this.memoryService = memoryService;
        this.eventsLogService = eventsLogService;
        this.visualDisplayOperationSource = new rxjs__WEBPACK_IMPORTED_MODULE_1__["Subject"]();
        this.initialValues = Array(256);
        for (var i = 0; i < 256; i++) {
            this.initialValues[i] = 0x00;
        }
        this.memoryService.addMemoryRegion('VisualDisplayRegion', 0xF00, 0xFFF, this.initialValues, function (op) { return _this.processMemoryOperation(op); });
        this.visualDisplayOperationSource$ = this.visualDisplayOperationSource.asObservable();
        this.visualDisplayOperationSource$.subscribe(function (visualDisplayOperation) { return _this.processVisualDisplayOperation(visualDisplayOperation); });
    }
    VisualDisplayComponent.prototype.publishVisualDisplayOperation = function (operation) {
        this.eventsLogService.log(operation);
        this.visualDisplayOperationSource.next(operation);
    };
    VisualDisplayComponent.prototype.operationStoreByte = function (address, value) {
        var offset = address - 0xF00;
        var x = offset % 16;
        var y = Math.floor(offset / 16);
        var parameters = {
            pixel: offset,
            coordX: x,
            coordY: y,
            color: value
        };
        this.publishVisualDisplayOperation(new VisualDisplayOperation(VisualDisplayOperationType.WRITE_PIXEL, parameters));
    };
    VisualDisplayComponent.prototype.operationStoreWord = function (address, value) {
        var offset = address - 0xF00;
        var msb = (value & 0xFF00) >>> 8;
        var lsb = (value & 0x00FF);
        var x = offset % 16;
        var y = Math.floor(offset / 16);
        var parameters = {
            pixel: offset,
            coordX: x,
            coordY: y,
            color: msb
        };
        this.publishVisualDisplayOperation(new VisualDisplayOperation(VisualDisplayOperationType.WRITE_PIXEL, parameters));
        if ((offset + 1) <= 255) {
            x = (offset + 1) % 16;
            y = Math.floor((offset + 1) / 16);
            parameters.pixel = offset + 1;
            parameters.coordX = x;
            parameters.coordY = y;
            parameters.color = lsb;
            this.publishVisualDisplayOperation(new VisualDisplayOperation(VisualDisplayOperationType.WRITE_PIXEL, parameters));
        }
    };
    VisualDisplayComponent.prototype.reset = function () {
        this.publishVisualDisplayOperation(new VisualDisplayOperation(VisualDisplayOperationType.RESET));
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.memoryService.storeBytes(0xF00, 256, this.initialValues);
    };
    VisualDisplayComponent.prototype.processVisualDisplayOperation = function (visualDisplayOperation) {
        switch (visualDisplayOperation.operationType) {
            case VisualDisplayOperationType.WRITE_PIXEL:
                var params = visualDisplayOperation.data;
                this.fillRect(params.coordX, params.coordY, params.color);
                break;
            default:
                break;
        }
    };
    VisualDisplayComponent.prototype.processMemoryOperation = function (memoryOperation) {
        switch (memoryOperation.operationType) {
            case _memory_service__WEBPACK_IMPORTED_MODULE_2__["MemoryOperationType"].STORE_BYTE:
                this.operationStoreByte(memoryOperation.data.address, memoryOperation.data.value);
                break;
            case _memory_service__WEBPACK_IMPORTED_MODULE_2__["MemoryOperationType"].STORE_WORD:
                this.operationStoreWord(memoryOperation.data.address, memoryOperation.data.value);
                break;
            default:
                break;
        }
    };
    VisualDisplayComponent.prototype.fillRect = function (x, y, color) {
        this.context.fillStyle = COLOR_PALETTE[color];
        this.context.fillRect(x * RECTX, y * RECTY, RECTX, RECTY);
    };
    VisualDisplayComponent.prototype.ngAfterViewInit = function () {
        this.canvas = this.display.nativeElement;
        this.context = this.canvas.getContext('2d');
    };
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["ViewChild"])('display'),
        __metadata("design:type", _angular_core__WEBPACK_IMPORTED_MODULE_0__["ElementRef"])
    ], VisualDisplayComponent.prototype, "display", void 0);
    VisualDisplayComponent = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"])({
            selector: 'app-visual-display',
            template: __webpack_require__(/*! ./visual-display.component.html */ "./src/app/visual-display/visual-display.component.html")
        }),
        __metadata("design:paramtypes", [_memory_service__WEBPACK_IMPORTED_MODULE_2__["MemoryService"],
            _events_log_service__WEBPACK_IMPORTED_MODULE_4__["EventsLogService"]])
    ], VisualDisplayComponent);
    return VisualDisplayComponent;
}());



/***/ }),

/***/ "./src/environments/environment.ts":
/*!*****************************************!*\
  !*** ./src/environments/environment.ts ***!
  \*****************************************/
/*! exports provided: environment */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "environment", function() { return environment; });
// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.
var environment = {
    production: false
};
/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/dist/zone-error';  // Included with Angular CLI.


/***/ }),

/***/ "./src/main.ts":
/*!*********************!*\
  !*** ./src/main.ts ***!
  \*********************/
/*! no exports provided */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var _angular_platform_browser_dynamic__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/platform-browser-dynamic */ "./node_modules/@angular/platform-browser-dynamic/fesm5/platform-browser-dynamic.js");
/* harmony import */ var _app_app_module__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./app/app.module */ "./src/app/app.module.ts");
/* harmony import */ var _environments_environment__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./environments/environment */ "./src/environments/environment.ts");
/* harmony import */ var codemirror__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! codemirror */ "./node_modules/codemirror/lib/codemirror.js");
/* harmony import */ var codemirror__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(codemirror__WEBPACK_IMPORTED_MODULE_4__);





if (_environments_environment__WEBPACK_IMPORTED_MODULE_3__["environment"].production) {
    Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["enableProdMode"])();
}
codemirror__WEBPACK_IMPORTED_MODULE_4__["defineOption"]('scrollEditorOnly', false, function (cm) {
    var preventScrollPropagation = function (event) {
        event.stopPropagation();
        event.preventDefault();
        event.returnValue = false;
        return false;
    };
    var mouseWheelEventHandler = function (event) {
        var delta = event.wheelDelta;
        var scroll = cm.display.scroller;
        var scrollTop = scroll.scrollTop;
        var scrollHeight = scroll.scrollHeight;
        var height = scroll.clientHeight;
        var up = delta > 0;
        if (!up && ((scrollHeight - height - scrollTop) === 0)) {
            preventScrollPropagation(event);
        }
    };
    var DOMMouseScrollEventHandler = function (event) {
        var delta = event.detail * -40;
        var scroll = cm.display.scroller;
        var scrollTop = scroll.scrollTop;
        var scrollHeight = scroll.scrollHeight;
        var height = scroll.clientHeight;
        var up = delta > 0;
        if (!up && ((scrollHeight - height - scrollTop) === 0)) {
            preventScrollPropagation(event);
        }
    };
    codemirror__WEBPACK_IMPORTED_MODULE_4__["on"](cm.getScrollerElement(), 'mousewheel', mouseWheelEventHandler);
    codemirror__WEBPACK_IMPORTED_MODULE_4__["on"](cm.getScrollerElement(), 'DOMMouseScroll', DOMMouseScrollEventHandler);
});
Object(_angular_platform_browser_dynamic__WEBPACK_IMPORTED_MODULE_1__["platformBrowserDynamic"])().bootstrapModule(_app_app_module__WEBPACK_IMPORTED_MODULE_2__["AppModule"])
    .catch(function (err) { return console.error(err); });


/***/ }),

/***/ 0:
/*!***************************!*\
  !*** multi ./src/main.ts ***!
  \***************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(/*! /home/domen/asm/src/main.ts */"./src/main.ts");


/***/ })

},[[0,"runtime","vendor"]]]);
//# sourceMappingURL=main.js.map