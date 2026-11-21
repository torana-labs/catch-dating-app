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

/// One page of a hand-picked group's people: page [page] of the group's
/// chosen contact ids, [hostSavedGroupMemberPage] at a time, each with its
/// `hostContactSummaries` row, or no name when the contact has none (merged
/// into another contact, removed or hidden).

@ProviderFor(hostSavedGroupMembers)
final hostSavedGroupMembersProvider = HostSavedGroupMembersFamily._();

/// One page of a hand-picked group's people: page [page] of the group's
/// chosen contact ids, [hostSavedGroupMemberPage] at a time, each with its
/// `hostContactSummaries` row, or no name when the contact has none (merged
/// into another contact, removed or hidden).

final class HostSavedGroupMembersProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<HostSavedGroupMember>>,
          List<HostSavedGroupMember>,
          Stream<List<HostSavedGroupMember>>
        >
    with
        $FutureModifier<List<HostSavedGroupMember>>,
        $StreamProvider<List<HostSavedGroupMember>> {
  /// One page of a hand-picked group's people: page [page] of the group's
  /// chosen contact ids, [hostSavedGroupMemberPage] at a time, each with its
  /// `hostContactSummaries` row, or no name when the contact has none (merged
  /// into another contact, removed or hidden).
  HostSavedGroupMembersProvider._({
    required HostSavedGroupMembersFamily super.from,
    required (String, String, int) super.argument,
  }) : super(
         retry: null,
         name: r'hostSavedGroupMembersProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostSavedGroupMembersHash();

  @override
  String toString() {
    return r'hostSavedGroupMembersProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $StreamProviderElement<List<HostSavedGroupMember>> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<List<HostSavedGroupMember>> create(Ref ref) {
    final argument = this.argument as (String, String, int);
    return hostSavedGroupMembers(ref, argument.$1, argument.$2, argument.$3);
  }

  @override
  bool operator ==(Object other) {
    return other is HostSavedGroupMembersProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostSavedGroupMembersHash() =>
    r'fc975a2854e1b972875b630487f41c9fd9f92dd9';

/// One page of a hand-picked group's people: page [page] of the group's
/// chosen contact ids, [hostSavedGroupMemberPage] at a time, each with its
/// `hostContactSummaries` row, or no name when the contact has none (merged
/// into another contact, removed or hidden).

final class HostSavedGroupMembersFamily extends $Family
    with
        $FunctionalFamilyOverride<
          Stream<List<HostSavedGroupMember>>,
          (String, String, int)
        > {
  HostSavedGroupMembersFamily._()
    : super(
        retry: null,
        name: r'hostSavedGroupMembersProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// One page of a hand-picked group's people: page [page] of the group's
  /// chosen contact ids, [hostSavedGroupMemberPage] at a time, each with its
  /// `hostContactSummaries` row, or no name when the contact has none (merged
  /// into another contact, removed or hidden).

  HostSavedGroupMembersProvider call(
    String organizerId,
    String audienceId,
    int page,
  ) => HostSavedGroupMembersProvider._(
    argument: (organizerId, audienceId, page),
    from: this,
  );

  @override
  String toString() => r'hostSavedGroupMembersProvider';
}

/// A saved group, composed from the group read, its preview and the
/// organizer's events (for a Went to rule's event). No [audienceId] means
/// a new group. A hand-picked group also lists its first [memberPages]
/// pages of people.

@ProviderFor(hostSavedGroupController)
final hostSavedGroupControllerProvider = HostSavedGroupControllerFamily._();

/// A saved group, composed from the group read, its preview and the
/// organizer's events (for a Went to rule's event). No [audienceId] means
/// a new group. A hand-picked group also lists its first [memberPages]
/// pages of people.

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
  /// a new group. A hand-picked group also lists its first [memberPages]
  /// pages of people.
  HostSavedGroupControllerProvider._({
    required HostSavedGroupControllerFamily super.from,
    required (String, String?, {int memberPages}) super.argument,
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
    final argument = this.argument as (String, String?, {int memberPages});
    return hostSavedGroupController(
      ref,
      argument.$1,
      argument.$2,
      memberPages: argument.memberPages,
    );
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
    r'03d8b3604757402b920eb19698e7a9f1464f013b';

/// A saved group, composed from the group read, its preview and the
/// organizer's events (for a Went to rule's event). No [audienceId] means
/// a new group. A hand-picked group also lists its first [memberPages]
/// pages of people.

final class HostSavedGroupControllerFamily extends $Family
    with
        $FunctionalFamilyOverride<
          HostSavedGroupState,
          (String, String?, {int memberPages})
        > {
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
  /// a new group. A hand-picked group also lists its first [memberPages]
  /// pages of people.

  HostSavedGroupControllerProvider call(
    String organizerId,
    String? audienceId, {
    int memberPages = 1,
  }) => HostSavedGroupControllerProvider._(
    argument: (organizerId, audienceId, memberPages: memberPages),
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
