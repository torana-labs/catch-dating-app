// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'saved_group_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Who a saved group holds now: the existing preview command run on the
/// group's current revision, with the first few people.

@ProviderFor(hostSavedGroupPreview)
final hostSavedGroupPreviewProvider = HostSavedGroupPreviewFamily._();

/// Who a saved group holds now: the existing preview command run on the
/// group's current revision, with the first few people.

final class HostSavedGroupPreviewProvider
    extends
        $FunctionalProvider<
          AsyncValue<HostSavedAudiencePreview>,
          HostSavedAudiencePreview,
          FutureOr<HostSavedAudiencePreview>
        >
    with
        $FutureModifier<HostSavedAudiencePreview>,
        $FutureProvider<HostSavedAudiencePreview> {
  /// Who a saved group holds now: the existing preview command run on the
  /// group's current revision, with the first few people.
  HostSavedGroupPreviewProvider._({
    required HostSavedGroupPreviewFamily super.from,
    required (String, String) super.argument,
  }) : super(
         retry: null,
         name: r'hostSavedGroupPreviewProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostSavedGroupPreviewHash();

  @override
  String toString() {
    return r'hostSavedGroupPreviewProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $FutureProviderElement<HostSavedAudiencePreview> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<HostSavedAudiencePreview> create(Ref ref) {
    final argument = this.argument as (String, String);
    return hostSavedGroupPreview(ref, argument.$1, argument.$2);
  }

  @override
  bool operator ==(Object other) {
    return other is HostSavedGroupPreviewProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostSavedGroupPreviewHash() =>
    r'77b4fd09e9e774e5352cd689ac4343e595f2f788';

/// Who a saved group holds now: the existing preview command run on the
/// group's current revision, with the first few people.

final class HostSavedGroupPreviewFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<HostSavedAudiencePreview>,
          (String, String)
        > {
  HostSavedGroupPreviewFamily._()
    : super(
        retry: null,
        name: r'hostSavedGroupPreviewProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Who a saved group holds now: the existing preview command run on the
  /// group's current revision, with the first few people.

  HostSavedGroupPreviewProvider call(String organizerId, String audienceId) =>
      HostSavedGroupPreviewProvider._(
        argument: (organizerId, audienceId),
        from: this,
      );

  @override
  String toString() => r'hostSavedGroupPreviewProvider';
}

/// A saved group, composed from the group read, its preview and the
/// organizer's events (for a Went to rule's event). No [audienceId] means
/// a new group.

@ProviderFor(hostSavedGroupController)
final hostSavedGroupControllerProvider = HostSavedGroupControllerFamily._();

/// A saved group, composed from the group read, its preview and the
/// organizer's events (for a Went to rule's event). No [audienceId] means
/// a new group.

final class HostSavedGroupControllerProvider
    extends
        $FunctionalProvider<
          HostSavedGroupState,
          HostSavedGroupState,
          HostSavedGroupState
        >
    with $Provider<HostSavedGroupState> {
  /// A saved group, composed from the group read, its preview and the
  /// organizer's events (for a Went to rule's event). No [audienceId] means
  /// a new group.
  HostSavedGroupControllerProvider._({
    required HostSavedGroupControllerFamily super.from,
    required (String, String?) super.argument,
  }) : super(
         retry: null,
         name: r'hostSavedGroupControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostSavedGroupControllerHash();

  @override
  String toString() {
    return r'hostSavedGroupControllerProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $ProviderElement<HostSavedGroupState> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostSavedGroupState create(Ref ref) {
    final argument = this.argument as (String, String?);
    return hostSavedGroupController(ref, argument.$1, argument.$2);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostSavedGroupState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostSavedGroupState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostSavedGroupControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostSavedGroupControllerHash() =>
    r'26f9784567e5d02e056e1a4d958b5cee771169f8';

/// A saved group, composed from the group read, its preview and the
/// organizer's events (for a Went to rule's event). No [audienceId] means
/// a new group.

final class HostSavedGroupControllerFamily extends $Family
    with $FunctionalFamilyOverride<HostSavedGroupState, (String, String?)> {
  HostSavedGroupControllerFamily._()
    : super(
        retry: null,
        name: r'hostSavedGroupControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// A saved group, composed from the group read, its preview and the
  /// organizer's events (for a Went to rule's event). No [audienceId] means
  /// a new group.

  HostSavedGroupControllerProvider call(
    String organizerId,
    String? audienceId,
  ) => HostSavedGroupControllerProvider._(
    argument: (organizerId, audienceId),
    from: this,
  );

  @override
  String toString() => r'hostSavedGroupControllerProvider';
}

/// The existing saved group commands: save (create or update) and delete
/// (archive), each fenced by the group's revision.

@ProviderFor(hostSavedGroupCommands)
final hostSavedGroupCommandsProvider = HostSavedGroupCommandsProvider._();

/// The existing saved group commands: save (create or update) and delete
/// (archive), each fenced by the group's revision.

final class HostSavedGroupCommandsProvider
    extends
        $FunctionalProvider<
          HostSavedGroupCommands,
          HostSavedGroupCommands,
          HostSavedGroupCommands
        >
    with $Provider<HostSavedGroupCommands> {
  /// The existing saved group commands: save (create or update) and delete
  /// (archive), each fenced by the group's revision.
  HostSavedGroupCommandsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostSavedGroupCommandsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostSavedGroupCommandsHash();

  @$internal
  @override
  $ProviderElement<HostSavedGroupCommands> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostSavedGroupCommands create(Ref ref) {
    return hostSavedGroupCommands(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostSavedGroupCommands value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostSavedGroupCommands>(value),
    );
  }
}

String _$hostSavedGroupCommandsHash() =>
    r'aeafc48f89dd198d580c32c2af6a0e2d2ba7bc8c';
