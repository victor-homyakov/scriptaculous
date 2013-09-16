/*global $, $F, $H, $w, Ajax, Class, Effect, Element, Event, Field, Form, Prototype */
/*jshint evil:true */

// Copyright (c) 2005-2010 Thomas Fuchs (http://script.aculo.us, http://mir.aculo.us)
//           (c) 2005-2010 Ivan Krstic (http://blogs.law.harvard.edu/ivan)
//           (c) 2005-2010 Jon Tirsen (http://www.tirsen.com)
// Contributors:
//  Richard Livsey
//  Rahul Bhargava
//  Rob Wills
//
// script.aculo.us is freely distributable under the terms of an MIT-style license.
// For details, see the script.aculo.us web site: http://script.aculo.us/

// Autocompleter.Base handles all the autocompletion functionality
// that's independent of the data source for autocompletion. This
// includes drawing the autocompletion menu, observing keyboard
// and mouse events, and similar.
//
// Specific autocompleters need to provide, at the very least,
// a getUpdatedChoices function that will be invoked every time
// the text inside the monitored textbox changes. This method
// should get the text for which to provide autocompletion by
// invoking this.getToken(), NOT by directly accessing
// this.element.value. This is to allow incremental tokenized
// autocompletion. Specific auto-completion logic (AJAX, etc)
// belongs in getUpdatedChoices.
//
// Tokenized incremental autocompletion is enabled automatically
// when an autocompleter is instantiated with the 'tokens' option
// in the options parameter, e.g.:
// new Ajax.Autocompleter('id','upd', '/url/', { tokens: ',' });
// will incrementally autocomplete with a comma as the token.
// Additionally, ',' in the above example can be replaced with
// a token array, e.g. { tokens: [',', '\n'] } which
// enables autocompletion on multiple tokens. This is most
// useful when one of the tokens is \n (a newline), as it
// allows smart autocompletion after linebreaks.

if (typeof Effect == 'undefined') {
  throw ("controls.js requires including script.aculo.us' effects.js library");
}

