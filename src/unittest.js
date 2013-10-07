/*global $, $$, $A, $H, Ajax, Class, Element, Event, Prototype, Test */

// Copyright (c) 2005-2010 Thomas Fuchs (http://script.aculo.us, http://mir.aculo.us)
//           (c) 2005-2010 Jon Tirsen (http://www.tirsen.com)
//           (c) 2005-2010 Michael Schuerig (http://www.schuerig.de/michael/)
//
// script.aculo.us is freely distributable under the terms of an MIT-style license.
// For details, see the script.aculo.us web site: http://script.aculo.us/

// experimental, Firefox && IE only
Event.simulateMouse = function(element, eventName, options) {
  element = $(element);
  options = Object.extend({
    pointerX: 0,
    pointerY: 0,
    button: 0,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    metaKey: false
  }, options || {});

  var oEvent;
  if (document.createEvent && document.dispatchEvent) {
    oEvent = document.createEvent("MouseEvents");
    oEvent.initMouseEvent(eventName, true, true, document.defaultView, options.button, options.pointerX, options.pointerY, options.pointerX, options.pointerY, options.ctrlKey, options.altKey, options.shiftKey, options.metaKey, 0, element);
  } else if (document.createEventObject && document.fireEvent) {
    oEvent = document.createEventObject();
    Object.extend(oEvent, Object.extend(options, {
      detail: 0,
      screenX: options.pointerX,
      screenY: options.pointerY,
      clientX: options.pointerX,
      clientY: options.pointerY,
      relatedTarget: element
    }));
  }

  if (this.mark) {
    Element.remove(this.mark);
  }
  this.mark = new Element("div").setStyle({
    position: "absolute",
    top: options.pointerY + "px",
    left: options.pointerX + "px",
    width: "5px",
    height: "5px",
    borderTop: "1px solid red",
    borderLeft: "1px solid red"
  });
  this.mark.appendChild(document.createTextNode(" "));
  document.body.appendChild(this.mark);

  if (this.step) {
    alert('[' + new Date().getTime().toString() + '] ' + eventName + '/' + Test.Unit.inspect(options));
  }

  if (document.createEvent && document.dispatchEvent) {
    element.dispatchEvent(oEvent);
  } else if (document.createEventObject && document.fireEvent) {
    element.fireEvent("on" + eventName, oEvent);
  }
};

Event.simulateKey = function(element, eventName, options) {
  element = $(element);
  options = Object.extend({
    //ctrlKey: null, altKey: null, shiftKey: null, metaKey: null
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    metaKey: false,
    keyCode: 0,
    charCode: 0
  }, options || {});

  var oEvent;
  if (document.createEvent && document.dispatchEvent) {
    try {
      oEvent = document.createEvent("KeyEvents"); // "KeyboardEvent"
      oEvent.initKeyEvent(eventName, true, true, window, options.ctrlKey, options.altKey, options.shiftKey, options.metaKey, options.keyCode, options.charCode);
    } catch (e) {
      try {
        oEvent = document.createEvent("Events");
      } catch (e2) {
        oEvent = document.createEvent("UIEvents");
      } finally {
        oEvent.initEvent(eventName, true, true);
        Object.extend(oEvent, options);
      }
    }
    element.dispatchEvent(oEvent);
  } else if (document.createEventObject && document.fireEvent) {
    oEvent = document.createEventObject();
    Object.extend(oEvent, options);
    try {
      window.event = oEvent;
    } catch (e3) {
    }
    // IE-specific sourceIndex makes sure element is in the document
    if (element.sourceIndex > 0) {
      element.fireEvent("on" + eventName, oEvent);
    }
  }
};

Event.simulateKeys = function(element, command, full) {
  element = $(element);
  for (var i = 0, len = command.length; i < len; ++i) {
    var code = command.charCodeAt(i);
    if (full) {
      Event.simulateKey(element, 'keydown', {
        keyCode: code
      });
    }
    Event.simulateKey(element, 'keypress', {
      charCode: code
    });
    if (full) {
      Event.simulateKey(element, 'keyup', {
        keyCode: code
      });
    }
  }
};

