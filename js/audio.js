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
        fftSize: 2048 * 2,
        smoothingTimeConstant: 0.1,

        barGap: 1,
        barWidth: 2,

        gaussianRadius: 2,
        gaussianSigma: 1,
        sharpening: 4,
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

    this.kernel = this.gaussianKernel(config.gaussianRadius, config.gaussianSigma);
};
Visualizer.prototype = {
    init: function() {
        window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext;
        window.requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.msRequestAnimationFrame;
        window.cancelAnimationFrame = window.cancelAnimationFrame || window.webkitCancelAnimationFrame || window.mozCancelAnimationFrame || window.msCancelAnimationFrame;

        // setup audio analysis
        this.audioContext = new AudioContext();
        var input = this.audioContext.createMediaElementSource(this.audio);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.smoothingTimeConstant = this.config.smoothingTimeConstant;
        this.analyser.fftSize = this.config.fftSize;
        input.connect(this.analyser);
        input.connect(this.audioContext.destination);
    },
    gaussianKernel: function(radius, sigma) {
        var gaussianDistribution = function(d) {
            var n = 1.0 / (Math.sqrt(2 * Math.PI) * sigma);
            return Math.exp(-d*d/(2 * sigma * sigma)) * n;
        };
        var width = (radius * 2) + 1;
        var kernel = new Array(width);
        var sum = 0.0;
        for (var i = 0; i < width; i++) {
            kernel[i] = gaussianDistribution(i - radius);
            sum += kernel[i];
        }
        for (var i = 0; i < width; i++) {
            kernel[i] = kernel[i] / sum;
        }
        return kernel;
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

        // resample and lerp
        var barCount = canvas.width / (this.config.barWidth + this.config.barGap);
        var barInterval = this.config.barWidth + this.config.barGap;
        var bars = new Array(barCount);
        for (var i = 0; i < barCount; i++) {
            // Linear interpolation
            var index = this.logScale((i * array.length) / barCount, array.length);
            // var index = (i / barCount) * array.length;
            var indexLo = Math.floor(index);
            var indexHi = Math.ceil(index);
            var valueLo = array[indexLo];
            var valueHi = array[indexHi];
            var value = (index - indexLo) * valueHi + (indexHi - index) * valueLo;

            // Sharpening
            value = Math.pow(value / 255.0, this.config.sharpening) * 255.0;

            bars[i] = value;
        }


        // smoothing
        var bars2 = new Array(bars.length);
        for (var i = 0; i < bars.length; i++) {
            bars2[i] = 0.0;
            for (var j = -this.config.gaussianRadius; j<= this.config.gaussianRadius; j++) {
                var ind = i + j;
                if (ind >= 0 && ind < bars.length) {
                    bars2[i] += this.kernel[j + this.config.gaussianRadius] * bars[ind];
                }
            }
        }
        bars = bars2;

        // draw
        for (var i = 0; i < barCount; i++) {
            var value = bars[i];

            ctx.fillStyle = 'white';
            ctx.fillRect(i * barInterval, canvas.height - value, this.config.barWidth, canvas.height);
        }

        this.animationID = requestAnimationFrame(this.render.bind(this));
    },
}