var Autocompleter = {};
Autocompleter.Base = Class.create({
  DEFAULT_OPTIONS: {
    frequency: 0.4,
    minChars: 1,
    duration: 0,
    tokens: ['\n'],
    onShow: function(element, update) { // bound to this.options
      var style = update.style;
      if (!style.position || style.position == 'absolute') {
        style.position = 'absolute';
        try {
          var l = update.getLayout(), w = element.offsetWidth - l.get('border-left') - l.get('border-right') - l.get('padding-left') - l.get('padding-right');
          update.style.width = w + "px";
          update.clonePosition(element, {
            setHeight: false,
            setWidth: false,
            offsetTop: element.offsetHeight
          });
        } catch (ex) {
          // ignore IE errors
        }
      }
      if (this.duration) {
        Effect.Appear(update, {
          duration: this.duration
        });
      } else {
        update.show();
      }
    },
    onHide: function(element, update) { // bound to this.options
      if (this.duration) {
        Effect.Fade(update, {
          duration: this.duration
        });
      } else {
        update.hide();
      }
    }
  },

  baseInitialize: function(element, update, options) {
    element = $(element);
    this.element = element;
    this.update = $(update);
    this.updateHasFocus = false; // FIX
    this.hasFocus = false;
    this.changed = false;
    this.active = false;
    this.index = 0;
    this.entryCount = 0;
    this.oldElementValue = this.selectedValue = this.element.value;

    if (this.setOptions) {
      this.setOptions(options);
    } else {
      this.options = options || {};
    }

    var o = this.options;
    for (var property in this.DEFAULT_OPTIONS) {
      o[property] = o[property] || this.DEFAULT_OPTIONS[property];
    }

    o.paramName = o.paramName || this.element.name;
    o.restricted = !!o.restricted;

    var tokens = o.tokens;
    if (typeof(tokens) == 'string') {
      tokens = [tokens];
    }
    // Force carriage returns as token delimiters anyway
    if (!tokens.include('\n')) {
      tokens.push('\n');
    }
    o.tokens = tokens;

    this.observer = null;

    this.element.setAttribute('autocomplete', 'off');

    Element.hide(this.update);

    var prebind = $w('onFocus onBlur onKeyPress onKeyDown onMouseDown onMouseLeave fixIEOverlapping onObserverEvent hide onHover onClick');
    for (var i = 0, len = prebind.length; i < len; ++i) {
      this[prebind[i]] = this[prebind[i]].bind(this);
    }

    Event.observe(this.element, 'focus', this.onFocus);
    Event.observe(this.element, 'blur', this.onBlur);
    Event.observe(this.element, 'keypress', this.onKeyPress);
    Event.observe(this.element, 'keydown', this.onKeyDown);
    // lazy this.addObserversOnUpdate();
  },

  onMouseDown: function() {
    this.updateHasFocus = true;
  },

  onMouseLeave: function() {
    this.updateHasFocus = false;
  },

  addObserversOnUpdate: function() {
    if (!this.updateObserved) {
      // mouseup was not fired on scrollbar
      // mouseout has false positive when moving from ul to li
      Event.observe(this.update, "mousedown", this.onMouseDown);
      Event.observe(this.update, "mouseleave", this.onMouseLeave);
      // 'mouseover' == 'mouseenter' == this.onMouseDown
      Event.on(this.update, "mouseover", "li", this.onHover);
      Event.on(this.update, "click", "li", this.onClick);
      this.updateObserved = true;
    }
  },

  show: function() {
    this.addObserversOnUpdate();
    if (Element.getStyle(this.update, 'display') === 'none') {
      this.options.onShow(this.element, this.update);
    }
    if (!this.iefix && Prototype.Browser.IE6 && (Element.getStyle(this.update, 'position') === 'absolute')) {
      var id = this.update.id + '_iefix';
      Element.insert(this.update, {
        after: '<iframe id="' + id + '" ' +
          'style="display:none;position:absolute;filter:progid:DXImageTransform.Microsoft.Alpha(opacity=0);" ' +
          'src="javascript:false;" frameborder="0" scrolling="no"><\/iframe>'
      });
      this.iefix = $(id);
    }
    if (this.iefix) {
      setTimeout(this.fixIEOverlapping, 50);
    }
  },

  fixIEOverlapping: function() {
    var s = this.update.style;
    if (!s.zIndex) {
      s.zIndex = 2;
    }
    this.iefix
      .clonePosition(this.update, {
        setTop: (!s.height)
      }).setStyle({
        zIndex: s.zIndex - 1,
        display: ''
      });
  },

  hide: function() {
    this.stopIndicator();
    var e = this.element, o = this.options;
    if (!this.hasFocus && o.restricted && e.value) {
      e.value = this.selectedValue;
    }
    if (Element.getStyle(this.update, 'display') != 'none') {
      o.onHide(e, this.update);
    }
    if (this.iefix) {
      Element.hide(this.iefix);
    }
    this.updateHasFocus = false;
  },

  startIndicator: function() {
    if (this.options.indicator) {
      Element.show(this.options.indicator);
    }
  },

  stopIndicator: function() {
    if (this.options.indicator) {
      Element.hide(this.options.indicator);
    }
  },

  // KEY_RETURN, KEY_ESC in IE6-9 fires only keypress, keyup
  onKeyPress: function(event) {
    var keyCode = event.keyCode;
    if (this.active && !event.stopped) {
      switch (keyCode) {
        case Event.KEY_RETURN:
          this.selectEntry();
        // fall through
        case Event.KEY_ESC:
          this.hide();
          this.active = false;
          Event.stop(event);
          return;
      }
    }
  },

  // KEY_ESC in WebKit (Chrome, Midori, Safari) fires only keydown, keyup
  onKeyDown: function(event) {
    var keyCode = event.keyCode;
    if (this.active) {
      switch (keyCode) {
        case Event.KEY_RETURN:
          // should be processed in onKeyPress
          return;
        case Event.KEY_TAB:
          this.selectEntry();
        // fall through
        case Event.KEY_ESC:
          this.hide();
          this.active = false;
          Event.stop(event);
          return;
        case Event.KEY_PAGEUP:
        case Event.KEY_PAGEDOWN:
        case Event.KEY_END:
        case Event.KEY_HOME:
        // TODO use for entry navigation
        // KEY_HOME:this.markFirst() KEY_END:this.markLast()
        case Event.KEY_LEFT:
        case Event.KEY_RIGHT:
          return;
        case Event.KEY_UP:
          this.markPrevious();
          this.render();
          Event.stop(event);
          return;
        case Event.KEY_DOWN:
          this.markNext();
          this.render();
          Event.stop(event);
          return;
      }
    } else if (keyCode == Event.KEY_TAB || keyCode == Event.KEY_RETURN || keyCode == Event.KEY_ESC ||
      (keyCode >= Event.KEY_PAGEUP && keyCode <= Event.KEY_DOWN) ||
      (Prototype.Browser.WebKit && keyCode === 0)) {
      // KEY_PAGEUP: 33, KEY_PAGEDOWN: 34, KEY_END: 35, KEY_HOME: 36,
      // KEY_LEFT: 37, KEY_UP: 38, KEY_RIGHT: 39, KEY_DOWN: 40
      return;
    }

    this.changed = true;
    this.hasFocus = true;

    if (this.observer) {
      clearTimeout(this.observer);
    }
    this.observer = setTimeout(this.onObserverEvent, this.options.frequency * 1000);
  },

  activate: function() {
    this.changed = false;
    this.hasFocus = true;
    this.getUpdatedChoices();
  },

  onHover: function(event, element) {
    if (this.index != element.autocompleteIndex) {
      this.index = element.autocompleteIndex;
      this.render();
    }
    Event.stop(event);
  },

  onClick: function(event, element) {
    this.index = element.autocompleteIndex;
    this.selectEntry();
    this.hide();
  },

  onFocus: function(event) {
    if (!this.hasFocus) {
      this.oldElementValue = this.selectedValue = this.element.value;
    }
  },

  onBlur: function(event) {
    if (this.updateHasFocus) {
      // focus moved from this.element to scrollbar of this.update
      this.element.focus();
    } else {
      // needed to make click events working
      setTimeout(this.hide, 250);
      this.hasFocus = false;
      this.active = false;
    }
  },

  render: function() {
    if (this.entryCount > 0) {
      for (var i = 0; i < this.entryCount; i++) {
        Element.toggleClassName(this.getEntry(i), "selected", (this.index == i));
      }
      if (this.hasFocus) {
        this.show();
        this.active = true;
      }
    } else {
      this.active = false;
      this.hide();
    }
  },

  markPrevious: function() {
    if (this.index > 0) {
      this.index--;
    } else {
      this.index = this.entryCount - 1;
    }
    this.getCurrentEntry().scrollIntoView(true);
  },

  markNext: function() {
    if (this.index < this.entryCount - 1) {
      this.index++;
    } else {
      this.index = 0;
    }
    this.getCurrentEntry().scrollIntoView(false);
  },

  getEntry: function(index) {
    var c = this.update.firstChild;
    return c ? c.childNodes[index] : undefined;
  },

  getCurrentEntry: function() {
    return this.getEntry(this.index);
  },

  selectEntry: function() {
    this.active = false;
    this.updateElement(this.getCurrentEntry());
  },

  updateElement: function(selectedElement) {
    var o = this.options;
    if (o.updateElement) {
      o.updateElement(selectedElement);
      return;
    }
    var value = '';
    if (o.select) {
      var nodes = $(selectedElement).select('.' + o.select) || [];
      if (nodes.length > 0) {
        value = Element.collectTextNodes(nodes[0]);
      }
    } else {
      value = Element.collectTextNodesIgnoreClass(selectedElement, 'informal');
    }

    var element = this.element, newValue = value;
    var bounds = this.changed ? this.getTokenBounds() : this.tokenBounds; // FIX
    if (bounds[0] != -1) {
      var v = element.value, before = v.substr(0, bounds[0]), after = v.substr(bounds[1]);
      var whitespace = v.substr(bounds[0]).match(/^\s+/);
      if (whitespace) {
        before += whitespace[0];
      }
      newValue = before + value + after;
    }
    element.value = this.oldElementValue = this.selectedValue = newValue;
    element.focus();

    if (o.afterUpdateElement) {
      o.afterUpdateElement(element, selectedElement);
    }
  },

  updateChoices: function(choices) {
    if (this.changed || !this.hasFocus) {
      return;
    }
    //if (!this.changed && this.hasFocus) {
    this.update.update(choices);
    Element.cleanWhitespace(this.update);

    var list = this.update.firstChild;
    if (list && list.childNodes) {
      Element.cleanWhitespace(list);
      this.entryCount = list.childNodes.length;
      for (var i = 0; i < this.entryCount; i++) {
        var entry = list.childNodes[i];
        entry.autocompleteIndex = i;
      }
    } else {
      this.entryCount = 0;
    }

    this.stopIndicator();
    this.index = 0;

    if (this.entryCount == 1 && this.options.autoSelect) {
      this.selectEntry();
      this.hide();
    } else {
      if (this.entryCount > 0) {
        this.getCurrentEntry().scrollIntoView();
      }
      this.render();
    }
    //}
  },

  onObserverEvent: function() {
    this.changed = false;
    if (this.getToken().length >= this.options.minChars) {
      this.getUpdatedChoices();
    } else {
      this.active = false;
      this.hide();
    }
    this.oldElementValue = this.element.value;
  },

  getToken: function() {
    var bounds = this.getTokenBounds();
    return this.element.value.substring(bounds[0], bounds[1]).strip();
  },

  getTokenBounds: function() {
    var value = this.element.value;
    if (value.strip().empty()) {
      return [-1, 0];
    }
    var diff = arguments.callee.getFirstDifferencePos(value, this.oldElementValue);
    var offset = (diff == this.oldElementValue.length ? 1 : 0);
    var prevTokenPos = -1, nextTokenPos = value.length;
    var tokenPos, tokens = this.options.tokens;
    for (var index = 0, len = tokens.length; index < len; ++index) {
      tokenPos = value.lastIndexOf(tokens[index], diff + offset - 1);
      if (tokenPos > prevTokenPos) {
        prevTokenPos = tokenPos;
      }
      tokenPos = value.indexOf(tokens[index], diff + offset);
      if (-1 != tokenPos && tokenPos < nextTokenPos) {
        nextTokenPos = tokenPos;
      }
    }
    this.tokenBounds = [prevTokenPos + 1, nextTokenPos];
    return this.tokenBounds;
  }
});

