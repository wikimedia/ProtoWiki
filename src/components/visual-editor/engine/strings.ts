/**
 * User-facing copy for Edit Check / Suggestion Mode, verbatim from
 * VisualEditor `editcheck/i18n/en.json` (plus Cite, OOUI and VE core keys it
 * uses). `{{int:…}}` links are resolved to their targets. Don't invent copy
 * here — add the message key alongside anything new.
 */

const mw = '//www.mediawiki.org/wiki/Help:Suggestion_mode'

function link(href: string, text: string): string {
  return `<a href="https:${href}" target="_blank" rel="noopener">${text}</a>`
}

export const STR = {
  // editcheck-toolbar-suggestions-title
  toggleSuggestions: 'Toggle suggestions',
  // editcheck-suggestions-turned-on / -off / -none
  suggestionsTurnedOn: 'Suggestions turned on',
  suggestionsTurnedOff: 'Suggestions turned off',
  suggestionsNone: 'No suggestions available',
  // editcheck-dialog-success-suggestion / -check
  successSuggestion: 'Suggestion completed!',
  successCheck: 'Check completed!',
  // editcheck-dialog-title / editcheck-review-title
  beforePublishing: 'Before publishing',
  reviewChanges: 'Review changes',
  // visualeditor-backbutton-tooltip
  goBack: 'Go back',
  // publishchanges-start (desktop) / publish (mobile)
  publishChangesEllipsis: 'Publish changes…',
  publishEllipsis: 'Publish…',
  publishChanges: 'Publish changes',
  publish: 'Publish',
  // visualeditor-find-and-replace-results
  nOfM: (n: number, m: number) => `${n} of ${m}`,
  // ooui-dialog-process-dismiss / editcheck-action-dismiss
  dismiss: 'Dismiss',
  decline: 'Decline',
  revise: 'Revise',
  recheck: 'Recheck',
  replace: 'Replace',
  back: 'Back',
  submit: 'Submit',
  // visualeditor-contextitemwidget-label-remove
  delete: 'Delete',
  // editcheck-reject-description
  rejectDescription: 'Other editors would value learning why you made this choice.',
  // editcheck-suggestionfeedback-label-about / -report
  aboutSuggestions: 'About suggestions',
  reportProblem: 'Report a problem',
  // postedit-confirmation-published
  editPublished: 'Your edit was published.',
} as const

