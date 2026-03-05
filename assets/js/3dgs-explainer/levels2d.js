(function() {
  var container = document.getElementById('levels-2d-chart');
  var slider = document.getElementById('levels-2d-level');
  var valueLabel = document.getElementById('levels-2d-value');

  if (!container || !slider || !valueLabel || typeof d3 === 'undefined') {
    return;
  }

  var margin = { top: 12, right: 12, bottom: 12, left: 12 };
  var xMin = -3;
  var xMax = 3;

  var svg = d3.select(container)
    .append('svg')
    .attr('role', 'img')
    .attr('aria-label', '2D level set ring');

  var plot = svg.append('g');
  var ring = plot.append('circle').attr('class', 'gs-ring');
  var centerDot = plot.append('circle').attr('class', 'gs-center');
  var radiusLabel = plot.append('text').attr('class', 'gs-ring-label');

  function update(xScale) {
    var c = Math.max(0.001, Math.min(1, parseFloat(slider.value)));
    valueLabel.textContent = c.toFixed(2);

    var radius = Math.sqrt(-2 * Math.log(c));
    if (!isFinite(radius)) {
      radius = 0;
    }

    var cx = xScale(0);
    var cy = xScale(0);
    var r = Math.max(0, xScale(radius) - xScale(0));

    ring.attr('cx', cx).attr('cy', cy).attr('r', r);
    centerDot.attr('cx', cx).attr('cy', cy).attr('r', 4);
    radiusLabel
      .attr('x', cx + r + 8)
      .attr('y', cy + 4)
      .text('r = ' + radius.toFixed(2));
  }

  function render() {
    var width = Math.max(260, container.clientWidth || 0);
    var height = width;
    svg.attr('width', width).attr('height', height);
    plot.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    var innerWidth = width - margin.left - margin.right;
    var xScale = d3.scaleLinear().domain([xMin, xMax]).range([0, innerWidth]);

    update(xScale);
  }

  var ro = new ResizeObserver(function() {
    render();
  });
  ro.observe(container);

  slider.addEventListener('input', function() {
    var width = Math.max(260, container.clientWidth || 0);
    var innerWidth = width - margin.left - margin.right;
    var xScale = d3.scaleLinear().domain([xMin, xMax]).range([0, innerWidth]);
    update(xScale);
  });

  render();
})();
