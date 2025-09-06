---
title: "RenderBender: A Survey on Adversarial Attacks Using Differentiable Rendering"
shorttitle: "RenderBender"
authors: "Matthew Hull, Haoran Wang, Matthew Lau, Alec Helbling, Mansi Phute, Chao Zhang, Zsolt Kira, Willian Lunardi, Martin Andreoni, Wenke Lee, and Duen Horng Chau"
venue: "International Joint Conference on Artificial Intelligence (IJCAI)"
venue-shorthand: IJCAI'25
location: Montréal, Canada
featured: true
year: 2025
pdf: https://poloclub.github.io/papers/25-ijcai-survey-adv-diff-rendering.pdf
paper-home: https://poloclub.github.io/papers/25-ijcai-survey-adv-diff-rendering.pdf
icon: render-bender.png
icon-fit: cover
brand: RenderBender
collaboration: TII
excerpt: "A Survey on Adversarial Attacks Using Differentiable Rendering"
pub-type: "conference"
bibtex: |-
  @inproceedings{DBLP:conf/ijcai/HullRB25,
    author={Matthew Hull and Haoran Wang and Matthew Lau and Alec Helbling and Mansi Phute and Chao Zhang and Zsolt Kira and Willian Lunardi and Martin Andreoni and Wenke Lee and Duen Horng Chau},
    title={RenderBender: A Survey on Adversarial Attacks Using Differentiable Rendering},
    year={2025},
    url={https://www.ijcai.org/proceedings/2025},
    booktitle={IJCAI},
    crossref={conf/ijcai/2025}
  }
---
Abstract: Differentiable rendering techniques like Gaussian Splatting and Neural Radiance Fields have become powerful tools for generating high-fidelity models of 3D objects and scenes. Their ability to produce both physically plausible and differentiable models of scenes are key ingredient needed to produce physically plausible adversarial attacks on DNNs. However, the adversarial machine learning community has yet to fully explore these capabilities, partly due to differing attack goals (e.g., misclassification, misdetection) and a wide range of possible scene manipulations used to achieve them (e.g., alter texture, mesh). This survey contributes a framework that unifies diverse goals and tasks, facilitating easy comparison of existing work, identifying research gaps, and highlighting future directions—ranging from expanding attack goals and tasks to account for new modalities, state-of-the-art models, tools, and pipelines, to underscoring the importance of studying real-world threats in complex scenes.