Autocompleter.Base.prototype.getTokenBounds.getFirstDifferencePos = function(newS, oldS) {
  var boundary = Math.min(newS.length, oldS.length);
  for (var index = 0; index < boundary; ++index) {
    if (newS[index] != oldS[index]) {
      return index;
    }
  }
  return boundary;
};

Ajax.Autocompleter = Class.create(Autocompleter.Base, {
  initialize: function(element, update, url, options) {
    this.baseInitialize(element, update, options);
    this.options.asynchronous = true;
    this.options.onComplete = this.onComplete.bind(this);
    this.options.defaultParams = this.options.parameters || null;
    this.url = url;
  },

  getUpdatedChoices: function() {
    this.startIndicator();
    var o = this.options, entry = encodeURIComponent(o.paramName) + '=' + encodeURIComponent(this.getToken());
    o.parameters = o.callback ? o.callback(this.element, entry) : entry;
    if (o.defaultParams) {
      o.parameters += '&' + o.defaultParams;
    }
    new Ajax.Request(this.url, o);
  },

  onComplete: function(request) {
    this.updateChoices(request.responseText);
  }
});

// The local array autocompleter. Used when you'd prefer to
// inject an array of autocompletion options into the page, rather
// than sending out Ajax queries, which can be quite slow sometimes.
//
// The constructor takes four parameters. The first two are, as usual,
// the id of the monitored textbox, and id of the autocompletion menu.
// The third is the array you want to autocomplete from, and the fourth
// is the options block.
//
// Extra local autocompletion options:
// - choices - How many autocompletion choices to offer
//
// - partialSearch - If false, the autocompleter will match entered
//                    text only at the beginning of strings in the
//                    autocomplete array. Defaults to true, which will
//                    match text at the beginning of any *word* in the
//                    strings in the autocomplete array. If you want to
//                    search anywhere in the string, additionally set
//                    the option fullSearch to true (default: off).
//
// - fullSearch - Search anywhere in autocomplete array strings.
//
// - partialChars - How many characters to enter before triggering
//                   a partial match (unlike minChars, which defines
//                   how many characters are required to do any match
//                   at all). Defaults to 2.
//
// - ignoreCase - Whether to ignore case when autocompleting.
//                 Defaults to true.
//
// It's possible to pass in a custom function as the 'selector'
// option, if you prefer to write your own autocompletion logic.
// In that case, the other options above will not apply unless
// you support them.

