// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_success_companion_launcher.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Session lifetime: the launch de-dupe state survives app-shell listener
/// rebuilds, so an attendance transition never relaunches the same companion
/// route, and the next account starts with none.

@ProviderFor(eventSuccessCompanionLaunchRegistry)
final eventSuccessCompanionLaunchRegistryProvider =
    EventSuccessCompanionLaunchRegistryProvider._();

/// Session lifetime: the launch de-dupe state survives app-shell listener
/// rebuilds, so an attendance transition never relaunches the same companion
/// route, and the next account starts with none.

final class EventSuccessCompanionLaunchRegistryProvider
    extends
        $FunctionalProvider<
          EventSuccessCompanionLaunchRegistry,
          EventSuccessCompanionLaunchRegistry,
          EventSuccessCompanionLaunchRegistry
        >
    with $Provider<EventSuccessCompanionLaunchRegistry> {
  /// Session lifetime: the launch de-dupe state survives app-shell listener
  /// rebuilds, so an attendance transition never relaunches the same companion
  /// route, and the next account starts with none.
  EventSuccessCompanionLaunchRegistryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'eventSuccessCompanionLaunchRegistryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() =>
      _$eventSuccessCompanionLaunchRegistryHash();

  @$internal
  @override
  $ProviderElement<EventSuccessCompanionLaunchRegistry> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  EventSuccessCompanionLaunchRegistry create(Ref ref) {
    return eventSuccessCompanionLaunchRegistry(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(EventSuccessCompanionLaunchRegistry value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<EventSuccessCompanionLaunchRegistry>(
        value,
      ),
    );
  }
}

String _$eventSuccessCompanionLaunchRegistryHash() =>
    r'45d14736c8ba753eaa3484b1b5934355e618665e';
