/// Atomic read/modify/write of one account's command journal. The callback is
/// synchronous: it must not perform networking or change external state.
abstract interface class CommandJournalStorage {
  /// Read the original value without decoding or rewriting it. Recovery must
  /// work even when malformed JSON prevents ordinary transactions.
  Future<String?> readRaw(String key);

  Future<T> transact<T>(
    String key,
    T Function(Map<String, Object?> state) change,
  );
  Future<void> close();
}
