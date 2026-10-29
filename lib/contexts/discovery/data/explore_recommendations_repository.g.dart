// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'explore_recommendations_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(exploreRecommendedEvents)
final exploreRecommendedEventsProvider = ExploreRecommendedEventsFamily._();

final class ExploreRecommendedEventsProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<ExploreEventRecommendationCandidate>>,
          List<ExploreEventRecommendationCandidate>,
          FutureOr<List<ExploreEventRecommendationCandidate>>
        >
    with
        $FutureModifier<List<ExploreEventRecommendationCandidate>>,
        $FutureProvider<List<ExploreEventRecommendationCandidate>> {
  ExploreRecommendedEventsProvider._({
    required ExploreRecommendedEventsFamily super.from,
    required ExploreRecommendationsQuery super.argument,
  }) : super(
         retry: null,
         name: r'exploreRecommendedEventsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$exploreRecommendedEventsHash();

  @override
  String toString() {
    return r'exploreRecommendedEventsProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<List<ExploreEventRecommendationCandidate>>
  $createElement($ProviderPointer pointer) => $FutureProviderElement(pointer);

  @override
  FutureOr<List<ExploreEventRecommendationCandidate>> create(Ref ref) {
    final argument = this.argument as ExploreRecommendationsQuery;
    return exploreRecommendedEvents(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is ExploreRecommendedEventsProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$exploreRecommendedEventsHash() =>
    r'2cda5398bf100ea238715f7880be90273fa57ba7';

final class ExploreRecommendedEventsFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<List<ExploreEventRecommendationCandidate>>,
          ExploreRecommendationsQuery
        > {
  ExploreRecommendedEventsFamily._()
    : super(
        retry: null,
        name: r'exploreRecommendedEventsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  ExploreRecommendedEventsProvider call(ExploreRecommendationsQuery query) =>
      ExploreRecommendedEventsProvider._(argument: query, from: this);

  @override
  String toString() => r'exploreRecommendedEventsProvider';
}