export const CHECK_STRINGS = {
  addReference: {
    title: 'Add a citation',
    description:
      'Help readers understand where this information is coming from by adding a citation.',
    accept: 'Add citation',
    rejectDescription:
      'Other editors would value learning more about your decision not to add a citation.',
    rejectOptions: [
      { value: 'uncertain', label: "I'm not sure what citation to add" },
      { value: 'common-knowledge', label: "The information I'm adding is widely known" },
      { value: 'irrelevant', label: "I don't think citations are relevant to the change I'm making" },
      { value: 'other', label: 'Other' },
    ],
  },
  citationNeeded: {
    title: 'Add a citation',
    // cite-ve-citationneeded-description / -reason
    description: 'An editor has indicated that this claim needs a citation to a reliable source.',
    reason: (reason: string) => `Reason given: <em>${reason}</em>`,
    footer: 'Reported by an editor',
    accept: 'Add citation',
  },
  convertReference: {
    title: 'Convert reference',
    description: `This reference is missing details. Help readers understand where the information is coming from by converting this into a formatted ${link(`${mw}#Convert_reference`, 'reference')}. After converting it, check the accuracy of the details that the tool has added, and remove anything that is wrong or confusing.`,
    accept: 'Convert',
  },
  disambiguation: {
    title: 'Link to a more specific page',
    description: `This link points to a ${link(`${mw}#Disambiguation_links`, 'disambiguation page')}. Help readers find the right topic by linking to a more specific page.`,
    accept: 'Update link',
  },
  doubleBold: {
    title: 'Remove unnecessary bold formatting',
    description: `Bold is applied automatically to subheadings, definition list terms and table headers. Help readers by removing ${link(`${mw}#Double_bold`, 'unnecessary bold formatting')} from these elements.`,
    accept: 'Remove bold',
  },
  duplicateLink: {
    title: 'Remove duplicated link',
    description: `This link appears more than once in this section. Help readers navigate more easily by removing ${link(`${mw}#Duplicate_links`, 'repeated links')}.`,
    accept: 'Remove link',
  },
  adjacentLink: {
    title: 'Merge adjacent links',
    description:
      'These identical links are adjacent or separated only by whitespace. Help readers navigate more easily by merging them into a single link.',
    accept: 'Merge links',
  },
  externalLink: {
    title: 'Remove external link',
    description: `This link points to an ${link(`${mw}#External_links`, 'external website')}. Help readers stay focused on the content by removing this link, moving it to the “External links” section, or converting it into a ${link(`${mw}#External_links`, 'citation')} if appropriate.`,
    accept: 'Remove link',
  },
  headingLevel: {
    title: 'Adjust heading level',
    description: `This heading level may not follow the correct sequential structure. Help readers navigate the content more easily by using the correct ${link(`${mw}#Heading_levels`, 'heading level')}.`,
    accept: 'Adjust heading',
  },
  imageCaption: {
    title: 'Add image caption',
    description: `This image does not have a caption. Help readers understand why the image is relevant by adding a ${link(`${mw}#Image_caption_missing`, 'short caption')}.`,
    accept: 'Add caption',
  },
  suggestedLink: {
    title: 'Add a link',
    description: `This text does not link to another article. Add a link to ${link(`${mw}#Add_a_link`, 'help readers learn')} more about this topic.`,
    prompt: (text: string, target: string) =>
      `Link "${text}" to <a href="https://en.wikipedia.org/wiki/${encodeURIComponent(target.replace(/ /g, '_'))}" target="_blank" rel="noopener">${target}</a>?`,
    footer: 'Suggested links are machine-generated. Review before adding.',
    accept: 'Add link',
  },
  yearLink: {
    title: 'Fix year link',
    description:
      'This link points to a different year than the one shown in the text. Help make the article more accurate by updating the displayed year and linked year to match.',
    use: (year: string) => `Use ${year}`,
  },
  tone: {
    title: 'Revise Tone?',
    description: `Other users often revise this kind of wording, saying the tone is unbalanced. ${link('//meta.wikimedia.org/wiki/Special:MyLanguage/Neutral_point_of_view', 'Learn more')}`,
    footer: `Identified using a ${link('//meta.wikimedia.org/wiki/Special:MyLanguage/Machine_learning_models/Proposed/Tone_Check', 'BERT model')}`,
    thanks: 'Thank you for considering tone!',
    declineOptions: [
      { value: 'appropriate', label: 'The tone is appropriate' },
      { value: 'uncertain', label: "I'm not sure how to revise the tone" },
      { value: 'other', label: 'Other' },
    ],
  },
  paste: {
    title: 'Pasted content',
    description: `Please avoid copying text from other sources, even if rephrased or cited. This could be considered ${link('//foundation.wikimedia.org/wiki/Special:MyLanguage/Resolution:Licensing_policy#Resolution', 'copyright violation or plagiarism')} and may result in your content being removed or your account being blocked.`,
    prompt: 'Did you write this text?',
    keep: 'Yes, keep it',
    remove: 'No, remove it',
    keepDescription:
      'Please help other editors of this article understand your reason to keep the pasted text.',
    keepOptions: [
      { value: 'wrote', label: "I wrote this content and it's not published elsewhere" },
      { value: 'permission', label: 'This content is freely licensed' },
      { value: 'other', label: 'None of the above applies' },
    ],
    keepThanks: 'Thank you for sharing your reason to keep the pasted text!',
  },
  llmPaste: {
    title: 'Potential AI-generated content',
    description: `The text you pasted appears to be AI-generated, which is usually <em>not</em> allowed. Help keep articles trustworthy by making sure it follows ${link('//www.mediawiki.org/wiki/Special:MyLanguage/Help:Edit_check#LLM_Paste_check', "this wiki's policy on AI use")}.`,
    keep: 'Keep it',
    remove: 'Remove it',
    keepDescription:
      'Please help other editors of this article understand your reason to keep the pasted text.',
    keepOptions: [
      { value: 'llm-edited', label: 'I wrote this text myself, and have used AI to make minor edits to it.' },
      { value: 'llm-not-ai', label: 'I wrote this text myself. It is not AI-generated.' },
      {
        value: 'llm-generated',
        label: `I used AI to generate this text and I have confirmed it complies with ${link('//www.mediawiki.org/wiki/Special:MyLanguage/Help:Edit_check#LLM_Paste_check', "this wiki's AI policy")}.`,
      },
      { value: 'llm-other', label: 'None of the above.' },
    ],
    keepThanks: 'Thank you for sharing your reason to keep the pasted text!',
  },
} as const

/** Experimental checks (hard-coded English in their check classes unless a key is given). */
export const EXPERIMENTAL_STRINGS = {
  // editcheck-experimental-subheading-suggestion / -check
  subheadingSuggestion: 'Experimental suggestion for testing',
  subheadingCheck: 'Experimental edit check for testing',
  fakeHeading: {
    title: 'Use real headings',
    description: 'Real headings should be used, not bold text.',
    fix: 'Adjust heading',
  },
  leadLength: {
    // editcheck-leadlength-title / -description / -thank
    title: 'Improve readability',
    description: `This section is longer than ${link('//en.wikipedia.org/wiki/Wikipedia:Manual_of_Style/Lead_section#Length', 'Wikipedia guidelines')} recommend. Consider making it shorter by doing things like moving information into other sections or replacing long phrases with simpler ones.`,
    thanks: 'Thank you for considering the length of the lead section!',
    declineOptions: [
      { value: 'appropriate', label: 'The length is appropriate for this article' },
      { value: 'uncertain', label: "I'm not sure how to make it shorter" },
      { value: 'other', label: 'Other' },
    ],
  },
  redirect: {
    title: 'Link to the final page',
    description: 'This link points to a redirect page. Link to the final page instead.',
    fix: 'Update link',
  },
  requiredTemplateParam: {
    title: 'Template has missing parameters',
    description: 'The template is missing some required parameters.',
    edit: 'Edit',
  },
  llmSuggestion: {
    prompt: 'Do you think this suggestion is valid?',
    footer: `Identified using an ${link('//www.mediawiki.org/wiki/VisualEditor/Suggestion_Mode/Model-generated_editing_suggestions#Research_findings', 'open-weight language model')}`,
    valid: "Yes, it's valid",
    invalid: "No, it's not valid",
    invalidDescription: 'Please help developers understand why you think this suggestion is invalid',
    invalidOptions: [
      { value: 'mislabeled', label: 'There is an issue in the text, but the type of issue is mislabeled' },
      { value: 'unhelpful', label: 'There is an issue in the text, but the suggestion is not helpful' },
      { value: 'other', label: 'None of the above applies' },
    ],
  },
} as const

/** editcheck-textmatch-replace */
export function textMatchReplacePrompt(from: string, to: string): string {
  return `Replace "${from}" with "${to}"?`
}
