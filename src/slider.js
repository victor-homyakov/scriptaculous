/*global $, $R, Class, Element, Event, Prototype */

// Copyright (c) 2005-2010 Marty Haught, Thomas Fuchs
//
// script.aculo.us is freely distributable under the terms of an MIT-style license.
// For details, see the script.aculo.us web site: http://script.aculo.us/

window.Control = window.Control || {};

// options:
//  axis: 'vertical', or 'horizontal' (default)
//
// callbacks:
//  onChange(value)
//  onSlide(value)
window.Control.Slider = Class.create({
  initialize: function(handle, track, options) {
    if (Object.isArray(handle)) {
      this.handles = handle.collect(function(e) {
        return $(e);
      });
    } else {
      this.handles = [$(handle)];
    }

    this.track = $(track);
    options = options || {};
    this.options = options;

    this.axis = options.axis || 'horizontal';
    this.increment = options.increment || 1;
    this.step = parseInt(options.step || '1', 10);
    this.range = options.range || $R(0, 1);

    this.value = 0; // assure backwards compat
    this.values = this.handles.map(function() {
      return 0;
    });
    this.spans = options.spans ? options.spans.map(function(s) {
      return $(s);
    }) : false;
    options.startSpan = $(options.startSpan || null);
    options.endSpan = $(options.endSpan || null);

    this.restricted = options.restricted || false;

    this.maximum = options.maximum || this.range.end;
    this.minimum = options.minimum || this.range.start;

    // Will be used to align the handle onto the track, if necessary
    this.alignX = parseInt(options.alignX || '0', 10);
    this.alignY = parseInt(options.alignY || '0', 10);

    this.trackLength = this.maximumOffset() - this.minimumOffset();
    this.handleLength = this.elementOffset(this.handles[0]);

    this.active = this.dragging = this.disabled = false;

    if (options.disabled) {
      this.setDisabled();
    }

    // Allowed values array
    this.allowedValues = options.values ? options.values.sortBy(Prototype.K) : false;
    if (this.allowedValues) {
      this.minimum = this.allowedValues.min();
      this.maximum = this.allowedValues.max();
    }

    this.eventMouseDown = this.startDrag.bind(this);
    this.eventMouseUp = this.endDrag.bind(this);
    this.eventMouseMove = this.update.bind(this);

    // Initialize handles in reverse (make sure first handle is active)
    var value = options.sliderValue;
    this.handles.each(function(h, i) {
      i = this.handles.length - 1 - i;
      this.setValue(parseFloat((Object.isArray(value) ? value[i] : value) || this.range.start), i);
      h.makePositioned().observe("mousedown", this.eventMouseDown);
    }, this);

    this.track.observe("mousedown", this.eventMouseDown);
    document.observe("mouseup", this.eventMouseUp);
    document.observe("mousemove", this.eventMouseMove);

    this.initialized = true;
  },
  dispose: function() {
    var slider = this;
    Event.stopObserving(this.track, "mousedown", this.eventMouseDown);
    Event.stopObserving(document, "mouseup", this.eventMouseUp);
    Event.stopObserving(document, "mousemove", this.eventMouseMove);
    this.handles.invoke("stopObserving", "mousedown", slider.eventMouseDown);
  },
  setDisabled: function() {
    this.disabled = true;
  },
  setEnabled: function() {
    this.disabled = false;
  },
  getNearestValue: function(value) {
    if (this.allowedValues) {
      if (value >= this.allowedValues.max()) {
        return (this.allowedValues.max());
      }
      if (value <= this.allowedValues.min()) {
        return (this.allowedValues.min());
      }

      var offset = Math.abs(this.allowedValues[0] - value);
      var newValue = this.allowedValues[0];
      this.allowedValues.each(function(v) {
        var currentOffset = Math.abs(v - value);
        if (currentOffset <= offset) {
          newValue = v;
          offset = currentOffset;
        }
      });
      return newValue;
    }
    return (value > this.range.end) ? this.range.end : ((value < this.range.start) ? this.range.start : value);
  },
  setValue: function(sliderValue, handleIdx) {
    if (!this.active) {
      this.activeHandleIdx = handleIdx || 0;
      this.activeHandle = this.handles[this.activeHandleIdx];
      this.updateStyles();
    }
    handleIdx = handleIdx || this.activeHandleIdx || 0;
    if (this.initialized && this.restricted) {
      if ((handleIdx > 0) && (sliderValue < this.values[handleIdx - 1])) {
        sliderValue = this.values[handleIdx - 1];
      }
      if ((handleIdx < (this.handles.length - 1)) && (sliderValue > this.values[handleIdx + 1])) {
        sliderValue = this.values[handleIdx + 1];
      }
    }
    sliderValue = this.getNearestValue(sliderValue);
    this.values[handleIdx] = sliderValue;
    this.value = this.values[0]; // assure backwards compat
    this.handles[handleIdx].style[this.isVertical() ? 'top' : 'left'] = this.translateToPx(sliderValue);

    this.drawSpans();
    if (!this.dragging || !this.event) {
      this.updateFinished();
    }
  },
  setValueBy: function(delta, handleIdx) {
    this.setValue(this.values[handleIdx || this.activeHandleIdx || 0] + delta, handleIdx || this.activeHandleIdx || 0);
  },
  translateToPx: function(value) {
    return Math.round(((this.trackLength - this.handleLength) / (this.range.end - this.range.start)) * (value - this.range.start)) + "px";
  },
  translateToValue: function(offset) {
    return ((offset / (this.trackLength - this.handleLength) * (this.range.end - this.range.start)) + this.range.start);
  },
  getRange: function(range) {
    var v = this.values.sortBy(Prototype.K);
    range = range || 0;
    return $R(v[range], v[range + 1]);
  },
  minimumOffset: function() {
    return (this.isVertical() ? this.alignY : this.alignX);
  },
  maximumOffset: function() {
    return this.elementOffset(this.track) - (this.isVertical() ? this.alignY : this.alignX);
  },
  elementOffset: function(e) {
    return (this.isVertical() ? (e.offsetHeight != 0 ? e.offsetHeight : e.style.height.replace(/px$/, "")) : (e.offsetWidth != 0 ? e.offsetWidth : e.style.width.replace(/px$/, "")));
  },
  isVertical: function() {
    return (this.axis == 'vertical');
  },
  drawSpans: function() {
    if (this.spans) {
      $R(0, this.spans.length - 1).each(function(r) {
        this.setSpan(this.spans[r], this.getRange(r));
      }, this);
    }
    if (this.options.startSpan) {
      this.setSpan(this.options.startSpan, $R(0, this.values.length > 1 ? this.getRange(0).min() : this.value));
    }
    if (this.options.endSpan) {
      this.setSpan(this.options.endSpan, $R(this.values.length > 1 ? this.getRange(this.spans.length - 1).max() : this.value, this.maximum));
    }
  },
  setSpan: function(span, range) {
    if (this.isVertical()) {
      span.style.top = this.translateToPx(range.start);
      span.style.height = this.translateToPx(range.end - range.start + this.range.start);
    } else {
      span.style.left = this.translateToPx(range.start);
      span.style.width = this.translateToPx(range.end - range.start + this.range.start);
    }
  },
  updateStyles: function() {
    this.handles.invoke('removeClassName', 'selected');
    Element.addClassName(this.activeHandle, 'selected');
  },
  startDrag: function(event) {
    if (Event.isLeftClick(event)) {
      if (!this.disabled) {
        this.active = true;

        var handle = Event.element(event), pointer = [Event.pointerX(event), Event.pointerY(event)], track = handle, offsets;
        if (track == this.track) {
          offsets = this.track.cumulativeOffset();
          this.event = event;
          this.setValue(this.translateToValue((this.isVertical() ? pointer[1] - offsets[1] : pointer[0] - offsets[0]) - (this.handleLength / 2)));
          offsets = this.activeHandle.cumulativeOffset();
          this.offsetX = (pointer[0] - offsets[0]);
          this.offsetY = (pointer[1] - offsets[1]);
        } else {
          // find the handle (prevents issues with Safari)
          while (!this.handles.include(handle) && handle.parentNode) {
            handle = handle.parentNode;
          }

          if (this.handles.include(handle)) {
            this.activeHandle = handle;
            this.activeHandleIdx = this.handles.indexOf(this.activeHandle);
            this.updateStyles();

            offsets = this.activeHandle.cumulativeOffset();
            this.offsetX = (pointer[0] - offsets[0]);
            this.offsetY = (pointer[1] - offsets[1]);
          }
        }
      }
      Event.stop(event);
    }
  },
  update: function(event) {
    if (this.active) {
      this.dragging = true;
      this.draw(event);
      if (Prototype.Browser.WebKit) {
        window.scrollBy(0, 0);
      }
      Event.stop(event);
    }
  },
  draw: function(event) {
    var offsets = this.track.cumulativeOffset(), pointer = [Event.pointerX(event) - this.offsetX - offsets[0], Event.pointerY(event) - this.offsetY - offsets[1]];
    this.event = event;
    this.setValue(this.translateToValue(this.isVertical() ? pointer[1] : pointer[0]));
    if (this.initialized && this.options.onSlide) {
      this.options.onSlide(this.values.length > 1 ? this.values : this.value, this);
    }
  },
  endDrag: function(event) {
    if (this.active && this.dragging) {
      this.finishDrag(event, true);
      Event.stop(event);
    }
    this.active = this.dragging = false;
  },
  finishDrag: function(event, success) {
    this.active = this.dragging = false;
    this.updateFinished();
  },
  updateFinished: function() {
    if (this.initialized && this.options.onChange) {
      this.options.onChange(this.values.length > 1 ? this.values : this.value, this);
    }
    this.event = null;
  }
});
