/**
 * Every Nth card is a title the partner liked (and you haven't swiped). 4 → one in four.
 * Halfway between those slots goes a title like your recent likes, so a full deck runs:
 * discover, recommended, discover, partner's like, …
 */
export const PARTNER_BOOST_EVERY = 4

/** Recommendations come from your this-many most recent likes… */
export const RECOMMEND_SEEDS = 3
/** …and when a filter needs title details (services, film length), at most this many are checked per batch. */
export const RECOMMEND_CHECKED = 8

/** Titles with fewer votes than this are skipped unless the pair sets its own floor. */
export const DEFAULT_MIN_VOTES = 150

/** One /api/deck response aims for this many fresh cards… */
export const DECK_BATCH = 20
/** …but walks at most this many discover pages per media type to get them. */
export const MAX_PAGES_PER_REQUEST = 6
