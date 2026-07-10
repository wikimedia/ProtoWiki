<script setup lang="ts">
definePage({
  meta: {
    title: 'Article (custom)',
    description:
      'Template for an article page where the article is written out within the template itself. Useful for when you want to directly change some part of the article.',
    category: 'template',
  },
})

import { RouterLink } from 'vue-router'

import ArticleCustom from '@/components/article/ArticleCustom.vue'
import ChromeWrapper from '@/components/chrome/ChromeWrapper.vue'

const leadPhotoUrl = `${import.meta.env.BASE_URL}images/wet-leg-o2-infobox.jpg`
</script>

<template>
  <ChromeWrapper>
    <main>
      <ArticleCustom>
        <section class="hand-authored-lead">
          <p>
            <em>For their eponymous album, see</em>&nbsp;<a
              href="https://en.wikipedia.org/wiki/Wet_Leg_(album)"
              ><em>Wet Leg</em> (album)</a
            >.
          </p>

          <p>
            <strong>Wet Leg</strong> are an English indie rock band from the Isle of Wight, founded
            in 2019 by Rhian Teasdale (vocals, guitar) and Hester Chambers (guitar). The band also
            includes Josh Mobaraki (guitar, keyboards), Ellis Durand (bass) and Henry Holmes
            (drums).
          </p>

          <table class="infobox vcard plainlist">
            <tbody>
              <tr>
                <th
                  class="infobox-above"
                  colspan="2"
                  style="color: #202122; background-color: #b0c4de; font-size: 125%"
                >
                  <div>Wet Leg</div>
                </th>
              </tr>
              <tr>
                <td class="infobox-image" colspan="2">
                  <a
                    href="https://commons.wikimedia.org/wiki/File:Wet_Leg_O2_Academy_Brixton_2025-05-24_-29.jpg"
                    rel="noopener"
                  >
                    <img
                      alt="Wet Leg performing in 2025"
                      decoding="async"
                      height="200"
                      width="300"
                      :src="leadPhotoUrl"
                    />
                  </a>
                  <div class="infobox-caption">Wet Leg performing in 2025</div>
                </td>
              </tr>
              <tr>
                <th
                  class="infobox-header"
                  colspan="2"
                  style="color: #202122; background-color: #b0c4de"
                >
                  Background information
                </th>
              </tr>
              <tr>
                <th class="infobox-label" scope="row">Origin</th>
                <td class="infobox-data">
                  <a href="https://en.wikipedia.org/wiki/Isle_of_Wight">Isle of Wight</a>, England
                </td>
              </tr>
              <tr>
                <th class="infobox-label" scope="row">Genres</th>
                <td class="infobox-data">
                  <a href="https://en.wikipedia.org/wiki/Indie_rock">Indie rock</a>,
                  <a href="https://en.wikipedia.org/wiki/Post-punk_revival">post-punk revival</a>,
                  <a href="https://en.wikipedia.org/wiki/Indie_pop">indie pop</a>
                </td>
              </tr>
              <tr>
                <th class="infobox-label" scope="row">
                  <span class="nowrap">Years active</span>
                </th>
                <td class="infobox-data">2019–present</td>
              </tr>
              <tr>
                <th class="infobox-label" scope="row">Label</th>
                <td class="infobox-data">
                  <a href="https://en.wikipedia.org/wiki/Domino_Recording_Company">Domino</a>
                </td>
              </tr>
              <tr>
                <th
                  class="infobox-header"
                  colspan="2"
                  style="color: #202122; background-color: #b0c4de"
                ></th>
              </tr>
              <tr>
                <th class="infobox-label" scope="row">Members</th>
                <td class="infobox-data">
                  <a href="https://en.wikipedia.org/wiki/Rhian_Teasdale">Rhian Teasdale</a><br />
                  Hester Chambers<br />
                  Henry Holmes<br />
                  Josh Mobaraki<br />
                  Ellis Durand
                </td>
              </tr>
              <tr>
                <th
                  class="infobox-header"
                  colspan="2"
                  style="color: #202122; background-color: #b0c4de"
                ></th>
              </tr>
              <tr>
                <th class="infobox-label" scope="row">
                  <span class="nowrap">Past members</span>
                </th>
                <td class="infobox-data">Doug Richards</td>
              </tr>
              <tr>
                <th
                  class="infobox-header"
                  colspan="2"
                  style="color: #202122; background-color: #b0c4de"
                ></th>
              </tr>
              <tr>
                <th class="infobox-label" scope="row">Website</th>
                <td class="infobox-data">
                  <span class="url">
                    <a class="external text" href="https://wetlegband.com" rel="noopener">
                      wetlegband.com
                    </a>
                  </span>
                </td>
              </tr>
            </tbody>
          </table>

          <p>
            Initially a duo, Teasdale and Chambers debuted with the single &ldquo;Chaise
            Longue&rdquo;, in 2021. Their self-titled debut album debuted in 2022 at number one on
            the UK Albums Chart and Australia&rsquo;s ARIA Albums Chart. The album was shortlisted
            for the 2022 Mercury Prize. At the 65th Annual Grammy Awards, Wet Leg won Best
            Alternative Music Album for their debut and Best Alternative Music Performance for
            &ldquo;Chaise Longue&rdquo;, and were nominated for Best New Artist. They also won Best
            New Artist and Best British Group at the 2023 Brit Awards.
          </p>

          <p>
            The band's second studio album, <i>Moisturizer</i> (2025), was written and recorded as a
            five-piece, with former touring members Mobaraki, Durand and Holmes all becoming core
            members of the band. Released to critical acclaim, the album debuted at number one on
            the UK Albums Chart.
          </p>

          <p>
            Wet Leg have cited various bands and artists as influences, including Bombay Bicycle
            Club, PJ Harvey, the White Stripes, the Strokes, and Kings of Leon.
          </p>
        </section>

        <section>
          <h2>History</h2>

          <section>
            <h3>Early lives and formation</h3>

            <p>
              Merseyside-born Teasdale moved from Formby to the Isle of Wight when she was eight.
              She performed for many years on the Isle of Wight as a musician and pianist, and prior
              to forming Wet Leg was known as RHAIN and was linked to the music scene in Bristol. As
              RHAIN, Teasdale performed her song &ldquo;Humdrum Drivel&rdquo; in 2013. In 2014, she
              was photographed by <i>Cosmopolitan</i> magazine while attending the Isle of Wight
              music festival.
            </p>

            <p>
              Teasdale and Chambers first met at Platform One College of Music on the Isle of Wight
              while studying. After ten years of friendship, they formed a band in 2019 under the
              name Wet Leg, and later signed with Domino Recording Company. Several different
              explanations have been given for how the band got their name: in a December 2021
              interview, they said that they chose the name by picking different emoji combinations;
              in an April 2022 YouTube interview, the band said it came from an Isle of Wight slang
              to describe non-locals on the island — who had crossed the Solent were said to have a
              &ldquo;wet leg&rdquo; from getting off the boat. Former drummer Doug Richards, in a
              July 2023 interview, alleged that the name stemmed from a list of &ldquo;stupid band
              names&rdquo; that was added to &ldquo;any time you&apos;d think of a funny combination
              of words&rdquo;. He further alleged that the original &ldquo;stupid band name&rdquo;
              was Wet Book, but was misheard as Wet Leg.
            </p>
          </section>

          <section>
            <h3>2021–2024: Debut album</h3>

            <p>
              The band's debut single, &ldquo;Chaise Longue&rdquo;, was released on 15 June 2021,
              and gained media notice for earning millions of streams and video views. Their second
              single, &ldquo;Wet Dream&rdquo;, was released on 28 September 2021.
              <i>Variety</i> noted, &ldquo;It's rare that a new group releases two songs and they're
              both great&rdquo;. They appeared on <i>Later&hellip; with Jools Holland</i> on BBC2,
              on 30 October 2021. On 29 November 2021, they announced their debut self-titled album,
              released on 8 April 2022 via Domino. The same day, Wet Leg released the double-single
              &ldquo;Too Late Now&rdquo; / &ldquo;Oh No&rdquo;.
            </p>

            <p>
              In 2022, they toured the UK playing songs from their first album. It was then
              announced that they would tour Australia and New Zealand as the support band for Harry
              Styles's Oceanic leg of Love On Tour in 2023. Wet Leg appeared on
              <i>Later&hellip; with Jools Holland</i> in November 2021 and returned for the first
              part of his next series in May 2022.
            </p>

            <p>
              In an interview with Andrew Ford of ABC in Australia in July 2022, Wet Leg clarified
              that a comment about a completed second album in a previous interview was &ldquo;a big
              joke&rdquo;. &ldquo;We haven't got a second album; we haven't had any time to
              write&rdquo;.
            </p>

            <p>
              Wet Leg received their first three nominations at the 65th Annual Grammy Awards,
              including Best New Artist, Best Alternative Music Performance for &ldquo;Chaise
              Longue&rdquo; and Best Alternative Music Album, winning the latter two awards. They
              also won Best New Artist and Group of the Year at the Brit Awards 2023 where they
              performed &ldquo;Chaise Longue&rdquo; with the prog Morris dance troupe Boss Morris
              and their Morris beasts.
            </p>

            <p>
              Wet Leg performed at Coachella in April 2023, where they were joined on-stage by Dave
              Grohl during their performance of &ldquo;Ur Mum&rdquo;.
            </p>

            <p>
              On 6 July 2023, Wet Leg remixed Depeche Mode&apos;s track &ldquo;Wagging
              Tongue&rdquo;, the second single from their <i>Memento Mori</i> album. The track
              earned them the Grammy Award for Best Remixed Recording, Non-Classical at the 66th
              Annual Grammy Awards.
            </p>
          </section>

          <section>
            <h3>2025–present: <i>Moisturizer</i></h3>

            <p>
              In March 2025, Wet Leg posted a new photo on their Instagram account with the caption
              &ldquo;We&apos;re so back&rdquo;, indicating that the band was set to return with new
              music. Later that month, the band played a secret show under the name Uma Thurman at
              the Green Door Store in Brighton, during which they performed seven unreleased songs.
              The band's single, &ldquo;Catch These Fists&rdquo;, was released on 1 April 2025,
              coinciding with the announcement of their second album
              <i>Moisturizer</i>, released on 11 July. The band were referred to in the album&apos;s
              press materials as &ldquo;the Isle of Wight five-piece&rdquo;, indicating that
              long-serving touring musicians Henry Holmes, Josh Mobaraki and Ellis Durand had been
              formally inducted into the band as official members after four years together.
              Alongside the release of &ldquo;Catch These Fists&rdquo; they announced a UK tour and
              a North America tour on their Instagram.
            </p>

            <p>
              In December 2025, their song &ldquo;Mangetout&rdquo; was featured in the opening of
              episode two of the television show <i>Heated Rivalry</i>. Streaming of the song
              increased by 61% in the days after the episode&apos;s release. On March 21, 2026, they
              were the first musical guest in the debut of <i>Saturday Night Live UK</i>, in which
              they performed &ldquo;Catch These Fists&rdquo; and &ldquo;Mangetout&rdquo;.
            </p>
          </section>

          <p>
            <RouterLink to="/">Back to gallery</RouterLink> · Content adapted from the English
            Wikipedia article
            <a href="https://en.wikipedia.org/wiki/Wet_Leg">&ldquo;Wet Leg&rdquo;</a>
            (<abbr title="Creative Commons Attribution Share-Alike licence">CC BY-SA</abbr>).
          </p>
        </section>
      </ArticleCustom>
    </main>
  </ChromeWrapper>
</template>

<style scoped>
main {
  padding: 0 var(--spacing-100);
}
</style>
