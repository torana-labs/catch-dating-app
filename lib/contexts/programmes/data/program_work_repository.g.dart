// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'program_work_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(programWorkRepository)
final programWorkRepositoryProvider = ProgramWorkRepositoryProvider._();

final class ProgramWorkRepositoryProvider
    extends
        $FunctionalProvider<
          ProgramWorkRepository,
          ProgramWorkRepository,
          ProgramWorkRepository
        >
    with $Provider<ProgramWorkRepository> {
  ProgramWorkRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'programWorkRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$programWorkRepositoryHash();

  @$internal
  @override
  $ProviderElement<ProgramWorkRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  ProgramWorkRepository create(Ref ref) {
    return programWorkRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ProgramWorkRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ProgramWorkRepository>(value),
    );
  }
}

String _$programWorkRepositoryHash() =>
    r'1afd99f8840d6c75a4c222e78cf1b1ab9211f42b';

/// The work shell's access through listeners (#1339), gated on the account's
/// authority; an invitation is still claimed online. Callable-reading screens
/// keep their offline cold start: each delivery refreshes the saved work
/// access they bound a snapshot by, and a denial clears it.

@ProviderFor(programWorkEntry)
final programWorkEntryProvider = ProgramWorkEntryFamily._();

/// The work shell's access through listeners (#1339), gated on the account's
/// authority; an invitation is still claimed online. Callable-reading screens
/// keep their offline cold start: each delivery refreshes the saved work
/// access they bound a snapshot by, and a denial clears it.

