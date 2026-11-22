// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'guest_safety_commands_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The guest list safety commands: report a guest to Catch, stop them
/// booking the organiser events, and let them back. Blocking and letting
/// back refresh the organiser block list.

@ProviderFor(HostGuestSafetyCommands)
final hostGuestSafetyCommandsProvider = HostGuestSafetyCommandsProvider._();

/// The guest list safety commands: report a guest to Catch, stop them
/// booking the organiser events, and let them back. Blocking and letting
/// back refresh the organiser block list.
final class HostGuestSafetyCommandsProvider
    extends $NotifierProvider<HostGuestSafetyCommands, void> {
  /// The guest list safety commands: report a guest to Catch, stop them
  /// booking the organiser events, and let them back. Blocking and letting
  /// back refresh the organiser block list.
  HostGuestSafetyCommandsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostGuestSafetyCommandsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostGuestSafetyCommandsHash();

  @$internal
  @override
  HostGuestSafetyCommands create() => HostGuestSafetyCommands();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(void value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<void>(value),
    );
  }
}

String _$hostGuestSafetyCommandsHash() =>
    r'3ccca068c917e0967bf6cc40176b842df6c6c317';

/// The guest list safety commands: report a guest to Catch, stop them
/// booking the organiser events, and let them back. Blocking and letting
/// back refresh the organiser block list.

abstract class _$HostGuestSafetyCommands extends $Notifier<void> {
  void build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<void, void>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<void, void>,
              void,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, build);
  }
}
