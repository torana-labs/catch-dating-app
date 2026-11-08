// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'live_step_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Pause and Resume for the live console's active step, each a
/// `controlEventSuccessLive` action fenced on the plan's live-control
/// revision. Repeating either replays on the server. Neither invalidates a
/// read: the plan listener delivers the paused state.

@ProviderFor(HostLiveStepCommands)
final hostLiveStepCommandsProvider = HostLiveStepCommandsProvider._();

/// Pause and Resume for the live console's active step, each a
/// `controlEventSuccessLive` action fenced on the plan's live-control
/// revision. Repeating either replays on the server. Neither invalidates a
/// read: the plan listener delivers the paused state.
final class HostLiveStepCommandsProvider
    extends $NotifierProvider<HostLiveStepCommands, void> {
  /// Pause and Resume for the live console's active step, each a
  /// `controlEventSuccessLive` action fenced on the plan's live-control
  /// revision. Repeating either replays on the server. Neither invalidates a
  /// read: the plan listener delivers the paused state.
  HostLiveStepCommandsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostLiveStepCommandsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostLiveStepCommandsHash();

  @$internal
  @override
  HostLiveStepCommands create() => HostLiveStepCommands();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(void value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<void>(value),
    );
  }
}

String _$hostLiveStepCommandsHash() =>
    r'bc8caa64e959ffbb06933d1c1693741ea2b901b5';

/// Pause and Resume for the live console's active step, each a
/// `controlEventSuccessLive` action fenced on the plan's live-control
/// revision. Repeating either replays on the server. Neither invalidates a
/// read: the plan listener delivers the paused state.

abstract class _$HostLiveStepCommands extends $Notifier<void> {
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
