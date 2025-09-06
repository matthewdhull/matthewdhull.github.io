---
layout: cv
title: CV
permalink: /cv/
author_profile: false
---

<div id="cv" markdown="1">

<h1 id="cv-title"><a href="{{ site.url }}">Matthew Hull</a></h1>

<p id="cv-subtitle"><i>Ph.D. Student (<span class="cv-vis">ML</span> + <span class="cv-ai">Simulation</span>)</i></p>

<div class="cv-spacer"></div>

<div class="cv-intro">
I am a Ph.D. student in Machine Learning at Georgia Tech advised by Duen Horng (Polo) Chau. My research focuses on adversarial machine learning and simulation with differentiable rendering. I’ve also been a professional pilot for 20+ years and currently captain the Boeing 767 at FedEx.
</div>

<div class="cv-spacer"></div>

<div class="cv-image-links-wrapper">
	<div class="cv-image-links">
		{% for link in site.data.social-links %}
			{% if link.cv-group == 1 %}
				{% include cv-social-link.html link=link %}
			{% endif %}
		{% endfor %}
	</div>
	<div class="cv-image-links">
		{% for link in site.data.social-links %}
			{% if link.cv-group == 2 %}
				{% include cv-social-link.html link=link %}
			{% endif %}
		{% endfor %}
	</div>
</div>

***

## Education

{% for degree in site.data.education %}
<div class="cv-spacer-small"></div>
<div class="cv-row">
  <div class="cv-left-date">{{ degree.years }}{% if degree.year-extra %} {{ degree.year-extra }}{% endif %}{% if degree.years-extra %} {{ degree.years-extra }}{% endif %}</div>
  <div>
    <b>{{ degree.degree }}</b><br/>
    {% if degree.institution-url %}<a href="{{ degree.institution-url }}">{{ degree.institution }}</a>{% else %}{{ degree.institution }}{% endif %}{% if degree.location %}, {{ degree.location }}{% endif %}
    {% if degree.thesis %}<div class="cv-description">Thesis: {{ degree.thesis }}</div>{% endif %}
  </div>
  <div class="cv-spacer-small"></div>
</div>
{% endfor %}

## Academic Research Experience

{% for experience in site.data.experiences %}
{% if experience.type == 'academic' %}
<div class="cv-spacer-small"></div>
<div class="cv-row">
  <div class="cv-left-date">{{ experience.year }}</div>
  <div>
    <b>{% if experience.institution-url %}<a href="{{ experience.institution-url }}">{{ experience.institution }}</a>{% else %}{{ experience.institution }}{% endif %}</b>, {{ experience.location }}<br/>
    <i>{{ experience.position }}</i>
    {% if experience.description %}<div class="cv-description">{{ experience.description }}</div>{% endif %}
  </div>
</div>
{% endif %}
{% endfor %}

## Industry Experience

{% for experience in site.data.experiences %}
{% if experience.type == 'industry' %}
<div class="cv-spacer-small"></div>
<div class="cv-row">
  <div class="cv-left-date">{{ experience.year }}</div>
  <div>
    <b>{% if experience.institution-url %}<a href="{{ experience.institution-url }}">{{ experience.institution }}</a>{% else %}{{ experience.institution }}{% endif %}</b>, {{ experience.location }}<br/>
    <i>{{ experience.position }}</i>
    {% if experience.description %}<div class="cv-description">{{ experience.description }}</div>{% endif %}
  </div>
</div>
{% endif %}
{% endfor %}


## Honors and Awards

{% for award in site.data.awards %}
<div class="cv-spacer-small"></div>
<div class="cv-row">
  <div class="cv-left-date">{{ award.year }}</div>
  <div>
    <span class="cv-award">{{ award.name }}</span>
    {% if award.description %}<div class="cv-description">{{ award.description }}</div>{% endif %}
  </div>
</div>
{% endfor %}

## Publications

{% assign pubs_all = site.publications | sort: 'date' | reverse %}

{%- comment -%} Helper to render a category block {%- endcomment -%}
{% assign items = pubs_all | where: 'pub-type', 'journal' %}
{% if items and items.size > 0 %}
### Journal
{% for pub in items %}
<div class="cv-spacer-small"></div>
<div class="cv-row">
  {% include cv/publication.html pub=pub label='J' idx=forloop.index %}
