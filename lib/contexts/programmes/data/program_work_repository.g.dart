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

/// An invitation must be claimed online; an existing program may reopen from
/// a bounded snapshot of its previously verified access.

@ProviderFor(programWorkEntry)
final programWorkEntryProvider = ProgramWorkEntryFamily._();

/// An invitation must be claimed online; an existing program may reopen from
/// a bounded snapshot of its previously verified access.

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
  /// An invitation must be claimed online; an existing program may reopen from
  /// a bounded snapshot of its previously verified access.
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

String _$programWorkEntryHash() => r'50b7414a9ad3e95964a784acc5674c5edca7c87f';

/// An invitation must be claimed online; an existing program may reopen from
/// a bounded snapshot of its previously verified access.

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

  /// An invitation must be claimed online; an existing program may reopen from
  /// a bounded snapshot of its previously verified access.

  ProgramWorkEntryProvider call(String programId, String? inviteId) =>
      ProgramWorkEntryProvider._(argument: (programId, inviteId), from: this);

  @override
  String toString() => r'programWorkEntryProvider';
}

@ProviderFor(programArrivalsRoster)
final programArrivalsRosterProvider = ProgramArrivalsRosterFamily._();

final class ProgramArrivalsRosterProvider
    extends
        $FunctionalProvider<
          AsyncValue<ProgramArrivalsRoster>,
          ProgramArrivalsRoster,
          FutureOr<ProgramArrivalsRoster>
        >
    with
        $FutureModifier<ProgramArrivalsRoster>,
        $FutureProvider<ProgramArrivalsRoster> {
  ProgramArrivalsRosterProvider._({
    required ProgramArrivalsRosterFamily super.from,
    required (String, String?) super.argument,
  }) : super(
         retry: null,
         name: r'programArrivalsRosterProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$programArrivalsRosterHash();

  @override
  String toString() {
    return r'programArrivalsRosterProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $FutureProviderElement<ProgramArrivalsRoster> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<ProgramArrivalsRoster> create(Ref ref) {
    final argument = this.argument as (String, String?);
    return programArrivalsRoster(ref, argument.$1, argument.$2);
  }

  @override
  bool operator ==(Object other) {
    return other is ProgramArrivalsRosterProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$programArrivalsRosterHash() =>
    r'9143c3b11fe80a644e2361169750efb93ef3d832';

final class ProgramArrivalsRosterFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<ProgramArrivalsRoster>,
          (String, String?)
        > {
  ProgramArrivalsRosterFamily._()
    : super(
        retry: null,
        name: r'programArrivalsRosterProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  ProgramArrivalsRosterProvider call(String programId, String? pickupPointId) =>
      ProgramArrivalsRosterProvider._(
        argument: (programId, pickupPointId),
        from: this,
      );

  @override
  String toString() => r'programArrivalsRosterProvider';
}

@ProviderFor(programArrivalsRosterView)
final programArrivalsRosterViewProvider = ProgramArrivalsRosterViewFamily._();

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
    r'f085a79621708513500c7eb57d21125c922958f0';

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

@ProviderFor(programTripList)
final programTripListProvider = ProgramTripListFamily._();

final class ProgramTripListProvider
    extends
        $FunctionalProvider<
          AsyncValue<ProgramTripList>,
          ProgramTripList,
          FutureOr<ProgramTripList>
        >
    with $FutureModifier<ProgramTripList>, $FutureProvider<ProgramTripList> {
  ProgramTripListProvider._({
    required ProgramTripListFamily super.from,
    required (String, {String? cursor}) super.argument,
  }) : super(
         retry: null,
         name: r'programTripListProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$programTripListHash();

  @override
  String toString() {
    return r'programTripListProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $FutureProviderElement<ProgramTripList> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<ProgramTripList> create(Ref ref) {
    final argument = this.argument as (String, {String? cursor});
    return programTripList(ref, argument.$1, cursor: argument.cursor);
  }

  @override
  bool operator ==(Object other) {
    return other is ProgramTripListProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$programTripListHash() => r'567c8a1f768d508f26d435ab1dc865997b20eae6';

final class ProgramTripListFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<ProgramTripList>,
          (String, {String? cursor})
        > {
  ProgramTripListFamily._()
    : super(
        retry: null,
        name: r'programTripListProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  ProgramTripListProvider call(String programId, {String? cursor}) =>
      ProgramTripListProvider._(
        argument: (programId, cursor: cursor),
        from: this,
      );

  @override
  String toString() => r'programTripListProvider';
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

@ProviderFor(programFunctionDoorView)
final programFunctionDoorViewProvider = ProgramFunctionDoorViewFamily._();

final class ProgramFunctionDoorViewProvider
    extends
        $FunctionalProvider<
          AsyncValue<ProgramDoorView>,
          ProgramDoorView,
          FutureOr<ProgramDoorView>
        >
    with $FutureModifier<ProgramDoorView>, $FutureProvider<ProgramDoorView> {
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
    r'f73a6dc0c0bbd06be491ede77e443b26c2281059';

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

  ProgramFunctionDoorViewProvider call(String programId, String functionId) =>
      ProgramFunctionDoorViewProvider._(
        argument: (programId, functionId),
        from: this,
      );

  @override
  String toString() => r'programFunctionDoorViewProvider';
}

@ProviderFor(programFunctionDoorViewWithSnapshot)
final programFunctionDoorViewWithSnapshotProvider =
    ProgramFunctionDoorViewWithSnapshotFamily._();

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
    r'033a5625589ab42a2286a690e161d5a8678b4c47';

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

/// The departures desk, from the live read or a bounded offline snapshot.

@ProviderFor(programDeparturesRosterView)
final programDeparturesRosterViewProvider =
    ProgramDeparturesRosterViewFamily._();

/// The departures desk, from the live read or a bounded offline snapshot.

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
  /// The departures desk, from the live read or a bounded offline snapshot.
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
    r'0a5f9d9cd14f063a15521d76776f468b379ba115';

/// The departures desk, from the live read or a bounded offline snapshot.

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

  /// The departures desk, from the live read or a bounded offline snapshot.

  ProgramDeparturesRosterViewProvider call(String programId, String hotelId) =>
      ProgramDeparturesRosterViewProvider._(
        argument: (programId, hotelId),
        from: this,
      );

  @override
  String toString() => r'programDeparturesRosterViewProvider';
}

/// The live board, from the live read or a bounded offline snapshot.

@ProviderFor(programLiveBoardView)
final programLiveBoardViewProvider = ProgramLiveBoardViewFamily._();

/// The live board, from the live read or a bounded offline snapshot.

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
  /// The live board, from the live read or a bounded offline snapshot.
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
    r'54efdc4c0a01e01ca505dca9629f86908b73c04f';

/// The live board, from the live read or a bounded offline snapshot.

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

  /// The live board, from the live read or a bounded offline snapshot.

  ProgramLiveBoardViewProvider call(String programId) =>
      ProgramLiveBoardViewProvider._(argument: programId, from: this);

  @override
  String toString() => r'programLiveBoardViewProvider';
}

/// Lead-facing report and feed providers: attendance rollups, stakeholder
/// counts, the duty-scoped attention feed and the organizer's vendor
/// directory. Split into a part file so the work repository stays under the
/// handwritten-source size budget.

@ProviderFor(programAttendanceReport)
final programAttendanceReportProvider = ProgramAttendanceReportFamily._();

/// Lead-facing report and feed providers: attendance rollups, stakeholder
/// counts, the duty-scoped attention feed and the organizer's vendor
/// directory. Split into a part file so the work repository stays under the
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
  /// Lead-facing report and feed providers: attendance rollups, stakeholder
  /// counts, the duty-scoped attention feed and the organizer's vendor
  /// directory. Split into a part file so the work repository stays under the
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

/// Lead-facing report and feed providers: attendance rollups, stakeholder
/// counts, the duty-scoped attention feed and the organizer's vendor
/// directory. Split into a part file so the work repository stays under the
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

  /// Lead-facing report and feed providers: attendance rollups, stakeholder
  /// counts, the duty-scoped attention feed and the organizer's vendor
  /// directory. Split into a part file so the work repository stays under the
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

/// Function-lead attention feed scoped to the caller's duties.

@ProviderFor(programStaffAttention)
final programStaffAttentionProvider = ProgramStaffAttentionFamily._();

/// Function-lead attention feed scoped to the caller's duties.

final class ProgramStaffAttentionProvider
    extends
        $FunctionalProvider<
          AsyncValue<ProgramStaffAttention>,
          ProgramStaffAttention,
          FutureOr<ProgramStaffAttention>
        >
    with
        $FutureModifier<ProgramStaffAttention>,
        $FutureProvider<ProgramStaffAttention> {
  /// Function-lead attention feed scoped to the caller's duties.
  ProgramStaffAttentionProvider._({
    required ProgramStaffAttentionFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'programStaffAttentionProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$programStaffAttentionHash();

  @override
  String toString() {
    return r'programStaffAttentionProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<ProgramStaffAttention> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<ProgramStaffAttention> create(Ref ref) {
    final argument = this.argument as String;
    return programStaffAttention(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is ProgramStaffAttentionProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$programStaffAttentionHash() =>
    r'7b6333c2e24450f40ddaa2abcd82b496ffda4b13';

/// Function-lead attention feed scoped to the caller's duties.

final class ProgramStaffAttentionFamily extends $Family
    with $FunctionalFamilyOverride<FutureOr<ProgramStaffAttention>, String> {
  ProgramStaffAttentionFamily._()
    : super(
        retry: null,
        name: r'programStaffAttentionProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Function-lead attention feed scoped to the caller's duties.

  ProgramStaffAttentionProvider call(String programId) =>
      ProgramStaffAttentionProvider._(argument: programId, from: this);

  @override
  String toString() => r'programStaffAttentionProvider';
}

/// Organizer-scoped vendor directory for the transport planning surface.

@ProviderFor(programTransportVendors)
final programTransportVendorsProvider = ProgramTransportVendorsFamily._();

/// Organizer-scoped vendor directory for the transport planning surface.

final class ProgramTransportVendorsProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<ProgramVendorOption>>,
          List<ProgramVendorOption>,
          FutureOr<List<ProgramVendorOption>>
        >
    with
        $FutureModifier<List<ProgramVendorOption>>,
        $FutureProvider<List<ProgramVendorOption>> {
  /// Organizer-scoped vendor directory for the transport planning surface.
  ProgramTransportVendorsProvider._({
    required ProgramTransportVendorsFamily super.from,
    required (String, String) super.argument,
  }) : super(
         retry: null,
         name: r'programTransportVendorsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$programTransportVendorsHash();

  @override
  String toString() {
    return r'programTransportVendorsProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $FutureProviderElement<List<ProgramVendorOption>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<List<ProgramVendorOption>> create(Ref ref) {
    final argument = this.argument as (String, String);
    return programTransportVendors(ref, argument.$1, argument.$2);
  }

  @override
  bool operator ==(Object other) {
    return other is ProgramTransportVendorsProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$programTransportVendorsHash() =>
    r'8a888d1076d4957a61446ef6f487d86dfad14ed9';

/// Organizer-scoped vendor directory for the transport planning surface.

final class ProgramTransportVendorsFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<List<ProgramVendorOption>>,
          (String, String)
        > {
  ProgramTransportVendorsFamily._()
    : super(
        retry: null,
        name: r'programTransportVendorsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Organizer-scoped vendor directory for the transport planning surface.

  ProgramTransportVendorsProvider call(String organizerId, String programId) =>
      ProgramTransportVendorsProvider._(
        argument: (organizerId, programId),
        from: this,
      );

  @override
  String toString() => r'programTransportVendorsProvider';
}

/// Hotel desk providers: the inbound board and the room board for one
/// property. Split into a part file so the work repository stays under the
/// handwritten-source size budget; providers remain top-level so tests fake
/// them through `overrideWith`, not repository subclassing.

@ProviderFor(programHotelInbound)
final programHotelInboundProvider = ProgramHotelInboundFamily._();

/// Hotel desk providers: the inbound board and the room board for one
/// property. Split into a part file so the work repository stays under the
/// handwritten-source size budget; providers remain top-level so tests fake
/// them through `overrideWith`, not repository subclassing.

final class ProgramHotelInboundProvider
    extends
        $FunctionalProvider<
          AsyncValue<ProgramHotelInbound>,
          ProgramHotelInbound,
          FutureOr<ProgramHotelInbound>
        >
    with
        $FutureModifier<ProgramHotelInbound>,
        $FutureProvider<ProgramHotelInbound> {
  /// Hotel desk providers: the inbound board and the room board for one
  /// property. Split into a part file so the work repository stays under the
  /// handwritten-source size budget; providers remain top-level so tests fake
  /// them through `overrideWith`, not repository subclassing.
  ProgramHotelInboundProvider._({
    required ProgramHotelInboundFamily super.from,
    required (String, String, {String? tripCursor, String? expectedCursor})
    super.argument,
  }) : super(
         retry: null,
         name: r'programHotelInboundProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$programHotelInboundHash();

  @override
  String toString() {
    return r'programHotelInboundProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $FutureProviderElement<ProgramHotelInbound> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<ProgramHotelInbound> create(Ref ref) {
    final argument =
        this.argument
            as (String, String, {String? tripCursor, String? expectedCursor});
    return programHotelInbound(
      ref,
      argument.$1,
      argument.$2,
      tripCursor: argument.tripCursor,
      expectedCursor: argument.expectedCursor,
    );
  }

  @override
  bool operator ==(Object other) {
    return other is ProgramHotelInboundProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$programHotelInboundHash() =>
    r'85ec7cf0b6a8c27edd1740e0792a038601c75b08';

/// Hotel desk providers: the inbound board and the room board for one
/// property. Split into a part file so the work repository stays under the
/// handwritten-source size budget; providers remain top-level so tests fake
/// them through `overrideWith`, not repository subclassing.

final class ProgramHotelInboundFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<ProgramHotelInbound>,
          (String, String, {String? tripCursor, String? expectedCursor})
        > {
  ProgramHotelInboundFamily._()
    : super(
        retry: null,
        name: r'programHotelInboundProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Hotel desk providers: the inbound board and the room board for one
  /// property. Split into a part file so the work repository stays under the
  /// handwritten-source size budget; providers remain top-level so tests fake
  /// them through `overrideWith`, not repository subclassing.

  ProgramHotelInboundProvider call(
    String programId,
    String hotelId, {
    String? tripCursor,
    String? expectedCursor,
  }) => ProgramHotelInboundProvider._(
    argument: (
      programId,
      hotelId,
      tripCursor: tripCursor,
      expectedCursor: expectedCursor,
    ),
    from: this,
  );

  @override
  String toString() => r'programHotelInboundProvider';
}

@ProviderFor(programHotelRooms)
final programHotelRoomsProvider = ProgramHotelRoomsFamily._();

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

  ProgramHotelRoomsProvider call(String programId, String hotelId) =>
      ProgramHotelRoomsProvider._(argument: (programId, hotelId), from: this);

  @override
  String toString() => r'programHotelRoomsProvider';
}
