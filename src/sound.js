/*global $, $$, $A, $R, Audio, Element, Prototype, Template */

// Copyright (c) 2005-2010 Thomas Fuchs (http://script.aculo.us, http://mir.aculo.us)
//
// Based on code created by Jules Gravinese (http://www.webveteran.com/)
//
// script.aculo.us is freely distributable under the terms of an MIT-style license.
// For details, see the script.aculo.us web site: http://script.aculo.us/

var Sound = {
  tracks: {},
  enabled: true,
  html5audio: !!window.Audio && new Audio().canPlayType,
  enable: function() {
    Sound.enabled = true;
  },
  disable: function() {
    Sound.enabled = false;
  },
  createElement: Prototype.Browser.IE ? (function(options) {
    return new Element('bgsound', {
      id: 'sound_' + options.track + '_' + options.id,
      src: options.url,
      loop: 1,
      autostart: true
    });
  }) : (function(options) {
    return this.template.evaluate(options);
  }),
  play: function(url, options) {
    if (!Sound.enabled) {
      return;
    }
    options = Object.extend({
      track: 'global',
      url: url,
      replace: false
    }, options || {});

    var sound;
    if (options.replace && this.tracks[options.track]) {
      $R(0, this.tracks[options.track].id).each(function(id) {
        sound = $('sound_' + options.track + '_' + id);
        if (Prototype.Browser.IE) {
          // mute bgsound - sometimes it replays while removing
          sound.volume = -10000;
        }
        if (sound.Stop) {
          sound.Stop();
        } else if (sound.pause) {
          sound.pause();
        }
        sound.remove();
      });
      this.tracks[options.track] = null;
    }

    if (this.tracks[options.track]) {
      this.tracks[options.track].id++;
    } else {
      this.tracks[options.track] = {
        id: 0
      };
    }

    options.id = this.tracks[options.track].id;
    sound = this.createElement(options);
    $$('body')[0].insert(sound);
  }
};

/*if (Sound.html5audio) {
  // in Firefox and Opera 12.X html5audio does not support mp3
  Sound.template = new Template('<audio id="sound_#{track}_#{id}" src="#{url}" preload="auto" autobuffer="autobuffer" autoplay="autoplay"><\/audio>');
  // Empty audio tag doesn't work in some browsers
} else*/ if (Prototype.Browser.Gecko && navigator.userAgent.indexOf("Win") > 0) {
  (function() {
    var plugins = navigator.plugins ? $A(navigator.plugins) : null;
    function plugin(name) {
      return plugins &&
      plugins.detect(function(p) {
        return p.name.indexOf(name) != -1;
      });
    }

    if (plugin('QuickTime')) {
      Sound.template = new Template('<object id="sound_#{track}_#{id}" width="0" height="0" type="audio/mpeg" data="#{url}"><\/object>');
    } else if (plugin('Windows Media')) {
      Sound.template = new Template('<object id="sound_#{track}_#{id}" type="application/x-mplayer2" data="#{url}"><\/object>');
    } else if (plugin('RealPlayer')) {
      Sound.template = new Template('<embed id="sound_#{track}_#{id}" type="audio/x-pn-realaudio-plugin" style="height:0" src="#{url}" loop="false" autostart="true" hidden="true"><\/embed>');
    } else {
      Sound.play = function() {
      };
    }
  })();
} else if (!Prototype.Browser.IE) {
  Sound.template = new Template('<embed id="sound_#{track}_#{id}" style="height:0" src="#{url}" loop="false" autostart="true" hidden="true"><\/embed>');
}

// TODO create container for all appended sound elements
// TODO remove container on window.onbeforeunload / window.onunload
