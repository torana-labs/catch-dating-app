// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'organizer_event_venue_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(organizerEventVenueRepository)
final organizerEventVenueRepositoryProvider =
    OrganizerEventVenueRepositoryProvider._();

final class OrganizerEventVenueRepositoryProvider
    extends
        $FunctionalProvider<
          OrganizerEventVenueRepository,
          OrganizerEventVenueRepository,
          OrganizerEventVenueRepository
        >
    with $Provider<OrganizerEventVenueRepository> {
  OrganizerEventVenueRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'organizerEventVenueRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$organizerEventVenueRepositoryHash();

  @$internal
  @override
  $ProviderElement<OrganizerEventVenueRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  OrganizerEventVenueRepository create(Ref ref) {
    return organizerEventVenueRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(OrganizerEventVenueRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<OrganizerEventVenueRepository>(
        value,
      ),
    );
  }
}

String _$organizerEventVenueRepositoryHash() =>
    r'f64d6caa191aea632d79e43c07e889930caf27ac';

@ProviderFor(watchOrganizerEventVenues)
final watchOrganizerEventVenuesProvider = WatchOrganizerEventVenuesFamily._();

final class WatchOrganizerEventVenuesProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<OrganizerEventVenue>>,
          List<OrganizerEventVenue>,
          Stream<List<OrganizerEventVenue>>
        >
    with
        $FutureModifier<List<OrganizerEventVenue>>,
        $StreamProvider<List<OrganizerEventVenue>> {
  WatchOrganizerEventVenuesProvider._({
    required WatchOrganizerEventVenuesFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchOrganizerEventVenuesProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchOrganizerEventVenuesHash();

  @override
  String toString() {
    return r'watchOrganizerEventVenuesProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<OrganizerEventVenue>> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<List<OrganizerEventVenue>> create(Ref ref) {
    final argument = this.argument as String;
    return watchOrganizerEventVenues(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchOrganizerEventVenuesProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchOrganizerEventVenuesHash() =>
    r'8f035371f9b35bf4eebbc76fddeb6c3e36fa5a96';

final class WatchOrganizerEventVenuesFamily extends $Family
    with $FunctionalFamilyOverride<Stream<List<OrganizerEventVenue>>, String> {
  WatchOrganizerEventVenuesFamily._()
    : super(
        retry: null,
        name: r'watchOrganizerEventVenuesProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchOrganizerEventVenuesProvider call(String organizerId) =>
      WatchOrganizerEventVenuesProvider._(argument: organizerId, from: this);

  @override
  String toString() => r'watchOrganizerEventVenuesProvider';
}
