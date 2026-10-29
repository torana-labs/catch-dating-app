import 'package:catch_dating_app/contexts/organizers/data/clubs_repository.dart';
import 'package:flutter/foundation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'club_name_lookup.g.dart';

class ClubNameLookupQuery {
  ClubNameLookupQuery(Iterable<String> clubIds)
    : clubIds = List.unmodifiable((clubIds.toSet().toList()..sort()));

  final List<String> clubIds;

  @override
  bool operator ==(Object other) {
    return other is ClubNameLookupQuery && listEquals(other.clubIds, clubIds);
  }

  @override
  int get hashCode => Object.hashAll(clubIds);
}

// autoDispose so each distinct id-set query is reclaimed when no screen is
// watching it, instead of accumulating one cached provider per query forever.
@riverpod
Future<Map<String, String>> clubNameLookup(
  Ref ref,
  ClubNameLookupQuery query,
) async {
  if (query.clubIds.isEmpty) return const <String, String>{};

  final repository = ref.watch(clubsRepositoryProvider);
  final clubs = await Future.wait(query.clubIds.map(repository.fetchClub));

  return {
    for (final club in clubs)
      if (club != null) club.id: club.name,
  };
}
