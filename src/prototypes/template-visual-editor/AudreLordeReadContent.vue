<script setup lang="ts">
import { RouterLink } from 'vue-router'

import lordeImage from './assets/lorde-1980.png'
</script>

<template>
  <section>
    <p>
      <strong>Audre Lorde</strong> (<a href="#">/ˈɔːdri ˈlɔːrd/</a> <em>AW-dree LORD</em>; born
      <strong>Audrey Geraldine Lorde</strong>; February 18, 1934 – November 17, 1992) was an American
      writer, professor, philosopher, intersectional <a href="#">feminist</a>,
      <a href="#">poet</a> and <a href="#">civil rights activist</a>.
    </p>

    <table class="infobox vcard plainlist">
      <tbody>
        <tr>
          <th
            class="infobox-above"
            colspan="2"
            style="color: #202122; background-color: #b0c4de; font-size: 125%"
          >
            Audre Lorde
          </th>
        </tr>
        <tr>
          <td class="infobox-image" colspan="2">
            <img :src="lordeImage" alt="Audre Lorde in 1980" decoding="async" height="200" width="300" />
            <div class="infobox-caption">Lorde in 1980</div>
          </td>
        </tr>
        <tr>
          <th class="infobox-label" scope="row">Born</th>
          <td class="infobox-data">
            Audrey Geraldine Lorde<br />
            February 18, 1934<br />
            <a href="#">New York City</a>, U.S.
          </td>
        </tr>
        <tr>
          <th class="infobox-label" scope="row">Died</th>
          <td class="infobox-data">
            November 17, 1992 (aged 58)<br />
            <a href="#">Saint Croix, Virgin Islands</a>, U.S.
          </td>
        </tr>
      </tbody>
    </table>

    <p>
      As a poet, she is well known for technical mastery and emotional expression, as well as her
      poems that express anger and outrage at civil and social injustices she observed throughout her
      life.
    </p>
  </section>

  <section>
    <h2>Early life</h2>
    <p>
      Audre Lorde was born on February 18, 1934, in <a href="#">New York City</a> to Caribbean
      immigrants. The family settled in <a href="#">Harlem</a>. Lorde was the youngest of three
      daughters.
    </p>
  </section>

  <section>
    <h2>Career</h2>
    <p>
      In 1954, she spent a pivotal year as a student at the
      <a href="#">National Autonomous University of Mexico</a>. On her return to New York, Lorde
      attended <a href="#">Hunter College</a>, graduating in 1959.
    </p>
    <p>
      In 1968 Lorde was writer-in-residence at <a href="#">Tougaloo College</a> in Mississippi.
      From 1972 to 1987, Lorde resided on <a href="#">Staten Island</a>.
    </p>
  </section>

  <p>
    <RouterLink to="/">Back to gallery</RouterLink> · Demo content adapted from the English
    Wikipedia article
    <a href="https://en.wikipedia.org/wiki/Audre_Lorde">“Audre Lorde”</a>.
  </p>
</template>
