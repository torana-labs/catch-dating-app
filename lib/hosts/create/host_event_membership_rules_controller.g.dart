// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_event_membership_rules_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// One event's paid-membership rules, saved independently of event edits so
/// they never touch the event policy or its booking lock.

@ProviderFor(HostEventMembershipRulesController)
final hostEventMembershipRulesControllerProvider =
    HostEventMembershipRulesControllerFamily._();

/// One event's paid-membership rules, saved independently of event edits so
/// they never touch the event policy or its booking lock.
final class HostEventMembershipRulesControllerProvider
    extends
        $AsyncNotifierProvider<
          HostEventMembershipRulesController,
          HostEventMembershipRules
        > {
  /// One event's paid-membership rules, saved independently of event edits so
  /// they never touch the event policy or its booking lock.
  HostEventMembershipRulesControllerProvider._({
    required HostEventMembershipRulesControllerFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'hostEventMembershipRulesControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() =>
      _$hostEventMembershipRulesControllerHash();

  @override
  String toString() {
    return r'hostEventMembershipRulesControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  HostEventMembershipRulesController create() =>
      HostEventMembershipRulesController();

  @override
  bool operator ==(Object other) {
    return other is HostEventMembershipRulesControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostEventMembershipRulesControllerHash() =>
    r'4a7537083b2ef3318bf969d7c14ca18de6d06fd2';

/// One event's paid-membership rules, saved independently of event edits so
/// they never touch the event policy or its booking lock.

final class HostEventMembershipRulesControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          HostEventMembershipRulesController,
          AsyncValue<HostEventMembershipRules>,
          HostEventMembershipRules,
          FutureOr<HostEventMembershipRules>,
          String
        > {
  HostEventMembershipRulesControllerFamily._()
    : super(
        retry: null,
        name: r'hostEventMembershipRulesControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// One event's paid-membership rules, saved independently of event edits so
  /// they never touch the event policy or its booking lock.

  HostEventMembershipRulesControllerProvider call(String eventId) =>
      HostEventMembershipRulesControllerProvider._(
        argument: eventId,
        from: this,
      );

  @override
  String toString() => r'hostEventMembershipRulesControllerProvider';
}

/// One event's paid-membership rules, saved independently of event edits so
/// they never touch the event policy or its booking lock.

abstract class _$HostEventMembershipRulesController
    extends $AsyncNotifier<HostEventMembershipRules> {
  late final _$args = ref.$arg as String;
  String get eventId => _$args;

  FutureOr<HostEventMembershipRules> build(String eventId);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<
              AsyncValue<HostEventMembershipRules>,
              HostEventMembershipRules
            >;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AsyncValue<HostEventMembershipRules>,
                HostEventMembershipRules
              >,
              AsyncValue<HostEventMembershipRules>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}