Autocompleter.Local = Class.create(Autocompleter.Base, {
  initialize: function(element, update, array, options) {
    this.baseInitialize(element, update, options);
    this.options.array = array;
  },

  getUpdatedChoices: function() {
    this.updateChoices(this.options.selector(this));
  },

  createEntry: function(elem, pos, len) {
    var pre = elem.substr(0, pos), match = elem.substr(pos, len), post = elem.substr(pos + len);
    return "<li>" + pre + "<strong>" + match + "<\/strong>" + post + "<\/li>";
  },

  selector: function(instance) {
    var ret = []; // Beginning matches
    var partial = []; // Inside matches
    var o = this.options, entry = o.ignoreCase ? this.getToken().toLowerCase() : this.getToken(), entrylen = entry.length;

    for (var i = 0; i < o.array.length && ret.length < o.choices; i++) {
      var elem = o.array[i], elem2 = o.ignoreCase ? elem.toLowerCase() : elem;
      var foundPos = elem2.indexOf(entry), li;

      while (foundPos != -1) {
        if (foundPos === 0) {
          li = this.createEntry(elem, 0, entrylen);
          // li = this.createEntry(elem, 0, elem.length > entrylen ? entrylen : elem.length);
          ret.push(li);
          break;
        } else if (o.partialSearch && entrylen >= o.partialChars && (o.fullSearch || (/\s/.test(elem.substr(foundPos - 1, 1)))) /* && foundPos != -1 */) {
          // partialSearch && fullSearch && found anywhere in string
          // or partialSearch && found at the beginning of word
          li = this.createEntry(elem, foundPos, entrylen);
          partial.push(li);
          break;
        }

        foundPos = elem2.indexOf(entry, foundPos + 1);
      }
    }
    if (partial.length) {
      ret = ret.concat(partial.slice(0, o.choices - ret.length));
    }
    return "<ul>" + ret.join('') + "<\/ul>";
  },

  setOptions: function(options) {
    this.options = Object.extend({
      choices: 10,
      partialSearch: true,
      partialChars: 2,
      ignoreCase: true,
      fullSearch: false,
      selector: this.selector.bind(this)
    }, options || {});
  }
});