var Test = {
  Unit: {
    inspect: Object.inspect
  }
};

Test.Unit.Logger = Class.create({
  initialize: function(log) {
    this.log = $(log);
    if (!this.log) {
      this.log = new Element("div");
      Element.insert(document.body, this.log);
    }
    this._createLogTable();
  },
  start: function(testName) {
    if (!this.log) {
      return;
    }
    this.testName = testName;
    this.lastLogLine = document.createElement('tr');
    this.statusCell = document.createElement('td');
    this.nameCell = document.createElement('td');
    this.nameCell.className = "nameCell";
    this.nameCell.appendChild(document.createTextNode(testName));
    this.messageCell = document.createElement('td');
    this.lastLogLine.appendChild(this.statusCell);
    this.lastLogLine.appendChild(this.nameCell);
    this.lastLogLine.appendChild(this.messageCell);
    this.loglines.appendChild(this.lastLogLine);
  },
  finish: function(status, summary) {
    if (!this.log) {
      return;
    }
    this.lastLogLine.className = status;
    this.statusCell.innerHTML = status;
    this.messageCell.innerHTML = this._toHTML(summary);
    this.addLinksToResults();
  },
  message: function(message) {
    if (this.log) {
      this.messageCell.innerHTML = this._toHTML(message);
    }
  },
  summary: function(summary) {
    if (this.log) {
      this.logsummary.innerHTML = this._toHTML(summary);
    }
  },
  _createLogTable: function() {
    this.log.innerHTML = '<div id="logsummary"></div><table id="logtable"><thead><tr><th>Status</th><th>Test</th><th>Message</th></tr></thead><tbody id="loglines"></tbody></table>';
    this.logsummary = $('logsummary');
    this.loglines = $('loglines');
  },
  _toHTML: function(txt) {
    return txt.escapeHTML().replace(/\n/g, "<br/>");
  },
  addLinksToResults: function() {
    $$("tr.failed .nameCell,tr.error .nameCell").each(function(td) { // todo: limit to children of this.log
      td.title = "Run only this test";
      Event.observe(td, 'click', function() {
        window.location.search = "?tests=" + td.innerHTML;
      });
    });
    $$("tr.passed .nameCell").each(function(td) { // todo: limit to children of this.log
      td.title = "Run all tests";
      Event.observe(td, 'click', function() {
        window.location.search = "";
      });
    });
  }
});

