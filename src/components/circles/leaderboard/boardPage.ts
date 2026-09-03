/**
 * How many leaderboard rows the screen asks for, and what that means for any
 * count printed underneath them.
 *
 * ## There is no contributor total on the wire
 *
 * circle-service DOES compute one — `GetLeaderboardHandler` returns a `total`
 * that is a COUNT over the whole board — but `Leaderboard` in `circle.proto` has
 * no field for it (circle_id, season_key, ranking_enabled, collective_total,
 * rows), so `leaderboardToProto` drops it and neither the gateway nor this
 * client ever sees it. A footer that counts the rows it was handed and calls
 * that the number of contributors is therefore a claim the API never made: it is
 * right until a circle passes the page size, then silently wrong forever.
 *
 * ## The page size makes the claim decidable
 *
 * `clampLimit` bounds the request at MAX_LIMIT = 200, so a request for 50 is
 * passed through unclamped and the returned page is exactly 50 when — and only
 * when — the board has at least that many scoring members. So a SHORT page is
 * proof the scan ran out of members, and only then is the row count a total.
 * A full page is not disclosed as a total; it is labelled as a top-N.
 *
 * (This is the same reasoning circle-service applies to its own cache prefix:
 * "a prefix at exactly the fill size may have been cut off … a total that is
 * merely probably right is not a total.")
 */
export const LEADERBOARD_PAGE_LIMIT = 50;

/**
 * True when `rows` is the whole board rather than its first page — i.e. when the
 * row count may honestly be presented as the number of contributors.
 */
export function isWholeBoard(rowCount: number): boolean {
  return rowCount < LEADERBOARD_PAGE_LIMIT;
}
