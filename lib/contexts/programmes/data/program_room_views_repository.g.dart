// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'program_room_views_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(programRoomViewsRepository)
final programRoomViewsRepositoryProvider =
    ProgramRoomViewsRepositoryProvider._();

final class ProgramRoomViewsRepositoryProvider
    extends
        $FunctionalProvider<
          ProgramRoomViewsRepository,
          ProgramRoomViewsRepository,
          ProgramRoomViewsRepository
        >
    with $Provider<ProgramRoomViewsRepository> {
  ProgramRoomViewsRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'programRoomViewsRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$programRoomViewsRepositoryHash();

  @$internal
  @override
  $ProviderElement<ProgramRoomViewsRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  ProgramRoomViewsRepository create(Ref ref) {
    return programRoomViewsRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ProgramRoomViewsRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ProgramRoomViewsRepository>(value),
    );
  }
}

String _$programRoomViewsRepositoryHash() =>
    r'0a9b84a8e13415891b53f3e54f770a6f83e885a8';

/// One hotel's room board, live: block capacity, every stay with its
/// revision, and routed guests still needing a room.

@ProviderFor(programHotelRooms)
final programHotelRoomsProvider = ProgramHotelRoomsFamily._();

/// One hotel's room board, live: block capacity, every stay with its
/// revision, and routed guests still needing a room.

final class ProgramHotelRoomsProvider
    extends
        $FunctionalProvider<
          AsyncValue<ProgramHotelRooms>,
          ProgramHotelRooms,
          Stream<ProgramHotelRooms>
        >
    with
        $FutureModifier<ProgramHotelRooms>,
        $StreamProvider<ProgramHotelRooms> {
  /// One hotel's room board, live: block capacity, every stay with its
  /// revision, and routed guests still needing a room.
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
  $StreamProviderElement<ProgramHotelRooms> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<ProgramHotelRooms> create(Ref ref) {
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

String _$programHotelRoomsHash() => r'92623d96db85a16619de4f879b6a43bb314aa690';

/// One hotel's room board, live: block capacity, every stay with its
/// revision, and routed guests still needing a room.

final class ProgramHotelRoomsFamily extends $Family
    with
        $FunctionalFamilyOverride<Stream<ProgramHotelRooms>, (String, String)> {
  ProgramHotelRoomsFamily._()
    : super(
        retry: null,
        name: r'programHotelRoomsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// One hotel's room board, live: block capacity, every stay with its
  /// revision, and routed guests still needing a room.

  ProgramHotelRoomsProvider call(String programId, String hotelId) =>
      ProgramHotelRoomsProvider._(argument: (programId, hotelId), from: this);

  @override
  String toString() => r'programHotelRoomsProvider';
}
