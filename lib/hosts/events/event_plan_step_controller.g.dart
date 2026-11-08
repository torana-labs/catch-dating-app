// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_plan_step_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The run-of-show step edits the plan screen commits, each through
/// `saveEventPlanStep`. None invalidates a read: the plan listener delivers
/// the saved steps.

@ProviderFor(HostEventPlanCommands)
final hostEventPlanCommandsProvider = HostEventPlanCommandsProvider._();

/// The run-of-show step edits the plan screen commits, each through
/// `saveEventPlanStep`. None invalidates a read: the plan listener delivers
/// the saved steps.
final class HostEventPlanCommandsProvider
    extends $NotifierProvider<HostEventPlanCommands, void> {
  /// The run-of-show step edits the plan screen commits, each through
  /// `saveEventPlanStep`. None invalidates a read: the plan listener delivers
  /// the saved steps.
  HostEventPlanCommandsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostEventPlanCommandsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostEventPlanCommandsHash();

  @$internal
  @override
  HostEventPlanCommands create() => HostEventPlanCommands();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(void value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<void>(value),
    );
  }
}

String _$hostEventPlanCommandsHash() =>
    r'a538624d34ff9aaab145e260cb34376ae909eb82';

/// The run-of-show step edits the plan screen commits, each through
/// `saveEventPlanStep`. None invalidates a read: the plan listener delivers
/// the saved steps.

abstract class _$HostEventPlanCommands extends $Notifier<void> {
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