final class ProgramWorkEntryProvider
    extends
        $FunctionalProvider<
          AsyncValue<ProgramReadView<ProgramWorkAccess>>,
          ProgramReadView<ProgramWorkAccess>,
          FutureOr<ProgramReadView<ProgramWorkAccess>>
        >
    with
        $FutureModifier<ProgramReadView<ProgramWorkAccess>>,
        $FutureProvider<ProgramReadView<ProgramWorkAccess>> {
  /// The work shell's access through listeners (#1339), gated on the account's
  /// authority; an invitation is still claimed online. Callable-reading screens
  /// keep their offline cold start: each delivery refreshes the saved work
  /// access they bound a snapshot by, and a denial clears it.
  ProgramWorkEntryProvider._({
    required ProgramWorkEntryFamily super.from,
    required (String, String?) super.argument,
  }) : super(
         retry: null,
         name: r'programWorkEntryProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$programWorkEntryHash();

  @override
  String toString() {
    return r'programWorkEntryProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $FutureProviderElement<ProgramReadView<ProgramWorkAccess>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<ProgramReadView<ProgramWorkAccess>> create(Ref ref) {
    final argument = this.argument as (String, String?);
    return programWorkEntry(ref, argument.$1, argument.$2);
  }

  @override
  bool operator ==(Object other) {
    return other is ProgramWorkEntryProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$programWorkEntryHash() => r'1517d312d676f6aca053b96e4cc20e42d076d236';

/// The work shell's access through listeners (#1339), gated on the account's
/// authority; an invitation is still claimed online. Callable-reading screens
/// keep their offline cold start: each delivery refreshes the saved work
/// access they bound a snapshot by, and a denial clears it.

final class ProgramWorkEntryFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<ProgramReadView<ProgramWorkAccess>>,
          (String, String?)
        > {
  ProgramWorkEntryFamily._()
    : super(
        retry: null,
        name: r'programWorkEntryProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The work shell's access through listeners (#1339), gated on the account's
  /// authority; an invitation is still claimed online. Callable-reading screens
  /// keep their offline cold start: each delivery refreshes the saved work
  /// access they bound a snapshot by, and a denial clears it.

  ProgramWorkEntryProvider call(String programId, String? inviteId) =>
      ProgramWorkEntryProvider._(argument: (programId, inviteId), from: this);

  @override
  String toString() => r'programWorkEntryProvider';
}

/// The arrivals roster, live from `programArrivalViews` (#1339).

@ProviderFor(programArrivalsRosterView)
final programArrivalsRosterViewProvider = ProgramArrivalsRosterViewFamily._();

/// The arrivals roster, live from `programArrivalViews` (#1339).

final class ProgramArrivalsRosterViewProvider
    extends
        $FunctionalProvider<
          AsyncValue<ProgramReadView<ProgramArrivalsRoster>>,
          ProgramReadView<ProgramArrivalsRoster>,
          FutureOr<ProgramReadView<ProgramArrivalsRoster>>
        >
    with
        $FutureModifier<ProgramReadView<ProgramArrivalsRoster>>,
        $FutureProvider<ProgramReadView<ProgramArrivalsRoster>> {
  /// The arrivals roster, live from `programArrivalViews` (#1339).
  ProgramArrivalsRosterViewProvider._({
    required ProgramArrivalsRosterViewFamily super.from,
    required (String, String?) super.argument,
  }) : super(
         retry: null,
         name: r'programArrivalsRosterViewProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$programArrivalsRosterViewHash();

  @override
  String toString() {
    return r'programArrivalsRosterViewProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $FutureProviderElement<ProgramReadView<ProgramArrivalsRoster>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<ProgramReadView<ProgramArrivalsRoster>> create(Ref ref) {
    final argument = this.argument as (String, String?);
    return programArrivalsRosterView(ref, argument.$1, argument.$2);
  }

  @override
  bool operator ==(Object other) {
    return other is ProgramArrivalsRosterViewProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$programArrivalsRosterViewHash() =>
    r'e1bb9d5747af86f12d28d3b55a5c8402d41ac744';

/// The arrivals roster, live from `programArrivalViews` (#1339).

final class ProgramArrivalsRosterViewFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<ProgramReadView<ProgramArrivalsRoster>>,
          (String, String?)
        > {
  ProgramArrivalsRosterViewFamily._()
    : super(
        retry: null,
        name: r'programArrivalsRosterViewProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The arrivals roster, live from `programArrivalViews` (#1339).

  ProgramArrivalsRosterViewProvider call(
    String programId,
    String? pickupPointId,
  ) => ProgramArrivalsRosterViewProvider._(
    argument: (programId, pickupPointId),
    from: this,
  );

  @override
  String toString() => r'programArrivalsRosterViewProvider';
}

@ProviderFor(programTransportPlan)
final programTransportPlanProvider = ProgramTransportPlanFamily._();

final class ProgramTransportPlanProvider
    extends
        $FunctionalProvider<
          AsyncValue<ProgramTransportPlan>,
          ProgramTransportPlan,
          FutureOr<ProgramTransportPlan>
        >
    with
        $FutureModifier<ProgramTransportPlan>,
        $FutureProvider<ProgramTransportPlan> {
  ProgramTransportPlanProvider._({
    required ProgramTransportPlanFamily super.from,
    required (String, String?) super.argument,
  }) : super(
         retry: null,
         name: r'programTransportPlanProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$programTransportPlanHash();

  @override
  String toString() {
    return r'programTransportPlanProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $FutureProviderElement<ProgramTransportPlan> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<ProgramTransportPlan> create(Ref ref) {
    final argument = this.argument as (String, String?);
    return programTransportPlan(ref, argument.$1, argument.$2);
  }

  @override
  bool operator ==(Object other) {
    return other is ProgramTransportPlanProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$programTransportPlanHash() =>
    r'ec3b9e87f6f33c6f78d1c4de42057de36395ab90';

final class ProgramTransportPlanFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<ProgramTransportPlan>,
          (String, String?)
        > {
  ProgramTransportPlanFamily._()
    : super(
        retry: null,
        name: r'programTransportPlanProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  ProgramTransportPlanProvider call(String programId, String? pickupPointId) =>
      ProgramTransportPlanProvider._(
        argument: (programId, pickupPointId),
        from: this,
      );

  @override
  String toString() => r'programTransportPlanProvider';
}

@ProviderFor(programTransportPlanView)
final programTransportPlanViewProvider = ProgramTransportPlanViewFamily._();

final class ProgramTransportPlanViewProvider
    extends
        $FunctionalProvider<
          AsyncValue<ProgramReadView<ProgramTransportPlan>>,
          ProgramReadView<ProgramTransportPlan>,
          FutureOr<ProgramReadView<ProgramTransportPlan>>
        >
    with
        $FutureModifier<ProgramReadView<ProgramTransportPlan>>,
        $FutureProvider<ProgramReadView<ProgramTransportPlan>> {
  ProgramTransportPlanViewProvider._({
    required ProgramTransportPlanViewFamily super.from,
    required (String, String?) super.argument,
  }) : super(
         retry: null,
         name: r'programTransportPlanViewProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$programTransportPlanViewHash();

  @override
  String toString() {
    return r'programTransportPlanViewProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $FutureProviderElement<ProgramReadView<ProgramTransportPlan>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<ProgramReadView<ProgramTransportPlan>> create(Ref ref) {
    final argument = this.argument as (String, String?);
    return programTransportPlanView(ref, argument.$1, argument.$2);
  }

  @override
  bool operator ==(Object other) {
    return other is ProgramTransportPlanViewProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$programTransportPlanViewHash() =>
    r'18e84e27715f52e12984471127950842b01079b9';

final class ProgramTransportPlanViewFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<ProgramReadView<ProgramTransportPlan>>,
          (String, String?)
        > {
  ProgramTransportPlanViewFamily._()
    : super(
        retry: null,
        name: r'programTransportPlanViewProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  ProgramTransportPlanViewProvider call(
    String programId,
    String? pickupPointId,
  ) => ProgramTransportPlanViewProvider._(
    argument: (programId, pickupPointId),
    from: this,
  );

  @override
  String toString() => r'programTransportPlanViewProvider';
}

/// One vendor's bill, from the live read or a bounded offline snapshot.

@ProviderFor(programVendorBillView)
final programVendorBillViewProvider = ProgramVendorBillViewFamily._();

/// One vendor's bill, from the live read or a bounded offline snapshot.

final class ProgramVendorBillViewProvider
    extends
        $FunctionalProvider<
          AsyncValue<ProgramReadView<ProgramVendorBillView>>,
          ProgramReadView<ProgramVendorBillView>,
          FutureOr<ProgramReadView<ProgramVendorBillView>>
        >
    with
        $FutureModifier<ProgramReadView<ProgramVendorBillView>>,
        $FutureProvider<ProgramReadView<ProgramVendorBillView>> {
  /// One vendor's bill, from the live read or a bounded offline snapshot.
  ProgramVendorBillViewProvider._({
    required ProgramVendorBillViewFamily super.from,
    required (String, String) super.argument,
  }) : super(
         retry: null,
         name: r'programVendorBillViewProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$programVendorBillViewHash();

  @override
  String toString() {
    return r'programVendorBillViewProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $FutureProviderElement<ProgramReadView<ProgramVendorBillView>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<ProgramReadView<ProgramVendorBillView>> create(Ref ref) {
    final argument = this.argument as (String, String);
    return programVendorBillView(ref, argument.$1, argument.$2);
  }

  @override
  bool operator ==(Object other) {
    return other is ProgramVendorBillViewProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$programVendorBillViewHash() =>
    r'fb1d66cdd73fd720bdfc3b232c247a91eb09dcc6';

/// One vendor's bill, from the live read or a bounded offline snapshot.

final class ProgramVendorBillViewFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<ProgramReadView<ProgramVendorBillView>>,
          (String, String)
        > {
  ProgramVendorBillViewFamily._()
    : super(
        retry: null,
        name: r'programVendorBillViewProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// One vendor's bill, from the live read or a bounded offline snapshot.

  ProgramVendorBillViewProvider call(String programId, String vendorId) =>
      ProgramVendorBillViewProvider._(
        argument: (programId, vendorId),
        from: this,
      );

  @override
  String toString() => r'programVendorBillViewProvider';
}

/// The ID tracker for one programme, optionally one hotel.

@ProviderFor(programIdTracker)
final programIdTrackerProvider = ProgramIdTrackerFamily._();

/// The ID tracker for one programme, optionally one hotel.

final class ProgramIdTrackerProvider
    extends
        $FunctionalProvider<
          AsyncValue<ProgramIdTracker>,
          ProgramIdTracker,
          FutureOr<ProgramIdTracker>
        >
    with $FutureModifier<ProgramIdTracker>, $FutureProvider<ProgramIdTracker> {
  /// The ID tracker for one programme, optionally one hotel.
  ProgramIdTrackerProvider._({
    required ProgramIdTrackerFamily super.from,
    required (String, String?) super.argument,
  }) : super(
         retry: null,
         name: r'programIdTrackerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$programIdTrackerHash();

  @override
  String toString() {
    return r'programIdTrackerProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $FutureProviderElement<ProgramIdTracker> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<ProgramIdTracker> create(Ref ref) {
    final argument = this.argument as (String, String?);
    return programIdTracker(ref, argument.$1, argument.$2);
  }

  @override
  bool operator ==(Object other) {
    return other is ProgramIdTrackerProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$programIdTrackerHash() => r'240f05d8e86df313042b7f14c4253dd396bfbccb';

/// The ID tracker for one programme, optionally one hotel.

final class ProgramIdTrackerFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<ProgramIdTracker>,
          (String, String?)
        > {
  ProgramIdTrackerFamily._()
    : super(
        retry: null,
        name: r'programIdTrackerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The ID tracker for one programme, optionally one hotel.

  ProgramIdTrackerProvider call(String programId, String? hotelId) =>
      ProgramIdTrackerProvider._(argument: (programId, hotelId), from: this);

  @override
  String toString() => r'programIdTrackerProvider';
}

/// One album (or every photo), from the live read or a bounded snapshot.

@ProviderFor(programPhotosView)
final programPhotosViewProvider = ProgramPhotosViewFamily._();

/// One album (or every photo), from the live read or a bounded snapshot.

final class ProgramPhotosViewProvider
    extends
        $FunctionalProvider<
          AsyncValue<ProgramReadView<ProgramPhotos>>,
          ProgramReadView<ProgramPhotos>,
          FutureOr<ProgramReadView<ProgramPhotos>>
        >
    with
        $FutureModifier<ProgramReadView<ProgramPhotos>>,
        $FutureProvider<ProgramReadView<ProgramPhotos>> {
  /// One album (or every photo), from the live read or a bounded snapshot.
  ProgramPhotosViewProvider._({
    required ProgramPhotosViewFamily super.from,
    required (String, String?) super.argument,
  }) : super(
         retry: null,
         name: r'programPhotosViewProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$programPhotosViewHash();

  @override
  String toString() {
    return r'programPhotosViewProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $FutureProviderElement<ProgramReadView<ProgramPhotos>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<ProgramReadView<ProgramPhotos>> create(Ref ref) {
    final argument = this.argument as (String, String?);
    return programPhotosView(ref, argument.$1, argument.$2);
  }

  @override
  bool operator ==(Object other) {
    return other is ProgramPhotosViewProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$programPhotosViewHash() => r'fd06a615b640a3b0a789b1f6d1e6cd1a46d14251';

/// One album (or every photo), from the live read or a bounded snapshot.

final class ProgramPhotosViewFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<ProgramReadView<ProgramPhotos>>,
          (String, String?)
        > {
  ProgramPhotosViewFamily._()
    : super(
        retry: null,
        name: r'programPhotosViewProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// One album (or every photo), from the live read or a bounded snapshot.

  ProgramPhotosViewProvider call(String programId, String? functionId) =>
      ProgramPhotosViewProvider._(
        argument: (programId, functionId),
        from: this,
      );

  @override
  String toString() => r'programPhotosViewProvider';
}

/// The guest inbox and assistant settings commands, so presentation code
/// never reaches into the repository provider itself.

@ProviderFor(programmeInboxCommands)
final programmeInboxCommandsProvider = ProgrammeInboxCommandsProvider._();

/// The guest inbox and assistant settings commands, so presentation code
/// never reaches into the repository provider itself.

final class ProgrammeInboxCommandsProvider
    extends
        $FunctionalProvider<
          ProgramWorkRepository,
          ProgramWorkRepository,
          ProgramWorkRepository
        >
    with $Provider<ProgramWorkRepository> {
  /// The guest inbox and assistant settings commands, so presentation code
  /// never reaches into the repository provider itself.
  ProgrammeInboxCommandsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'programmeInboxCommandsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$programmeInboxCommandsHash();

  @$internal
  @override
  $ProviderElement<ProgramWorkRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  ProgramWorkRepository create(Ref ref) {
    return programmeInboxCommands(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ProgramWorkRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ProgramWorkRepository>(value),
    );
  }
}

String _$programmeInboxCommandsHash() =>
    r'6e9249961f2c67699c62a3575d281d45845871a2';

/// One inbox segment, from the live read or a bounded snapshot.

@ProviderFor(programWhatsappInbox)
final programWhatsappInboxProvider = ProgramWhatsappInboxFamily._();

/// One inbox segment, from the live read or a bounded snapshot.

final class ProgramWhatsappInboxProvider
    extends
        $FunctionalProvider<
          AsyncValue<ProgramReadView<ProgramWhatsappInbox>>,
          ProgramReadView<ProgramWhatsappInbox>,
          FutureOr<ProgramReadView<ProgramWhatsappInbox>>
        >
    with
        $FutureModifier<ProgramReadView<ProgramWhatsappInbox>>,
        $FutureProvider<ProgramReadView<ProgramWhatsappInbox>> {
  /// One inbox segment, from the live read or a bounded snapshot.
  ProgramWhatsappInboxProvider._({
    required ProgramWhatsappInboxFamily super.from,
    required (String, ProgramWhatsappFilter) super.argument,
  }) : super(
         retry: null,
         name: r'programWhatsappInboxProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$programWhatsappInboxHash();

  @override
  String toString() {
    return r'programWhatsappInboxProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $FutureProviderElement<ProgramReadView<ProgramWhatsappInbox>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<ProgramReadView<ProgramWhatsappInbox>> create(Ref ref) {
    final argument = this.argument as (String, ProgramWhatsappFilter);
    return programWhatsappInbox(ref, argument.$1, argument.$2);
  }

  @override
  bool operator ==(Object other) {
    return other is ProgramWhatsappInboxProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$programWhatsappInboxHash() =>
    r'8a41cd1419e5354ac4c2ea134b569836e8767d14';

/// One inbox segment, from the live read or a bounded snapshot.

final class ProgramWhatsappInboxFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<ProgramReadView<ProgramWhatsappInbox>>,
          (String, ProgramWhatsappFilter)
        > {
  ProgramWhatsappInboxFamily._()
    : super(
        retry: null,
        name: r'programWhatsappInboxProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// One inbox segment, from the live read or a bounded snapshot.

  ProgramWhatsappInboxProvider call(
    String programId,
    ProgramWhatsappFilter filter,
  ) =>
      ProgramWhatsappInboxProvider._(argument: (programId, filter), from: this);

  @override
  String toString() => r'programWhatsappInboxProvider';
}

/// One conversation, from the live read or a bounded snapshot.

@ProviderFor(programWhatsappThread)
final programWhatsappThreadProvider = ProgramWhatsappThreadFamily._();

/// One conversation, from the live read or a bounded snapshot.

final class ProgramWhatsappThreadProvider
    extends
        $FunctionalProvider<
          AsyncValue<ProgramReadView<ProgramWhatsappThread>>,
          ProgramReadView<ProgramWhatsappThread>,
          FutureOr<ProgramReadView<ProgramWhatsappThread>>
        >
    with
        $FutureModifier<ProgramReadView<ProgramWhatsappThread>>,
        $FutureProvider<ProgramReadView<ProgramWhatsappThread>> {
  /// One conversation, from the live read or a bounded snapshot.
  ProgramWhatsappThreadProvider._({
    required ProgramWhatsappThreadFamily super.from,
    required (String, String) super.argument,
  }) : super(
         retry: null,
         name: r'programWhatsappThreadProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$programWhatsappThreadHash();

  @override
  String toString() {
    return r'programWhatsappThreadProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $FutureProviderElement<ProgramReadView<ProgramWhatsappThread>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<ProgramReadView<ProgramWhatsappThread>> create(Ref ref) {
    final argument = this.argument as (String, String);
    return programWhatsappThread(ref, argument.$1, argument.$2);
  }

  @override
  bool operator ==(Object other) {
    return other is ProgramWhatsappThreadProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$programWhatsappThreadHash() =>
    r'1bea45390c5f583051d290006811bbdf831b5653';

/// One conversation, from the live read or a bounded snapshot.

final class ProgramWhatsappThreadFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<ProgramReadView<ProgramWhatsappThread>>,
          (String, String)
        > {
  ProgramWhatsappThreadFamily._()
    : super(
        retry: null,
        name: r'programWhatsappThreadProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// One conversation, from the live read or a bounded snapshot.

  ProgramWhatsappThreadProvider call(String programId, String threadId) =>
      ProgramWhatsappThreadProvider._(
        argument: (programId, threadId),
        from: this,
      );

  @override
  String toString() => r'programWhatsappThreadProvider';
}

/// The programme's saved replies.

@ProviderFor(programCannedReplies)
final programCannedRepliesProvider = ProgramCannedRepliesFamily._();

/// The programme's saved replies.

final class ProgramCannedRepliesProvider
    extends
        $FunctionalProvider<
          AsyncValue<ProgramReadView<List<ProgramCannedReply>>>,
          ProgramReadView<List<ProgramCannedReply>>,
          FutureOr<ProgramReadView<List<ProgramCannedReply>>>
        >
    with
        $FutureModifier<ProgramReadView<List<ProgramCannedReply>>>,
        $FutureProvider<ProgramReadView<List<ProgramCannedReply>>> {
  /// The programme's saved replies.
  ProgramCannedRepliesProvider._({
    required ProgramCannedRepliesFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'programCannedRepliesProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$programCannedRepliesHash();

  @override
  String toString() {
    return r'programCannedRepliesProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<ProgramReadView<List<ProgramCannedReply>>>
  $createElement($ProviderPointer pointer) => $FutureProviderElement(pointer);

  @override
  FutureOr<ProgramReadView<List<ProgramCannedReply>>> create(Ref ref) {
    final argument = this.argument as String;
    return programCannedReplies(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is ProgramCannedRepliesProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$programCannedRepliesHash() =>
    r'58d66f21999e2695d6e1f574a3b98e53f0bdc5dc';

/// The programme's saved replies.

final class ProgramCannedRepliesFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<ProgramReadView<List<ProgramCannedReply>>>,
          String
        > {
  ProgramCannedRepliesFamily._()
    : super(
        retry: null,
        name: r'programCannedRepliesProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The programme's saved replies.

  ProgramCannedRepliesProvider call(String programId) =>
      ProgramCannedRepliesProvider._(argument: programId, from: this);

  @override
  String toString() => r'programCannedRepliesProvider';
}

/// The assistant settings and the wedding's number.

@ProviderFor(programAssistantSettings)
final programAssistantSettingsProvider = ProgramAssistantSettingsFamily._();

/// The assistant settings and the wedding's number.

final class ProgramAssistantSettingsProvider
    extends
        $FunctionalProvider<
          AsyncValue<ProgramReadView<ProgramAssistantSettings>>,
          ProgramReadView<ProgramAssistantSettings>,
          FutureOr<ProgramReadView<ProgramAssistantSettings>>
        >
    with
        $FutureModifier<ProgramReadView<ProgramAssistantSettings>>,
        $FutureProvider<ProgramReadView<ProgramAssistantSettings>> {
  /// The assistant settings and the wedding's number.
  ProgramAssistantSettingsProvider._({
    required ProgramAssistantSettingsFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'programAssistantSettingsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$programAssistantSettingsHash();

  @override
  String toString() {
    return r'programAssistantSettingsProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<ProgramReadView<ProgramAssistantSettings>>
  $createElement($ProviderPointer pointer) => $FutureProviderElement(pointer);

  @override
  FutureOr<ProgramReadView<ProgramAssistantSettings>> create(Ref ref) {
    final argument = this.argument as String;
    return programAssistantSettings(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is ProgramAssistantSettingsProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$programAssistantSettingsHash() =>
    r'a4f8b07aebe56df70af8fed478e435b526e7790b';

/// The assistant settings and the wedding's number.

final class ProgramAssistantSettingsFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<ProgramReadView<ProgramAssistantSettings>>,
          String
        > {
  ProgramAssistantSettingsFamily._()
    : super(
        retry: null,
        name: r'programAssistantSettingsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The assistant settings and the wedding's number.

  ProgramAssistantSettingsProvider call(String programId) =>
      ProgramAssistantSettingsProvider._(argument: programId, from: this);

  @override
  String toString() => r'programAssistantSettingsProvider';
}

/// The door of one function, live (#1339): the function's header, roster
/// rows and newest journal entries through listeners, gated on the account's
/// authority. The same type as the callable read it replaces.

@ProviderFor(programFunctionDoorView)
final programFunctionDoorViewProvider = ProgramFunctionDoorViewFamily._();

/// The door of one function, live (#1339): the function's header, roster
/// rows and newest journal entries through listeners, gated on the account's
/// authority. The same type as the callable read it replaces.

final class ProgramFunctionDoorViewProvider
    extends
        $FunctionalProvider<
          AsyncValue<ProgramDoorView>,
          ProgramDoorView,
          FutureOr<ProgramDoorView>
        >
    with $FutureModifier<ProgramDoorView>, $FutureProvider<ProgramDoorView> {
  /// The door of one function, live (#1339): the function's header, roster
  /// rows and newest journal entries through listeners, gated on the account's
  /// authority. The same type as the callable read it replaces.
  ProgramFunctionDoorViewProvider._({
    required ProgramFunctionDoorViewFamily super.from,
    required (String, String) super.argument,
  }) : super(
         retry: null,
         name: r'programFunctionDoorViewProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$programFunctionDoorViewHash();

  @override
  String toString() {
    return r'programFunctionDoorViewProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $FutureProviderElement<ProgramDoorView> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<ProgramDoorView> create(Ref ref) {
    final argument = this.argument as (String, String);
    return programFunctionDoorView(ref, argument.$1, argument.$2);
  }

  @override
  bool operator ==(Object other) {
    return other is ProgramFunctionDoorViewProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$programFunctionDoorViewHash() =>
    r'a990d1ac20f3995f2662fae12a3ca6da5feb9b30';

/// The door of one function, live (#1339): the function's header, roster
/// rows and newest journal entries through listeners, gated on the account's
/// authority. The same type as the callable read it replaces.

final class ProgramFunctionDoorViewFamily extends $Family
    with
        $FunctionalFamilyOverride<FutureOr<ProgramDoorView>, (String, String)> {
  ProgramFunctionDoorViewFamily._()
    : super(
        retry: null,
        name: r'programFunctionDoorViewProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The door of one function, live (#1339): the function's header, roster
  /// rows and newest journal entries through listeners, gated on the account's
  /// authority. The same type as the callable read it replaces.

  ProgramFunctionDoorViewProvider call(String programId, String functionId) =>
      ProgramFunctionDoorViewProvider._(
        argument: (programId, functionId),
        from: this,
      );

  @override
  String toString() => r'programFunctionDoorViewProvider';
}

/// The door for the screen: the live door, which opens offline from the
/// device cache while the account's duty holds.

@ProviderFor(programFunctionDoorViewWithSnapshot)
final programFunctionDoorViewWithSnapshotProvider =
    ProgramFunctionDoorViewWithSnapshotFamily._();

/// The door for the screen: the live door, which opens offline from the
/// device cache while the account's duty holds.

final class ProgramFunctionDoorViewWithSnapshotProvider
    extends
        $FunctionalProvider<
          AsyncValue<ProgramReadView<ProgramDoorView>>,
          ProgramReadView<ProgramDoorView>,
          FutureOr<ProgramReadView<ProgramDoorView>>
        >
    with
        $FutureModifier<ProgramReadView<ProgramDoorView>>,
        $FutureProvider<ProgramReadView<ProgramDoorView>> {
  /// The door for the screen: the live door, which opens offline from the
  /// device cache while the account's duty holds.
  ProgramFunctionDoorViewWithSnapshotProvider._({
    required ProgramFunctionDoorViewWithSnapshotFamily super.from,
    required (String, String) super.argument,
  }) : super(
         retry: null,
         name: r'programFunctionDoorViewWithSnapshotProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() =>
      _$programFunctionDoorViewWithSnapshotHash();

  @override
  String toString() {
    return r'programFunctionDoorViewWithSnapshotProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $FutureProviderElement<ProgramReadView<ProgramDoorView>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<ProgramReadView<ProgramDoorView>> create(Ref ref) {
    final argument = this.argument as (String, String);
    return programFunctionDoorViewWithSnapshot(ref, argument.$1, argument.$2);
  }

  @override
  bool operator ==(Object other) {
    return other is ProgramFunctionDoorViewWithSnapshotProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$programFunctionDoorViewWithSnapshotHash() =>
    r'cd529530b08892ae2f7daad24a1fb133ab57cca9';

/// The door for the screen: the live door, which opens offline from the
/// device cache while the account's duty holds.

final class ProgramFunctionDoorViewWithSnapshotFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<ProgramReadView<ProgramDoorView>>,
          (String, String)
        > {
  ProgramFunctionDoorViewWithSnapshotFamily._()
    : super(
        retry: null,
        name: r'programFunctionDoorViewWithSnapshotProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The door for the screen: the live door, which opens offline from the
  /// device cache while the account's duty holds.

  ProgramFunctionDoorViewWithSnapshotProvider call(
    String programId,
    String functionId,
  ) => ProgramFunctionDoorViewWithSnapshotProvider._(
    argument: (programId, functionId),
    from: this,
  );

  @override
  String toString() => r'programFunctionDoorViewWithSnapshotProvider';
}

/// The departures desk, live from `programDepartureViews` (#1339).

@ProviderFor(programDeparturesRosterView)
final programDeparturesRosterViewProvider =
    ProgramDeparturesRosterViewFamily._();

/// The departures desk, live from `programDepartureViews` (#1339).

final class ProgramDeparturesRosterViewProvider
    extends
        $FunctionalProvider<
          AsyncValue<ProgramReadView<ProgramDeparturesRoster>>,
          ProgramReadView<ProgramDeparturesRoster>,
          FutureOr<ProgramReadView<ProgramDeparturesRoster>>
        >
    with
        $FutureModifier<ProgramReadView<ProgramDeparturesRoster>>,
        $FutureProvider<ProgramReadView<ProgramDeparturesRoster>> {
  /// The departures desk, live from `programDepartureViews` (#1339).
  ProgramDeparturesRosterViewProvider._({
    required ProgramDeparturesRosterViewFamily super.from,
    required (String, String) super.argument,
  }) : super(
         retry: null,
         name: r'programDeparturesRosterViewProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$programDeparturesRosterViewHash();

  @override
  String toString() {
    return r'programDeparturesRosterViewProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $FutureProviderElement<ProgramReadView<ProgramDeparturesRoster>>
  $createElement($ProviderPointer pointer) => $FutureProviderElement(pointer);

  @override
  FutureOr<ProgramReadView<ProgramDeparturesRoster>> create(Ref ref) {
    final argument = this.argument as (String, String);
    return programDeparturesRosterView(ref, argument.$1, argument.$2);
  }

  @override
  bool operator ==(Object other) {
    return other is ProgramDeparturesRosterViewProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$programDeparturesRosterViewHash() =>
    r'56c545cc857ea861cdcc63e14acd05b083169d48';

/// The departures desk, live from `programDepartureViews` (#1339).

final class ProgramDeparturesRosterViewFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<ProgramReadView<ProgramDeparturesRoster>>,
          (String, String)
        > {
  ProgramDeparturesRosterViewFamily._()
    : super(
        retry: null,
        name: r'programDeparturesRosterViewProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The departures desk, live from `programDepartureViews` (#1339).

  ProgramDeparturesRosterViewProvider call(String programId, String hotelId) =>
      ProgramDeparturesRosterViewProvider._(
        argument: (programId, hotelId),
        from: this,
      );

  @override
  String toString() => r'programDeparturesRosterViewProvider';
}

/// The live board (#1339): function labels, the alerts this account may
/// read and the travel counts through listeners, gated on the account's
/// authority, with the schedule phased by the app clock.

@ProviderFor(programLiveBoardView)
final programLiveBoardViewProvider = ProgramLiveBoardViewFamily._();

/// The live board (#1339): function labels, the alerts this account may
/// read and the travel counts through listeners, gated on the account's
/// authority, with the schedule phased by the app clock.

final class ProgramLiveBoardViewProvider
    extends
        $FunctionalProvider<
          AsyncValue<ProgramReadView<ProgramLiveBoard>>,
          ProgramReadView<ProgramLiveBoard>,
          FutureOr<ProgramReadView<ProgramLiveBoard>>
        >
    with
        $FutureModifier<ProgramReadView<ProgramLiveBoard>>,
        $FutureProvider<ProgramReadView<ProgramLiveBoard>> {
  /// The live board (#1339): function labels, the alerts this account may
  /// read and the travel counts through listeners, gated on the account's
  /// authority, with the schedule phased by the app clock.
  ProgramLiveBoardViewProvider._({
    required ProgramLiveBoardViewFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'programLiveBoardViewProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$programLiveBoardViewHash();

  @override
  String toString() {
    return r'programLiveBoardViewProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<ProgramReadView<ProgramLiveBoard>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<ProgramReadView<ProgramLiveBoard>> create(Ref ref) {
    final argument = this.argument as String;
    return programLiveBoardView(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is ProgramLiveBoardViewProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$programLiveBoardViewHash() =>
    r'dcf30ae562f7ed16b475de188146fa7d4ccb1518';

/// The live board (#1339): function labels, the alerts this account may
/// read and the travel counts through listeners, gated on the account's
/// authority, with the schedule phased by the app clock.

final class ProgramLiveBoardViewFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<ProgramReadView<ProgramLiveBoard>>,
          String
        > {
  ProgramLiveBoardViewFamily._()
    : super(
        retry: null,
        name: r'programLiveBoardViewProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The live board (#1339): function labels, the alerts this account may
  /// read and the travel counts through listeners, gated on the account's
  /// authority, with the schedule phased by the app clock.

  ProgramLiveBoardViewProvider call(String programId) =>
      ProgramLiveBoardViewProvider._(argument: programId, from: this);

  @override
  String toString() => r'programLiveBoardViewProvider';
}

/// Lead-facing report providers: attendance rollups and stakeholder counts.
/// Split into a part file so the work repository stays under the
/// handwritten-source size budget.

@ProviderFor(programAttendanceReport)
final programAttendanceReportProvider = ProgramAttendanceReportFamily._();

/// Lead-facing report providers: attendance rollups and stakeholder counts.
/// Split into a part file so the work repository stays under the
/// handwritten-source size budget.

final class ProgramAttendanceReportProvider
    extends
        $FunctionalProvider<
          AsyncValue<ProgramAttendanceReport>,
          ProgramAttendanceReport,
          FutureOr<ProgramAttendanceReport>
        >
    with
        $FutureModifier<ProgramAttendanceReport>,
        $FutureProvider<ProgramAttendanceReport> {
  /// Lead-facing report providers: attendance rollups and stakeholder counts.
  /// Split into a part file so the work repository stays under the
  /// handwritten-source size budget.
  ProgramAttendanceReportProvider._({
    required ProgramAttendanceReportFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'programAttendanceReportProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$programAttendanceReportHash();

  @override
  String toString() {
    return r'programAttendanceReportProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<ProgramAttendanceReport> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<ProgramAttendanceReport> create(Ref ref) {
    final argument = this.argument as String;
    return programAttendanceReport(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is ProgramAttendanceReportProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$programAttendanceReportHash() =>
    r'ef4875bbc0e32499ac51d6f10a1a47149d57c7d1';

/// Lead-facing report providers: attendance rollups and stakeholder counts.
/// Split into a part file so the work repository stays under the
/// handwritten-source size budget.

final class ProgramAttendanceReportFamily extends $Family
    with $FunctionalFamilyOverride<FutureOr<ProgramAttendanceReport>, String> {
  ProgramAttendanceReportFamily._()
    : super(
        retry: null,
        name: r'programAttendanceReportProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Lead-facing report providers: attendance rollups and stakeholder counts.
  /// Split into a part file so the work repository stays under the
  /// handwritten-source size budget.

  ProgramAttendanceReportProvider call(String programId) =>
      ProgramAttendanceReportProvider._(argument: programId, from: this);

  @override
  String toString() => r'programAttendanceReportProvider';
}

@ProviderFor(programStakeholderCounts)
final programStakeholderCountsProvider = ProgramStakeholderCountsFamily._();

final class ProgramStakeholderCountsProvider
    extends
        $FunctionalProvider<
          AsyncValue<ProgramStakeholderCounts>,
          ProgramStakeholderCounts,
          FutureOr<ProgramStakeholderCounts>
        >
    with
        $FutureModifier<ProgramStakeholderCounts>,
        $FutureProvider<ProgramStakeholderCounts> {
  ProgramStakeholderCountsProvider._({
    required ProgramStakeholderCountsFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'programStakeholderCountsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$programStakeholderCountsHash();

  @override
  String toString() {
    return r'programStakeholderCountsProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<ProgramStakeholderCounts> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<ProgramStakeholderCounts> create(Ref ref) {
    final argument = this.argument as String;
    return programStakeholderCounts(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is ProgramStakeholderCountsProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$programStakeholderCountsHash() =>
    r'8a9ff43059a23737c10e99727882a80edbabb10e';

final class ProgramStakeholderCountsFamily extends $Family
    with $FunctionalFamilyOverride<FutureOr<ProgramStakeholderCounts>, String> {
  ProgramStakeholderCountsFamily._()
    : super(
        retry: null,
        name: r'programStakeholderCountsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  ProgramStakeholderCountsProvider call(String programId) =>
      ProgramStakeholderCountsProvider._(argument: programId, from: this);

  @override
  String toString() => r'programStakeholderCountsProvider';
}

/// Hotel desk providers: the room board for one property (the inbound board
/// is `programHotelInboundStreamProvider`). Split into a part file so the
/// work repository stays under the handwritten-source size budget; providers
/// remain top-level so tests fake them through `overrideWith`, not repository
/// subclassing.

@ProviderFor(programHotelRooms)
final programHotelRoomsProvider = ProgramHotelRoomsFamily._();

/// Hotel desk providers: the room board for one property (the inbound board
/// is `programHotelInboundStreamProvider`). Split into a part file so the
/// work repository stays under the handwritten-source size budget; providers
/// remain top-level so tests fake them through `overrideWith`, not repository
/// subclassing.

final class ProgramHotelRoomsProvider
    extends
        $FunctionalProvider<
          AsyncValue<ProgramHotelRooms>,
          ProgramHotelRooms,
          FutureOr<ProgramHotelRooms>
        >
    with
        $FutureModifier<ProgramHotelRooms>,
        $FutureProvider<ProgramHotelRooms> {
  /// Hotel desk providers: the room board for one property (the inbound board
  /// is `programHotelInboundStreamProvider`). Split into a part file so the
  /// work repository stays under the handwritten-source size budget; providers
  /// remain top-level so tests fake them through `overrideWith`, not repository
  /// subclassing.
  ProgramHotelRoomsProvider._({
    required ProgramHotelRoomsFamily super.from,
    required (String, String) super.argument,
  }) : super(
         retry: null,
         name: r'programHotelRoomsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$programHotelRoomsHash();

  @override
  String toString() {
    return r'programHotelRoomsProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $FutureProviderElement<ProgramHotelRooms> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<ProgramHotelRooms> create(Ref ref) {
    final argument = this.argument as (String, String);
    return programHotelRooms(ref, argument.$1, argument.$2);
  }

  @override
  bool operator ==(Object other) {
    return other is ProgramHotelRoomsProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$programHotelRoomsHash() => r'2e5b788b876388427eddc07237310c98aaf2f278';

/// Hotel desk providers: the room board for one property (the inbound board
/// is `programHotelInboundStreamProvider`). Split into a part file so the
/// work repository stays under the handwritten-source size budget; providers
/// remain top-level so tests fake them through `overrideWith`, not repository
/// subclassing.

final class ProgramHotelRoomsFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<ProgramHotelRooms>,
          (String, String)
        > {
  ProgramHotelRoomsFamily._()
    : super(
        retry: null,
        name: r'programHotelRoomsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Hotel desk providers: the room board for one property (the inbound board
  /// is `programHotelInboundStreamProvider`). Split into a part file so the
  /// work repository stays under the handwritten-source size budget; providers
  /// remain top-level so tests fake them through `overrideWith`, not repository
  /// subclassing.

  ProgramHotelRoomsProvider call(String programId, String hotelId) =>
      ProgramHotelRoomsProvider._(argument: (programId, hotelId), from: this);

  @override
  String toString() => r'programHotelRoomsProvider';
}
