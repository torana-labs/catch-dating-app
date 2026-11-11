// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'programme_planner_commands_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The planner's own commands: branding, links, messages, guest IDs, photos
/// and vendor bills. Planner screens go through this controller rather than
/// reaching into the programme repositories, as the setup screens go through
/// `ProgramWorkspaceController`.

@ProviderFor(HostProgrammePlannerCommands)
final hostProgrammePlannerCommandsProvider =
    HostProgrammePlannerCommandsProvider._();

/// The planner's own commands: branding, links, messages, guest IDs, photos
/// and vendor bills. Planner screens go through this controller rather than
/// reaching into the programme repositories, as the setup screens go through
/// `ProgramWorkspaceController`.
final class HostProgrammePlannerCommandsProvider
    extends $NotifierProvider<HostProgrammePlannerCommands, void> {
  /// The planner's own commands: branding, links, messages, guest IDs, photos
  /// and vendor bills. Planner screens go through this controller rather than
  /// reaching into the programme repositories, as the setup screens go through
  /// `ProgramWorkspaceController`.
  HostProgrammePlannerCommandsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostProgrammePlannerCommandsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostProgrammePlannerCommandsHash();

  @$internal
  @override
  HostProgrammePlannerCommands create() => HostProgrammePlannerCommands();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(void value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<void>(value),
    );
  }
}

String _$hostProgrammePlannerCommandsHash() =>
    r'04b8f138ebed405d5283ea576bf88312b9e91af2';

/// The planner's own commands: branding, links, messages, guest IDs, photos
/// and vendor bills. Planner screens go through this controller rather than
/// reaching into the programme repositories, as the setup screens go through
/// `ProgramWorkspaceController`.

abstract class _$HostProgrammePlannerCommands extends $Notifier<void> {
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
