/** The Mentor module's copy (Figma T419358-Home). */
export const MENTOR_CONTENT = {
  unassigned: {
    title: 'Mentor for editing',
    description:
      'If you have questions about editing, an experienced editor can be assigned as your mentor to help you.',
    action: 'Get a mentor',
  },
  assigned: {
    title: 'Your mentor',
    notice: "We've assigned you an experienced editor to answer your questions about editing.",
    action: 'Ask your mentor a question about editing',
    mentor: {
      name: 'Samwalton9',
      bio: "Hi! I'm Sam. I like helping on articles about video games and TV shows mainly. I also do a lot of moderating! I've been editing for quite a long time now so I'm happy to answer any questions you might have.",
      editingSince: 'Editing since 2011',
    },
  },
} as const
