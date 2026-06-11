---
title: "Crosswind Component Explainer"
excerpt: "An interactive, self-drawing crosswind component chart paired with a live top-down runway scene — read headwind &amp; crosswind components, gusts, tailwinds, and windsocks, with a guided tour. ![Crosswind explainer — the component chart and the live runway scene](/images/xwind-teaser.png)"
collection: projects
link: /xwind/
---

A visual explainer that teaches pilots and the aviation-curious how to read the
classic **crosswind component chart** and connect it to what they'd actually see
out the window.

- **Interactive chart** — click an angle, drag the wind point, or grab the
  headwind/crosswind handles; the chart redraws the geometry live.
- **Live runway scene** — a top-down airfield that spins to the active runway,
  with three.js cloth windsocks, an ambient wind field, and the into-wind end
  marked for you.
- **Gusts & tailwinds** — see each component become a *range* between steady and
  peak, and watch the axis flip when the wind moves behind you.
- **Guided tour** — paged explainer panels with worked examples and real math
  (\\(c=\\sqrt{a^2+b^2}\\)), plus a windsock-reading tutorial.
- **Day / night** — a "backlit instrument" chart and a "night airfield" with
  runway lighting, and full reduced-motion support.

Built as a self-contained web app (plain HTML + ES modules, three.js, MathJax).

Try it [here.](/xwind/)