Test.Unit.Runner = Class.create({
  initialize: function(testcases, options) {
    this.options = Object.extend({
      testLog: 'testlog'
    }, options || {});
    var o = this.options;
    o.resultsURL = this.parseResultsURLQueryParameter();
    o.tests = this.parseTestsQueryParameter();
    if (o.testLog) {
      o.testLog = $(o.testLog) || null;
    }
    if (o.tests) {
      this.tests = [];
      var tests = o.tests;
      for (var i = 0; i < tests.length; i++) {
        if (/^test/.test(tests[i])) {
          this.tests.push(new Test.Unit.Testcase(tests[i], testcases[tests[i]], testcases.setup, testcases.teardown));
        }
      }
    } else if (o.test) {
      this.tests = [new Test.Unit.Testcase(o.test, testcases[o.test], testcases.setup, testcases.teardown)];
    } else {
      this.tests = [];
      for (var testcase in testcases) {
        if (/^test/.test(testcase)) {
          this.tests.push(new Test.Unit.Testcase(o.context ? ' -> ' + o.titles[testcase] : testcase, testcases[testcase], testcases.setup, testcases.teardown));
        }
      }
    }
    this.currentTest = 0;
    this.logger = new Test.Unit.Logger(o.testLog);
    this.runTests.bind(this).delay(1);
  },
  parseResultsURLQueryParameter: function() {
    var query = window.location.search.parseQuery();
    return query.resultsURL;
  },
  parseTestsQueryParameter: function() {
    var query = window.location.search.parseQuery();
    if (query.tests) {
      return query.tests.split(',');
    }
  },
  // Returns:
  //  "ERROR" if there was an error,
  //  "FAILURE" if there was a failure, or
  //  "SUCCESS" if there was neither
  getResult: function(results) {
    results = results || [];
    for (var i = 0; i < this.tests.length; i++) {
      if (this.tests[i].errors > 0) {
        return results[2] || "ERROR";
      }
      if (this.tests[i].failures > 0) {
        return results[1] || "FAILURE";
      }
    }
    return results[0] || "SUCCESS";
  },
  showResultsInTitle: function() {
    document.title = this.getResult(["\u2714 Success", "\u2716 Failure", "\u2716 Error", "\u2652 In Progress"]) + " " + document.title;
  },
  postResults: function() {
    if (this.options.resultsURL) {
      new Ajax.Request(this.options.resultsURL, {
        method: 'get',
        parameters: 'result=' + this.getResult(),
        asynchronous: false
      });
    }
  },
  runTests: function() {
    var test = this.tests[this.currentTest];
    if (!test) {
      // finished!
      this.showResultsInTitle();
      this.postResults();
      this.logger.summary(this.summary());
      return;
    }
    if (!test.isWaiting) {
      this.logger.start(test.name);
    }
    test.run();
    var delay;
    if (test.isWaiting) {
      this.logger.message("Waiting for " + test.timeToWait + "ms");
      delay = (test.timeToWait || 1000) / 1000;
    } else {
      this.logger.finish(test.status(), test.summary());
      this.currentTest++;
      delay = 1;
    }
    this.runTests.bind(this).delay(delay); // FIX
  },
  summary: function() {
    var assertions = 0, failures = 0, errors = 0;
    for (var i = 0; i < this.tests.length; i++) {
      assertions += this.tests[i].assertions;
      failures += this.tests[i].failures;
      errors += this.tests[i].errors;
    }
    return ((this.options.context ? this.options.context + ': ' : '') + this.tests.length + " tests, " + assertions + " assertions, " + failures + " failures, " + errors + " errors");
  }
});

