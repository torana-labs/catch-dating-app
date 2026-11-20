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
    r'499954b8939d28cc54c18080acc4673e97ff1448';

/// One organizer's journey for its hosts, or, with null, each page the
/// signed-in account is waiting to claim. A Firestore listener: a claim
/// decided while the sheet is open shows without a reload.

@ProviderFor(organizerJourneys)
final organizerJourneysProvider = OrganizerJourneysFamily._();

/// One organizer's journey for its hosts, or, with null, each page the
/// signed-in account is waiting to claim. A Firestore listener: a claim
/// decided while the sheet is open shows without a reload.

final class OrganizerJourneysProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<OrganizerJourney>>,
          List<OrganizerJourney>,
          Stream<List<OrganizerJourney>>
        >
    with
        $FutureModifier<List<OrganizerJourney>>,
        $StreamProvider<List<OrganizerJourney>> {
  /// One organizer's journey for its hosts, or, with null, each page the
  /// signed-in account is waiting to claim. A Firestore listener: a claim
  /// decided while the sheet is open shows without a reload.
  OrganizerJourneysProvider._({
    required OrganizerJourneysFamily super.from,
    required String? super.argument,
  }) : super(
         retry: null,
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
  $StreamProviderElement<List<OrganizerJourney>> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<List<OrganizerJourney>> create(Ref ref) {
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

String _$organizerJourneysHash() => r'085274385103ed3d87527242674074ce09230c44';

/// One organizer's journey for its hosts, or, with null, each page the
/// signed-in account is waiting to claim. A Firestore listener: a claim
/// decided while the sheet is open shows without a reload.

final class OrganizerJourneysFamily extends $Family
    with $FunctionalFamilyOverride<Stream<List<OrganizerJourney>>, String?> {
  OrganizerJourneysFamily._()
    : super(
        retry: null,
        name: r'organizerJourneysProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// One organizer's journey for its hosts, or, with null, each page the
  /// signed-in account is waiting to claim. A Firestore listener: a claim
  /// decided while the sheet is open shows without a reload.

  OrganizerJourneysProvider call(String? organizerId) =>
      OrganizerJourneysProvider._(argument: organizerId, from: this);

  @override
  String toString() => r'organizerJourneysProvider';
}