// AJAX in-place editor and collection editor
// Full rewrite by Christophe Porteneuve <tdd@tddsworld.com> (April 2007).

// Use this if you notice weird scrolling problems on some browsers,
// the DOM might be a bit confused when this gets called so do this
// waits 1 ms (with setTimeout) until it does the activation
Field.scrollFreeActivate = function(field) {
  setTimeout(function() {
    Field.activate(field);
  }, 1);
};

Ajax.InPlaceEditor = Class.create({
  initialize: function(element, url, options) {
    this.url = url;
    this.element = element = $(element);
    this.prepareOptions();
    this._controls = {};
    Object.extend(this.options, options || {});
    if (!this.options.formId && this.element.id) {
      this.options.formId = this.element.id + '-inplaceeditor';
      if ($(this.options.formId)) {
        this.options.formId = '';
      }
    }
    if (this.options.externalControl) {
      this.options.externalControl = $(this.options.externalControl);
    }
    if (!this.options.externalControl) {
      this.options.externalControlOnly = false;
    }
    this._originalBackground = this.element.getStyle('background-color') || 'transparent';
    this.element.title = this.options.clickToEditText;
    // FIXME use prebind
    this.handleFormCancellation = this.handleFormCancellation.bind(this);
    this._boundComplete = (this.options.onComplete || Prototype.emptyFunction).bind(this);
    this.handleAJAXFailure = this.handleAJAXFailure.bind(this);
    this.handleFormSubmission = this.handleFormSubmission.bind(this);
    this.wrapUp = this.wrapUp.bind(this);
    this.registerListeners();
  },
  checkForEscapeOrReturn: function(e) {
    if (!this._editing || e.ctrlKey || e.altKey || e.shiftKey) {
      return;
    }
    if (Event.KEY_ESC == e.keyCode) {
      this.handleFormCancellation(e);
    } else if (Event.KEY_RETURN == e.keyCode) {
      this.handleFormSubmission(e);
    }
  },
  createControl: function(mode, handler, extraClasses) {
    var control = this.options[mode + 'Control'];
    var text = this.options[mode + 'Text'];
    if ('button' == control) {
      var btn = document.createElement('input');
      btn.type = 'submit';
      btn.value = text;
      btn.className = 'editor_' + mode + '_button';
      if ('cancel' == mode) {
        btn.onclick = this.handleFormCancellation;
      }
      this._form.appendChild(btn);
      this._controls[mode] = btn;
    } else if ('link' == control) {
      var link = document.createElement('a');
      link.href = '#';
      link.appendChild(document.createTextNode(text));
      link.onclick = 'cancel' == mode ? this.handleFormCancellation : this.handleFormSubmission;
      link.className = 'editor_' + mode + '_link';
      if (extraClasses) {
        link.className += ' ' + extraClasses;
      }
      this._form.appendChild(link);
      this._controls[mode] = link;
    }
  },
  createEditField: function() {
    var text = (this.options.loadTextURL ? this.options.loadingText : this.getText());
    var fld;
    if (1 >= this.options.rows && !(/\r|\n/.test(this.getText()))) {
      fld = document.createElement('input');
      fld.type = 'text';
      var size = this.options.size || this.options.cols || 0;
      if (0 < size) {
        fld.size = size;
      }
    } else {
      fld = document.createElement('textarea');
      fld.rows = (1 >= this.options.rows ? this.options.autoRows : this.options.rows);
      fld.cols = this.options.cols || 40;
    }
    fld.name = this.options.paramName;
    fld.value = text; // No HTML breaks conversion anymore
    fld.className = 'editor_field';
    if (this.options.submitOnBlur) {
      fld.onblur = this.handleFormSubmission;
    }
    this._controls.editor = fld;
    if (this.options.loadTextURL) {
      this.loadExternalText();
    }
    this._form.appendChild(this._controls.editor);
  },
  createForm: function() {
    var ipe = this;

    function addText(mode, condition) {
      var text = ipe.options['text' + mode + 'Controls'];
      if (!text || condition === false) {
        return;
      }
      ipe._form.appendChild(document.createTextNode(text));
    }

    this._form = $(document.createElement('form'));
    this._form.id = this.options.formId;
    this._form.addClassName(this.options.formClassName);
    this._form.onsubmit = this.handleFormSubmission;
    this.createEditField();
    if ('textarea' == this._controls.editor.tagName.toLowerCase()) {
      this._form.appendChild(document.createElement('br'));
    }
    if (this.options.onFormCustomization) {
      this.options.onFormCustomization(this, this._form);
    }
    addText('Before', this.options.okControl || this.options.cancelControl);
    this.createControl('ok', this.handleFormSubmission);
    addText('Between', this.options.okControl && this.options.cancelControl);
    this.createControl('cancel', this.handleFormCancellation, 'editor_cancel');
    addText('After', this.options.okControl || this.options.cancelControl);
  },
  destroy: function() {
    if (this._oldInnerHTML) {
      this.element.innerHTML = this._oldInnerHTML;
    }
    this.leaveEditMode();
    this.unregisterListeners();
  },
  enterEditMode: function(e) {
    if (this._saving || this._editing) {
      return;
    }
    this._editing = true;
    this.triggerCallback('onEnterEditMode');
    if (this.options.externalControl) {
      this.options.externalControl.hide();
    }
    this.element.hide();
    this.createForm();
    this.element.parentNode.insertBefore(this._form, this.element);
    if (!this.options.loadTextURL) {
      this.postProcessEditField();
    }
    if (e) {
      Event.stop(e);
    }
  },
  enterHover: function(e) {
    if (this.options.hoverClassName) {
      this.element.addClassName(this.options.hoverClassName);
    }
    if (this._saving) {
      return;
    }
    this.triggerCallback('onEnterHover');
  },
  getText: function() {
    return this.element.innerHTML.unescapeHTML();
  },
  handleAJAXFailure: function(transport) {
    this.triggerCallback('onFailure', transport);
    if (this._oldInnerHTML) {
      this.element.innerHTML = this._oldInnerHTML;
      this._oldInnerHTML = null;
    }
  },
  handleFormCancellation: function(e) {
    this.wrapUp();
    if (e) {
      Event.stop(e);
    }
  },
  handleFormSubmission: function(e) {
    var form = this._form, value = $F(this._controls.editor);
    this.prepareSubmission();
    var params = this.options.callback(form, value) || '';
    if (Object.isString(params)) {
      params = params.toQueryParams();
    }
    params.editorId = this.element.id;
    var options = this.options.htmlResponse ? {evalScripts: true} : {method: 'get'};
    options = Object.extend(options, this.options.ajaxOptions);
    Object.extend(options, {
      parameters: params,
      onComplete: this.wrapUp,
      onFailure: this.handleAJAXFailure
    });
    if (this.options.htmlResponse) {
      new Ajax.Updater({
        success: this.element
      }, this.url, options);
    } else {
      new Ajax.Request(this.url, options);
    }
    if (e) {
      Event.stop(e);
    }
  },
  leaveEditMode: function() {
    this.element.removeClassName(this.options.savingClassName);
    this.removeForm();
    this.leaveHover();
    this.element.style.backgroundColor = this._originalBackground;
    this.element.show();
    if (this.options.externalControl) {
      this.options.externalControl.show();
    }
    this._saving = false;
    this._editing = false;
    this._oldInnerHTML = null;
    this.triggerCallback('onLeaveEditMode');
  },
  leaveHover: function(e) {
    if (this.options.hoverClassName) {
      this.element.removeClassName(this.options.hoverClassName);
    }
    if (this._saving) {
      return;
    }
    this.triggerCallback('onLeaveHover');
  },
  loadExternalText: function() {
    this._form.addClassName(this.options.loadingClassName);
    this._controls.editor.disabled = true;
    var options = Object.extend({
      method: 'get'
    }, this.options.ajaxOptions);
    Object.extend(options, {
      parameters: 'editorId=' + encodeURIComponent(this.element.id),
      onComplete: Prototype.emptyFunction,
      onSuccess: (function(transport) {
        this._form.removeClassName(this.options.loadingClassName);
        var text = transport.responseText;
        if (this.options.stripLoadedTextTags) {
          text = text.stripTags();
        }
        this._controls.editor.value = text;
        this._controls.editor.disabled = false;
        this.postProcessEditField();
      }).bind(this),
      onFailure: this.handleAJAXFailure
    });
    new Ajax.Request(this.options.loadTextURL, options);
  },
  postProcessEditField: function() {
    var fpc = this.options.fieldPostCreation;
    if (fpc) {
      $(this._controls.editor)['focus' == fpc ? 'focus' : 'activate']();
    }
  },
  prepareOptions: function() {
    this.options = Object.clone(Ajax.InPlaceEditor.DefaultOptions);
    Object.extend(this.options, Ajax.InPlaceEditor.DefaultCallbacks);
    [this._extraDefaultOptions].flatten().compact().each(function(defs) {
      Object.extend(this.options, defs);
    }, this);
  },
  prepareSubmission: function() {
    this._saving = true;
    this.removeForm();
    this.leaveHover();
    this.showSaving();
  },
  registerListeners: function() {
    this._listeners = {};
    var listener;
    $H(Ajax.InPlaceEditor.Listeners).each(function(pair) {
      listener = this[pair.value].bind(this);
      this._listeners[pair.key] = listener;
      if (!this.options.externalControlOnly) {
        this.element.observe(pair.key, listener);
      }
      if (this.options.externalControl) {
        this.options.externalControl.observe(pair.key, listener);
      }
    }, this);
  },
  removeForm: function() {
    if (!this._form) {
      return;
    }
    this._form.remove();
    this._form = null;
    this._controls = {};
  },
  showSaving: function() {
    this._oldInnerHTML = this.element.innerHTML;
    this.element.innerHTML = this.options.savingText;
    this.element.addClassName(this.options.savingClassName);
    this.element.style.backgroundColor = this._originalBackground;
    this.element.show();
  },
  triggerCallback: function(cbName, arg) {
    if ('function' == typeof this.options[cbName]) {
      this.options[cbName](this, arg);
    }
  },
  unregisterListeners: function() {
    $H(this._listeners).each(function(pair) {
      if (!this.options.externalControlOnly) {
        this.element.stopObserving(pair.key, pair.value);
      }
      if (this.options.externalControl) {
        this.options.externalControl.stopObserving(pair.key, pair.value);
      }
    }, this);
  },
  wrapUp: function(transport) {
    this.leaveEditMode();
    // Can't use triggerCallback due to backward compatibility: requires
    // binding + direct element
    this._boundComplete(transport, this.element);
  }
});