Test.Unit.Assertions = Class.create({
  initialize: function() {
    this.assertions = this.failures = this.errors = 0;
    this.messages = [];
  },
  summary: function() {
    return (this.assertions + " assertions, " + this.failures + " failures, " + this.errors + " errors" + "\n" + this.messages.join("\n"));
  },
  pass: function() {
    this.assertions++;
  },
  fail: function(message) {
    this.failures++;
    this.messages.push("Failure: " + message);
  },
  info: function(message) {
    this.messages.push("Info: " + message);
  },
  error: function(error) {
    this.errors++;
    this.messages.push(error.name + ": " + error.message + "(" + Test.Unit.inspect(error) + ")");
  },
  status: function() {
    return (this.failures > 0) ? 'failed' : ((this.errors > 0) ? 'error' : 'passed');
  },
  assert: function(expression, message) {
    message = message || 'assert: got "' + Test.Unit.inspect(expression) + '"';
    try {
      expression ? this.pass() : this.fail(message);
    } catch (e) {
      this.error(e);
    }
  },
  /**
   * Fails if the result isn't truthy.
   * @param {Object} expression
   * @param {String} message
   */
  assertTrue: function(expression, message) {
    this.assert(expression, message);
  },
  /**
   * Fails if the result isn't falsy.
   * @param {Object} expression
   * @param {String} message
   */
  assertFalse: function(expression, message) {
    this.assert(!expression, message);
  },
  assertEqual: function(expected, actual, message) {
    message = message || "assertEqual";
    try {
      (expected == actual) ? this.pass() : this.fail(message + ': expected "' + Test.Unit.inspect(expected) + '", actual "' + Test.Unit.inspect(actual) + '"');
    } catch (e) {
      this.error(e);
    }
  },
  /**
   * Fails if the expected and actual values can not be compared to be equal.
   * @param {Object} expected
   * @param {Object} actual
   * @param {String} message
   */
  assertEquals: function(expected, actual, message) {
    this.assertEqual(expected, actual, message);
  },
  assertNotEqual: function(expected, actual, message) {
    message = message || "assertNotEqual";
    try {
      (expected != actual) ? this.pass() : this.fail(message + ': got "' + Test.Unit.inspect(actual) + '"');
    } catch (e) {
      this.error(e);
    }
  },
  /**
   * Fails if the expected and actual values can be compared to be equal.
   * @param {Object} expected
   * @param {Object} actual
   * @param {String} message
   */
  assertNotEquals: function(expected, actual, message) {
    this.assertNotEqual(expected, actual, message);
  },
  assertInspect: function(expected, actual, message) {
    message = message || "assertInspect";
    try {
      (expected == actual.inspect()) ? this.pass() : this.fail(message + ': expected "' + Test.Unit.inspect(expected) + '", actual "' + Test.Unit.inspect(actual) + '"');
    } catch (e) {
      this.error(e);
    }
  },
  assertEnumEqual: function(expected, actual, message) {
    message = message || "assertEnumEqual";
    try {
      $A(expected).length == $A(actual).length &&
        expected.zip(actual).all(function(pair) {
          return pair[0] == pair[1];
        }) ? this.pass() : this.fail(message + ': expected ' + Test.Unit.inspect(expected) + ', actual ' + Test.Unit.inspect(actual));
    } catch (e) {
      this.error(e);
    }
  },
  assertPairEqual: function(pair) {
    return pair.all(Object.isArray) ? pair[0].zip(pair[1]).all(this.assertPairEqual, this) : pair[0] == pair[1];
  },
  assertHashEqual: function(expected, actual, message) {
    expected = $H(expected);
    actual = $H(actual);
    var expectedArray = expected.toArray().sort(), actualArray = actual.toArray().sort();
    message = message || "assertHashEqual";
    // from now we recursively zip & compare nested arrays
    try {
      expectedArray.length == actualArray.length &&
        expectedArray.zip(actualArray).all(this.assertPairEqual, this) ? this.pass() : this.fail(message + ': expected ' + Test.Unit.inspect(expected) + ', actual ' + Test.Unit.inspect(actual));
    } catch (e) {
      this.error(e);
    }
  },
  assertIdentical: function(expected, actual, message) {
    message = message || "assertIdentical";
    try {
      (expected === actual) ? this.pass() : this.fail(message + ': expected "' + Test.Unit.inspect(expected) + '", actual "' + Test.Unit.inspect(actual) + '"');
    } catch (e) {
      this.error(e);
    }
  },
  /**
   * Fails if the expected and actual values are not references to the same object.
   * @param {Object} expected
   * @param {Object} actual
   * @param {String} message
   */
  assertSame: function(expected, actual, message) {
    this.assertIdentical(expected, actual, message);
  },
  assertNotIdentical: function(expected, actual, message) {
    message = message || "assertNotIdentical";
    try {
      !(expected === actual) ? this.pass() : this.fail(message + ': expected "' + Test.Unit.inspect(expected) + '", actual "' + Test.Unit.inspect(actual) + '"');
    } catch (e) {
      this.error(e);
    }
  },
  /**
   * Fails if the expected and actual are references to the same object.
   * @param {Object} expected
   * @param {Object} actual
   * @param {String} message
   */
  assertNotSame: function(expected, actual, message) {
    this.assertNotIdentical(expected, actual, message);
  },
  /**
   * Fails if the given value is not exactly null.
   * @param {Object} object
   * @param {String} message
   */
  assertNull: function(object, message) {
    message = message || 'assertNull';
    try {
      (object === null) ? this.pass() : this.fail(message + ': expected null, got "' + Test.Unit.inspect(object) + '"');
    } catch (e) {
      this.error(e);
    }
  },
  /**
   * Fails if the given value is exactly null.
   * @param {Object} object
   * @param {String} message
   */
  assertNotNull: function(object, message) {
    this.assert(object !== null, message || 'assertNotNull');
  },
  assertUndefined: function(object, message) {
    this.assert(typeof object == "undefined", message || 'assertUndefined');
  },
  assertNotUndefined: function(object, message) {
    this.assert(typeof object != "undefined", message || 'assertNotUndefined');
  },
  assertNullOrUndefined: function(object, message) {
    this.assert(object == null, message || 'assertNullOrUndefined');
  },
  assertNotNullOrUndefined: function(object, message) {
    this.assert(object != null, message || 'assertNotNullOrUndefined');
  },
  /**
   * Fails if the given value does not match the given regular expression.
   * @param {String} expected
   * @param {String} actual
   * @param {String} message
   */
  assertMatch: function(expected, actual, message) {
    message = message || 'assertMatch';
    var regex = new RegExp(expected);
    try {
      (regex.exec(actual)) ? this.pass() : this.fail(message + ' : regex: "' + Test.Unit.inspect(expected) + ' did not match: ' + Test.Unit.inspect(actual) + '"');
    } catch (e) {
      this.error(e);
    }
  },
  assertHidden: function(element, message) {
    this.assertEqual("none", element.style.display, message || 'assertHidden');
  },
  assertType: function(expected, actual, message) {
    message = message || 'assertType';
    try {
      (actual.constructor == expected) ? this.pass() : this.fail(message + ': expected "' + Test.Unit.inspect(expected) + '", actual "' + (actual.constructor) + '"');
    } catch (e) {
      this.error(e);
    }
  },
  assertNotOfType: function(expected, actual, message) {
    message = message || 'assertNotOfType';
    try {
      (actual.constructor != expected) ? this.pass() : this.fail(message + ': expected "' + Test.Unit.inspect(expected) + '", actual "' + (actual.constructor) + '"');
    } catch (e) {
      this.error(e);
    }
  },
  /**
   * Fails if the given object is not an instance of given type.
   * @param {Object} expected
   * @param {Object} actual
   * @param {String} [message]
   */
  assertInstanceOf: function(expected, actual, message) {
    message = message || 'assertInstanceOf';
    try {
      (actual instanceof expected) ? this.pass() : this.fail(message + ": object was not an instance of the expected type");
    } catch (e) {
      this.error(e);
    }
  },
  /**
   * Fails if the given object is an instance of given type.
   * @param {Object} expected
   * @param {Object} actual
   * @param {String} [message]
   */
  assertNotInstanceOf: function(expected, actual, message) {
    message = message || 'assertNotInstanceOf';
    try {
      !(actual instanceof expected) ? this.pass() : this.fail(message + ": object was an instance of the not expected type");
    } catch (e) {
      this.error(e);
    }
  },
  /**
   * Fails if the JavaScript type of the value isn't the expected string.
   * @param {Object} expected
   * @param {String} actual
   * @param {String} [message]
   */
  assertTypeOf: function(expected, actual, message) {
    message = message || 'assertTypeOf';
    try {
      (typeof expected === actual) ? this.pass() : this.fail(message + ": type of object was not the expected type");
    } catch (e) {
      this.error(e);
    }
  },
  assertRespondsTo: function(method, obj, message) {
    message = message || 'assertRespondsTo';
    try {
      (obj[method] && typeof obj[method] == 'function') ? this.pass() : this.fail(message + ": object doesn't respond to [" + method + "]");
    } catch (e) {
      this.error(e);
    }
  },
  assertReturnsTrue: function(method, obj, message) {
    message = message || 'assertReturnsTrue';
    try {
      var m = obj[method];
      if (!m) {
        m = obj['is' + method.charAt(0).toUpperCase() + method.slice(1)];
      }
      m() ? this.pass() : this.fail(message + ": method returned false");
    } catch (e) {
      this.error(e);
    }
  },
  assertReturnsFalse: function(method, obj, message) {
    message = message || 'assertReturnsFalse';
    try {
      var m = obj[method];
      if (!m) {
        m = obj['is' + method.charAt(0).toUpperCase() + method.slice(1)];
      }
      m() ? this.fail(message + ": method returned true") : this.pass();
    } catch (e) {
      this.error(e);
    }
  },
  assertRaise: function(exceptionName, method, message) {
    message = message || 'assertRaise';
    try {
      method();
      this.fail(message + ": exception expected but none was raised");
    } catch (e) {
      ((exceptionName == null) || (e.name == exceptionName)) ? this.pass() : this.error(e);
    }
  },
  /**
   * Fails if the code in the method does not throw the error with given name.
   * @param {String} exceptionName
   * @param {Function} method
   * @param {String} message
   */
  assertException: function(exceptionName, method, message) {
    this.assertRaise(exceptionName, method, message);
  },
  assertNothingRaised: function(method, message) {
    message = message || 'assertNothingRaised';
    try {
      method();
      this.pass();
    } catch (e) {
      this.fail(message + ": exception was thrown when nothing was expected");
    }
  },
  /**
   * Fails if the code in the method throws an error.
   * @param {Function} method
   * @param {String} message
   */
  assertNoException: function(method, message) {
    this.assertNothingRaised(method, message);
  },
  assertElementsMatch: function() {
    var expressions = $A(arguments), elements = $A(expressions.shift());
    if (elements.length != expressions.length) {
      this.fail('assertElementsMatch: size mismatch: ' + elements.length + ' elements, ' + expressions.length + ' expressions');
      return false;
    }
    elements.zip(expressions).all(function(pair, index) {
      var element = $(pair.first()), expression = pair.last();
      if (element.match(expression)) {
        return true;
      }
      this.fail('assertElementsMatch: (in index ' + index + ') expected ' + expression.inspect() + ' but got ' + element.inspect());
    }, this) && this.pass();
  },
  assertElementMatches: function(element, expression) {
    this.assertElementsMatch([element], expression);
  },
  _isVisible: function(element) {
    element = $(element);
    this.assertNotNull(element);
    if (!element.parentNode) {
      return true;
    }
    if (element.getStyle('display') === 'none' || element.getStyle('visibility') === 'hidden') {
      return false;
    }
    return this._isVisible(element.parentNode);
  },
  assertNotVisible: function(element, message) {
    this.assert(!this._isVisible(element), Test.Unit.inspect(element) + " was not hidden and didn't have a hidden parent either. " + (message || ""));
  },
  assertVisible: function(element, message) {
    this.assert(this._isVisible(element), Test.Unit.inspect(element) + " was not visible. " + (message || ""));
  },
  assertElement: function(element, message) {
    message = message || "assertElement";
    this.assert(element && $(element), message + ": " + Test.Unit.inspect(element) + " is not an Element.");
  },
  /**
   * Fails if the given DOM element does not have given ID.
   * @param {String} id
   * @param {Element} element
   * @param {String} message
   */
  assertElementId: function(id, element, message) {
    message = message || "assertElementId";
    this.assertElement(element, message);
    element = $(element);
    this.assertEqual(id, element.id, message + ": " + Test.Unit.inspect(element) + " does not have id '" + id + "'.");
  },
  /**
   * Fails if the given DOM element does not have given CSS class name.
   * @param {String} className
   * @param {Element} element
   * @param {String} message
   */
  assertClassName: function(className, element, message) {
    message = message || "assertClassName";
    this.assertElement(element, message);
    element = $(element);
    this.assert(element.hasClassName(className), message + ": " + Test.Unit.inspect(element) + " does not have class name '" + className + "'.");
  },
  /**
   * Fails if the given DOM element is not of given tagName.
   * @param {String} tagName
   * @param {Element} element
   * @param {String} [message]
   */
  assertTagName: function(tagName, element, message) {
    message = message || "assertTagName";
    this.assertElement(element, message);
    element = $(element);
    this.assertEqual(tagName, element.tagName.toLowerCase(), message + ": " + Test.Unit.inspect(element) + " does not have tag name '" + tagName + "'.");
  },
  /**
   * Fails if the given value is not a Function.
   * @param {Object} actual
   * @param {String} [message]
   */
  assertFunction: function(actual, message) {
    message = message || "assertFunction";
    this.assert(Object.isFunction(actual), message + ": object is not a Function.");
  },
  benchmark: function(operation, iterations, message) {
    iterations = iterations || 1;
    var startAt = new Date();
    iterations.times(operation);
    var timeTaken = new Date() - startAt;
    this.info((message || 'Operation') + ' finished ' + iterations + ' iteration(s) in ' + (timeTaken / 1000) + 's');
    return timeTaken;
  }
});

