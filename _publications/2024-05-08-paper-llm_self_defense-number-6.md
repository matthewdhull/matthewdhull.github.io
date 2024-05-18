---
title: "LLM Self Defense: By Self Examination, LLMs Know They Are Being Tricked"
collection: publications
permalink: /publications/2024-05-08-paper-llm_self_defense-number-6
excerpt: 'LLM Self Defense'
date: 2024-05-08
venue: 'ICLR 24'
paperurl: 'https://arxiv.org/pdf/2308.07308'
citation: 'Phute, Mansi, et. al. (2024). &quot;LLM Self Defense: By Self Examination, LLMs Know They Are Being Tricked.&quot; <i>ICLR 24</i>.'
---
Large language models (LLMs) are popular for high-quality text generation but can produce harmful content, even when aligned with human values through reinforcement learning. Adversarial prompts can bypass their safety measures. We propose LLM SELF DEFENSE, a simple approach to defend against these attacks by having an LLM screen the induced responses. Our method does not require any fine-tuning, input preprocessing, or iterative output generation. Instead, we incorporate the generated content into a pre-defined prompt and employ another instance of an LLM to analyze the text and predict whether it is harmful. We test LLM SELF DEFENSE on GPT 3.5 and Llama 2, two of the current most prominent LLMs against various types of attacks, such as forcefully inducing affirmative responses to prompts and prompt engineering attacks. Notably, LLM SELF DEFENSE succeeds in reducing the attack success rate to virtually 0 using both GPT 3.5 and Llama 2. The code is publicly available at [https://github.com/poloclub/llm-self-defense](https://github.com/poloclub/llm-self-defense.).

[Download paper here](https://arxiv.org/pdf/2308.07308)

Recommended citation: Phute, Mansi, et. al. (2024). LLM Self Defense: By Self Examination, LLMs Know They Are Being Tricked." <i>ICLR 24</i>
