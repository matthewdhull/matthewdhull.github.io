---
title: "LLM Self Defense"
authors: "Mansi Phute, Alec Helbling, Matthew Hull, ShengYun Peng, Sebastian Szyller, Cory Cornelius, and Duen Horng Chau"
collection: publications
permalink: /publications/2024-05-08-paper-llm_self_defense-number-6
excerpt: "LLM's can filter out harmful content produced by themselves!"
date: 2024-05-08
venue: 'International Conference on Learning Representations (Tiny Papers at ICLR)'
venue-shorthand: "ICLR'24"
location: Vienna, Austria
featured: true
paperurl: 'https://arxiv.org/pdf/2308.07308'
github: 'https://github.com/poloclub/llm-self-defense'
pub-type: "poster"
bibtex: |-
    @inproceedings{phute2023llm,
      title={LLM Self Defense: By self examination, LLMs know they are being tricked},
      author={Phute, Mansi and Helbling, Alec and Hull, Matthew Daniel and Peng, ShengYun and Szyller, Sebastian and Cornelius, Cory and Chau, Duen Horng},
      booktitle={The Second Tiny Papers Track at ICLR 2024},
      year={2024}
    }
---
Abstract: Large language models (LLMs) are popular for high-quality text generation but can produce harmful content, even when aligned with human values through reinforcement learning. Adversarial prompts can bypass their safety measures. We propose LLM SELF DEFENSE, a simple approach to defend against these attacks by having an LLM screen the induced responses. Our method does not require any fine-tuning, input preprocessing, or iterative output generation. Instead, we incorporate the generated content into a pre-defined prompt and employ another instance of an LLM to analyze the text and predict whether it is harmful. We test LLM SELF DEFENSE on GPT 3.5 and Llama 2, two of the current most prominent LLMs against various types of attacks, such as forcefully inducing affirmative responses to prompts and prompt engineering attacks. Notably, LLM SELF DEFENSE succeeds in reducing the attack success rate to virtually 0 using both GPT 3.5 and Llama 2. The code is publicly available at [https://github.com/poloclub/llm-self-defense](https://github.com/poloclub/llm-self-defense.).

[Download paper here](https://arxiv.org/pdf/2308.07308)