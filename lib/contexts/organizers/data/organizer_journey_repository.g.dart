// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'organizer_journey_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(organizerJourneyRepository)
final organizerJourneyRepositoryProvider =
    OrganizerJourneyRepositoryProvider._();

final class OrganizerJourneyRepositoryProvider
    extends
        $FunctionalProvider<
          OrganizerJourneyRepository,
          OrganizerJourneyRepository,
          OrganizerJourneyRepository
        >
    with $Provider<OrganizerJourneyRepository> {
  OrganizerJourneyRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'organizerJourneyRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$organizerJourneyRepositoryHash();

  @$internal
  @override
  $ProviderElement<OrganizerJourneyRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  OrganizerJourneyRepository create(Ref ref) {
    return organizerJourneyRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(OrganizerJourneyRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<OrganizerJourneyRepository>(value),
    );
  }
}

String _$organizerJourneyRepositoryHash() =>
    r'ca7bb38244012238460bd136ecd46d255da0a289';

/// No background retry: the sheet has its own Retry, and Today's waiting claims
/// show nothing if the read fails.

@ProviderFor(organizerJourneys)
final organizerJourneysProvider = OrganizerJourneysFamily._();

/// No background retry: the sheet has its own Retry, and Today's waiting claims
/// show nothing if the read fails.

final class OrganizerJourneysProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<OrganizerJourney>>,
          List<OrganizerJourney>,
          FutureOr<List<OrganizerJourney>>
        >
    with
        $FutureModifier<List<OrganizerJourney>>,
        $FutureProvider<List<OrganizerJourney>> {
  /// No background retry: the sheet has its own Retry, and Today's waiting claims
  /// show nothing if the read fails.
  OrganizerJourneysProvider._({
    required OrganizerJourneysFamily super.from,
    required String? super.argument,
  }) : super(
         retry: _noJourneyReadRetry,
         name: r'organizerJourneysProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$organizerJourneysHash();

  @override
  String toString() {
    return r'organizerJourneysProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<List<OrganizerJourney>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<List<OrganizerJourney>> create(Ref ref) {
    final argument = this.argument as String?;
    return organizerJourneys(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is OrganizerJourneysProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$organizerJourneysHash() => r'49c19fb4c0fd93eac98d6e5e115ecc3f290a17fb';

/// No background retry: the sheet has its own Retry, and Today's waiting claims
/// show nothing if the read fails.

final class OrganizerJourneysFamily extends $Family
    with $FunctionalFamilyOverride<FutureOr<List<OrganizerJourney>>, String?> {
  OrganizerJourneysFamily._()
    : super(
        retry: _noJourneyReadRetry,
        name: r'organizerJourneysProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// No background retry: the sheet has its own Retry, and Today's waiting claims
  /// show nothing if the read fails.

  OrganizerJourneysProvider call(String? organizerId) =>
      OrganizerJourneysProvider._(argument: organizerId, from: this);

  @override
  String toString() => r'organizerJourneysProvider';
}
