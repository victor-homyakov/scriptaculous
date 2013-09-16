// transitions.js
// Based on Easing Equations v2.0 (c) 2003 Robert Penner, all rights reserved.
// This work is subject to the terms in http://www.robertpenner.com/easing_terms_of_use.html
// Adapted for Scriptaculous by Ken Snyder (kendsnyder ~at~ gmail ~dot~ com) June 2006

/*global Effect */

if (Object.isUndefined(Effect)) {
  throw ("transitions.js requires including script.aculo.us' effects.js library");
}

/*
 Overshooting Transitions

 s controls the amount of overshoot: higher s means greater overshoot
 s has a default value of 1.70158, which produces an overshoot of 10 percent
 s==0 produces cubic easing with no overshoot
 */
// Elastic (adapted from "EaseOutElastic")
Effect.Transitions.Elastic = function(pos) {
  return 1 - Math.pow(4, -8 * pos) * Math.sin((pos * 6 - 1) * Math.PI);
};
// SwingFromTo (adapted from "BackEaseInOut")
Effect.Transitions.SwingFromTo = function(pos) {
  var s = 1.70158;
  if ((pos *= 2) < 1) {
    return pos * pos * (((s *= (1.525)) + 1) * pos - s) / 2;
  }
  return ((pos -= 2) * pos * (((s *= (1.525)) + 1) * pos + s) + 2) / 2;
};
// SwingFrom (adapted from "BackEaseIn")
Effect.Transitions.SwingFrom = function(pos) {
  var s = 1.70158;
  return pos * pos * ((s + 1) * pos - s);
};
// SwingTo (adapted from "BackEaseOut")
Effect.Transitions.SwingTo = function(pos) {
  var s = 1.70158;
  return (pos -= 1) * pos * ((s + 1) * pos + s) + 1;
};

/*
 Bouncing Transitions
 */
// Bounce (adapted from "EaseOutBounce")
Effect.Transitions.Bounce = function(pos) {
  if (pos < (1 / 2.75)) {
    return (7.5625 * pos * pos);
  } else if (pos < (2 / 2.75)) {
    return (7.5625 * (pos -= (1.5 / 2.75)) * pos + 0.75);
  } else if (pos < (2.5 / 2.75)) {
    return (7.5625 * (pos -= (2.25 / 2.75)) * pos + 0.9375);
  } else {
    return (7.5625 * (pos -= (2.625 / 2.75)) * pos + 0.984375);
  }
};
// BouncePast (new creation based on "EaseOutBounce")
Effect.Transitions.BouncePast = function(pos) {
  if (pos < (1 / 2.75)) {
    return (7.5625 * pos * pos);
  } else if (pos < (2 / 2.75)) {
    return 2 - (7.5625 * (pos -= (1.5 / 2.75)) * pos + 0.75);
  } else if (pos < (2.5 / 2.75)) {
    return 2 - (7.5625 * (pos -= (2.25 / 2.75)) * pos + 0.9375);
  } else {
    return 2 - (7.5625 * (pos -= (2.625 / 2.75)) * pos + 0.984375);
  }
};

/*
 Gradual Transitions
 */
// EaseFromTo (adapted from "Quart.EaseInOut")
Effect.Transitions.EaseFromTo = function(pos) {
  if ((pos *= 2) < 1) {
    return Math.pow(pos, 4) / 2;
  }
  return 1 - (pos -= 2) * Math.pow(pos, 3) / 2;
};
// EaseFrom (adapted from "Quart.EaseIn")
Effect.Transitions.EaseFrom = function(pos) {
  return Math.pow(pos, 4);
};
// EaseTo (adapted from "Quart.EaseOut")
Effect.Transitions.EaseTo = function(pos) {
  return Math.pow(pos, 0.25);
};
