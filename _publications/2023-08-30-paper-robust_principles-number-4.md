---
title: "Robust Principles: Architectural Design Principles for Adversarially Robust CNNs"
shorttitle: "Robust Principles"
collection: publications
permalink: /publications/2023-08-30-paper-robust_principles-number-4
excerpt: 'A suite of generalizable robust architectural design principles.'
date: 2023-08-30
venue: 'BMVC'
venue-shorthand: "BMVC'23"
paperurl: 'https://arxiv.org/pdf/2308.16258.pdf'
github: 'https://github.com/poloclub/robust-principles'
youtube: 'https://www.youtube.com/watch?v=S-N1iuA0hAY'
poster: 'https://shengyun-peng.github.io/papers/posters/22_robarch.pdf'
pub-type: "conference"
bibtex: |-
    @article{peng2023robust,
        title={Robust Principles: Architectural Design Principles for Adversarially Robust CNNs},
        author={Peng, ShengYun and Xu, Weilin and Cornelius, Cory and Hull, Matthew and Li, Kevin and Duggal, Rahul and Phute, Mansi and Martin, Jason and Chau, Duen Horng},
        journal={arXiv preprint arXiv:2308.16258},
        year={2023}
    }
---
Abstract: Our research aims to unify existing works' diverging opinions on how architectural components affect the adversarial robustness of CNNs. To accomplish our goal, we synthesize a suite of three generalizable robust architectural design principles: (a) optimal range for depth and width configurations, (b) preferring convolutional over patchify stem stage, and (c) robust residual block design through adopting squeeze and excitation blocks and non-parametric smooth activation functions. Through extensive experiments across a wide spectrum of dataset scales, adversarial training methods, model parameters, and network design spaces, our principles consistently and markedly improve AutoAttack accuracy: 1-3 percentage points (pp) on CIFAR-10 and CIFAR-100, and 4-9 pp on ImageNet. The code is publicly available at [this https URL](https://github.com/poloclub/robust-principles).

[Download paper here](https://arxiv.org/pdf/2308.16258.pdf)