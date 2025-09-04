---
title: "News"
permalink: /news/
layout: default
---

{% include base_path %}

<div id="news" class="hm-news-page">
  <div class="container">
    <div class="row news-container">
      {% assign sorted_news = site.data.news | sort: 'date' | reverse %}
      {% for item in sorted_news %}
        <div class="news-item col-lg-12 col-sm-12 col-xs-12">
          <div class="news-date">{{ item.date | date: "%Y %b" }}</div>
          <div>{{ item.content }}</div>
        </div>
      {% endfor %}
    </div>
  </div>
  <div style="height: 2rem"></div>
</div>

