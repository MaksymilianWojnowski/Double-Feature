/** Every Nth card is a title the partner liked (and you haven't swiped). 4 → one in four. */
export const PARTNER_BOOST_EVERY = 4

/** Titles with fewer votes than this are skipped unless the pair sets its own floor. */
export const DEFAULT_MIN_VOTES = 150

/** One /api/deck response aims for this many fresh cards… */
export const DECK_BATCH = 20
/** …but walks at most this many discover pages per media type to get them. */
export const MAX_PAGES_PER_REQUEST = 6
