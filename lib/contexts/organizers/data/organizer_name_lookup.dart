import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:flutter/foundation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'organizer_name_lookup.g.dart';

class OrganizerNameLookupQuery {
  OrganizerNameLookupQuery(Iterable<String> organizerIds)
    : organizerIds = List.unmodifiable((organizerIds.toSet().toList()..sort()));

  final List<String> organizerIds;

  @override
  bool operator ==(Object other) {
    return other is OrganizerNameLookupQuery &&
        listEquals(other.organizerIds, organizerIds);
  }

  @override
  int get hashCode => Object.hashAll(organizerIds);
}

// autoDispose so each distinct id-set query is reclaimed when no screen is
// watching it, instead of accumulating one cached provider per query forever.
@riverpod
Future<Map<String, String>> organizerNameLookup(
  Ref ref,
  OrganizerNameLookupQuery query,
) async {
  if (query.organizerIds.isEmpty) return const <String, String>{};

  final repository = ref.watch(organizersRepositoryProvider);
  final organizers = await Future.wait(
    query.organizerIds.map(repository.fetchOrganizer),
  );

  return {
    for (final organizer in organizers)
      if (organizer != null) organizer.id: organizer.name,
  };
}
