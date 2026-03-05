(function () {
  var container = document.getElementById('gaussian1d-chart');
  var slider = document.getElementById('gaussian1d-mu');
  var varianceSlider = document.getElementById('gaussian1d-variance');
  var valueLabel = document.getElementById('gaussian1d-mu-value');
  var equation = document.getElementById('gaussian1d-equation');
  var muSliderLabel = document.getElementById('gaussian1d-mu-label');
  var varianceSliderLabel = document.getElementById('gaussian1d-variance-label');
  var varianceValueLabel = document.getElementById('gaussian1d-variance-value');
  var axisXLabel = null;
  var axisYLabel = null;
  var muLabelKatex = null;

  if (!container || !slider || !varianceSlider || !valueLabel || !varianceValueLabel || typeof d3 === 'undefined') {
    return;
  }

  var height = 260;
  var margin = { top: 20, right: 24, bottom: 40, left: 82 };
  var sigma = 1;
  var mu = 0;
  var xMin = -3;
  var xMax = 3;

  var svg = d3.select(container)
    .append('svg')
    .attr('role', 'img')
    .attr('aria-label', '1D Gaussian curve with level set points');

  var plot = svg.append('g');
  var xAxisGroup = plot.append('g').attr('class', 'gs-axis');
  var yAxisGroup = plot.append('g').attr('class', 'gs-axis');
  var curvePath = plot.append('path').attr('class', 'gs-gaussian');
  var muLine = plot.append('line').attr('class', 'gs-mu-line');
  var muLabel = plot.append('text').attr('class', 'gs-mu-label');
  var xLabel = plot.append('text').attr('class', 'gs-axis-label');
  var yLabel = plot.append('text').attr('class', 'gs-axis-label');

  function gaussian(x) {
    var variance = sigma * sigma;
    var t = x - mu;
    return Math.exp(-0.5 * (t * t) / variance);
  }

  function buildData() {
    var data = [];
    var steps = 240;
    var step = (xMax - xMin) / steps;
    for (var i = 0; i <= steps; i += 1) {
      var x = xMin + step * i;
      data.push({ x: x, y: gaussian(x) });
    }
    return data;
  }

  var data = buildData();
  var hasAnimated = false;

  function resize() {
    var width = Math.max(280, container.clientWidth || 0);
    svg.attr('width', width).attr('height', height);
    plot.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    var innerWidth = width - margin.left - margin.right;
    var innerHeight = height - margin.top - margin.bottom;

    var xScale = d3.scaleLinear().domain([xMin, xMax]).range([0, innerWidth]);
    var yScale = d3.scaleLinear().domain([0, 1]).range([innerHeight, 0]);

    var line = d3.line()
      .x(function (d) { return xScale(d.x); })
      .y(function (d) { return yScale(d.y); });

    curvePath.attr('d', line(data));
    xAxisGroup.attr('transform', 'translate(0,' + innerHeight + ')').call(d3.axisBottom(xScale).ticks(6));
    yAxisGroup.call(d3.axisLeft(yScale).ticks(4));

    xLabel
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 32)
      .attr('text-anchor', 'middle')
      .text('x');

    yLabel
      .attr('transform', 'translate(' + (-66) + ',' + (innerHeight / 2) + ') rotate(-90)')
      .attr('text-anchor', 'middle')
      .text('g(x)');

    updateCurve(xScale, yScale, innerHeight);
    if (!hasAnimated) {
      animateDraw();
      hasAnimated = true;
    }
  }

  function updateCurve(xScale, yScale, innerHeight) {
    mu = parseFloat(slider.value);
    sigma = Math.max(0.2, Math.sqrt(parseFloat(varianceSlider.value)));
    valueLabel.textContent = mu.toFixed(2);
    varianceValueLabel.textContent = (sigma * sigma).toFixed(2);
    data = buildData();

    var line = d3.line()
      .x(function (d) { return xScale(d.x); })
      .y(function (d) { return yScale(d.y); });

    curvePath.attr('d', line(data));

    var peakY = gaussian(mu) * 0.94;
    var xPos = xScale(mu);
    muLine
      .attr('x1', xPos)
      .attr('x2', xPos)
      .attr('y1', yScale(peakY))
      .attr('y2', yScale(0));
    muLabel
      .attr('x', xPos)
      .attr('y', yScale(peakY) - 20)
      .attr('text-anchor', 'middle')
      .text(window.katex ? '' : 'μ');

    updateKatexLabels(innerHeight, xPos, yScale(peakY) - 12, xScale(0));
  }

  var ro = new ResizeObserver(function () {
    resize();
  });
  ro.observe(container);

  function animateDraw() {
    var totalLength = curvePath.node().getTotalLength();
    curvePath
      .attr('stroke-dasharray', totalLength + ' ' + totalLength)
      .attr('stroke-dashoffset', totalLength)
      .transition()
      .duration(1200)
      .ease(d3.easeCubicOut)
      .attr('stroke-dashoffset', 0);
  }

  function handleInput() {
    var width = Math.max(280, container.clientWidth || 0);
    var innerWidth = width - margin.left - margin.right;
    var innerHeight = height - margin.top - margin.bottom;
    var xScale = d3.scaleLinear().domain([xMin, xMax]).range([0, innerWidth]);
    var yScale = d3.scaleLinear().domain([0, 1]).range([innerHeight, 0]);
    updateCurve(xScale, yScale, innerHeight);
  }

  slider.addEventListener('input', handleInput);
  varianceSlider.addEventListener('input', handleInput);

  resize();

  function ensureKatexOverlays() {
    container.style.position = 'relative';

    if (!axisXLabel) {
      axisXLabel = document.createElement('div');
      axisXLabel.className = 'gs-axis-katex gs-axis-katex--x';
      container.appendChild(axisXLabel);
    }

    if (!axisYLabel) {
      axisYLabel = document.createElement('div');
      axisYLabel.className = 'gs-axis-katex gs-axis-katex--y';
      container.appendChild(axisYLabel);
    }

    if (!muLabelKatex) {
      muLabelKatex = document.createElement('div');
      muLabelKatex.className = 'gs-axis-katex gs-axis-katex--mu';
      container.appendChild(muLabelKatex);
    }
  }

  function updateKatexLabels(innerHeight, muX, muY, zeroX) {
    if (!window.katex) {
      return;
    }

    ensureKatexOverlays();

    var width = Math.max(280, container.clientWidth || 0);
    var innerWidth = width - margin.left - margin.right;

    xLabel.attr('opacity', 0);
    yLabel.attr('opacity', 0);
    muLabel.attr('opacity', 0);

    window.katex.render(String.raw`{\color{#1b6d85}{x}}`, axisXLabel, { throwOnError: false });
    window.katex.render(String.raw`g({\color{#1b6d85}{x}})`, axisYLabel, { throwOnError: false });
    window.katex.render(String.raw`{\color{#d9643a}{\mu}}`, muLabelKatex, { throwOnError: false });

    axisXLabel.style.left = (margin.left + zeroX + 15) + 'px';
    axisXLabel.style.top = (margin.top + innerHeight + 52) + 'px';
    axisYLabel.style.left = (margin.left - 56) + 'px';
    axisYLabel.style.top = (margin.top + innerHeight / 2 - 4) + 'px';

    muLabelKatex.style.left = (margin.left + muX + 15) + 'px';
    muLabelKatex.style.top = (margin.top + muY - 2) + 'px';
  }

  function renderEquation() {
    if (!equation) {
      return;
    }
    if (window.katex) {
      window.katex.render(
        String.raw`g({\color{#1b6d85}{x}}) = \exp\left(-\frac{({\color{#1b6d85}{x}}-{\color{#d9643a}{\mu}})^2}{2{\color{#6b4ca3}{\sigma^2}}}\right),\; {\color{#1b6d85}{x}} \in \mathbb{R}`,
        equation,
        { throwOnError: false, trust: true, strict: "ignore" }
      );
    } else {
      equation.textContent = 'g(x) = exp(-1/2 (x - μ)^2), x ∈ R';
    }
  }

  function waitForKatex(tries) {
    if (window.katex || tries <= 0) {
      renderEquation();
      if (window.katex && muSliderLabel) {
        window.katex.render('\\mu', muSliderLabel, { throwOnError: false });
      }
      if (window.katex && varianceSliderLabel) {
        window.katex.render('\\sigma^2', varianceSliderLabel, { throwOnError: false });
      }
      return;
    }
    setTimeout(function () {
      waitForKatex(tries - 1);
    }, 80);
  }

  waitForKatex(20);
})();
