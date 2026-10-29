// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'swipe_candidate_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(swipeCandidateRepository)
final swipeCandidateRepositoryProvider = SwipeCandidateRepositoryProvider._();

final class SwipeCandidateRepositoryProvider
    extends
        $FunctionalProvider<
          SwipeCandidateRepository,
          SwipeCandidateRepository,
          SwipeCandidateRepository
        >
    with $Provider<SwipeCandidateRepository> {
  SwipeCandidateRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'swipeCandidateRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$swipeCandidateRepositoryHash();

  @$internal
  @override
  $ProviderElement<SwipeCandidateRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  SwipeCandidateRepository create(Ref ref) {
    return swipeCandidateRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(SwipeCandidateRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<SwipeCandidateRepository>(value),
    );
  }
}

String _$swipeCandidateRepositoryHash() =>
    r'5d618924c602e7e7e70566d3d8ed93b48d73a88e';

@ProviderFor(swipeCandidates)
final swipeCandidatesProvider = SwipeCandidatesFamily._();

final class SwipeCandidatesProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<PublicProfile>>,
          List<PublicProfile>,
          FutureOr<List<PublicProfile>>
        >
    with
        $FutureModifier<List<PublicProfile>>,
        $FutureProvider<List<PublicProfile>> {
  SwipeCandidatesProvider._({
    required SwipeCandidatesFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'swipeCandidatesProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$swipeCandidatesHash();

  @override
  String toString() {
    return r'swipeCandidatesProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<List<PublicProfile>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<List<PublicProfile>> create(Ref ref) {
    final argument = this.argument as String;
    return swipeCandidates(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is SwipeCandidatesProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$swipeCandidatesHash() => r'a884f6d028695632484fd9fa067ce11de7dac6a7';

final class SwipeCandidatesFamily extends $Family
    with $FunctionalFamilyOverride<FutureOr<List<PublicProfile>>, String> {
  SwipeCandidatesFamily._()
    : super(
        retry: null,
        name: r'swipeCandidatesProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  SwipeCandidatesProvider call(String eventId) =>
      SwipeCandidatesProvider._(argument: eventId, from: this);

  @override
  String toString() => r'swipeCandidatesProvider';
}
