// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_calendar_links.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(nativeCalendarLauncher)
final nativeCalendarLauncherProvider = NativeCalendarLauncherProvider._();

final class NativeCalendarLauncherProvider
    extends
        $FunctionalProvider<
          NativeCalendarLauncher,
          NativeCalendarLauncher,
          NativeCalendarLauncher
        >
    with $Provider<NativeCalendarLauncher> {
  NativeCalendarLauncherProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'nativeCalendarLauncherProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$nativeCalendarLauncherHash();

  @$internal
  @override
  $ProviderElement<NativeCalendarLauncher> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  NativeCalendarLauncher create(Ref ref) {
    return nativeCalendarLauncher(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(NativeCalendarLauncher value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<NativeCalendarLauncher>(value),
    );
  }
}

String _$nativeCalendarLauncherHash() =>
    r'e50281a01f2799732c947bb346272758dc8dd0e5';

@ProviderFor(eventCalendarController)
final eventCalendarControllerProvider = EventCalendarControllerProvider._();

final class EventCalendarControllerProvider
    extends
        $FunctionalProvider<
          EventCalendarController,
          EventCalendarController,
          EventCalendarController
        >
    with $Provider<EventCalendarController> {
  EventCalendarControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'eventCalendarControllerProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$eventCalendarControllerHash();

  @$internal
  @override
  $ProviderElement<EventCalendarController> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  EventCalendarController create(Ref ref) {
    return eventCalendarController(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(EventCalendarController value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<EventCalendarController>(value),
    );
  }
}

String _$eventCalendarControllerHash() =>
    r'7a189f7cd79d9cb39b04a8c665ec82eabe6abe7b';
