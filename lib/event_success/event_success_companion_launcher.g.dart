// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_success_companion_launcher.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(eventSuccessCompanionLaunchRegistry)
final eventSuccessCompanionLaunchRegistryProvider =
    EventSuccessCompanionLaunchRegistryProvider._();

final class EventSuccessCompanionLaunchRegistryProvider
    extends
        $FunctionalProvider<
          EventSuccessCompanionLaunchRegistry,
          EventSuccessCompanionLaunchRegistry,
          EventSuccessCompanionLaunchRegistry
        >
    with $Provider<EventSuccessCompanionLaunchRegistry> {
  EventSuccessCompanionLaunchRegistryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'eventSuccessCompanionLaunchRegistryProvider',
        isAutoDispose: false,
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
    r'5aa328c6afcfd9727644f1f47f04f5f4c2097515';
