/// Firestore `whereIn` / `in` / `arrayContainsAny` queries accept at most 10
/// values, so id lists must be split into chunks before fanning out into
/// multiple queries and merging the results.
const int firestoreInQueryLimit = 10;

/// Splits [values] into consecutive sublists of at most [size] items
/// (default [firestoreInQueryLimit]) for Firestore `whereIn` fan-out.
///
/// Replaces the previously duplicated private `_chunks` helpers in the clubs,
/// events, and saved-event repositories so the whereIn batching limit lives in
/// one place.
Iterable<List<T>> chunkedForWhereIn<T>(
  List<T> values, [
  int size = firestoreInQueryLimit,
]) sync* {
  for (var start = 0; start < values.length; start += size) {
    final end = start + size > values.length ? values.length : start + size;
    yield values.sublist(start, end);
  }
}
