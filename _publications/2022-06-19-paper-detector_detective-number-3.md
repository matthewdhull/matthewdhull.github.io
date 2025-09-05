---
title: "DetectorDetective: Investigating the Effects of Adversarial Examples on Object Detectors"
shorttitle: "DetectorDetective"
collection: publications
permalink: /publication/2022-06-19-detector_detective-number-3
excerpt: 'Visualize Adversarial Examples on Object Detectors.'
date: 2022-06-19
venue: 'CVPR'
venue-short: "CVPR'22"
paper-home: 'https://github.com/poloclub/detector-detective'
github: 'https://github.com/poloclub/detector-detective'
paperurl: 'https://matthewdhull.github.io/files/detector_detective.pdf'
youtube: 'https://www.youtube.com/watch?v=5C3Klh87CZI'
pub-type: "demo"
bibtex: |-
    @inproceedings{vellaichamy2022detectordetective,
      title={DetectorDetective: Investigating the Effects of Adversarial Examples on Object Detectors},
      author={Vellaichamy, Sivapriya and Hull, Matthew and Wang, Zijie J and Das, Nilaksh and Peng, ShengYun and Park, Haekyu and Chau, Duen Horng Polo},
      booktitle={Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition},
      pages={21484--21491},
      year={2022}
    }
---
Abstract: With deep learning based systems performing exceedingly well in many vision-related tasks, a major concern with their widespread deployment especially in safety-critical appli- cations is their susceptibility to adversarial attacks. We propose DetectorDetective, an interactive visual tool that aims to help users better understand the behaviors of a model as adversarial images journey through an object detector. DetectorDetective enables users to easily learn about how the three key modules of the Faster R-CNN object detector — Feature Pyramidal Network, Region Proposal Network, and Region Of Interest Head — respond to a user-selected benign image and its adversarial version. Visualizations about the progressive changes in the intermediate features among such modules help users gain insights into the impact of adversar- ial attacks, and perform side-by-side comparisons between the benign and adversarial responses. Furthermore, Detec- torDetective displays saliency maps for the input images to comparatively highlight image regions that contribute to attack success. DetectorDetective complements adversarial machine learning research on object detection by providing a user-friendly interactive tool for inspecting and under- standing model responses. DetectorDetective is available at the following public demo link: [https://poloclub.github.io/detector-detective ](https://poloclub.github.io/detector-detective). A video demo is available at [https://youtu.be/5C3Klh87CZI](https://youtu.be/5C3Klh87CZI).

[Download paper here](https://matthewdhull.github.io/files/detector_detective.pdf)