// TODO assertions:
// assertNaN([msg], actual)
// Fails if the given value is not a NaN.
//
// assertNotNaN([msg], actual)
// Fails if the given value is a NaN.
//
// assertArray([msg], actual)
// Fails if the given value is not an Array.
//
// assertBoolean([msg], actual)
// Fails if the given value is not a Boolean. Convenience function to assertTypeOf.
//
// assertObject([msg], actual)
// Fails if the given value is not an Object. Convenience function to assertTypeOf.
//
// assertNumber([msg], actual)
// Fails if the given value is not a Number. Convenience function to assertTypeOf.
//
// assertString([msg], actual)
// Fails if the given value is not a String. Convenience function to assertTypeOf.
//
// assertNoMatch([msg], regexp, actual)
// Fails if the given value matches the given regular expression.

Test.Unit.Testcase = Class.create(Test.Unit.Assertions, {
  initialize: function($super, name, test, setup, teardown) {
    $super();
    this.name = name;

    if (typeof test == 'string') {
      test = test.gsub(/(\.should[^\(]+\()/, '#{0}this,');
      test = test.gsub(/(\.should[^\(]+)\(this,\)/, '#{1}(this)');
      this.test = function() {
        eval('with(this){' + test + '}');
      };
    } else {
      this.test = test || Prototype.emptyFunction;
    }

    this.setup = setup || Prototype.emptyFunction;
    this.teardown = teardown || Prototype.emptyFunction;
    this.isWaiting = false;
    this.timeToWait = 1000;
  },
  wait: function(time, nextPart) {
    this.isWaiting = true;
    this.test = nextPart;
    this.timeToWait = time;
  },
  run: function() {
    try {
      try {
        if (!this.isWaiting) {
          this.setup.bind(this)();
        }
        this.isWaiting = false;
        this.test.bind(this)();
      } finally {
        if (!this.isWaiting) {
          this.teardown.bind(this)();
        }
      }
    } catch (e) {
      this.error(e);
    }
  }
});

// *EXPERIMENTAL* BDD-style testing to please non-technical folk
// This draws many ideas from RSpec http://rspec.rubyforge.org/

Test.setupBDDExtensionMethods = function() {
  var METHODMAP = {
    shouldEqual: 'assertEqual',
    shouldNotEqual: 'assertNotEqual',
    shouldEqualEnum: 'assertEnumEqual',
    shouldBeA: 'assertType',
    shouldNotBeA: 'assertNotOfType',
    shouldBeAn: 'assertType',
    shouldNotBeAn: 'assertNotOfType',
    shouldBeNull: 'assertNull',
    shouldNotBeNull: 'assertNotNull',

    shouldBe: 'assertReturnsTrue',
    shouldNotBe: 'assertReturnsFalse',
    shouldRespondTo: 'assertRespondsTo'
  };
  var makeAssertion = function(assertion, args, object) {
    this[assertion].apply(this, (args || []).concat([object]));
  };

  Test.BDDMethods = {};
  $H(METHODMAP).each(function(pair) {
    Test.BDDMethods[pair.key] = function() {
      var args = $A(arguments);
      var scope = args.shift();
      makeAssertion.apply(scope, [pair.value, args, this]);
    };
  });

  [Array.prototype, String.prototype, Number.prototype, Boolean.prototype].each(function(p) {
    Object.extend(p, Test.BDDMethods);
  });
};

Test.context = function(name, spec, log) {
  Test.setupBDDExtensionMethods();

  var compiledSpec = {};
  var titles = {};
  for (var specName in spec) {
    switch (specName) {
      case "setup":
      case "teardown":
        compiledSpec[specName] = spec[specName];
        break;
      default:
        var testName = 'test' + specName.gsub(/\s+/, '-').camelize();
        var body = spec[specName].toString().split('\n').slice(1);
        if (/^\{/.test(body[0])) {
          body = body.slice(1);
        }
        body.pop();
        body = body.map(function(statement) {
          return statement.strip();
        });
        compiledSpec[testName] = body.join('\n');
        titles[testName] = specName;
    }
  }
  new Test.Unit.Runner(compiledSpec, {
    titles: titles,
    testLog: log || 'testlog',
    context: name
  });
};
