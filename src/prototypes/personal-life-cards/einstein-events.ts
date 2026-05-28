export interface LifeEventCard {
  title: string
  html: string
}

/** Hand-picked Einstein life events — trimmed from en.wikipedia.org, May 2026. */
export const einsteinLifeEvents: LifeEventCard[] = [
  {
    title: 'Childhood, youth and education',
    html: `
<figure class="mw-halign-left">
  <img
    alt="Albert Einstein at age three, 1882"
    src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/Albert_Einstein_at_the_age_of_three_%281882%29.jpg/250px-Albert_Einstein_at_the_age_of_three_%281882%29.jpg"
    width="190"
    height="275"
  />
  <figcaption>Einstein in 1882, age 3</figcaption>
</figure>
<p>Einstein was born in Ulm in the German Empire on 14 March 1879. His parents were Hermann Einstein, a salesman and engineer, and Pauline Koch. In 1880, the family moved to Munich, where his father and uncle founded an electrical engineering company.</p>
<p>When he was very young, his parents worried that he had a learning disability because he was slow to learn to talk. When he was five and sick in bed, his father brought him a compass — the start of his lifelong fascination with electromagnetism.</p>
<p>He attended a Catholic elementary school in Munich, then the Luitpold Gymnasium (later renamed the Albert Einstein Gymnasium). In 1895, at 16, he took the entrance examinations for the Swiss Federal Polytechnic in Zurich but failed the general part.</p>
`.trim(),
  },
  {
    title: 'Marriages, relationships and children',
    html: `
<figure>
  <img
    alt="Albert Einstein and Mileva Marić"
    src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Albert_Einstein_and_his_wife_Mileva_Maric.jpg/250px-Albert_Einstein_and_his_wife_Mileva_Maric.jpg"
    width="250"
    height="186"
  />
  <figcaption>Einstein and Mileva Marić, circa 1912</figcaption>
</figure>
<p>Einstein and Mileva Marić met while studying at the Zurich Polytechnic. Correspondence published in 1987 revealed they had a daughter, Lieserl, born in 1902 while Marić was in Novi Sad. Her fate remains uncertain.</p>
<p>Einstein and Marić married in January 1903. Their sons Hans Albert (1904) and Eduard (1910) were born in Switzerland. The marriage deteriorated, and Marić accepted a divorce agreement in 1919.</p>
<p>Einstein married his cousin Elsa Löwenthal in 1919. He had begun a relationship with her during his marriage to Marić. Elsa died in 1936.</p>
`.trim(),
  },
  {
    title: 'Personal views',
    html: `
<p>Einstein described himself as a pacifist and humanitarian. In 1918 he signed the founding proclamation of the German Democratic Party. Later he favoured democratic socialism and was critical of capitalism, writing essays such as <em>Why Socialism?</em></p>
<p>On religion, he said he believed in "Spinoza's God" — not a personal deity, but one revealed in the harmony of the universe. He rejected the idea of a God who rewards and punishes.</p>
<p>On Lenin he wrote: "In Lenin I honor a man who in total sacrifice of his own person has committed his entire energy to realizing social justice. I do not find his methods advisable."</p>
`.trim(),
  },
  {
    title: 'Death',
    html: `
<p>On 17 April 1955, Einstein experienced internal bleeding from a rupture of an abdominal aortic aneurysm, previously reinforced by surgery in 1948. He took a draft speech for a television appearance about Israel's seventh anniversary to the hospital, but did not live to complete it.</p>
<p>Einstein refused surgery, saying: "I want to go when I want. It is tasteless to prolong life artificially. I have done my share; it is time to go. I will do it elegantly."</p>
<p>He died at Princeton Hospital on 18 April 1955, aged 76, having continued to work until near the end. His ashes were scattered at an undisclosed location.</p>
`.trim(),
  },
]