Ajax.InPlaceEditor.prototype.dispose = Ajax.InPlaceEditor.prototype.destroy;

Ajax.InPlaceCollectionEditor = Class.create(Ajax.InPlaceEditor, {
  initialize: function($super, element, url, options) {
    this._extraDefaultOptions = Ajax.InPlaceCollectionEditor.DefaultOptions;
    $super(element, url, options);
  },

  createEditField: function() {
    var list = document.createElement('select');
    list.name = this.options.paramName;
    list.size = 1;
    this._controls.editor = list;
    this._collection = this.options.collection || [];
    if (this.options.loadCollectionURL) {
      this.loadCollection();
    } else {
      this.checkForExternalText();
    }
    this._form.appendChild(this._controls.editor);
  },

  loadCollection: function() {
    this._form.addClassName(this.options.loadingClassName);
    this.showLoadingText(this.options.loadingCollectionText);
    var options = Object.extend({
      method: 'get'
    }, this.options.ajaxOptions);
    Object.extend(options, {
      parameters: 'editorId=' + encodeURIComponent(this.element.id),
      onComplete: Prototype.emptyFunction,
      onSuccess: (function(transport) {
        var js = transport.responseText.strip();
        // TODO: improve sanity check
        if (!(/^\[.*\]$/.test(js))) {
          throw ('Server returned an invalid collection representation.');
        }
        this._collection = eval(js);
        this.checkForExternalText();
      }).bind(this),
      onFailure: this.onFailure
    });
    new Ajax.Request(this.options.loadCollectionURL, options);
  },

  showLoadingText: function(text) {
    this._controls.editor.disabled = true;
    var tempOption = this._controls.editor.firstChild;
    if (!tempOption) {
      tempOption = document.createElement('option');
      tempOption.value = '';
      this._controls.editor.appendChild(tempOption);
      tempOption.selected = true;
    }
    tempOption.update((text || '').stripScripts().stripTags());
  },

  checkForExternalText: function() {
    this._text = this.getText();
    if (this.options.loadTextURL) {
      this.loadExternalText();
    } else {
      this.buildOptionList();
    }
  },

  loadExternalText: function() {
    this.showLoadingText(this.options.loadingText);
    var options = Object.extend({
      method: 'get'
    }, this.options.ajaxOptions);
    Object.extend(options, {
      parameters: 'editorId=' + encodeURIComponent(this.element.id),
      onComplete: Prototype.emptyFunction,
      onSuccess: (function(transport) {
        this._text = transport.responseText.strip();
        this.buildOptionList();
      }).bind(this),
      onFailure: this.onFailure
    });
    new Ajax.Request(this.options.loadTextURL, options);
  },

  buildOptionList: function() {
    this._form.removeClassName(this.options.loadingClassName);
    this._collection = this._collection.map(function(entry) {
      return 2 === entry.length ? entry : [entry, entry].flatten();
    });
    var marker = ('value' in this.options) ? this.options.value : this._text;
    var textFound = this._collection.any(function(entry) {
      return entry[0] == marker;
    }, this);
    this._controls.editor.update('');
    var option;
    this._collection.each(function(entry, index) {
      option = document.createElement('option');
      option.value = entry[0];
      option.selected = textFound ? entry[0] == marker : 0 == index;
      option.appendChild(document.createTextNode(entry[1]));
      this._controls.editor.appendChild(option);
    }, this);
    this._controls.editor.disabled = false;
    Field.scrollFreeActivate(this._controls.editor);
  }
});

