// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_event_staff_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(hostEventStaffRepository)
final hostEventStaffRepositoryProvider = HostEventStaffRepositoryProvider._();

final class HostEventStaffRepositoryProvider
    extends
        $FunctionalProvider<
          HostEventStaffRepository,
          HostEventStaffRepository,
          HostEventStaffRepository
        >
    with $Provider<HostEventStaffRepository> {
  HostEventStaffRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostEventStaffRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostEventStaffRepositoryHash();

  @$internal
  @override
  $ProviderElement<HostEventStaffRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostEventStaffRepository create(Ref ref) {
    return hostEventStaffRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostEventStaffRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostEventStaffRepository>(value),
    );
  }
}

String _$hostEventStaffRepositoryHash() =>
    r'ea9d8514f8dabbe2ff01d10f1a7d693430da9cb6';

@ProviderFor(hostOperatorEvent)
final hostOperatorEventProvider = HostOperatorEventFamily._();

final class HostOperatorEventProvider
    extends
        $FunctionalProvider<
          AsyncValue<HostOperatorEvent>,
          HostOperatorEvent,
          Stream<HostOperatorEvent>
        >
    with
        $FutureModifier<HostOperatorEvent>,
        $StreamProvider<HostOperatorEvent> {
  HostOperatorEventProvider._({
    required HostOperatorEventFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'hostOperatorEventProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostOperatorEventHash();

  @override
  String toString() {
    return r'hostOperatorEventProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<HostOperatorEvent> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<HostOperatorEvent> create(Ref ref) {
    final argument = this.argument as String;
    return hostOperatorEvent(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is HostOperatorEventProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostOperatorEventHash() => r'f4211fdfa7ba6bd7e68c6b8c8d09df4334287b26';

final class HostOperatorEventFamily extends $Family
    with $FunctionalFamilyOverride<Stream<HostOperatorEvent>, String> {
  HostOperatorEventFamily._()
    : super(
        retry: null,
        name: r'hostOperatorEventProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  HostOperatorEventProvider call(String eventId) =>
      HostOperatorEventProvider._(argument: eventId, from: this);

  @override
  String toString() => r'hostOperatorEventProvider';
}

@ProviderFor(hostOperatorOrganizerManagerIds)
final hostOperatorOrganizerManagerIdsProvider =
    HostOperatorOrganizerManagerIdsFamily._();

final class HostOperatorOrganizerManagerIdsProvider
    extends
        $FunctionalProvider<
          AsyncValue<Set<String>?>,
          Set<String>?,
          Stream<Set<String>?>
        >
    with $FutureModifier<Set<String>?>, $StreamProvider<Set<String>?> {
  HostOperatorOrganizerManagerIdsProvider._({
    required HostOperatorOrganizerManagerIdsFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'hostOperatorOrganizerManagerIdsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostOperatorOrganizerManagerIdsHash();

  @override
  String toString() {
    return r'hostOperatorOrganizerManagerIdsProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<Set<String>?> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<Set<String>?> create(Ref ref) {
    final argument = this.argument as String;
    return hostOperatorOrganizerManagerIds(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is HostOperatorOrganizerManagerIdsProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostOperatorOrganizerManagerIdsHash() =>
    r'888c030cc3a7a98d36f1282cec8c5bf05808884b';

final class HostOperatorOrganizerManagerIdsFamily extends $Family
    with $FunctionalFamilyOverride<Stream<Set<String>?>, String> {
  HostOperatorOrganizerManagerIdsFamily._()
    : super(
        retry: null,
        name: r'hostOperatorOrganizerManagerIdsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  HostOperatorOrganizerManagerIdsProvider call(String organizerId) =>
      HostOperatorOrganizerManagerIdsProvider._(
        argument: organizerId,
        from: this,
      );

  @override
  String toString() => r'hostOperatorOrganizerManagerIdsProvider';
}

@ProviderFor(hostOwnEventStaffGrant)
final hostOwnEventStaffGrantProvider = HostOwnEventStaffGrantFamily._();

final class HostOwnEventStaffGrantProvider
    extends
        $FunctionalProvider<
          AsyncValue<HostOwnEventStaffGrant?>,
          HostOwnEventStaffGrant?,
          Stream<HostOwnEventStaffGrant?>
        >
    with
        $FutureModifier<HostOwnEventStaffGrant?>,
        $StreamProvider<HostOwnEventStaffGrant?> {
  HostOwnEventStaffGrantProvider._({
    required HostOwnEventStaffGrantFamily super.from,
    required ({String eventId, String uid}) super.argument,
  }) : super(
         retry: null,
         name: r'hostOwnEventStaffGrantProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostOwnEventStaffGrantHash();

  @override
  String toString() {
    return r'hostOwnEventStaffGrantProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $StreamProviderElement<HostOwnEventStaffGrant?> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<HostOwnEventStaffGrant?> create(Ref ref) {
    final argument = this.argument as ({String eventId, String uid});
    return hostOwnEventStaffGrant(
      ref,
      eventId: argument.eventId,
      uid: argument.uid,
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostOwnEventStaffGrantProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostOwnEventStaffGrantHash() =>
    r'2a740a3c5c85afafefaaf3edbbb3f255fdfce721';

final class HostOwnEventStaffGrantFamily extends $Family
    with
        $FunctionalFamilyOverride<
          Stream<HostOwnEventStaffGrant?>,
          ({String eventId, String uid})
        > {
  HostOwnEventStaffGrantFamily._()
    : super(
        retry: null,
        name: r'hostOwnEventStaffGrantProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  HostOwnEventStaffGrantProvider call({
    required String eventId,
    required String uid,
  }) => HostOwnEventStaffGrantProvider._(
    argument: (eventId: eventId, uid: uid),
    from: this,
  );

  @override
  String toString() => r'hostOwnEventStaffGrantProvider';
}

/// Live operator access for the signed-in account, from three documents the
/// rules already expose: the event, its organizer and the caller's own grant.
/// Rebuilds when any of them changes, and again when a grant expires.

@ProviderFor(hostEventOperatorAccess)
final hostEventOperatorAccessProvider = HostEventOperatorAccessFamily._();

/// Live operator access for the signed-in account, from three documents the
/// rules already expose: the event, its organizer and the caller's own grant.
/// Rebuilds when any of them changes, and again when a grant expires.

final class HostEventOperatorAccessProvider
    extends
        $FunctionalProvider<
          AsyncValue<HostEventOperatorAccess>,
          HostEventOperatorAccess,
          FutureOr<HostEventOperatorAccess>
        >
    with
        $FutureModifier<HostEventOperatorAccess>,
        $FutureProvider<HostEventOperatorAccess> {
  /// Live operator access for the signed-in account, from three documents the
  /// rules already expose: the event, its organizer and the caller's own grant.
  /// Rebuilds when any of them changes, and again when a grant expires.
  HostEventOperatorAccessProvider._({
    required HostEventOperatorAccessFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'hostEventOperatorAccessProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostEventOperatorAccessHash();

  @override
  String toString() {
    return r'hostEventOperatorAccessProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<HostEventOperatorAccess> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<HostEventOperatorAccess> create(Ref ref) {
    final argument = this.argument as String;
    return hostEventOperatorAccess(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is HostEventOperatorAccessProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostEventOperatorAccessHash() =>
    r'02db1c84124037b3e9496e98c46929dfaa167991';

/// Live operator access for the signed-in account, from three documents the
/// rules already expose: the event, its organizer and the caller's own grant.
/// Rebuilds when any of them changes, and again when a grant expires.

final class HostEventOperatorAccessFamily extends $Family
    with $FunctionalFamilyOverride<FutureOr<HostEventOperatorAccess>, String> {
  HostEventOperatorAccessFamily._()
    : super(
        retry: null,
        name: r'hostEventOperatorAccessProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Live operator access for the signed-in account, from three documents the
  /// rules already expose: the event, its organizer and the caller's own grant.
  /// Rebuilds when any of them changes, and again when a grant expires.

  HostEventOperatorAccessProvider call(String eventId) =>
      HostEventOperatorAccessProvider._(argument: eventId, from: this);

  @override
  String toString() => r'hostEventOperatorAccessProvider';
}
