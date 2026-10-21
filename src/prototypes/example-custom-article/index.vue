<script setup lang="ts">
import { cdxIconArticle } from '@wikimedia/codex-icons'

definePage({
  meta: {
    title: 'Custom article',
    description: 'An example of how to prototype a static, custom-written article.',
    category: 'example',
    platform: 'web',
    order: 2,
    icon: cdxIconArticle,
  },
})

import { RouterLink } from 'vue-router'

import ArticleCustom from '@/components/article/ArticleCustom.vue'
import ChromeWrapper from '@/components/chrome/ChromeWrapper.vue'

const leadPhotoUrl = `${import.meta.env.BASE_URL}images/wet-leg-o2-infobox.jpg`
</script>

<template>
  <ChromeWrapper>
    <ArticleCustom editable title="Wet Leg">
      <section>
        <p>
          <em>For their eponymous album, see</em>&nbsp;<a
            href="https://en.wikipedia.org/wiki/Wet_Leg_(album)"
            ><em>Wet Leg</em> (album)</a
          >.
        </p>

        <p>
          <strong>Wet Leg</strong> are an English indie rock band from the Isle of Wight, founded in
          2019 by Rhian Teasdale (vocals, guitar) and Hester Chambers (guitar). The band also
          includes Josh Mobaraki (guitar, keyboards), Ellis Durand (bass) and Henry Holmes (drums).
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
          Longue&rdquo;, in 2021. Their self-titled debut album debuted in 2022 at number one on the
          UK Albums Chart and Australia&rsquo;s ARIA Albums Chart. The album was shortlisted for the
          2022 Mercury Prize. At the 65th Annual Grammy Awards, Wet Leg won Best Alternative Music
          Album for their debut and Best Alternative Music Performance for &ldquo;Chaise
          Longue&rdquo;, and were nominated for Best New Artist.<sup
            id="cite_ref-1"
            class="reference"
            ><a href="#cite_note-1"
              >[1]</a
            ></sup
          ><sup id="cite_ref-2" class="reference"
            ><a href="#cite_note-2">[2]</a></sup
          >
          They also won Best New Artist and Best British Group at the 2023 Brit Awards.
        </p>

        <p>
          The band's second studio album, <i>Moisturizer</i> (2025), was written and recorded as a
          five-piece, with former touring members Mobaraki, Durand and Holmes all becoming core
          members of the band. Released to critical acclaim, the album debuted at number one on the
          UK Albums Chart.
        </p>

        <p>
          Wet Leg have cited various bands and artists as influences, including Bombay Bicycle Club,
          PJ Harvey, the White Stripes, the Strokes, and Kings of Leon.<sup
            id="cite_ref-3"
            class="reference"
            ><a href="#cite_note-3">[3]</a></sup
          >
        </p>
      </section>

      <section>
        <h2>History</h2>

        <section>
          <h3>Early lives and formation</h3>

          <p>
            Merseyside-born Teasdale moved from Formby to the Isle of Wight when she was eight.<sup
              id="cite_ref-4"
              class="reference"
              ><a href="#cite_note-4">[4]</a></sup
            >
            She performed for many years on the Isle of Wight as a musician and pianist,<sup
              id="cite_ref-5"
              class="reference"
              ><a href="#cite_note-5">[5]</a></sup
            >
            and prior to forming Wet Leg was known as RHAIN and was linked to the music scene in
            Bristol.<sup id="cite_ref-6" class="reference"
              ><a href="#cite_note-6">[6]</a></sup
            >
            As RHAIN, Teasdale performed her song &ldquo;Humdrum Drivel&rdquo; in 2013.<sup
              id="cite_ref-7"
              class="reference"
              ><a href="#cite_note-7">[7]</a></sup
            >
            In 2014, she was photographed by <i>Cosmopolitan</i> magazine while attending the Isle
            of Wight music festival.<sup id="cite_ref-8" class="reference"
              ><a href="#cite_note-8">[8]</a></sup
            >
          </p>

          <p>
            Teasdale and Chambers first met at Platform One College of Music on the Isle of Wight
            while studying.<sup id="cite_ref-9" class="reference"
              ><a href="#cite_note-9">[9]</a></sup
            >
            After ten years of friendship, they formed a band in 2019 under the name Wet Leg,<sup
              id="cite_ref-10"
              class="reference"
              ><a href="#cite_note-10">[10]</a></sup
            >
            and later signed with Domino Recording Company.<sup
              id="cite_ref-11"
              class="reference"
              ><a href="#cite_note-11">[11]</a></sup
            ><sup id="cite_ref-12" class="reference"
              ><a href="#cite_note-12">[12]</a></sup
            >
            Several different explanations have been given for how the band got their name: in a
            December 2021 interview, they said that they chose the name by picking different emoji
            combinations;<sup id="cite_ref-13" class="reference"
              ><a href="#cite_note-13">[13]</a></sup
            >
            in an April 2022 YouTube interview, the band said it came from an Isle of Wight slang to
            describe non-locals on the island — who had crossed the Solent were said to have a
            &ldquo;wet leg&rdquo; from getting off the boat.<sup
              id="cite_ref-14"
              class="reference"
              ><a href="#cite_note-14">[14]</a></sup
            >
            Former drummer Doug Richards, in a July 2023 interview, alleged that the name stemmed
            from a list of &ldquo;stupid band names&rdquo; that was added to &ldquo;any time
            you&apos;d think of a funny combination of words&rdquo;. He further alleged that the
            original &ldquo;stupid band name&rdquo; was Wet Book, but was misheard as Wet Leg.<sup
              id="cite_ref-15"
              class="reference"
              ><a href="#cite_note-15">[15]</a></sup
            >
          </p>
        </section>

        <section>
          <h3>2021–2024: Debut album</h3>

          <p>
            The band's debut single, &ldquo;Chaise Longue&rdquo;, was released on 15 June 2021,<sup
              id="cite_ref-16"
              class="reference"
              ><a href="#cite_note-16">[16]</a></sup
            >
            and gained media notice for earning millions of streams and video views.<sup
              id="cite_ref-17"
              class="reference"
              ><a href="#cite_note-17">[17]</a></sup
            >
            Their second single, &ldquo;Wet Dream&rdquo;, was released on 28 September 2021.
            <i>Variety</i> noted, &ldquo;It's rare that a new group releases two songs and they're
            both great&rdquo;. They appeared on <i>Later&hellip; with Jools Holland</i> on BBC2, on
            30 October 2021.<sup id="cite_ref-18" class="reference"
              ><a href="#cite_note-18">[18]</a></sup
            >
            On 29 November 2021, they announced their debut self-titled album, released on 8 April
            2022 via Domino. The same day, Wet Leg released the double-single &ldquo;Too Late
            Now&rdquo; / &ldquo;Oh No&rdquo;.<sup id="cite_ref-19" class="reference"
              ><a href="#cite_note-19">[19]</a></sup
            >
          </p>

          <p>
            In 2022, they toured the UK playing songs from their first album. It was then announced
            that they would tour Australia and New Zealand as the support band for Harry Styles's
            Oceanic leg of Love On Tour in 2023.<sup id="cite_ref-20" class="reference"
              ><a href="#cite_note-20">[20]</a></sup
            >
            Wet Leg appeared on <i>Later&hellip; with Jools Holland</i> in November 2021 and returned
            for the first part of his next series in May 2022.<sup
              id="cite_ref-21"
              class="reference"
              ><a href="#cite_note-21">[21]</a></sup
            >
          </p>

          <p>
            In an interview with Andrew Ford of ABC in Australia in July 2022, Wet Leg clarified
            that a comment about a completed second album in a previous interview<sup
              id="cite_ref-22"
              class="reference"
              ><a href="#cite_note-22">[22]</a></sup
            >
            was &ldquo;a big joke&rdquo;. &ldquo;We haven't got a second album; we haven't had any
            time to write&rdquo;.<sup id="cite_ref-23" class="reference"
              ><a href="#cite_note-23">[23]</a></sup
            >
          </p>

          <p>
            Wet Leg received their first three nominations at the 65th Annual Grammy Awards,
            including Best New Artist, Best Alternative Music Performance for &ldquo;Chaise
            Longue&rdquo; and Best Alternative Music Album,<sup
              id="cite_ref-1-1"
              class="reference"
              ><a href="#cite_note-1">[1]</a></sup
            >
            winning the latter two awards.<sup id="cite_ref-24" class="reference"
              ><a href="#cite_note-24">[24]</a></sup
            >
            They also won Best New Artist and Group of the Year at the Brit Awards 2023 where they
            performed &ldquo;Chaise Longue&rdquo; with the prog Morris dance troupe Boss Morris and
            their Morris beasts.<sup id="cite_ref-25" class="reference"
              ><a href="#cite_note-25">[25]</a></sup
            >
          </p>

          <p>
            Wet Leg performed at Coachella in April 2023,<sup id="cite_ref-26" class="reference"
              ><a href="#cite_note-26">[26]</a></sup
            >
            where they were joined on-stage by Dave Grohl during their performance of &ldquo;Ur
            Mum&rdquo;.<sup id="cite_ref-27" class="reference"
              ><a href="#cite_note-27">[27]</a></sup
            >
          </p>

          <p>
            On 6 July 2023, Wet Leg remixed Depeche Mode&apos;s track &ldquo;Wagging Tongue&rdquo;,
            the second single from their <i>Memento Mori</i> album.<sup
              id="cite_ref-28"
              class="reference"
              ><a href="#cite_note-28">[28]</a></sup
            >
            The track earned them the Grammy
            Award for Best Remixed Recording, Non-Classical at the 66th Annual Grammy Awards.
          </p>
        </section>

        <section>
          <h3>2025–present: <i>Moisturizer</i></h3>

          <p>
            In March 2025, Wet Leg posted a new photo on their Instagram account with the caption
            &ldquo;We&apos;re so back&rdquo;, indicating that the band was set to return with new
            music.<sup id="cite_ref-29" class="reference"
              ><a href="#cite_note-29">[29]</a></sup
            >
            Later that month, the band played a secret show under the name Uma Thurman at the Green
            Door Store in Brighton, during which they performed seven unreleased songs.<sup
              id="cite_ref-30"
              class="reference"
              ><a href="#cite_note-30">[30]</a></sup
            >
            The band's single, &ldquo;Catch These Fists&rdquo;, was released on 1 April 2025,
            coinciding with the announcement of their second album <i>Moisturizer</i>, released on
            11 July.<sup id="cite_ref-31" class="reference"
              ><a href="#cite_note-31">[31]</a></sup
            >
            The band were referred to in the album&apos;s press materials as &ldquo;the Isle of Wight
            five-piece&rdquo;, indicating that long-serving touring musicians Henry Holmes, Josh
            Mobaraki and Ellis Durand had been formally inducted into the band as official members
            after four years together.<sup id="cite_ref-32" class="reference"
              ><a href="#cite_note-32">[32]</a></sup
            >
            Alongside
            the release of &ldquo;Catch These Fists&rdquo; they announced a UK tour and a North
            America tour on their Instagram.
          </p>

          <p>
            In December 2025, their song &ldquo;Mangetout&rdquo; was featured in the opening of
            episode two of the television show <i>Heated Rivalry</i>. Streaming of the song
            increased by 61% in the days after the episode&apos;s release.<sup
              id="cite_ref-33"
              class="reference"
              ><a href="#cite_note-33">[33]</a></sup
            >
            On March 21, 2026, they were the first musical guest in the debut of
            <i>Saturday Night Live UK</i>, in which they performed &ldquo;Catch These Fists&rdquo;
            and &ldquo;Mangetout&rdquo;.<sup id="cite_ref-34" class="reference"
              ><a href="#cite_note-34">[34]</a></sup
            >
          </p>
        </section>

        <section>
          <h2>References</h2>
          <div class="mw-references-wrap">
            <ol class="references">
              <li id="cite_note-1">
                <span class="mw-cite-backlink"
                  ><a href="#cite_ref-1" aria-label="Jump up">^</a>
                  <a href="#cite_ref-1-1" aria-label="Jump up">^</a></span
                >
                <span class="reference-text">
                  &ldquo;Wet Leg&rdquo; (artist).
                  <a
                    class="external text"
                    href="https://www.grammy.com/artists/wet-leg/52310"
                    rel="noopener"
                    >GRAMMY.com</a
                  >.
                </span>
              </li>
              <li id="cite_note-2">
                <span class="mw-cite-backlink"
                  ><a href="#cite_ref-2" aria-label="Jump up">^</a></span
                >
                <span class="reference-text">
                  Horton, Adrian; Lee, Benjamin (6 February 2023). &ldquo;Grammy awards 2023: list of
                  winners&rdquo;.
                  <a
                    class="external text"
                    href="https://www.theguardian.com/music/2023/feb/05/grammy-awards-2022-list-of-winners"
                    rel="noopener"
                    ><i>The Guardian</i></a
                  >.
                </span>
              </li>
              <li id="cite_note-3">
                <span class="mw-cite-backlink"
                  ><a href="#cite_ref-3" aria-label="Jump up">^</a></span
                >
                <span class="reference-text">
                  &ldquo;We didn&apos;t make decisions – we were flying by the seat of our
                  pants!&rdquo; – the inimitable WET LEG talk influences, not being taken seriously
                  (21 March 2022).
                  <a
                    class="external text"
                    href="https://www.buzzmag.co.uk/wet-leg-album-6-music-festival-influences-interview/"
                    rel="noopener"
                    ><i>buzz magazine</i></a
                  >.
                </span>
              </li>
              <li id="cite_note-4">
                <span class="mw-cite-backlink"
                  ><a href="#cite_ref-4" aria-label="Jump up">^</a></span
                >
                <span class="reference-text">
                  Jeff Hemmings (29 October 2021). &ldquo;BF Music Radio – Wet Leg&rdquo;.
                  <a
                    class="external text"
                    href="https://anchor.fm/bf-radio-interviews/episodes/BF-Music-Radio---Wet-Leg-e19haf3"
                    rel="noopener"
                    >Brightonsfinest Radio Interviews</a
                  >.
                </span>
              </li>
              <li id="cite_note-5">
                <span class="mw-cite-backlink"
                  ><a href="#cite_ref-5" aria-label="Jump up">^</a></span
                >
                <span class="reference-text">
                  &ldquo;It was no trouble for Rubble Club to please music lovers&rdquo; (12 May
                  2021).
                  <a
                    class="external text"
                    href="https://onthewight.com/no-trouble-for-rubble-club-to-please/"
                    rel="noopener"
                    >OnTheWight</a
                  >.
                </span>
              </li>
              <li id="cite_note-6">
                <span class="mw-cite-backlink"
                  ><a href="#cite_ref-6" aria-label="Jump up">^</a></span
                >
                <span class="reference-text">
                  <a
                    class="external text"
                    href="https://web.archive.org/web/20220410094026/https://365bristol.com/story/2016/12/02/the-sound-of-bristol-rhain/3466/"
                    rel="noopener"
                    >The Sound of Bristol: RHAIN</a
                  >, <i>365 Bristol</i>, December 2016.
                </span>
              </li>
              <li id="cite_note-7">
                <span class="mw-cite-backlink"
                  ><a href="#cite_ref-7" aria-label="Jump up">^</a></span
                >
                <span class="reference-text">
                  &ldquo;Choosic TV IOW // RHAIN - Humdrum Drivel&rdquo; (September 2013).
                  <a
                    class="external text"
                    href="https://www.youtube.com/watch?v=WSKyASxPChk"
                    rel="noopener"
                    >YouTube</a
                  >.
                </span>
              </li>
              <li id="cite_note-8">
                <span class="mw-cite-backlink"
                  ><a href="#cite_ref-8" aria-label="Jump up">^</a></span
                >
                <span class="reference-text">
                  &ldquo;Festival fashion: street style at Isle of Wight Festival&rdquo; (10 April
                  2022).
                  <a
                    class="external text"
                    href="https://www.cosmopolitan.com/uk/fashion/news/g3501/festival-fashion-street-style-isle-of-wight/?slide=4"
                    rel="noopener"
                    ><i>Cosmopolitan</i></a
                  >.
                </span>
              </li>
              <li id="cite_note-9">
                <span class="mw-cite-backlink"
                  ><a href="#cite_ref-9" aria-label="Jump up">^</a></span
                >
                <span class="reference-text">
                  &ldquo;Wet Leg deserve Grammy wins, says Isle of Wight music teacher&rdquo; (7
                  February 2023).
                  <a
                    class="external text"
                    href="https://www.bbc.com/news/uk-england-hampshire-64539349"
                    rel="noopener"
                    >BBC News</a
                  >.
                </span>
              </li>
              <li id="cite_note-10">
                <span class="mw-cite-backlink"
                  ><a href="#cite_ref-10" aria-label="Jump up">^</a></span
                >
                <span class="reference-text">
                  &ldquo;Meet Wet Leg, the British rock band to know now&rdquo; (25 February 2022).
                  <a
                    class="external text"
                    href="https://www.standard.co.uk/esmagazine/wet-leg-band-chaise-longue-interview-b984651.html"
                    rel="noopener"
                    ><i>Evening Standard</i></a
                  >.
                </span>
              </li>
              <li id="cite_note-11">
                <span class="mw-cite-backlink"
                  ><a href="#cite_ref-11" aria-label="Jump up">^</a></span
                >
                <span class="reference-text">
                  &ldquo;Quirky debut release ensures splash for Isle of Wight band Wet Leg&rdquo;.
                  <a
                    class="external text"
                    href="https://www.countypress.co.uk/news/19373615.quirky-debut-ensures-splash-isle-wight-band-wet-leg/"
                    rel="noopener"
                    ><i>Isle of Wight County Press</i></a
                  >.
                </span>
              </li>
              <li id="cite_note-12">
                <span class="mw-cite-backlink"
                  ><a href="#cite_ref-12" aria-label="Jump up">^</a></span
                >
                <span class="reference-text">
                  &ldquo;One to watch: Wet Leg&rdquo; (9 October 2021).
                  <a
                    class="external text"
                    href="https://www.theguardian.com/music/2021/oct/09/one-to-watch-wet-leg-isle-of-wight-wet-dream"
                    rel="noopener"
                    ><i>The Guardian</i></a
                  >.
                </span>
              </li>
              <li id="cite_note-13">
                <span class="mw-cite-backlink"
                  ><a href="#cite_ref-13" aria-label="Jump up">^</a></span
                >
                <span class="reference-text">
                  Sally Perry (6 December 2021). &ldquo;Wet Leg band name: What&apos;s the origin and
                  meaning?&rdquo;.
                  <a
                    class="external text"
                    href="https://onthewight.com/wet-leg-band-name-whats-the-origin-and-meaning-we-have-the-answer-direct-from-the-band"
                    rel="noopener"
                    >OnTheWight</a
                  >.
                </span>
              </li>
              <li id="cite_note-14">
                <span class="mw-cite-backlink"
                  ><a href="#cite_ref-14" aria-label="Jump up">^</a></span
                >
                <span class="reference-text">
                  <a
                    class="external text"
                    href="https://www.youtube.com/watch?v=SIcyPaaXSB8"
                    rel="noopener"
                    >@Wet Leg on their band name, &ldquo;Chaise Longue&rdquo; and social media |
                    DIFFUS</a
                  >
                  (8 April 2022).
                </span>
              </li>
              <li id="cite_note-15">
                <span class="mw-cite-backlink"
                  ><a href="#cite_ref-15" aria-label="Jump up">^</a></span
                >
                <span class="reference-text">
                  Josh Glancy (July 2023). &ldquo;My Wet Leg lover gave me the boot — and won&apos;t
                  stop kicking&rdquo;.
                  <a
                    class="external text"
                    href="https://www.thetimes.com/culture/music/article/my-wet-leg-lover-gave-me-the-boot-and-wont-stop-kicking-ll29qgl5w"
                    rel="noopener"
                    ><i>The Times</i></a
                  >.
                </span>
              </li>
              <li id="cite_note-16">
                <span class="mw-cite-backlink"
                  ><a href="#cite_ref-16" aria-label="Jump up">^</a></span
                >
                <span class="reference-text">
                  Chris Deville (15 June 2021). &ldquo;Wet Leg – &ldquo;Chaise Longue&rdquo;&rdquo;.
                  <a
                    class="external text"
                    href="https://www.stereogum.com/2151122/wet-leg-chaise-longue/music/"
                    rel="noopener"
                    ><i>Stereogum</i></a
                  >.
                </span>
              </li>
              <li id="cite_note-17">
                <span class="mw-cite-backlink"
                  ><a href="#cite_ref-17" aria-label="Jump up">^</a></span
                >
                <span class="reference-text">
                  Jem Aswad (28 September 2021). &ldquo;Oddball British Duo Wet Leg Return With
                  Their Second Great Single This Year, &lsquo;Wet Dream&rsquo;&rdquo;.
                  <a
                    class="external text"
                    href="https://variety.com/2021/music/news/wet-leg-single-video-dream-1235076142/"
                    rel="noopener"
                    ><i>Variety</i></a
                  >.
                </span>
              </li>
              <li id="cite_note-18">
                <span class="mw-cite-backlink"
                  ><a href="#cite_ref-18" aria-label="Jump up">^</a></span
                >
                <span class="reference-text">
                  Lori Little (28 October 2021). &ldquo;Isle of Wight band Wet Leg to star on Later
                  With Jools Holland&rdquo;.
                  <a
                    class="external text"
                    href="https://www.countypress.co.uk/news/19680132.isle-wight-band-wet-leg-star-later-jools-holland/"
                    rel="noopener"
                    ><i>Isle of Wight County Press</i></a
                  >.
                </span>
              </li>
              <li id="cite_note-19">
                <span class="mw-cite-backlink"
                  ><a href="#cite_ref-19" aria-label="Jump up">^</a></span
                >
                <span class="reference-text">
                  Damian Jones (29 November 2021). &ldquo;Wet Leg announce debut album and share two
                  new songs &lsquo;Too Late Now&rsquo; and &lsquo;Oh No&rsquo;&rdquo;.
                  <a
                    class="external text"
                    href="https://www.nme.com/news/music/wet-leg-announce-debut-album-and-share-two-new-songs-too-late-now-and-oh-no-3107104"
                    rel="noopener"
                    ><i>NME</i></a
                  >.
                </span>
              </li>
              <li id="cite_note-20">
                <span class="mw-cite-backlink"
                  ><a href="#cite_ref-20" aria-label="Jump up">^</a></span
                >
                <span class="reference-text">
                  &ldquo;Wet Leg live in London: a glorious victory lap for the indie
                  sensations&rdquo; (27 April 2022).
                  <a
                    class="external text"
                    href="https://www.nme.com/reviews/live/wet-leg-live-gig-review-debut-in-london-radar-3213434"
                    rel="noopener"
                    ><i>NME</i></a
                  >.
                </span>
              </li>
              <li id="cite_note-21">
                <span class="mw-cite-backlink"
                  ><a href="#cite_ref-21" aria-label="Jump up">^</a></span
                >
                <span class="reference-text">
                  &ldquo;Wet Leg set for second appearance on Later with Jools Holland TODAY&rdquo;
                  (14 May 2022).
                  <a
                    class="external text"
                    href="https://www.countypress.co.uk/news/20123535.isle-wight-band-wet-leg-back-later-jools-holland/"
                    rel="noopener"
                    ><i>Isle of Wight County Press</i></a
                  >.
                </span>
              </li>
              <li id="cite_note-22">
                <span class="mw-cite-backlink"
                  ><a href="#cite_ref-22" aria-label="Jump up">^</a></span
                >
                <span class="reference-text">
                  Tom Skinner (21 June 2022). &ldquo;Wet Leg reveal they&apos;ve completed their
                  second album: &ldquo;It&apos;s in the bag&rdquo;&rdquo;.
                  <a
                    class="external text"
                    href="https://www.nme.com/news/music/wet-leg-completed-second-album-interview-radar-3252129"
                    rel="noopener"
                    ><i>NME</i></a
                  >.
                </span>
              </li>
              <li id="cite_note-23">
                <span class="mw-cite-backlink"
                  ><a href="#cite_ref-23" aria-label="Jump up">^</a></span
                >
                <span class="reference-text">
                  Andrew Ford (16 July 2022). &ldquo;Wet Leg play live and Allan Clayton takes you on
                  A Winter&apos;s Journey&rdquo;.
                  <a
                    class="external text"
                    href="https://www.abc.net.au/radionational/programs/musicshow/wet-leg-rhian-teasdale-hester-chambers-allan-clayton-winterreise/13975066"
                    rel="noopener"
                    >ABC</a
                  >.
                </span>
              </li>
              <li id="cite_note-24">
                <span class="mw-cite-backlink"
                  ><a href="#cite_ref-24" aria-label="Jump up">^</a></span
                >
                <span class="reference-text">
                  Zach Saunders (5 February 2023). &ldquo;Isle of Wight band Wet Leg win TWO Grammy
                  Awards&rdquo;.
                  <a
                    class="external text"
                    href="https://www.countypress.co.uk/news/23300928.isle-wight-band-wet-leg-win-two-grammy-awards"
                    rel="noopener"
                    ><i>Isle of Wight County Press</i></a
                  >.
                </span>
              </li>
              <li id="cite_note-25">
                <span class="mw-cite-backlink"
                  ><a href="#cite_ref-25" aria-label="Jump up">^</a></span
                >
                <span class="reference-text">
                  Jon Wilks (11 February 2023). &ldquo;Who are the Morris dancers dancing with Wet Leg
                  at the Brits?&rdquo;.
                  <a
                    class="external text"
                    href="https://tradfolk.co/performance/morris-dancing/morris-dancers-wet-leg-the-brits/"
                    rel="noopener"
                    >Tradfolk</a
                  >.
                </span>
              </li>
              <li id="cite_note-26">
                <span class="mw-cite-backlink"
                  ><a href="#cite_ref-26" aria-label="Jump up">^</a></span
                >
                <span class="reference-text">
                  &ldquo;Coachella 2023 Weekend 2 Lineup &amp; Schedule: All the Set Times You Need
                  to Know&rdquo; (21 April 2023).
                  <a
                    class="external text"
                    href="https://pitchfork.com/news/coachella-2023-weekend-2-lineup-and-schedule-all-the-set-times-you-need-to-know/"
                    rel="noopener"
                    ><i>Pitchfork</i></a
                  >.
                </span>
              </li>
              <li id="cite_note-27">
                <span class="mw-cite-backlink"
                  ><a href="#cite_ref-27" aria-label="Jump up">^</a></span
                >
                <span class="reference-text">
                  Emma Wilkes (22 April 2023). &ldquo;Dave Grohl makes cameo appearance during Wet Leg
                  Coachella set&rdquo;.
                  <a
                    class="external text"
                    href="https://www.nme.com/en_au/news/music/dave-grohl-makes-cameo-appearance-during-wet-leg-coachella-set-3434142"
                    rel="noopener"
                    ><i>NME</i></a
                  >.
                </span>
              </li>
              <li id="cite_note-28">
                <span class="mw-cite-backlink"
                  ><a href="#cite_ref-28" aria-label="Jump up">^</a></span
                >
                <span class="reference-text">
                  Jazz Monroe (7 July 2023). &ldquo;Wet Leg Remix Depeche Mode&apos;s &ldquo;Wagging
                  Tongue&rdquo;: Listen&rdquo;.
                  <a
                    class="external text"
                    href="https://pitchfork.com/news/wet-leg-remix-depeche-modes-wagging-tongue-listen/"
                    rel="noopener"
                    ><i>Pitchfork</i></a
                  >.
                </span>
              </li>
              <li id="cite_note-29">
                <span class="mw-cite-backlink"
                  ><a href="#cite_ref-29" aria-label="Jump up">^</a></span
                >
                <span class="reference-text">
                  Anagricel Duran (17 March 2025). &ldquo;Wet Leg announce their return: &ldquo;We&apos;re
                  so back&rdquo;&rdquo;.
                  <a
                    class="external text"
                    href="https://www.nme.com/news/music/wet-leg-announce-their-return-were-so-back-3846997"
                    rel="noopener"
                    ><i>NME</i></a
                  >.
                </span>
              </li>
              <li id="cite_note-30">
                <span class="mw-cite-backlink"
                  ><a href="#cite_ref-30" aria-label="Jump up">^</a></span
                >
                <span class="reference-text">
                  Tom Breihan (24 March 2025). &ldquo;Wet Leg Debut New Songs At Secret Brighton
                  Show&rdquo;.
                  <a
                    class="external text"
                    href="https://www.stereogum.com/2301455/wet-leg-debut-new-songs-at-secret-brighton-show/news/"
                    rel="noopener"
                    ><i>Stereogum</i></a
                  >.
                </span>
              </li>
              <li id="cite_note-31">
                <span class="mw-cite-backlink"
                  ><a href="#cite_ref-31" aria-label="Jump up">^</a></span
                >
                <span class="reference-text">
                  Damian Jones (1 April 2025). &ldquo;Wet Leg announce new album &lsquo;Moisturizer&rsquo;
                  with thunderous single &lsquo;Catch These Fists&rsquo;&rdquo;.
                  <a
                    class="external text"
                    href="https://www.nme.com/news/music/wet-leg-announce-new-album-moisturizer-with-thunderous-single-catch-these-fists-3850978"
                    rel="noopener"
                    ><i>NME</i></a
                  >.
                </span>
              </li>
              <li id="cite_note-32">
                <span class="mw-cite-backlink"
                  ><a href="#cite_ref-32" aria-label="Jump up">^</a></span
                >
                <span class="reference-text">
                  &ldquo;Wet Leg - Moisturizer LP&rdquo;.
                  <a
                    class="external text"
                    href="https://shop.umusic.com.au/collections/pre-order/products/wet-leg-moisturizer-lp"
                    rel="noopener"
                    >Universal Music</a
                  >.
                </span>
              </li>
              <li id="cite_note-33">
                <span class="mw-cite-backlink"
                  ><a href="#cite_ref-33" aria-label="Jump up">^</a></span
                >
                <span class="reference-text">
                  <a
                    class="external text"
                    href="https://www.billboard.com/music/chart-beat/heated-rivalry-soundtrack-wet-leg-feist-streaming-gains-1236133983/"
                    rel="noopener"
                    ><i>Billboard</i></a
                  >
                  chart beat on Heated Rivalry streaming gains (December 2025).
                </span>
              </li>
              <li id="cite_note-34">
                <span class="mw-cite-backlink"
                  ><a href="#cite_ref-34" aria-label="Jump up">^</a></span
                >
                <span class="reference-text">
                  Annie Harrigan (16 March 2026). &ldquo;Wet Leg Revealed As Musical Guest on
                  &lsquo;SNL UK&rsquo; Premiere&rdquo;.
                  <a
                    class="external text"
                    href="https://www.billboard.com/culture/tv-film/wet-leg-snl-uk-musical-guest-1236200507/"
                    rel="noopener"
                    ><i>Billboard</i></a
                  >.
                </span>
              </li>
            </ol>
            <p>
              Prose adapted from the English Wikipedia article
              <a href="https://en.wikipedia.org/wiki/Wet_Leg">&ldquo;Wet Leg&rdquo;</a>
              (<abbr title="Creative Commons Attribution Share-Alike licence">CC BY-SA</abbr>).
            </p>
          </div>
        </section>

        <p><RouterLink to="/">Back to gallery</RouterLink></p>
      </section>
    </ArticleCustom>
  </ChromeWrapper>
</template>
