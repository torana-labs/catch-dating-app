// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_host_photos_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(eventHostPhotosRepository)
final eventHostPhotosRepositoryProvider = EventHostPhotosRepositoryProvider._();

final class EventHostPhotosRepositoryProvider
    extends
        $FunctionalProvider<
          EventHostPhotosRepository,
          EventHostPhotosRepository,
          EventHostPhotosRepository
        >
    with $Provider<EventHostPhotosRepository> {
  EventHostPhotosRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'eventHostPhotosRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$eventHostPhotosRepositoryHash();

  @$internal
  @override
  $ProviderElement<EventHostPhotosRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  EventHostPhotosRepository create(Ref ref) {
    return eventHostPhotosRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(EventHostPhotosRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<EventHostPhotosRepository>(value),
    );
  }
}

String _$eventHostPhotosRepositoryHash() =>
    r'ec57e1f957f6612cafc10122450c3631d8a3d60c';

/// The event's shared host photos for the signed-in viewer.

@ProviderFor(eventHostPhotoAlbum)
final eventHostPhotoAlbumProvider = EventHostPhotoAlbumFamily._();

/// The event's shared host photos for the signed-in viewer.

final class EventHostPhotoAlbumProvider
    extends
        $FunctionalProvider<
          AsyncValue<EventHostPhotoAlbum>,
          EventHostPhotoAlbum,
          FutureOr<EventHostPhotoAlbum>
        >
    with
        $FutureModifier<EventHostPhotoAlbum>,
        $FutureProvider<EventHostPhotoAlbum> {
  /// The event's shared host photos for the signed-in viewer.
  EventHostPhotoAlbumProvider._({
    required EventHostPhotoAlbumFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'eventHostPhotoAlbumProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$eventHostPhotoAlbumHash();

  @override
  String toString() {
    return r'eventHostPhotoAlbumProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<EventHostPhotoAlbum> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<EventHostPhotoAlbum> create(Ref ref) {
    final argument = this.argument as String;
    return eventHostPhotoAlbum(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is EventHostPhotoAlbumProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventHostPhotoAlbumHash() =>
    r'7ec62c9fdaa21c46112c10b58cd0803e0150d4a9';

/// The event's shared host photos for the signed-in viewer.

final class EventHostPhotoAlbumFamily extends $Family
    with $FunctionalFamilyOverride<FutureOr<EventHostPhotoAlbum>, String> {
  EventHostPhotoAlbumFamily._()
    : super(
        retry: null,
        name: r'eventHostPhotoAlbumProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The event's shared host photos for the signed-in viewer.

  EventHostPhotoAlbumProvider call(String eventId) =>
      EventHostPhotoAlbumProvider._(argument: eventId, from: this);

  @override
  String toString() => r'eventHostPhotoAlbumProvider';
}
