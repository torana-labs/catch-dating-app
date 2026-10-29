import 'package:catch_dating_app/contexts/payments/data/host_membership_admin_repository.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_membership_admin.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_event_membership_rules_controller.g.dart';

/// One event's paid-membership rules, saved independently of event edits so
/// they never touch the event policy or its booking lock.
@riverpod
class HostEventMembershipRulesController
    extends _$HostEventMembershipRulesController {
  static final saveMutation = Mutation<void>();

  @override
  Future<HostEventMembershipRules> build(String eventId) =>
      ref.watch(hostMembershipAdminRepositoryProvider).eventRules(eventId);

  Future<void> save({
    required List<HostEventMemberPriceOverride> overrides,
    required int? earlyAccessHours,
    required bool membersOnly,
  }) async {
    final current = await future;
    final repository = ref.read(hostMembershipAdminRepositoryProvider);
    state = AsyncData(
      overrides.isEmpty && earlyAccessHours == null && !membersOnly
          ? await repository.clearEventRules(eventId)
          : await repository.saveEventRules(
              eventId: eventId,
              overrides: overrides,
              earlyAccessHours: earlyAccessHours,
              membersOnly: membersOnly,
              expectedRevision: current.revision,
            ),
    );
  }
}