Object.extend(Ajax.InPlaceEditor, {
  DefaultOptions: {
    ajaxOptions: {},
    autoRows: 3, // Use when multi-line w/ rows == 1
    cancelControl: 'link', // 'link'|'button'|false
    cancelText: 'cancel',
    clickToEditText: 'Click to edit',
    externalControl: null, // id|elt
    externalControlOnly: false,
    fieldPostCreation: 'activate', // 'activate'|'focus'|false
    formClassName: 'inplaceeditor-form',
    formId: null, // id|elt
    highlightColor: '#ffff99',
    highlightEndColor: '#ffffff',
    hoverClassName: '',
    htmlResponse: true,
    loadingClassName: 'inplaceeditor-loading',
    loadingText: 'Loading...',
    okControl: 'button', // 'link'|'button'|false
    okText: 'ok',
    paramName: 'value',
    rows: 1, // If 1 and multi-line, uses autoRows
    savingClassName: 'inplaceeditor-saving',
    savingText: 'Saving...',
    size: 0,
    stripLoadedTextTags: false,
    submitOnBlur: false,
    textAfterControls: '',
    textBeforeControls: '',
    textBetweenControls: ''
  },
  DefaultCallbacks: {
    callback: function(form) {
      return Form.serialize(form);
    },
    onComplete: function(transport, element) {
      // For backward compatibility, this one is bound to the IPE, and passes
      // the element directly.  It was too often customized, so we don't break it.
      new Effect.Highlight(element, {
        startcolor: this.options.highlightColor,
        keepBackgroundImage: true
      });
    },
    onEnterEditMode: null,
    onEnterHover: function(ipe) {
      ipe.element.style.backgroundColor = ipe.options.highlightColor;
      if (ipe._effect) {
        ipe._effect.cancel();
      }
    },
    onFailure: function(transport, ipe) {
      alert('Error communication with the server: ' + transport.responseText.stripTags());
    },
    onFormCustomization: null, // Takes the IPE and its generated form, after editor, before controls.
    onLeaveEditMode: null,
    onLeaveHover: function(ipe) {
      ipe._effect = new Effect.Highlight(ipe.element, {
        startcolor: ipe.options.highlightColor,
        endcolor: ipe.options.highlightEndColor,
        restorecolor: ipe._originalBackground,
        keepBackgroundImage: true
      });
    }
  },
  Listeners: {
    click: 'enterEditMode',
    keydown: 'checkForEscapeOrReturn',
    mouseover: 'enterHover',
    mouseout: 'leaveHover'
  }
});

Ajax.InPlaceCollectionEditor.DefaultOptions = {
  loadingCollectionText: 'Loading options...'
};

// Delayed observer, like Form.Element.Observer,
// but waits for delay after last key input
// Ideal for live-search fields

Form.Element.DelayedObserver = Class.create({
  initialize: function(element, delay, callback) {
    this.delay = delay || 0.5;
    this.element = $(element);
    this.callback = callback;
    this.timer = null;
    this.lastValue = $F(this.element);
    Event.observe(this.element, 'keyup', this.delayedListener.bind(this));
  },
  delayedListener: function(event) {
    if (this.lastValue == $F(this.element)) {
      return;
    }
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(this.onTimerEvent.bind(this), this.delay * 1000);
    this.lastValue = $F(this.element);
  },
  onTimerEvent: function() {
    this.timer = null;
    this.callback(this.element, $F(this.element));
  }
});
