// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'program_lodging_providers.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(programLodgingRepository)
final programLodgingRepositoryProvider = ProgramLodgingRepositoryProvider._();

final class ProgramLodgingRepositoryProvider
    extends
        $FunctionalProvider<
          ProgramLodgingRepository,
          ProgramLodgingRepository,
          ProgramLodgingRepository
        >
    with $Provider<ProgramLodgingRepository> {
  ProgramLodgingRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'programLodgingRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$programLodgingRepositoryHash();

  @$internal
  @override
  $ProviderElement<ProgramLodgingRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  ProgramLodgingRepository create(Ref ref) {
    return programLodgingRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ProgramLodgingRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ProgramLodgingRepository>(value),
    );
  }
}

String _$programLodgingRepositoryHash() =>
    r'9571bd0e61782e1a845b24f1d2b24ef589c6c38e';

/// One hotel's read-only room list, read once each time the view opens.
/// Live-only: it is never written to the offline snapshot store.

@ProviderFor(programLodgingHotelBoard)
final programLodgingHotelBoardProvider = ProgramLodgingHotelBoardFamily._();

/// One hotel's read-only room list, read once each time the view opens.
/// Live-only: it is never written to the offline snapshot store.

final class ProgramLodgingHotelBoardProvider
    extends
        $FunctionalProvider<
          AsyncValue<ProgramLodgingHotelBoard>,
          ProgramLodgingHotelBoard,
          FutureOr<ProgramLodgingHotelBoard>
        >
    with
        $FutureModifier<ProgramLodgingHotelBoard>,
        $FutureProvider<ProgramLodgingHotelBoard> {
  /// One hotel's read-only room list, read once each time the view opens.
  /// Live-only: it is never written to the offline snapshot store.
  ProgramLodgingHotelBoardProvider._({
    required ProgramLodgingHotelBoardFamily super.from,
    required (String, String) super.argument,
  }) : super(
         retry: null,
         name: r'programLodgingHotelBoardProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$programLodgingHotelBoardHash();

  @override
  String toString() {
    return r'programLodgingHotelBoardProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $FutureProviderElement<ProgramLodgingHotelBoard> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<ProgramLodgingHotelBoard> create(Ref ref) {
    final argument = this.argument as (String, String);
    return programLodgingHotelBoard(ref, argument.$1, argument.$2);
  }

  @override
  bool operator ==(Object other) {
    return other is ProgramLodgingHotelBoardProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$programLodgingHotelBoardHash() =>
    r'0379d73464073b92247effa5cf953f414cdfa4b1';

/// One hotel's read-only room list, read once each time the view opens.
/// Live-only: it is never written to the offline snapshot store.

final class ProgramLodgingHotelBoardFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<ProgramLodgingHotelBoard>,
          (String, String)
        > {
  ProgramLodgingHotelBoardFamily._()
    : super(
        retry: null,
        name: r'programLodgingHotelBoardProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// One hotel's read-only room list, read once each time the view opens.
  /// Live-only: it is never written to the offline snapshot store.

  ProgramLodgingHotelBoardProvider call(String programId, String hotelId) =>
      ProgramLodgingHotelBoardProvider._(
        argument: (programId, hotelId),
        from: this,
      );

  @override
  String toString() => r'programLodgingHotelBoardProvider';
}
