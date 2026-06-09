---
layout: archive
title: "Publications"
permalink: /publications/
author_profile: false
---

{% if author.googlescholar %}
  You can also find my articles on <u><a href="{{author.googlescholar}}">my Google Scholar profile</a>.</u>
{% endif %}

{% include base_path %}

{% assign pubs = site.publications | sort: 'date' | reverse %}
{% assign current_year = '' %}
{% for post in pubs %}
{% assign post_year = post.date | date: '%Y' %}
{% if post_year != current_year %}
{% assign current_year = post_year %}
<h2 class="pub-year">{{ post_year }}</h2>
{% endif %}
{% include archive-single.html %}
{% endfor %}
