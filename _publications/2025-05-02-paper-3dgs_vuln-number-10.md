---
title: "3D Gaussian Splat Vulnerabilities"
authors: "Matthew Hull, Haoyang Yang, Pratham Mehta, Mansi Phute, Aeree Cho, Haoran Wang, Matthew Lau, Wenke Lee, Willian Lunardi, Martin Andreoni, and Duen Horng Chau"
venue: "CVPR Workshop on Neural Fields Beyond Conventional Cameras (NFBCC)"
venue-shorthand: CVPR'25
location: Nashville, TN
featured: true
year: 2025
pdf: https://poloclub.github.io/papers/25-cvpr-nfbcc-workshop-3dgs-attack.pdf
paper-home: https://poloclub.github.io/papers/25-cvpr-nfbcc-workshop-3dgs-attack.pdf
github: https://github.com/poloclub/3d-gaussian-splat-attack
icon: 3dgs-vulnerabilities.png
icon-fit: cover
brand: 3DGS Vulnerabilities
poster: https://poloclub.github.io/papers/25-cvpr-nfbcc-workshop-3dgs-attack-poster.pdf
collaboration: TII
excerpt: "3D Gaussian splats easily attacked"
pub-type: "workshop"
bibtex: |-
  @misc{hull20253dgsvulnerabilities,
    title={3D Gaussian Splat Vulnerabilities}, 
    author={Matthew Hull and Haoyang Yang and Pratham Mehta and Mansi Phute and Aeree Cho and Haoran Wang and Matthew Lau and Wenke Lee and Willian Lunardi and Martin Andreoni and Duen Horng Chau},
    booktitle = {CVPR Workshop on Neural Fields Beyond Conventional Cameras},
    year={2025},
    url={https://arxiv.org/pdf/2506.00280}
  }
---
Abstract: With 3D Gaussian Splatting (3DGS) being increasingly used in safety-critical applications, how can an adversary manipulate the scene to cause harm? We introduce CLOAK, the first attack that leverages view-dependent Gaussian appearances—colors and textures that change with viewing angle—to embed adversarial content visible only from specific viewpoints. We further demonstrate DAGGER, a targeted adversarial attack directly perturbing 3D Gaussians without access to underlying training data, deceiving multi-stage object detectors e.g., Faster R-CNN, through established methods such as projected gradient descent. These attacks highlight underexplored vulnerabilities in 3DGS, introducing a new potential threat to robotic learning for autonomous navigation and other safety-critical 3DGS applications.