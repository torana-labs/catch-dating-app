import 'package:catch_dating_app/contexts/profiles/data/public_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:flutter/foundation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'public_profiles_lookup.g.dart';

/// Value-equality key for a set of uids, so a roster maps to a single provider
/// instance regardless of input order or duplicates.
class PublicProfilesQuery {
  PublicProfilesQuery(Iterable<String> uids)
    : uids = List.unmodifiable(uids.toSet().toList()..sort());

  final List<String> uids;

  @override
  bool operator ==(Object other) =>
      other is PublicProfilesQuery && listEquals(other.uids, uids);

  @override
  int get hashCode => Object.hashAll(uids);
}

/// Batched public-profile lookup keyed by uid set — one fetch for a whole
/// roster (block list, recap grid, etc.) instead of a realtime stream per tile.
///
/// Uses the repository's per-document reads (public-profile rules evaluate
/// block/deletion per doc id), fetched in parallel. autoDispose so a roster's
/// result is reclaimed when no screen is watching it.
@riverpod
Future<Map<String, PublicProfile>> publicProfilesByIds(
  Ref ref,
  PublicProfilesQuery query,
) async {
  if (query.uids.isEmpty) return const <String, PublicProfile>{};
  final profiles = await ref
      .watch(publicProfileRepositoryProvider)
      .fetchPublicProfiles(query.uids);
  return {for (final profile in profiles) profile.uid: profile};
}
