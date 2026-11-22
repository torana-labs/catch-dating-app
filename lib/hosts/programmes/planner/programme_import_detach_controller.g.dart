// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'programme_import_detach_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Whether the viewer may detach a journey from its travel party: the
/// coordinator duty or the programme owner, as `detachProgramTravelLeg`
/// requires. The guest list check itself needs only guest relations, so a
/// planner can see a party-blocked row without being able to clear it.

@ProviderFor(hostProgrammeImportCanDetach)
final hostProgrammeImportCanDetachProvider =
    HostProgrammeImportCanDetachFamily._();

/// Whether the viewer may detach a journey from its travel party: the
/// coordinator duty or the programme owner, as `detachProgramTravelLeg`
/// requires. The guest list check itself needs only guest relations, so a
/// planner can see a party-blocked row without being able to clear it.

final class HostProgrammeImportCanDetachProvider
    extends $FunctionalProvider<bool, bool, bool>
    with $Provider<bool> {
  /// Whether the viewer may detach a journey from its travel party: the
  /// coordinator duty or the programme owner, as `detachProgramTravelLeg`
  /// requires. The guest list check itself needs only guest relations, so a
  /// planner can see a party-blocked row without being able to clear it.
  HostProgrammeImportCanDetachProvider._({
    required HostProgrammeImportCanDetachFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'hostProgrammeImportCanDetachProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostProgrammeImportCanDetachHash();

  @override
  String toString() {
    return r'hostProgrammeImportCanDetachProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $ProviderElement<bool> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  bool create(Ref ref) {
    final argument = this.argument as String;
    return hostProgrammeImportCanDetach(ref, argument);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(bool value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<bool>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostProgrammeImportCanDetachProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostProgrammeImportCanDetachHash() =>
    r'a4b3b1f2d4528124cea109a8724a90b0a95f29e0';

/// Whether the viewer may detach a journey from its travel party: the
/// coordinator duty or the programme owner, as `detachProgramTravelLeg`
/// requires. The guest list check itself needs only guest relations, so a
/// planner can see a party-blocked row without being able to clear it.

final class HostProgrammeImportCanDetachFamily extends $Family
    with $FunctionalFamilyOverride<bool, String> {
  HostProgrammeImportCanDetachFamily._()
    : super(
        retry: null,
        name: r'hostProgrammeImportCanDetachProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Whether the viewer may detach a journey from its travel party: the
  /// coordinator duty or the programme owner, as `detachProgramTravelLeg`
  /// requires. The guest list check itself needs only guest relations, so a
  /// planner can see a party-blocked row without being able to clear it.

  HostProgrammeImportCanDetachProvider call(String programId) =>
      HostProgrammeImportCanDetachProvider._(argument: programId, from: this);

  @override
  String toString() => r'hostProgrammeImportCanDetachProvider';
}

/// Detaching a journey the guest list check found blocked by its travel
/// party: one `detachProgramTravelLeg` command, fenced by the revision the
/// check returned. It invalidates no read: the arrivals and trips listeners
/// deliver the change, and the import screen checks the list again.

@ProviderFor(HostProgrammeImportDetachCommands)
final hostProgrammeImportDetachCommandsProvider =
    HostProgrammeImportDetachCommandsProvider._();

/// Detaching a journey the guest list check found blocked by its travel
/// party: one `detachProgramTravelLeg` command, fenced by the revision the
/// check returned. It invalidates no read: the arrivals and trips listeners
/// deliver the change, and the import screen checks the list again.
final class HostProgrammeImportDetachCommandsProvider
    extends $NotifierProvider<HostProgrammeImportDetachCommands, void> {
  /// Detaching a journey the guest list check found blocked by its travel
  /// party: one `detachProgramTravelLeg` command, fenced by the revision the
  /// check returned. It invalidates no read: the arrivals and trips listeners
  /// deliver the change, and the import screen checks the list again.
  HostProgrammeImportDetachCommandsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostProgrammeImportDetachCommandsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() =>
      _$hostProgrammeImportDetachCommandsHash();

  @$internal
  @override
  HostProgrammeImportDetachCommands create() =>
      HostProgrammeImportDetachCommands();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(void value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<void>(value),
    );
  }
}

String _$hostProgrammeImportDetachCommandsHash() =>
    r'1f73c3726ee1890ef3eb261b73f2c1e7a80a8e7f';

/// Detaching a journey the guest list check found blocked by its travel
/// party: one `detachProgramTravelLeg` command, fenced by the revision the
/// check returned. It invalidates no read: the arrivals and trips listeners
/// deliver the change, and the import screen checks the list again.

abstract class _$HostProgrammeImportDetachCommands extends $Notifier<void> {
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
