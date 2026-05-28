import{A as R}from"./ArticleWrapper-BPQVmjvu.js";import{C as T}from"./ChromeWrapper-BK8l8aBR.js";import{b as E,B as G,a as k,w as N}from"./PrototypeUserSettingsPopover-BicC1P2J.js";import{d as L,l as O,m as I,p as W,q as z,o as c,b as f,a as t,F as M,r as x,t as C,n as q,e as d,w as v,f as o,k as g,j as H,c as D}from"./index-_9eMIheG.js";import{_ as A}from"./_plugin-vue_export-helper-DlAUqK2U.js";const F=[{title:"Childhood, youth and education",html:`
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
`.trim()},{title:"Marriages, relationships and children",html:`
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
`.trim()},{title:"Personal views",html:`
<p>Einstein described himself as a pacifist and humanitarian. In 1918 he signed the founding proclamation of the German Democratic Party. Later he favoured democratic socialism and was critical of capitalism, writing essays such as <em>Why Socialism?</em></p>
<p>On religion, he said he believed in "Spinoza's God" — not a personal deity, but one revealed in the harmony of the universe. He rejected the idea of a God who rewards and punishes.</p>
<p>On Lenin he wrote: "In Lenin I honor a man who in total sacrifice of his own person has committed his entire energy to realizing social justice. I do not find his methods advisable."</p>
`.trim()},{title:"Death",html:`
<p>On 17 April 1955, Einstein experienced internal bleeding from a rupture of an abdominal aortic aneurysm, previously reinforced by surgery in 1948. He took a draft speech for a television appearance about Israel's seventh anniversary to the hospital, but did not live to complete it.</p>
<p>Einstein refused surgery, saying: "I want to go when I want. It is tasteless to prolong life artificially. I have done my share; it is time to go. I will do it elegantly."</p>
<p>He died at Princeton Hospital on 18 April 1955, aged 76, having continued to work until near the end. His ashes were scattered at an undisclosed location.</p>
`.trim()}],V={class:"personal-life-carousel","aria-roledescription":"carousel","aria-label":"Personal life events"},U=["aria-label"],Z={class:"life-event-card"},J={class:"life-event-card__title"},K=["innerHTML"],Q={class:"personal-life-carousel__footer"},X={class:"personal-life-carousel__dots","aria-hidden":"true"},Y={class:"personal-life-carousel__controls"},ee={class:"personal-life-carousel__counter","aria-live":"polite"},ie=L({__name:"PersonalLifeCarousel",props:{events:{}},setup(p){const m=p,h=g(null),u=g([]),e=g(0),_=H(()=>m.events.length),P=H(()=>`${e.value+1} of ${_.value}`);function B(r,a){u.value[r]=a instanceof HTMLElement?a:null}function w(r){const a=u.value[r];a&&a.scrollIntoView({behavior:"smooth",inline:"center",block:"nearest"})}function S(){e.value<=0||w(e.value-1)}function $(){e.value>=_.value-1||w(e.value+1)}let i=null;function b(){i==null||i.disconnect(),i=null;const r=h.value;!r||m.events.length===0||(i=new IntersectionObserver(a=>{let n=e.value,s=0;for(const l of a){if(!l.isIntersecting)continue;const y=u.value.findIndex(j=>j===l.target);y!==-1&&l.intersectionRatio>=s&&(s=l.intersectionRatio,n=y)}e.value=n},{root:r,threshold:[.4,.6,.8]}),u.value.forEach(a=>{a&&(i==null||i.observe(a))}))}return O(()=>{I(()=>b())}),W(()=>{i==null||i.disconnect()}),z(()=>m.events,()=>{u.value=[],e.value=0,I(()=>b())},{deep:!0}),(r,a)=>(c(),f("section",V,[t("div",{ref_key:"railRef",ref:h,class:"personal-life-carousel__rail"},[(c(!0),f(M,null,x(p.events,(n,s)=>(c(),f("article",{key:n.title,ref_for:!0,ref:l=>B(s,l),class:"personal-life-carousel__slide",role:"group","aria-label":`${s+1} of ${_.value}: ${n.title}`},[t("div",Z,[t("h3",J,C(n.title),1),t("div",{class:"mw-parser-output life-event-card__body",innerHTML:n.html},null,8,K)])],8,U))),128))],512),t("div",Q,[t("div",X,[(c(!0),f(M,null,x(p.events,(n,s)=>(c(),f("span",{key:`dot-${s}`,class:q(["personal-life-carousel__dot",{"personal-life-carousel__dot--active":s===e.value}])},null,2))),128))]),t("div",Y,[d(o(k),{"aria-label":"Previous event",weight:"quiet",disabled:e.value<=0,onClick:S},{default:v(()=>[d(o(E),{icon:o(G)},null,8,["icon"])]),_:1},8,["disabled"]),t("p",ee,C(P.value),1),d(o(k),{"aria-label":"Next event",weight:"quiet",disabled:e.value>=_.value-1,onClick:$},{default:v(()=>[d(o(E),{icon:o(N)},null,8,["icon"])]),_:1},8,["disabled"])])])]))}}),ae=A(ie,[["__scopeId","data-v-7f479dd2"]]),te={class:"personal-life-cards"},ne=L({__name:"index",setup(p){return(m,h)=>(c(),D(T,{skin:"mobile"},{default:v(()=>[d(R,{title:"Albert Einstein",skin:"mobile"},{default:v(()=>[t("div",te,[h[0]||(h[0]=t("h2",{class:"personal-life-cards__heading"},"Personal life",-1)),d(ae,{class:"personal-life-cards__carousel",events:o(F)},null,8,["events"])])]),_:1})]),_:1}))}}),de=A(ne,[["__scopeId","data-v-18436a85"]]);export{de as default};
