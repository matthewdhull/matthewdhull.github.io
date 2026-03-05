(function () {
  var container = document.getElementById('gaussian2d-chart');

  if (!container || typeof d3 === 'undefined') {
    return;
  }

  var margin = { top: 16, right: 16, bottom: 44, left: 56 };
  var xMin = -3;
  var xMax = 3;
  var yMin = -3;
  var yMax = 3;
  var gridSize = 140;

  var svg = d3.select(container)
    .append('svg')
    .attr('role', 'img')
    .attr('aria-label', '2D Gaussian heatmap with fading level set rings');

  var plot = svg.append('g');
  var heatLayer = plot.append('g').attr('class', 'gs-heatmap-smooth');
  var axisLayer = plot.append('g').attr('class', 'gs-axis');
  var ringLayer = plot.append('g').attr('class', 'gs-fade-rings');

  var axisXLabel = null;
  var axisYLabel = null;

  function gaussian2d(x, y) {
    return Math.exp(-0.5 * (x * x + y * y));
  }

  function buildGrid() {
    var data = [];
    var stepX = (xMax - xMin) / gridSize;
    var stepY = (yMax - yMin) / gridSize;
    for (var i = 0; i < gridSize; i += 1) {
      for (var j = 0; j < gridSize; j += 1) {
        var x = xMin + stepX * (i + 0.5);
        var y = yMin + stepY * (j + 0.5);
        data.push({ x: x, y: y, value: gaussian2d(x, y) });
      }
    }
    return data;
  }

  var gridData = buildGrid();
  var color = d3.scaleSequential(function (t) {
    return d3.interpolateRgb('#ffffff', '#f2a65a')(t);
  }).domain([0, 1]);
  var ringRadii = [0.5, 1, 1.5, 2, 2.5];
  var ringNodes = [];
  var ringTimer = null;

  function ensureAxisLabels() {
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
  }

  function updateAxisLabels(innerWidth, innerHeight, zeroX, zeroY) {
    if (!window.katex) {
      return;
    }

    ensureAxisLabels();

    window.katex.render(String.raw`x_1`, axisXLabel, { throwOnError: false });
    window.katex.render(String.raw`x_2`, axisYLabel, { throwOnError: false });

    axisXLabel.style.left = (margin.left + zeroX) + 'px';
    axisXLabel.style.top = (margin.top + innerHeight + 34) + 'px';
    axisYLabel.style.left = (margin.left - 44) + 'px';
    axisYLabel.style.top = (margin.top + zeroY) + 'px';
  }

  function drawAxes(xScale, yScale, innerWidth, innerHeight) {
    axisLayer.selectAll('*').remove();

    axisLayer.append('g')
      .attr('transform', 'translate(0,' + yScale(0) + ')')
      .call(d3.axisBottom(xScale).ticks(6));

    axisLayer.append('g')
      .attr('transform', 'translate(' + xScale(0) + ',0)')
      .call(d3.axisLeft(yScale).ticks(6));

    updateAxisLabels(
      innerWidth,
      innerHeight,
      xScale(0),
      yScale(0)
    );
  }

  function drawHeatmap(xScale, yScale, innerWidth, innerHeight) {
    var cellWidth = innerWidth / gridSize;
    var cellHeight = innerHeight / gridSize;

    var cells = heatLayer.selectAll('rect').data(gridData);
    cells.exit().remove();
    cells.enter().append('rect')
      .merge(cells)
      .attr('x', function (d) { return xScale(d.x) - cellWidth / 2; })
      .attr('y', function (d) { return yScale(d.y) - cellHeight / 2; })
      .attr('width', cellWidth + 0.6)
      .attr('height', cellHeight + 0.6)
      .attr('fill', function (d) { return color(d.value); });
  }

  function setupFadeRings(xScale) {
    ringNodes = ringRadii.map(function (radius) {
      var existing = ringLayer.select('circle[data-radius="' + radius + '"]');
      if (existing.empty()) {
        existing = ringLayer.append('circle')
          .attr('class', 'gs-fade-ring')
          .attr('data-radius', radius);
      }

      var r = Math.max(0, xScale(radius) - xScale(0));
      existing
        .attr('cx', xScale(0))
        .attr('cy', xScale(0))
        .attr('r', r)
        .attr('opacity', 0);

      return existing;
    });
  }

  function animateRing(index, fadeIn, fadeOut, delay) {
    if (!ringNodes[index]) {
      return;
    }
    ringNodes[index]
      .interrupt()
      .attr('opacity', 0)
      .transition()
      .delay(delay)
      .duration(fadeIn)
      .ease(d3.easeQuadOut)
      .attr('opacity', 0.65)
      .transition()
      .duration(fadeOut)
      .ease(d3.easeCubicOut)
      .attr('opacity', 0.06);
  }

  function startRingSequence() {
    if (ringTimer) {
      clearTimeout(ringTimer);
    }

    var fadeIn = 260;
    var fadeOut = 3600;
    var delayStep = 820;
    var totalDuration = delayStep * ringRadii.length + fadeOut - 700;

    ringRadii.forEach(function (_, idx) {
      animateRing(idx, fadeIn, fadeOut, idx * delayStep);
    });

    ringTimer = setTimeout(function () {
      startRingSequence();
    }, totalDuration);
  }

  function render() {
    var width = Math.max(300, container.clientWidth || 0);
    var height = width;
    svg.attr('width', width).attr('height', height);
    plot.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    var innerWidth = width - margin.left - margin.right;
    var innerHeight = height - margin.top - margin.bottom;

    var xScale = d3.scaleLinear().domain([xMin, xMax]).range([0, innerWidth]);
    var yScale = d3.scaleLinear().domain([yMin, yMax]).range([innerHeight, 0]);

    drawHeatmap(xScale, yScale, innerWidth, innerHeight);
    drawAxes(xScale, yScale, innerWidth, innerHeight);
    setupFadeRings(xScale);
    startRingSequence();
  }

  var ro = new ResizeObserver(function () {
    render();
  });
  ro.observe(container);

  render();
})();
