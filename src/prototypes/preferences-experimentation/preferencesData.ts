import { GADGET_SECTION_LABELS, GADGETS } from './gadgets'
import { INTERFACE_LANGUAGES } from './languages'
import type { PrefSection, PrefTab } from './types'

const WIKI = 'https://en.wikipedia.org/wiki'
const META = 'https://meta.wikimedia.org/wiki'

function gadgetSections(): PrefSection[] {
  const ids = [...new Set(GADGETS.map((gadget) => gadget.section))]
  return ids.map((sectionId) => ({
    id: `gadgets-${sectionId}`,
    title: GADGET_SECTION_LABELS[sectionId] ?? sectionId,
    fields: [
      {
        id: `gadget-group-${sectionId}`,
        type: 'checkboxes',
        options: GADGETS.filter((gadget) => gadget.section === sectionId).map((gadget) => ({
          value: gadget.id,
          label: gadget.label,
        })),
        defaultValue: GADGETS.filter((gadget) => gadget.section === sectionId && gadget.defaultOn).map(
          (gadget) => gadget.id,
        ),
      },
    ],
  }))
}

export const PREFERENCE_TABS: PrefTab[] = [
  {
    id: 'personal',
    label: 'User profile',
    sections: [
      {
        id: 'info',
        title: 'Basic information',
        fields: [
          { id: 'username', type: 'info', label: 'Username:', value: 'ExampleUser' },
          {
            id: 'usergroups',
            type: 'info',
            label: 'Member of groups:',
            value: 'Autoconfirmed users, Extended confirmed users, Users',
          },
          {
            id: 'oauth',
            type: 'info',
            label: 'Connected apps:',
            links: [{ label: 'Manage connected applications', href: `${WIKI}/Special:OAuthManageMyGrants` }],
          },
          {
            id: 'editcount',
            type: 'info',
            label: 'Number of edits:',
            links: [{ label: '1,247', href: `${WIKI}/Special:Contributions/ExampleUser` }],
          },
          { id: 'registrationdate', type: 'info', label: 'Registration time:', value: '12:04, 12 January 2024' },
          {
            id: 'realname',
            type: 'text',
            label: 'Real name:',
            help: 'Real name is optional. If provided, it may be used to give you attribution for your work.',
            defaultValue: '',
          },
          {
            id: 'globalaccount',
            type: 'info',
            label: 'Global account:',
            links: [
              { label: 'View your global account info', href: `${WIKI}/Special:CentralAuth/ExampleUser` },
              { label: 'Manage your global account', href: `${META}/Special:GlobalPreferences` },
            ],
          },
          {
            id: 'downloaduserdata',
            type: 'info',
            label: 'Access account data:',
            links: [{ label: 'My account data from this project', href: `${WIKI}/Special:Preferences` }],
          },
        ],
      },
      {
        id: 'accountsecurity',
        title: 'Account security',
        fields: [
          {
            id: 'password',
            type: 'buttons',
            label: 'Password:',
            links: [{ label: 'Change password', href: `${WIKI}/Special:ChangePassword` }],
          },
          {
            id: 'twofactor',
            type: 'buttons',
            label: 'Two-factor authentication:',
            links: [{ label: 'Manage', href: `${WIKI}/Special:OATH` }],
          },
        ],
      },
      {
        id: 'i18n',
        title: 'Internationalisation',
        fields: [
          {
            id: 'language',
            type: 'select',
            label:
              "Language (Warning: Selecting a language other than 'en - English' will prevent you from seeing localized parts of the interface on the English Wikipedia):",
            options: INTERFACE_LANGUAGES,
            defaultValue: 'en',
          },
          {
            id: 'gender',
            type: 'radio',
            label: 'Gender used in messages:',
            help: 'The software uses this value to address you and to mention you to others using the selected grammatical gender option. Your selection will be publicly visible to others.',
            options: [
              {
                value: 'unknown',
                label:
                  'Unspecified: Use gender-neutral terms when possible (e.g. "their contributions", "that editor")',
              },
              { value: 'female', label: 'Use feminine terms when possible (e.g. "her contributions")' },
              { value: 'male', label: 'Use masculine terms when possible (e.g. "his contributions")' },
            ],
            defaultValue: 'unknown',
          },
        ],
      },
      {
        id: 'signature',
        title: 'Signature',
        fields: [
          {
            id: 'oldsig',
            type: 'info',
            label: 'Your existing signature:',
            value: 'ExampleUser (talk)',
          },
          {
            id: 'nickname',
            type: 'text',
            label: 'Signature:',
            defaultValue: '',
          },
          {
            id: 'fancysig',
            type: 'checkbox',
            label:
              'Treat the above as wiki markup. If unchecked, the contents of the box above will be treated as your nickname and link automatically to your user page. If checked, signing with ~~~ or ~~~~ will insert the above markup in place of your username, including any wikicode or formatting. Custom signatures should link to your user page, your user talk page, or your contributions. Do not use images, transcluded templates, or external links in your signature. Please ensure your custom signature complies with the relevant guidelines. Note: to use a displayed pipe ("|") character (i.e. not part of a piped link), please use &#124; for the pipe character; otherwise, it may cause templates to fail.',
            help: 'Comments on talk pages should be signed with "~~~~", which will be converted into your signature and a timestamp.',
            defaultValue: false,
          },
        ],
      },
      {
        id: 'email',
        title: 'Email options',
        fields: [
          {
            id: 'emailaddress',
            type: 'info',
            label: 'Email (optional):',
            value: 'example@example.org',
            links: [{ label: 'Change or remove email address', href: `${WIKI}/Special:ChangeEmail` }],
            help: 'You do not have to provide an email address, but if you forget your password, you will not be able to regain access to your account without one.',
          },
          {
            id: 'emailauthentication',
            type: 'info',
            label: 'Email confirmation:',
            value: 'Your email address was confirmed on 12:18, 12 January 2024.',
          },
          {
            id: 'requireemail',
            type: 'checkbox',
            label: 'Send password reset emails only when both email address and username are provided',
            help: 'This improves privacy and helps prevent unsolicited emails.',
            defaultValue: false,
          },
          {
            id: 'disablemail',
            type: 'checkbox',
            label: 'Allow other users to email me',
            defaultValue: true,
          },
          {
            id: 'email-allow-new-users',
            type: 'checkbox',
            label: 'Allow emails from brand-new users',
            help: 'Enabling this option will allow users who are not autoconfirmed to send you emails.',
            defaultValue: true,
          },
          {
            id: 'ccmeonemails',
            type: 'checkbox',
            label: 'Send me copies of emails I send to other users',
            defaultValue: false,
          },
          {
            id: 'email-blacklist',
            type: 'textarea',
            label: 'Prohibit these users from emailing me:',
            defaultValue: '',
          },
          {
            id: 'enotifwatchlistpages',
            type: 'checkbox',
            label: 'Email me when a page or a file on my watchlist is changed',
            defaultValue: false,
          },
          {
            id: 'enotifusertalkpages',
            type: 'checkbox',
            label: 'Email me when my user talk page is changed',
            defaultValue: true,
          },
          {
            id: 'enotifminoredits',
            type: 'checkbox',
            label: 'Email me also for minor edits of pages and files',
            defaultValue: false,
          },
        ],
      },
      {
        id: 'homepage',
        title: 'Newcomer editor features',
        fields: [
          {
            id: 'growthexperiments-homepage-enable',
            type: 'checkbox',
            label: 'Display newcomer homepage',
            defaultValue: false,
          },
        ],
      },
    ],
  },
  {
    id: 'rendering',
    label: 'Appearance',
    sections: [
      {
        id: 'skin',
        title: 'Skin',
        fields: [
          {
            id: 'skin',
            type: 'radio',
            options: [
              { value: 'vector-2022', label: 'Vector (2022) (default)', href: `${WIKI}/Special:Preferences?useskin=vector-2022`, linkLabel: 'Preview' },
              { value: 'vector', label: 'Vector legacy (2010)', href: `${WIKI}/Special:Preferences?useskin=vector`, linkLabel: 'Preview' },
              { value: 'minerva', label: 'MinervaNeue', href: `${WIKI}/Special:Preferences?useskin=minerva`, linkLabel: 'Preview' },
              { value: 'monobook', label: 'MonoBook', href: `${WIKI}/Special:Preferences?useskin=monobook`, linkLabel: 'Preview' },
              { value: 'timeless', label: 'Timeless', href: `${WIKI}/Special:Preferences?useskin=timeless`, linkLabel: 'Preview' },
              { value: 'modern', label: 'Modern', href: `${WIKI}/Special:Preferences?useskin=modern`, linkLabel: 'Preview' },
            ],
            defaultValue: 'vector-2022',
          },
          {
            id: 'skin-responsive',
            type: 'checkbox',
            label: 'Enable responsive mode',
            help: 'Adapt layout to screen size on mobile.',
            defaultValue: true,
          },
          {
            id: 'vector-limited-width',
            type: 'checkbox',
            label: 'Enable limited width mode',
            help: 'Enable limited width mode for improved reading experience.',
            defaultValue: true,
          },
          {
            id: 'commoncssjs',
            type: 'info',
            label: 'Shared CSS/JavaScript for all skins:',
            links: [
              { label: 'Custom CSS', href: `${WIKI}/User:ExampleUser/common.css` },
              { label: 'Custom JavaScript', href: `${WIKI}/User:ExampleUser/common.js` },
            ],
          },
        ],
      },
      {
        id: 'reading',
        title: 'Reading preferences',
        fields: [
          {
            id: 'popups',
            type: 'checkbox',
            label: 'Enable page previews (get quick previews of a topic while reading a page)',
            defaultValue: true,
          },
          {
            id: 'popups-reference-previews',
            type: 'checkbox',
            label: 'Enable reference previews (get quick previews of a reference while reading a page)',
            defaultValue: true,
          },
        ],
      },
      {
        id: 'dateformat',
        title: 'Date format',
        fields: [
          {
            id: 'date',
            type: 'radio',
            options: [
              { value: 'default', label: 'No preference' },
              { value: 'mdy', label: '16:12, January 15, 2001' },
              { value: 'dmy', label: '16:12, 15 January 2001' },
              { value: 'ymd', label: '16:12, 2001 January 15' },
              { value: 'ISO 8601', label: '2001-01-15T16:12:34' },
            ],
            defaultValue: 'default',
          },
        ],
      },
      {
        id: 'timeoffset',
        title: 'Time offset',
        fields: [
          { id: 'nowserver', type: 'info', label: 'Server time:', value: '10:15' },
          { id: 'nowlocal', type: 'info', label: 'Local time:', value: '12:15' },
          {
            id: 'timecorrection-type',
            type: 'select',
            label: 'Time zone:',
            options: [
              { value: 'America/New_York', label: 'America/New_York' },
              { value: 'America/Los_Angeles', label: 'America/Los_Angeles' },
              { value: 'Europe/London', label: 'Europe/London' },
              { value: 'Europe/Paris', label: 'Europe/Paris' },
              { value: 'Europe/Berlin', label: 'Europe/Berlin' },
              { value: 'Asia/Kolkata', label: 'Asia/Kolkata' },
              { value: 'Asia/Tokyo', label: 'Asia/Tokyo' },
              { value: 'Australia/Sydney', label: 'Australia/Sydney' },
              { value: 'UTC', label: 'UTC' },
              { value: 'offset', label: 'Other (time offset from UTC)' },
            ],
            defaultValue: 'UTC',
          },
          {
            id: 'timecorrection-offset',
            type: 'text',
            label: 'Offset:',
            defaultValue: '0:00',
          },
          {
            id: 'guesstimezone',
            type: 'buttons',
            links: [{ label: 'Fill in from browser', href: '#' }],
          },
        ],
      },
      {
        id: 'files',
        title: 'Files',
        fields: [
          {
            id: 'imagesize',
            type: 'select',
            label: 'Image size limit on file description pages:',
            options: [
              { value: '320x240', label: '320×240 px' },
              { value: '640x480', label: '640×480 px' },
              { value: '800x600', label: '800×600 px' },
              { value: '1024x768', label: '1024×768 px' },
              { value: '1280x1024', label: '1280×1024 px' },
              { value: '2560x2048', label: '2560×2048 px' },
            ],
            defaultValue: '800x600',
          },
          {
            id: 'thumbsize',
            type: 'select',
            label: 'Thumbnail size:',
            options: [
              { value: '120', label: '120 px' },
              { value: '150', label: '150 px' },
              { value: '180', label: '180 px' },
              { value: '200', label: '200 px' },
              { value: '220', label: '220 px' },
              { value: '250', label: '250 px' },
              { value: '300', label: '300 px' },
              { value: '400', label: '400 px' },
            ],
            defaultValue: '250',
          },
          {
            id: 'multimediaviewer-enable',
            type: 'checkbox',
            label: 'Enable Media Viewer',
            defaultValue: true,
          },
        ],
      },
      {
        id: 'diffs',
        title: 'Diffs',
        fields: [
          {
            id: 'diffonly',
            type: 'checkbox',
            label: "Don't show page content below diffs",
            defaultValue: false,
          },
          {
            id: 'norollbackdiff',
            type: 'checkbox',
            label: "Don't show diff after performing a rollback",
            defaultValue: false,
          },
        ],
      },
      {
        id: 'advancedrendering',
        title: 'Advanced options',
        fields: [
          {
            id: 'underline',
            type: 'select',
            label: 'Underline links:',
            options: [
              { value: '0', label: 'Never' },
              { value: '1', label: 'Always' },
              { value: '2', label: 'Skin or browser default' },
            ],
            defaultValue: '2',
          },
          {
            id: 'stubthreshold',
            type: 'select',
            label: 'Threshold for stub link formatting:',
            options: [
              { value: '0', label: 'Disabled' },
              { value: '50', label: '50 bytes' },
              { value: '100', label: '100 bytes' },
              { value: '300', label: '300 bytes' },
              { value: '500', label: '500 bytes' },
              { value: '1000', label: '1,000 bytes' },
            ],
            defaultValue: '0',
          },
          {
            id: 'showhiddencats',
            type: 'checkbox',
            label: 'Show hidden categories',
            defaultValue: false,
          },
          {
            id: 'showrollbackconfirmation',
            type: 'checkbox',
            label: 'Show a confirmation prompt when clicking on a rollback link',
            defaultValue: false,
          },
          {
            id: 'forcesafemode',
            type: 'checkbox',
            label: 'Always enable safe mode',
            help: 'Disable on-wiki scripts and stylesheets.',
            defaultValue: false,
          },
        ],
      },
      {
        id: 'math',
        title: 'Math',
        fields: [
          {
            id: 'math',
            type: 'radio',
            options: [
              { value: 'mathml', label: 'SVG (MathML can be enabled via browser settings)' },
              { value: 'source', label: 'LaTeX source (for text browsers)' },
            ],
            defaultValue: 'mathml',
          },
        ],
      },
    ],
  },
  {
    id: 'editing',
    label: 'Editing',
    sections: [
      {
        id: 'advancedediting',
        title: 'General options',
        fields: [
          {
            id: 'editsectiononrightclick',
            type: 'checkbox',
            label: 'Enable section editing by right clicking on section titles',
            defaultValue: false,
          },
          {
            id: 'editondblclick',
            type: 'checkbox',
            label: 'Edit pages on double click',
            defaultValue: false,
          },
        ],
      },
      {
        id: 'editor',
        title: 'Editor',
        fields: [
          {
            id: 'editfont',
            type: 'select',
            label: 'Edit area font style:',
            options: [
              { value: 'monospace', label: 'Monospaced font' },
              { value: 'sans-serif', label: 'Sans-serif font' },
              { value: 'serif', label: 'Serif font' },
            ],
            defaultValue: 'monospace',
          },
          {
            id: 'minordefault',
            type: 'checkbox',
            label: 'Mark all edits minor by default',
            defaultValue: false,
          },
          {
            id: 'forceeditsummary',
            type: 'checkbox',
            label: 'Prompt me when entering a blank edit summary (or the default undo summary)',
            defaultValue: false,
          },
          {
            id: 'useeditwarning',
            type: 'checkbox',
            label: 'Warn me when I leave an edit page with unsaved changes',
            defaultValue: true,
          },
          {
            id: 'editrecovery',
            type: 'checkbox',
            label: 'Enable the Edit Recovery feature',
            defaultValue: true,
          },
          {
            id: 'usebetatoolbar',
            type: 'checkbox',
            label: 'Enable the editing toolbar',
            defaultValue: true,
          },
          {
            id: 'usecodemirror',
            type: 'checkbox',
            label: 'Enable syntax highlighting for wikitext',
            defaultValue: true,
          },
          {
            id: 'visualeditor-tabs',
            type: 'radio',
            label: 'Editing mode:',
            options: [
              { value: 'remember-last', label: 'Remember my last editor' },
              { value: 'prefer-ve', label: 'Always give me the visual editor if possible' },
              { value: 'prefer-wt', label: 'Always give me the source editor' },
              { value: 'multi-tab', label: 'Show me both editor tabs' },
            ],
            defaultValue: 'remember-last',
          },
          {
            id: 'visualeditor-newwikitext',
            type: 'checkbox',
            label: 'Use the VisualEditor toolbar—which includes the automatic citation tool—in the Source editor too',
            help: "This is sometimes called the '2017 wikitext editor'.",
            defaultValue: false,
          },
        ],
      },
      {
        id: 'discussion',
        title: 'Discussion pages',
        fields: [
          {
            id: 'discussiontools-replytool',
            type: 'checkbox',
            label: 'Enable quick replying',
            help: 'This will show you a link to reply to talk page comments in one click.',
            defaultValue: true,
          },
          {
            id: 'discussiontools-newtopictool',
            type: 'checkbox',
            label: 'Enable quick topic adding',
            help: 'This will show you an inline form for adding new topics.',
            defaultValue: true,
          },
          {
            id: 'discussiontools-sourcemodetoolbar',
            type: 'checkbox',
            label: 'Enable editing tools in source mode',
            help: 'This will add a toolbar to the quick replying and quick topic adding features’ source modes that includes shortcuts for pinging and adding links.',
            defaultValue: true,
          },
          {
            id: 'discussiontools-topicsubscription',
            type: 'checkbox',
            label: 'Enable topic subscription',
            help: 'This will allow you to subscribe to receive notifications about comments on individual topics.',
            defaultValue: true,
          },
          {
            id: 'discussiontools-autotopicsub',
            type: 'checkbox',
            label: 'Automatically subscribe to topics',
            help: 'When you start a new discussion or comment in an existing discussion, you will be automatically notified when others post new comments to it.',
            defaultValue: true,
          },
          {
            id: 'discussiontools-visualenhancements',
            type: 'checkbox',
            label: 'Show discussion activity',
            help: 'This will enable a new talk page appearance that includes information about the activity within each discussion.',
            defaultValue: true,
          },
        ],
      },
      {
        id: 'preview',
        title: 'Preview',
        fields: [
          {
            id: 'previewonfirst',
            type: 'checkbox',
            label: 'Show preview when starting to edit',
            defaultValue: false,
          },
          {
            id: 'previewontop',
            type: 'checkbox',
            label: 'Show preview before edit box',
            defaultValue: true,
          },
          {
            id: 'uselivepreview',
            type: 'checkbox',
            label: 'Show preview without reloading the page',
            defaultValue: false,
          },
        ],
      },
    ],
  },
  {
    id: 'rc',
    label: 'Recent changes',
    sections: [
      {
        id: 'displayrc',
        title: 'Display options',
        fields: [
          {
            id: 'rcdays',
            type: 'number',
            label: 'Days to show in recent changes:',
            help: 'Maximum 30 days',
            defaultValue: '7',
          },
          {
            id: 'rclimit',
            type: 'number',
            label: 'Number of edits to show in recent changes, page histories, and in logs, by default:',
            help: 'Maximum number: 1000',
            defaultValue: '50',
          },
        ],
      },
      {
        id: 'advancedrc',
        title: 'Advanced options',
        fields: [
          {
            id: 'usenewrc',
            type: 'checkbox',
            label: 'Group changes by page in recent changes and watchlist',
            defaultValue: true,
          },
          {
            id: 'shownumberswatching',
            type: 'checkbox',
            label: 'Show the number of watching users',
            defaultValue: true,
          },
          {
            id: 'rcenhancedfilters-disable',
            type: 'checkbox',
            label: 'Use non-JavaScript interface',
            defaultValue: false,
          },
          {
            id: 'usenavigabletoc',
            type: 'checkbox',
            label: 'Show Wikidata edits in recent changes',
            defaultValue: false,
          },
        ],
      },
      {
        id: 'changesrc',
        title: 'Changes shown',
        fields: [
          {
            id: 'hideminor',
            type: 'checkbox',
            label: 'Hide minor edits from recent changes',
            defaultValue: false,
          },
          {
            id: 'hidepatrolled',
            type: 'checkbox',
            label: 'Hide patrolled edits from recent changes',
            defaultValue: false,
          },
          {
            id: 'hidecategorization',
            type: 'checkbox',
            label: 'Hide categorization of pages',
            defaultValue: false,
          },
          {
            id: 'newpageshidepatrolled',
            type: 'checkbox',
            label: 'Hide patrolled pages from new page list',
            defaultValue: false,
          },
        ],
      },
      {
        id: 'flaggedrevs',
        title: 'Pending changes',
        fields: [
          {
            id: 'flaggedrevs-ui',
            type: 'checkbox',
            label: 'Show pending-changes review tools when viewing page histories',
            defaultValue: true,
          },
        ],
      },
    ],
  },
  {
    id: 'watchlist',
    label: 'Watchlist',
    sections: [
      {
        id: 'editwatchlist',
        title: 'Edit watchlist',
        fields: [
          {
            id: 'editwatchlist',
            type: 'buttons',
            label: 'Edit entries on your watchlist:',
            links: [
              { label: 'View and remove titles on your watchlist', href: `${WIKI}/Special:EditWatchlist` },
              { label: 'Edit raw watchlist', href: `${WIKI}/Special:EditWatchlist/raw` },
              { label: 'Clear your watchlist', href: `${WIKI}/Special:EditWatchlist/clear` },
            ],
          },
        ],
      },
      {
        id: 'displaywatchlist',
        title: 'Display options',
        fields: [
          {
            id: 'watchlistdays',
            type: 'number',
            label: 'Days to show in watchlist:',
            help: 'Maximum 30 days',
            defaultValue: '7',
          },
          {
            id: 'wllimit',
            type: 'number',
            label: 'Maximum number of changes to show in watchlist:',
            help: 'Maximum number: 1000',
            defaultValue: '250',
          },
        ],
      },
      {
        id: 'advancedwatchlist',
        title: 'Advanced options',
        fields: [
          {
            id: 'extendwatchlist',
            type: 'checkbox',
            label: 'Expand watchlist to show all changes, not just the most recent',
            defaultValue: false,
          },
          {
            id: 'watchlistreloadautomatically',
            type: 'checkbox',
            label: 'Reload the watchlist automatically whenever a filter is changed (JavaScript required)',
            defaultValue: false,
          },
          {
            id: 'watchlistunwatchlinks',
            type: 'checkbox',
            label:
              'Add direct unwatch/watch markers (×/+) to watched pages with changes (JavaScript required for toggle functionality)',
            defaultValue: false,
          },
          {
            id: 'wlenhancedfilters-disable',
            type: 'checkbox',
            label: 'Use non-JavaScript interface',
            defaultValue: false,
          },
          {
            id: 'wlshowwikidata',
            type: 'checkbox',
            label: 'Show Wikidata edits in your watchlist',
            defaultValue: false,
          },
        ],
      },
      {
        id: 'changeswatchlist',
        title: 'Changes shown',
        fields: [
          {
            id: 'watchlisthideminor',
            type: 'checkbox',
            label: 'Hide minor edits from the watchlist',
            defaultValue: false,
          },
          {
            id: 'watchlisthidebots',
            type: 'checkbox',
            label: 'Hide bot edits from the watchlist',
            defaultValue: false,
          },
          {
            id: 'watchlisthideown',
            type: 'checkbox',
            label: 'Hide my edits from the watchlist',
            defaultValue: false,
          },
          {
            id: 'watchlisthideanons',
            type: 'checkbox',
            label: 'Hide edits by anonymous users from the watchlist',
            defaultValue: false,
          },
          {
            id: 'watchlisthideliu',
            type: 'checkbox',
            label: 'Hide edits by logged in users from the watchlist',
            defaultValue: false,
          },
          {
            id: 'watchlisthidecategorization',
            type: 'checkbox',
            label: 'Hide categorization of pages',
            defaultValue: false,
          },
          {
            id: 'watchlisthidepatrolled',
            type: 'checkbox',
            label: 'Hide patrolled edits from the watchlist',
            defaultValue: false,
          },
        ],
      },
      {
        id: 'pageswatchlist',
        title: 'Watched pages',
        fields: [
          {
            id: 'watchdefault',
            type: 'checkbox',
            label: 'Add pages and files I edit to my watchlist',
            defaultValue: true,
          },
          {
            id: 'watchmoves',
            type: 'checkbox',
            label: 'Add pages and files I move to my watchlist',
            defaultValue: true,
          },
          {
            id: 'watchdeletion',
            type: 'checkbox',
            label: 'Add pages and files I delete to my watchlist',
            defaultValue: true,
          },
          {
            id: 'watchrollback',
            type: 'checkbox',
            label: 'Add pages where I have performed a rollback to my watchlist',
            defaultValue: false,
          },
          {
            id: 'watchuploads',
            type: 'checkbox',
            label: 'Add new files I upload to my watchlist',
            defaultValue: true,
          },
          {
            id: 'watchcreations',
            type: 'checkbox',
            label: 'Add pages I create and files I upload to my watchlist',
            defaultValue: true,
          },
        ],
      },
      {
        id: 'tokenwatchlist',
        title: 'Token',
        fields: [
          {
            id: 'watchlisttoken',
            type: 'info',
            label: 'Watchlist token:',
            value: '••••••••••••••••••••••••••••••••',
            links: [{ label: 'Manage tokens', href: `${WIKI}/Special:ResetTokens` }],
            help: 'This is the secret key to the web feed of your watchlist. It is not to be shared unless you trust somebody and wish them to follow changes to articles in your watchlist.',
          },
        ],
      },
    ],
  },
  {
    id: 'searchoptions',
    label: 'Search',
    sections: [
      {
        id: 'searchmisc',
        title: 'General',
        fields: [
          {
            id: 'searchlimit',
            type: 'number',
            label: 'Number of search results to show on each page:',
            defaultValue: '20',
          },
        ],
      },
      {
        id: 'completion',
        title: 'Search completion',
        fields: [
          {
            id: 'search-completion-profile',
            type: 'radio',
            options: [
              {
                value: 'fuzzy',
                label: 'Default (recommended)',
                description: 'Corrects up to two typos. Removes redirects that are very similar to the main title.',
              },
              {
                value: 'fuzzy-subphrases',
                label: 'Subphrase matching (recommended for longer page titles)',
                description: 'Corrects up to two typos. Resolves close redirects. Matches subphrase in titles.',
              },
              {
                value: 'strict',
                label: 'Strict mode (advanced)',
                description: 'No typo correction. No accent folding. Strict matching.',
              },
              {
                value: 'normal',
                label: 'Redirect mode (advanced)',
                description: 'No typo correction. Resolves close redirects.',
              },
              {
                value: 'classic',
                label: 'Classic prefix search',
                description: 'No typo correction. Matches the beginning of titles.',
              },
            ],
            defaultValue: 'fuzzy',
          },
        ],
      },
      {
        id: 'advancedsearch',
        title: 'Advanced Search',
        fields: [
          {
            id: 'advancedsearch-disable',
            type: 'checkbox',
            label: "Don't show the Advanced Search interface when using Special:Search",
            help: 'Advanced Search adds a form to the Special:Search page so you can perform specialized searches without knowing search syntax.',
            defaultValue: false,
          },
        ],
      },
    ],
  },
  {
    id: 'gadgets',
    label: 'Gadgets',
    sections: gadgetSections(),
  },
  {
    id: 'centralnotice-banners',
    label: 'Banners',
    sections: [
      {
        id: 'banners',
        title: 'Banner types to display',
        description:
          'Banners display announcements of interest to Wikimedia communities and users. Below are options that allow you to manage which types of announcements you see. Certain platform notices, such as those relating to site maintenance and special notices considered necessary to all users, will always be displayed.',
        fields: [
          {
            id: 'centralnotice-display-banner-types',
            type: 'checkboxes',
            options: [
              { value: 'advocacy', label: 'Advocacy' },
              { value: 'article-writing', label: 'Article writing' },
              { value: 'event', label: 'Event' },
              { value: 'fundraising', label: 'Fundraising' },
              { value: 'governance', label: 'Governance' },
              { value: 'maintenance', label: 'Maintenance' },
              { value: 'photography', label: 'Photography' },
              { value: 'special', label: 'Special' },
            ],
            defaultValue: [
              'advocacy',
              'article-writing',
              'event',
              'fundraising',
              'governance',
              'maintenance',
              'photography',
              'special',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'betafeatures',
    label: 'Beta features',
    sections: [
      {
        id: 'beta',
        title: 'Beta features',
        description:
          "Here are some new features we're considering for Wikipedia. Please try them out and give us your thoughts, so we can improve them based on your feedback.",
        fields: [
          {
            id: 'betafeatures-auto-enroll',
            type: 'checkbox',
            label: 'Automatically enable most beta features',
            help: 'Some beta features can have surprising changes, and so you have to opt in manually.',
            defaultValue: false,
          },
        ],
      },
    ],
  },
  {
    id: 'echo',
    label: 'Notifications',
    sections: [
      {
        id: 'echosubscriptions',
        title: 'Notify me about these events',
        fields: [
          {
            id: 'echo-email-frequency',
            type: 'radio',
            label: 'Send me:',
            options: [
              { value: '0', label: 'Individual notifications as they come in' },
              { value: '1', label: 'A daily summary of notifications' },
              { value: '7', label: 'A weekly summary of notifications' },
              { value: '-1', label: 'Do not send me any email notifications' },
            ],
            defaultValue: '0',
          },
          {
            id: 'echo-email-format',
            type: 'radio',
            label: 'Email format:',
            options: [
              { value: 'html', label: 'HTML' },
              { value: 'plain-text', label: 'Plain text' },
            ],
            defaultValue: 'html',
          },
          {
            id: 'echo-dont-email-read',
            type: 'checkbox',
            label: "Don't include read notifications in summary emails",
            defaultValue: false,
          },
          {
            id: 'echo-subscriptions',
            type: 'matrix',
            columns: [
              { value: 'web', label: 'Web' },
              { value: 'email', label: 'Email' },
              { value: 'push', label: 'Apps' },
            ],
            rows: [
              { value: 'edit-user-talk', label: 'Edits to my talk page' },
              { value: 'mention', label: 'Mentions' },
              { value: 'edit-thank', label: 'Thanks' },
              { value: 'reverted', label: 'Edit reverts' },
              { value: 'article-linked', label: 'Page links' },
              { value: 'emailuser', label: 'Emails from other users' },
              { value: 'user-rights', label: 'User rights changes' },
              { value: 'login-fail', label: 'Failed login attempts' },
              { value: 'login-success', label: 'Login from an unfamiliar device' },
              { value: 'cx', label: 'Translations' },
              { value: 'wikibase-action', label: 'Connections with Wikidata' },
              { value: 'dt-subscription', label: 'Talk page subscriptions' },
              { value: 'dt-subscription-archiving', label: 'Talk page archiving' },
              { value: 'thank-you-edit', label: 'Edit milestones' },
              { value: 'mention-success', label: 'Successful mentions' },
              { value: 'mention-failure', label: 'Failed mentions' },
              { value: 'ge-newcomer', label: 'Growth features' },
              { value: 'ge-mentorship', label: 'Mentorship' },
              { value: 'verify-email-reminder', label: 'Email confirmation reminders' },
              { value: 'campaign-events-notification-registration', label: 'Event registration' },
              { value: 'communityrequests-notification', label: 'Community Wishlist' },
            ],
            defaultValue: {
              'edit-user-talk': { web: true, email: true, push: true },
              mention: { web: true, email: false, push: true },
              'edit-thank': { web: true, email: false, push: true },
              reverted: { web: true, email: false, push: false },
              'article-linked': { web: true, email: false, push: false },
              emailuser: { web: true, email: true, push: false },
              'user-rights': { web: true, email: true, push: true },
              'login-fail': { web: true, email: true, push: true },
              'login-success': { web: true, email: false, push: true },
              cx: { web: true, email: false, push: false },
              'wikibase-action': { web: true, email: false, push: false },
              'dt-subscription': { web: true, email: false, push: true },
              'dt-subscription-archiving': { web: true, email: false, push: false },
              'thank-you-edit': { web: true, email: false, push: false },
              'mention-success': { web: false, email: false, push: false },
              'mention-failure': { web: true, email: false, push: false },
              'ge-newcomer': { web: true, email: false, push: false },
              'ge-mentorship': { web: true, email: false, push: false },
              'verify-email-reminder': { web: true, email: false, push: false },
              'campaign-events-notification-registration': { web: true, email: false, push: false },
              'communityrequests-notification': { web: true, email: false, push: false },
            },
          },
        ],
      },
      {
        id: 'echocrosswiki',
        title: 'Cross-wiki notifications',
        fields: [
          {
            id: 'echo-cross-wiki-notifications',
            type: 'checkbox',
            label: 'Show notifications from other wikis',
            defaultValue: true,
          },
        ],
      },
      {
        id: 'echopollupdates',
        title: 'Live notifications',
        fields: [
          {
            id: 'echo-show-poll-updates',
            type: 'checkbox',
            label: 'Display new notifications as they arrive',
            help: 'Show the number of unread notifications in the title bar, and show a snippet of each notification immediately when it arrives.',
            defaultValue: false,
          },
        ],
      },
      {
        id: 'blocknotificationslist',
        title: 'Muted users',
        fields: [
          {
            id: 'echo-notifications-blacklist',
            type: 'textarea',
            label: 'Do not display notifications from these users',
            defaultValue: '',
          },
        ],
      },
      {
        id: 'mutedpageslist',
        title: 'Muted pages for page link notifications',
        fields: [
          {
            id: 'echo-muted-pages',
            type: 'textarea',
            label: 'Do not display "Page link" notifications for these pages',
            defaultValue: '',
          },
        ],
      },
    ],
  },
]
