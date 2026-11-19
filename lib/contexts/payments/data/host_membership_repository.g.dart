// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_membership_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(hostMembershipRepository)
final hostMembershipRepositoryProvider = HostMembershipRepositoryProvider._();

final class HostMembershipRepositoryProvider
    extends
        $FunctionalProvider<
          HostMembershipRepository,
          HostMembershipRepository,
          HostMembershipRepository
        >
    with $Provider<HostMembershipRepository> {
  HostMembershipRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostMembershipRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostMembershipRepositoryHash();

  @$internal
  @override
  $ProviderElement<HostMembershipRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostMembershipRepository create(Ref ref) {
    return hostMembershipRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostMembershipRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostMembershipRepository>(value),
    );
  }
}

String _$hostMembershipRepositoryHash() =>
    r'bc9081a688390c03520607cbdf69bd524ad1c94a';

@ProviderFor(watchMyHostMemberships)
final watchMyHostMembershipsProvider = WatchMyHostMembershipsFamily._();

final class WatchMyHostMembershipsProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<HostMembership>>,
          List<HostMembership>,
          Stream<List<HostMembership>>
        >
    with
        $FutureModifier<List<HostMembership>>,
        $StreamProvider<List<HostMembership>> {
  WatchMyHostMembershipsProvider._({
    required WatchMyHostMembershipsFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchMyHostMembershipsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchMyHostMembershipsHash();

  @override
  String toString() {
    return r'watchMyHostMembershipsProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<HostMembership>> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<List<HostMembership>> create(Ref ref) {
    final argument = this.argument as String;
    return watchMyHostMemberships(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchMyHostMembershipsProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchMyHostMembershipsHash() =>
    r'4d9875f1876d8fd0ddd6f2d9e7212de6460dd58b';

final class WatchMyHostMembershipsFamily extends $Family
    with $FunctionalFamilyOverride<Stream<List<HostMembership>>, String> {
  WatchMyHostMembershipsFamily._()
    : super(
        retry: null,
        name: r'watchMyHostMembershipsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchMyHostMembershipsProvider call(String uid) =>
      WatchMyHostMembershipsProvider._(argument: uid, from: this);

  @override
  String toString() => r'watchMyHostMembershipsProvider';
}

@ProviderFor(watchUpcomingHostMembershipBenefitUses)
final watchUpcomingHostMembershipBenefitUsesProvider =
    WatchUpcomingHostMembershipBenefitUsesFamily._();

final class WatchUpcomingHostMembershipBenefitUsesProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<HostMembershipBenefitUse>>,
          List<HostMembershipBenefitUse>,
          Stream<List<HostMembershipBenefitUse>>
        >
    with
        $FutureModifier<List<HostMembershipBenefitUse>>,
        $StreamProvider<List<HostMembershipBenefitUse>> {
  WatchUpcomingHostMembershipBenefitUsesProvider._({
    required WatchUpcomingHostMembershipBenefitUsesFamily super.from,
    required ({
      String uid,
      String organizerId,
      int startingAfterMillis,
      int limit,
    })
    super.argument,
  }) : super(
         retry: null,
         name: r'watchUpcomingHostMembershipBenefitUsesProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() =>
      _$watchUpcomingHostMembershipBenefitUsesHash();

  @override
  String toString() {
    return r'watchUpcomingHostMembershipBenefitUsesProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $StreamProviderElement<List<HostMembershipBenefitUse>> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<List<HostMembershipBenefitUse>> create(Ref ref) {
    final argument =
        this.argument
            as ({
              String uid,
              String organizerId,
              int startingAfterMillis,
              int limit,
            });
    return watchUpcomingHostMembershipBenefitUses(
      ref,
      uid: argument.uid,
      organizerId: argument.organizerId,
      startingAfterMillis: argument.startingAfterMillis,
      limit: argument.limit,
    );
  }

  @override
  bool operator ==(Object other) {
    return other is WatchUpcomingHostMembershipBenefitUsesProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchUpcomingHostMembershipBenefitUsesHash() =>
    r'88e5e048b3167d01f1a589f0f671b9002c9a4684';

final class WatchUpcomingHostMembershipBenefitUsesFamily extends $Family
    with
        $FunctionalFamilyOverride<
          Stream<List<HostMembershipBenefitUse>>,
          ({String uid, String organizerId, int startingAfterMillis, int limit})
        > {
  WatchUpcomingHostMembershipBenefitUsesFamily._()
    : super(
        retry: null,
        name: r'watchUpcomingHostMembershipBenefitUsesProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchUpcomingHostMembershipBenefitUsesProvider call({
    required String uid,
    required String organizerId,
    required int startingAfterMillis,
    required int limit,
  }) => WatchUpcomingHostMembershipBenefitUsesProvider._(
    argument: (
      uid: uid,
      organizerId: organizerId,
      startingAfterMillis: startingAfterMillis,
      limit: limit,
    ),
    from: this,
  );

  @override
  String toString() => r'watchUpcomingHostMembershipBenefitUsesProvider';
}

@ProviderFor(watchPublishedHostMembershipPlans)
final watchPublishedHostMembershipPlansProvider =
    WatchPublishedHostMembershipPlansFamily._();

final class WatchPublishedHostMembershipPlansProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<HostMembershipPlan>>,
          List<HostMembershipPlan>,
          Stream<List<HostMembershipPlan>>
        >
    with
        $FutureModifier<List<HostMembershipPlan>>,
        $StreamProvider<List<HostMembershipPlan>> {
  WatchPublishedHostMembershipPlansProvider._({
    required WatchPublishedHostMembershipPlansFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchPublishedHostMembershipPlansProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() =>
      _$watchPublishedHostMembershipPlansHash();

  @override
  String toString() {
    return r'watchPublishedHostMembershipPlansProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<HostMembershipPlan>> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<List<HostMembershipPlan>> create(Ref ref) {
    final argument = this.argument as String;
    return watchPublishedHostMembershipPlans(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchPublishedHostMembershipPlansProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchPublishedHostMembershipPlansHash() =>
    r'c9048328031a4ff36c00f6d30ba72079d1bc7478';

final class WatchPublishedHostMembershipPlansFamily extends $Family
    with $FunctionalFamilyOverride<Stream<List<HostMembershipPlan>>, String> {
  WatchPublishedHostMembershipPlansFamily._()
    : super(
        retry: null,
        name: r'watchPublishedHostMembershipPlansProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchPublishedHostMembershipPlansProvider call(String organizerId) =>
      WatchPublishedHostMembershipPlansProvider._(
        argument: organizerId,
        from: this,
      );

  @override
  String toString() => r'watchPublishedHostMembershipPlansProvider';
}

@ProviderFor(watchEventMembershipRules)
final watchEventMembershipRulesProvider = WatchEventMembershipRulesFamily._();

final class WatchEventMembershipRulesProvider
    extends
        $FunctionalProvider<
          AsyncValue<EventMembershipRules?>,
          EventMembershipRules?,
          Stream<EventMembershipRules?>
        >
    with
        $FutureModifier<EventMembershipRules?>,
        $StreamProvider<EventMembershipRules?> {
  WatchEventMembershipRulesProvider._({
    required WatchEventMembershipRulesFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchEventMembershipRulesProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchEventMembershipRulesHash();

  @override
  String toString() {
    return r'watchEventMembershipRulesProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<EventMembershipRules?> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<EventMembershipRules?> create(Ref ref) {
    final argument = this.argument as String;
    return watchEventMembershipRules(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchEventMembershipRulesProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchEventMembershipRulesHash() =>
    r'482682dedf473e4b4e7b8d9eb662b88a5d429506';

final class WatchEventMembershipRulesFamily extends $Family
    with $FunctionalFamilyOverride<Stream<EventMembershipRules?>, String> {
  WatchEventMembershipRulesFamily._()
    : super(
        retry: null,
        name: r'watchEventMembershipRulesProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchEventMembershipRulesProvider call(String eventId) =>
      WatchEventMembershipRulesProvider._(argument: eventId, from: this);

  @override
  String toString() => r'watchEventMembershipRulesProvider';
}
