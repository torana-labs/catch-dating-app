import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/errors/backend_error_util.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:catch_dating_app/platform/firebase/read_limit_policy.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'explore_search_repository.g.dart';

// keepalive: search repository is a shared Functions facade for Explore query
// surfaces.
@Riverpod(keepAlive: true)
ExploreSearchRepository exploreSearchRepository(Ref ref) =>
    FirebaseExploreSearchRepository(ref.watch(firebaseFunctionsProvider));

abstract interface class ExploreSearchRepository {
  Future<ExploreSearchResult> searchExplore({
    required String query,
    required String cityName,
    int limit = ReadLimitPolicy.searchResults,
  });
}

class FirebaseExploreSearchRepository implements ExploreSearchRepository {
  const FirebaseExploreSearchRepository(this._functions);

  final FirebaseFunctions _functions;

  @override
  Future<ExploreSearchResult> searchExplore({
    required String query,
    required String cityName,
    int limit = ReadLimitPolicy.searchResults,
  }) => withBackendErrorContext(
    () async {
      final result = await _functions.httpsCallable('exploreSearch').call({
        'query': query.trim(),
        'cityName': cityName.trim(),
        'limit': limit,
      });
      return ExploreSearchResult.fromCallableData(result.data);
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'search explore',
      resource: 'exploreSearch',
    ),
  );
}

class ExploreSearchResult {
  const ExploreSearchResult({
    required this.organizerIds,
    required this.eventIds,
  });

  factory ExploreSearchResult.fromCallableData(Object? data) {
    if (data case final Map<Object?, Object?> map) {
      return ExploreSearchResult(
        organizerIds: _stringList(map['organizerIds']),
        eventIds: _stringList(map['eventIds']),
      );
    }
    return empty;
  }

  static const empty = ExploreSearchResult(organizerIds: [], eventIds: []);

  final List<String> organizerIds;
  final List<String> eventIds;
}

List<String> _stringList(Object? value) {
  if (value is! List<Object?>) return const [];
  return value.whereType<String>().toList(growable: false);
}

@riverpod
Future<ExploreSearchResult?> exploreServerSearch(
  Ref ref, {
  required String query,
  required String cityName,
}) async {
  final normalizedQuery = query.trim();
  if (normalizedQuery.length < 2) return null;
  return ref
      .watch(exploreSearchRepositoryProvider)
      .searchExplore(query: normalizedQuery, cityName: cityName);
}