</div>
{% endfor %}
{% endif %}

{% assign items = pubs_all | where: 'pub-type', 'conference' %}
{% if items and items.size > 0 %}
### Conference
{% for pub in items %}
<div class="cv-spacer-small"></div>
<div class="cv-row">
  {% include cv/publication.html pub=pub label='C' idx=forloop.index %}
</div>
{% endfor %}
{% endif %}

{% assign items = pubs_all | where: 'pub-type', 'workshop' %}
{% if items and items.size > 0 %}
### Workshop
{% for pub in items %}
<div class="cv-spacer-small"></div>
<div class="cv-row">
  {% include cv/publication.html pub=pub label='W' idx=forloop.index %}
</div>
{% endfor %}
{% endif %}

{% assign items = pubs_all | where: 'pub-type', 'poster' %}
{% if items and items.size > 0 %}
### Poster
{% for pub in items %}
<div class="cv-spacer-small"></div>
<div class="cv-row">
  {% include cv/publication.html pub=pub label='P' idx=forloop.index %}
</div>
{% endfor %}
{% endif %}

{% assign items = pubs_all | where: 'pub-type', 'preprint' %}
{% if items and items.size > 0 %}
### Preprint
{% for pub in items %}
<div class="cv-spacer-small"></div>
<div class="cv-row">
  {% include cv/publication.html pub=pub label='P' idx=forloop.index %}
</div>
{% endfor %}
{% endif %}

## Talks

{::nomarkdown}
{% assign talktitles = site.data.talks | group_by:"title" %}
{% for title in talktitles %}
{% include cv/talk.html talk=title %}
{% endfor %}
{:/}

## Teaching

{% for teach in site.data.teaching %}
<div class="cv-spacer-small"></div>
<div class="cv-row">
  <div class="cv-left-date">{{ teach.year }}</div>
  <div>
    <b>{% if teach.institution-url %}<a href="{{ teach.institution-url }}">{{ teach.institution }}</a>{% else %}{{ teach.institution }}{% endif %}</b>, {{ teach.location }}<br/>
    <i>{{ teach.position }}</i> — {{ teach.class }}
    {% if teach.description %}<div class="cv-description">{{ teach.description }}</div>{% endif %}
  </div>
</div>
{% endfor %}

<!-- ## Mentoring

{% for mentee in site.data.mentoring %}
<div class="cv-spacer-small"></div>
<div class="cv-row">
  <div class="cv-left-date">{{ mentee.year }}</div>
  <div>
    <b>{{ mentee.name }}</b>{% if mentee.degree %}, {{ mentee.degree }}{% endif %}
    {% if mentee.description %}<div class="cv-description">{{ mentee.description }}</div>{% endif %}
  </div>
</div>
{% endfor %}

## Grants and Funding

{% for fund in site.data.funding %}
<div class="cv-spacer-small"></div>
<div class="cv-row">
  <div class="cv-left-date">{{ fund.years }}</div>
  <div>
    <b>{{ fund.title }}</b><br/>
    {{ fund.name }}
    {% if fund.co-pis %}<div class="cv-description">Co-PIs: {{ fund.co-pis | join: ", " }}</div>{% endif %}
    {% if fund.amount %}<div class="cv-description">Amount: {{ fund.amount }}</div>{% endif %}
  </div>
</div>
{% endfor %} -->

## Service

<div class="cv-service-title"><b>Reviewer</b></div>
{% for venue in site.data.reviewer %}
{% include cv/venue.html venue=venue %}
{% endfor %}

<!-- <div class="cv-service-title"><b>Institutional</b></div>
{% for institution in site.data.institutional %}
{% include cv/institutional.html institution=institution %}
{% endfor %} -->

<div class="cv-service-title"><b>Member</b></div>
{% for member in site.data.memberships %}
{% include cv/member.html member=member %}
{% endfor %}

## References

{% for reference in site.data.references %}
{% include cv/reference.html reference=reference %}
{% endfor %}

</div>
