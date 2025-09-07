---
title: "ComplicitSplat: Downstream Models are Vulnerable to Blackbox Attacks by 3D Gaussian Splat Camouflages"
authors: "Matthew Hull, Haoyang Yang, Pratham Mehta, Mansi Phute, Aeree Cho, Haoran Wang, Matthew Lau, Wenke Lee, Willian Lunardi, Martin Andreoni, and Duen Horng Chau"
venue: "arXiv"
venue-shorthand: arXiv
# location: 
featured: false
year: 2025
pdf: https://arxiv.org/pdf/2508.11854
paper-home: https://arxiv.org/pdf/2508.11854
github: https://github.com/poloclub/complicit-splat
# icon: 3dgs-vulnerabilities.png
# icon-fit: cover
# brand: 3DGS Vulnerabilities
# poster: 
collaboration: TII
excerpt: "Downstream models are vulnerable to blackbox attacks by 3dgs camouflages"
pub-type: "preprint"
bibtex: |-
  @misc{hull2025complicitsplat,
    title={ComplicitSplat: Downstream Models are Vulnerable to Blackbox Attacks by 3D Gaussian Splat Camouflages}, 
    author={Matthew Hull and Haoyang Yang and Pratham Mehta and Mansi Phute and Aeree Cho and Haoran Wang and Matthew Lau and Wenke Lee and Willian Lunardi and Martin Andreoni and Duen Horng Chau},
    booktitle = {arXiv},
    year={2025},
    url={https://arxiv.org/pdf/2508.11854}
  }
---
Abstract: As 3D Gaussian Splatting (3DGS) gains rapid adoption in safety-critical tasks for efficient novel-view synthesis from static images, how might an adversary tamper images to cause harm? We introduce ComplicitSplat, the first attack that exploits standard 3DGS shading methods to create viewpoint-specific camouflage - colors and textures that change with viewing angle - to embed adversarial content in scene objects that are visible only from specific viewpoints and without requiring access to model architecture or weights. Our extensive experiments show that ComplicitSplat generalizes to successfully attack a variety of popular detector - both single-stage, multi-stage, and transformer-based models on both real-world capture of physical objects and synthetic scenes. To our knowledge, this is the first black-box attack on downstream object detectors using 3DGS, exposing a novel safety risk for applications like autonomous navigation and other mission-critical robotic systems