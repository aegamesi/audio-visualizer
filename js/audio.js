// references:
// https://github.com/wayou/HTML5_Audio_Visualizer
// https://academo.org/demos/spectrum-analyzer/

$(document).ready(function() {
    var audioPlayer = $('#audio-player');
    var audio = audioPlayer[0];
    var audioInput = $("#audio-file");
    audioInput.on("change", function(e) {
        audio.pause();

        // see http://lostechies.com/derickbailey/2013/09/23/getting-audio-file-information-with-htmls-file-api-and-audio-element/
        var file = e.currentTarget.files[0];
        var objectUrl = URL.createObjectURL(file);
        audio.src = objectUrl;
    });

    var canvas = $('#canvas')[0];

    var visualizer = new Visualizer({
        audio: audio,
        canvas: canvas,
        fftSize: 8192,
        smoothingTimeConstant: 0,

        barGap: 1,
        barWidth: 2,
    });
    visualizer.init();

    audio.onplay = function() {
        visualizer.render();
    };
    audio.onpause = function() {
        visualizer.stop();
    };
});

window.onload = function() {
    // new Visualizer().ini();
};
var Visualizer = function(config) {
    this.config = config;
    this.audio = config.audio;
    this.canvas = config.canvas;
    this.animationId = null;
    this.analyser = null;
};
Visualizer.prototype = {
    init: function() {
        window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext;
        window.requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.msRequestAnimationFrame;
        window.cancelAnimationFrame = window.cancelAnimationFrame || window.webkitCancelAnimationFrame || window.mozCancelAnimationFrame || window.msCancelAnimationFrame;
        this.audioContext = new AudioContext();

        var input = this.audioContext.createMediaElementSource(this.audio);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.smoothingTimeConstant = this.config.smoothingTimeConstant;
        this.analyser.fftSize = this.config.fftSize;

        input.connect(this.analyser);
        input.connect(this.audioContext.destination);
    },
    logBase: function(val, base) {
        return Math.log(val) / Math.log(base);
    },
    logScale: function(index, total, opt_base) {
        var base = opt_base || 2;
        var logmax = this.logBase(total + 1, base);
        var exp = logmax * index / total;
        return Math.pow(base, exp) - 1;
    },
    stop: function() {
        window.cancelAnimationFrame(this.animationID);
    },
    render: function() {
        var ctx = this.canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        var array = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(array);

        var barCount = canvas.width / (this.config.barWidth + this.config.barGap);
        var barInterval = this.config.barWidth + this.config.barGap;
        for (var i = 0; i < barCount; i++) {
            // Linear interpolation
            var index = this.logScale((i * array.length) / barCount, array.length);
            var indexLo = Math.floor(index);
            var indexHi = Math.ceil(index);
            var valueLo = array[indexLo];
            var valueHi = array[indexHi];
            var value = (index - indexLo) * valueHi + (indexHi - index) * valueLo;


            /*for (var j = -3; j < 3; j++) {
                var j2 = j + index;
                if (j2 >= 0 && j2 < array.length) {
                    value += kernel[j + 3] * array[j2];
                }
            }*/
            //value = array[(((i*step) / array.length) ** (1 / 2.0)) * array.length];

            var sharpening = 4.0;
            value = Math.pow(value, sharpening) / Math.pow(256.0, sharpening - 1.0);

            ctx.fillStyle = 'white';
            ctx.fillRect(i * barInterval, canvas.height - value, this.config.barWidth, canvas.height);
        }

        this.animationID = requestAnimationFrame(this.render.bind(this));
    },
}
