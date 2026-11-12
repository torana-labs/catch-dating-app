// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_commands_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The commands the event screens commit. Every one is an existing
/// command; none invalidates a read, since each screen reads through a
/// listener that delivers the result.

@ProviderFor(HostEventCommands)
final hostEventCommandsProvider = HostEventCommandsProvider._();

/// The commands the event screens commit. Every one is an existing
/// command; none invalidates a read, since each screen reads through a
/// listener that delivers the result.
final class HostEventCommandsProvider
    extends $NotifierProvider<HostEventCommands, void> {
  /// The commands the event screens commit. Every one is an existing
  /// command; none invalidates a read, since each screen reads through a
  /// listener that delivers the result.
  HostEventCommandsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostEventCommandsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostEventCommandsHash();

  @$internal
  @override
  HostEventCommands create() => HostEventCommands();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(void value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<void>(value),
    );
  }
}

String _$hostEventCommandsHash() => r'22e3ba8b2151d5fb72340cf67ceb45d74f9cf72d';

/// The commands the event screens commit. Every one is an existing
/// command; none invalidates a read, since each screen reads through a
/// listener that delivers the result.

abstract class _$HostEventCommands extends $Notifier<void> {
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
