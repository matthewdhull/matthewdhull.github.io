---
title: "News"
permalink: /news/
layout: default
---

{% include base_path %}

<div id="news" class="hm-news-page">
  <h1 class="hm-heading">News</h1>
  <div class="news-container">
    {% assign sorted_news = site.data.news | sort: 'date' | reverse %}
    {% for item in sorted_news %}
      <div class="news-item">
        <div class="news-date">{{ item.date | date: "%Y %b" }}</div>
        <div class="news-body">{{ item.content }}</div>
      </div>
    {% endfor %}
  </div>
</div>

