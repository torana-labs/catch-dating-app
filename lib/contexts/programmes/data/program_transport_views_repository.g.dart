// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'program_transport_views_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(programTransportViewsRepository)
final programTransportViewsRepositoryProvider =
    ProgramTransportViewsRepositoryProvider._();

final class ProgramTransportViewsRepositoryProvider
    extends
        $FunctionalProvider<
          ProgramTransportViewsRepository,
          ProgramTransportViewsRepository,
          ProgramTransportViewsRepository
        >
    with $Provider<ProgramTransportViewsRepository> {
  ProgramTransportViewsRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'programTransportViewsRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$programTransportViewsRepositoryHash();

  @$internal
  @override
  $ProviderElement<ProgramTransportViewsRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  ProgramTransportViewsRepository create(Ref ref) {
    return programTransportViewsRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ProgramTransportViewsRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ProgramTransportViewsRepository>(
        value,
      ),
    );
  }
}

String _$programTransportViewsRepositoryHash() =>
    r'd5284c09003a3934c49cea665ed618993af35d5e';

/// The arrivals roster the account's routes reach, live.

@ProviderFor(programArrivalsStream)
final programArrivalsStreamProvider = ProgramArrivalsStreamFamily._();

/// The arrivals roster the account's routes reach, live.

final class ProgramArrivalsStreamProvider
    extends
        $FunctionalProvider<
          AsyncValue<ProgramArrivalsRoster>,
          ProgramArrivalsRoster,
          Stream<ProgramArrivalsRoster>
        >
    with
        $FutureModifier<ProgramArrivalsRoster>,
        $StreamProvider<ProgramArrivalsRoster> {
  /// The arrivals roster the account's routes reach, live.
  ProgramArrivalsStreamProvider._({
    required ProgramArrivalsStreamFamily super.from,
    required (String, String?) super.argument,
  }) : super(
         retry: null,
         name: r'programArrivalsStreamProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$programArrivalsStreamHash();

  @override
  String toString() {
    return r'programArrivalsStreamProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $StreamProviderElement<ProgramArrivalsRoster> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<ProgramArrivalsRoster> create(Ref ref) {
    final argument = this.argument as (String, String?);
    return programArrivalsStream(ref, argument.$1, argument.$2);
  }

  @override
  bool operator ==(Object other) {
    return other is ProgramArrivalsStreamProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$programArrivalsStreamHash() =>
    r'f69bbfd70285843b5331d7decc29f4626c28ba09';

/// The arrivals roster the account's routes reach, live.

final class ProgramArrivalsStreamFamily extends $Family
    with
        $FunctionalFamilyOverride<
          Stream<ProgramArrivalsRoster>,
          (String, String?)
        > {
  ProgramArrivalsStreamFamily._()
    : super(
        retry: null,
        name: r'programArrivalsStreamProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The arrivals roster the account's routes reach, live.

  ProgramArrivalsStreamProvider call(String programId, String? pickupPointId) =>
      ProgramArrivalsStreamProvider._(
        argument: (programId, pickupPointId),
        from: this,
      );

  @override
  String toString() => r'programArrivalsStreamProvider';
}

/// One hotel's departures, live.

@ProviderFor(programDeparturesStream)
final programDeparturesStreamProvider = ProgramDeparturesStreamFamily._();

/// One hotel's departures, live.

final class ProgramDeparturesStreamProvider
    extends
        $FunctionalProvider<
          AsyncValue<ProgramDeparturesRoster>,
          ProgramDeparturesRoster,
          Stream<ProgramDeparturesRoster>
        >
    with
        $FutureModifier<ProgramDeparturesRoster>,
        $StreamProvider<ProgramDeparturesRoster> {
  /// One hotel's departures, live.
  ProgramDeparturesStreamProvider._({
    required ProgramDeparturesStreamFamily super.from,
    required (String, String) super.argument,
  }) : super(
         retry: null,
         name: r'programDeparturesStreamProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$programDeparturesStreamHash();

  @override
  String toString() {
    return r'programDeparturesStreamProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $StreamProviderElement<ProgramDeparturesRoster> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<ProgramDeparturesRoster> create(Ref ref) {
    final argument = this.argument as (String, String);
    return programDeparturesStream(ref, argument.$1, argument.$2);
  }

  @override
  bool operator ==(Object other) {
    return other is ProgramDeparturesStreamProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$programDeparturesStreamHash() =>
    r'b859705fe28e2d31ecb949ae50a09739f40b6674';

/// One hotel's departures, live.

final class ProgramDeparturesStreamFamily extends $Family
    with
        $FunctionalFamilyOverride<
          Stream<ProgramDeparturesRoster>,
          (String, String)
        > {
  ProgramDeparturesStreamFamily._()
    : super(
        retry: null,
        name: r'programDeparturesStreamProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// One hotel's departures, live.

  ProgramDeparturesStreamProvider call(String programId, String hotelId) =>
      ProgramDeparturesStreamProvider._(
        argument: (programId, hotelId),
        from: this,
      );

  @override
  String toString() => r'programDeparturesStreamProvider';
}

/// The trip ledger, live.

@ProviderFor(programTripsStream)
final programTripsStreamProvider = ProgramTripsStreamFamily._();

/// The trip ledger, live.

final class ProgramTripsStreamProvider
    extends
        $FunctionalProvider<
          AsyncValue<ProgramTripList>,
          ProgramTripList,
          Stream<ProgramTripList>
        >
    with $FutureModifier<ProgramTripList>, $StreamProvider<ProgramTripList> {
  /// The trip ledger, live.
  ProgramTripsStreamProvider._({
    required ProgramTripsStreamFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'programTripsStreamProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$programTripsStreamHash();

  @override
  String toString() {
    return r'programTripsStreamProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<ProgramTripList> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<ProgramTripList> create(Ref ref) {
    final argument = this.argument as String;
    return programTripsStream(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is ProgramTripsStreamProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$programTripsStreamHash() =>
    r'62d838f839f87a50c56e31e30780911a48729fd1';

/// The trip ledger, live.

final class ProgramTripsStreamFamily extends $Family
    with $FunctionalFamilyOverride<Stream<ProgramTripList>, String> {
  ProgramTripsStreamFamily._()
    : super(
        retry: null,
        name: r'programTripsStreamProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The trip ledger, live.

  ProgramTripsStreamProvider call(String programId) =>
      ProgramTripsStreamProvider._(argument: programId, from: this);

  @override
  String toString() => r'programTripsStreamProvider';
}

/// One hotel's inbound board, live.

@ProviderFor(programHotelInboundStream)
final programHotelInboundStreamProvider = ProgramHotelInboundStreamFamily._();

/// One hotel's inbound board, live.

final class ProgramHotelInboundStreamProvider
    extends
        $FunctionalProvider<
          AsyncValue<ProgramHotelInbound>,
          ProgramHotelInbound,
          Stream<ProgramHotelInbound>
        >
    with
        $FutureModifier<ProgramHotelInbound>,
        $StreamProvider<ProgramHotelInbound> {
  /// One hotel's inbound board, live.
  ProgramHotelInboundStreamProvider._({
    required ProgramHotelInboundStreamFamily super.from,
    required (String, String) super.argument,
  }) : super(
         retry: null,
         name: r'programHotelInboundStreamProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$programHotelInboundStreamHash();

  @override
  String toString() {
    return r'programHotelInboundStreamProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $StreamProviderElement<ProgramHotelInbound> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<ProgramHotelInbound> create(Ref ref) {
    final argument = this.argument as (String, String);
    return programHotelInboundStream(ref, argument.$1, argument.$2);
  }

  @override
  bool operator ==(Object other) {
    return other is ProgramHotelInboundStreamProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$programHotelInboundStreamHash() =>
    r'e7b37d03d4e6cdae78f45d79b57fa3cc8f10142c';

/// One hotel's inbound board, live.

final class ProgramHotelInboundStreamFamily extends $Family
    with
        $FunctionalFamilyOverride<
          Stream<ProgramHotelInbound>,
          (String, String)
        > {
  ProgramHotelInboundStreamFamily._()
    : super(
        retry: null,
        name: r'programHotelInboundStreamProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// One hotel's inbound board, live.

  ProgramHotelInboundStreamProvider call(String programId, String hotelId) =>
      ProgramHotelInboundStreamProvider._(
        argument: (programId, hotelId),
        from: this,
      );

  @override
  String toString() => r'programHotelInboundStreamProvider';
}

/// The vendors bound to a programme, live.

@ProviderFor(programVendorsStream)
final programVendorsStreamProvider = ProgramVendorsStreamFamily._();

/// The vendors bound to a programme, live.

final class ProgramVendorsStreamProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<ProgramVendorOption>>,
          List<ProgramVendorOption>,
          Stream<List<ProgramVendorOption>>
        >
    with
        $FutureModifier<List<ProgramVendorOption>>,
        $StreamProvider<List<ProgramVendorOption>> {
  /// The vendors bound to a programme, live.
  ProgramVendorsStreamProvider._({
    required ProgramVendorsStreamFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'programVendorsStreamProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$programVendorsStreamHash();

  @override
  String toString() {
    return r'programVendorsStreamProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<ProgramVendorOption>> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<List<ProgramVendorOption>> create(Ref ref) {
    final argument = this.argument as String;
    return programVendorsStream(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is ProgramVendorsStreamProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$programVendorsStreamHash() =>
    r'db6c7b248efc5bdfe1632151c6d23a9fc442a254';

/// The vendors bound to a programme, live.

final class ProgramVendorsStreamFamily extends $Family
    with $FunctionalFamilyOverride<Stream<List<ProgramVendorOption>>, String> {
  ProgramVendorsStreamFamily._()
    : super(
        retry: null,
        name: r'programVendorsStreamProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The vendors bound to a programme, live.

  ProgramVendorsStreamProvider call(String programId) =>
      ProgramVendorsStreamProvider._(argument: programId, from: this);

  @override
  String toString() => r'programVendorsStreamProvider';
}
