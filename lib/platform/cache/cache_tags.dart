/// Invalidation declared by the writes that make data stale.
///
/// Each bounded context defines typed tags in its domain, such as
/// `EventTags.roster(eventId)`. A read owner declares what it provides with
/// `ref.providesTags({...})`; an action controller declares what its write
/// makes stale in the same `Mutation.run` that performs it:
///
/// ```dart
/// await saveMutation.run(ref, (tx) async {
///   await tx.get(rosterRepositoryProvider).checkIn(eventId, guestId);
///   tx.get(cacheTagsProvider).invalidate({EventTags.roster(eventId)});
/// });
/// ```
///
/// Firestore listener providers declare no tags for their own documents: the
/// listener already delivers the write (CACHE-LISTENER-001). Tags exist for
/// the function and one-shot reads that project the same data. Widgets never
/// invalidate after a write; a direct `ref.invalidate` stays legal only in a
/// retry or pull-to-refresh that targets the read owner
/// (CACHE-INVALIDATE-001).
library;

import 'package:collection/collection.dart';
import 'package:flutter/foundation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'cache_tags.g.dart';

/// A typed name for data a write can make stale. Two tags are equal when
/// they have the same runtime type and equal [props].
@immutable
abstract base class CacheTag {
  const CacheTag();

  /// The values that identify this tag, such as an event id.
  List<Object?> get props;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is CacheTag &&
          other.runtimeType == runtimeType &&
          const ListEquality<Object?>().equals(other.props, props);

  @override
  int get hashCode => Object.hash(runtimeType, Object.hashAll(props));

  @override
  String toString() => '$runtimeType(${props.join(', ')})';
}

/// The read owners alive now and the tags each provides.
///
/// It holds callbacks, never data. Registrations end with their read owner,
/// and sign-out replaces the registry, so one session's writes never reach
/// another session's reads.
final class CacheTagRegistry {
  final _registrations = <_CacheTagRegistration>[];

  /// Calls [onInvalidate] whenever one of [tags] is invalidated, until the
  /// returned function runs.
  void Function() register(Set<CacheTag> tags, void Function() onInvalidate) {
    final registration = _CacheTagRegistration(
      Set.unmodifiable(tags),
      onInvalidate,
    );
    _registrations.add(registration);
    return () => _registrations.remove(registration);
  }

  /// Refetches every live read owner that provides one of [tags], and no
  /// other. Returns how many were invalidated.
  int invalidate(Set<CacheTag> tags) {
    var invalidated = 0;
    for (final registration in [..._registrations]) {
      if (!registration.tags.any(tags.contains)) continue;
      registration.onInvalidate();
      invalidated++;
    }
    return invalidated;
  }

  /// The number of live registrations, for tests.
  @visibleForTesting
  int get registrationCount => _registrations.length;
}

final class _CacheTagRegistration {
  const _CacheTagRegistration(this.tags, this.onInvalidate);

  final Set<CacheTag> tags;
  final void Function() onInvalidate;
}

// keepalive: an account-free registry of live read-owner callbacks that holds
// no data; AuthSessionController replaces it at sign-out.
@Riverpod(keepAlive: true)
CacheTagRegistry cacheTags(Ref ref) => CacheTagRegistry();

/// Tags declared from a read owner's `build`.
extension CacheTagsRef on Ref {
  /// Registers this read owner as providing [tags] for this build: a write
  /// that invalidates one of them refetches it.
  void providesTags(Set<CacheTag> tags) {
    if (tags.isEmpty) return;
    final unregister = read(cacheTagsProvider).register(tags, () {
      if (mounted) invalidateSelf();
    });
    onDispose(unregister);
  }
}
