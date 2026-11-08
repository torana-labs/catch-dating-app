// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_close_out_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(eventCloseOutRepository)
final eventCloseOutRepositoryProvider = EventCloseOutRepositoryProvider._();

final class EventCloseOutRepositoryProvider
    extends
        $FunctionalProvider<
          EventCloseOutRepository,
          EventCloseOutRepository,
          EventCloseOutRepository
        >
    with $Provider<EventCloseOutRepository> {
  EventCloseOutRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'eventCloseOutRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$eventCloseOutRepositoryHash();

  @$internal
  @override
  $ProviderElement<EventCloseOutRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  EventCloseOutRepository create(Ref ref) {
    return eventCloseOutRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(EventCloseOutRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<EventCloseOutRepository>(value),
    );
  }
}

String _$eventCloseOutRepositoryHash() =>
    r'af4d37c47d8477f7269fc618c1576467a74adbed';

/// The event's close-out, by listener.

@ProviderFor(watchEventCloseOut)
final watchEventCloseOutProvider = WatchEventCloseOutFamily._();

/// The event's close-out, by listener.

final class WatchEventCloseOutProvider
    extends
        $FunctionalProvider<
          AsyncValue<EventCloseOut>,
          EventCloseOut,
          Stream<EventCloseOut>
        >
    with $FutureModifier<EventCloseOut>, $StreamProvider<EventCloseOut> {
  /// The event's close-out, by listener.
  WatchEventCloseOutProvider._({
    required WatchEventCloseOutFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchEventCloseOutProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchEventCloseOutHash();

  @override
  String toString() {
    return r'watchEventCloseOutProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<EventCloseOut> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<EventCloseOut> create(Ref ref) {
    final argument = this.argument as String;
    return watchEventCloseOut(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchEventCloseOutProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchEventCloseOutHash() =>
    r'2d5ff0346746bf26344188c0cc4264ce47e0986c';

/// The event's close-out, by listener.

final class WatchEventCloseOutFamily extends $Family
    with $FunctionalFamilyOverride<Stream<EventCloseOut>, String> {
  WatchEventCloseOutFamily._()
    : super(
        retry: null,
        name: r'watchEventCloseOutProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The event's close-out, by listener.

  WatchEventCloseOutProvider call(String eventId) =>
      WatchEventCloseOutProvider._(argument: eventId, from: this);

  @override
  String toString() => r'watchEventCloseOutProvider';
}
