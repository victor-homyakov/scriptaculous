/*global $, Effect */
if (Object.isUndefined(Effect)) {
  throw new Error("effects-extensions.js requires including script.aculo.us' effects.js library");
}

Effect.SlideLeftOut = function(element, options) {
  element = $(element).makeClipping();
  return new Effect.Scale(element, 0, Object.extend({
    scaleContent: false,
    scaleY: false,
    restoreAfterFinish: true,
    afterFinishInternal: function(effect) {
      effect.element.hide().undoClipping();
    }
  }, options || {}));
};

Effect.SlideLeftIn = function(element, options) {
  element = $(element);
  var elementDimensions = element.getDimensions();
  return new Effect.Scale(element, 100, Object.extend({
    scaleContent: false,
    scaleY: false,
    scaleFrom: 0,
    scaleMode: {
      originalHeight: elementDimensions.height,
      originalWidth: elementDimensions.width
    },
    restoreAfterFinish: true,
    afterSetup: function(effect) {
      effect.element.makeClipping().setStyle({
        //height: '0px'
        width: '0px'
      }).show();
    },
    afterFinishInternal: function(effect) {
      effect.element.undoClipping();
    }
  }, options || {}));
};
