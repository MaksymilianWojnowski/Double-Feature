// Every user-facing string. A Polish file later: `export const pl: Strings = { ... }`.
export const t = {
  app: {
    name: 'Double Feature',
    tagline: 'Find what you both want to watch.',
  },
  nav: {
    deck: 'Deck',
    pair: 'Pair',
  },
  login: {
    emailLabel: 'Email',
    emailPlaceholder: 'you@example.com',
    send: 'Send sign-in email',
    sending: 'Sending…',
    sentTitle: 'Check your email',
    sentBody: 'Tap the link in the email, or type the code here. On an installed app, use the code.',
    codeLabel: 'Code',
    verify: 'Sign in',
    verifying: 'Signing in…',
    otherEmail: 'Use a different email',
    errors: {
      link: 'That sign-in link has expired or was already used. Request a new one.',
      send: 'Couldn’t send the email. Wait a minute and try again.',
      code: 'That code didn’t work. Check it, or request a new email.',
    },
  },
  onboarding: {
    nameTitle: 'What should your partner call you?',
    nameLabel: 'Your name',
    save: 'Continue',
    pairTitle: 'Swipe together',
    pairBody: 'One of you creates a pair and sends the invite link. The other opens it.',
    create: 'Create a pair',
    haveCode: 'I have an invite code',
    codeLabel: 'Invite code',
    join: 'Join',
  },
  join: {
    title: 'You’re invited',
    body: 'Join this pair to start swiping together.',
    accept: 'Join pair',
    errors: {
      pair_full: 'This pair already has two people.',
      already_paired: 'You’re already in a pair. Leave it first on the Pair page.',
      invalid_code: 'That invite code doesn’t exist. Check it with your partner.',
      generic: 'Something went wrong. Try again.',
    },
  },
  pair: {
    title: 'Pair',
    with: (name: string) => `With ${name}`,
    waiting: 'Waiting for your partner',
    inviteBody: 'Send this link to your partner. It works once, for one person.',
    inviteCode: 'Invite code',
    share: 'Share invite link',
    copy: 'Copy invite link',
    copied: 'Copied',
    stats: {
      you: 'You swiped',
      partner: (name: string) => `${name} swiped`,
      matches: 'Matches',
      watched: 'Watched',
    },
    signOut: 'Sign out',
    leave: 'Leave pair',
    leaveConfirm:
      'Leaving ends the pair for both of you. All swipes, matches and ratings are deleted. This can’t be undone.',
    leaveYes: 'Leave and delete everything',
    cancel: 'Cancel',
  },
  deck: {
    comingSoon: 'The deck arrives in the next milestone.',
  },
}

export type Strings = typeof t
