import 'package:catch_dating_app/contexts/payments/domain/host_membership_fields.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_membership_plan.dart';
import 'package:catch_dating_app/core/backend_error_util.dart';
import 'package:catch_dating_app/core/firebase_providers.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:catch_dating_app/hosts/domain/host_membership_admin.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part '../../../hosts/data/host_membership_admin_repository.g.dart';

enum HostMembershipProgramCommand {
  get,
  enable,
  disable,
  pauseBilling,
  resumeBilling,
}

/// Organizer-manager membership administration. All reads and writes go
/// through manager-authorized callables.
class HostMembershipAdminRepository {
  const HostMembershipAdminRepository(this._functions);

  final FirebaseFunctions _functions;

  Future<HostMembershipProgramView> program({
    required String organizerId,
    HostMembershipProgramCommand command = HostMembershipProgramCommand.get,
  }) => _call(
    'manageHostMembershipProgram',
    {'action': command.name, 'organizerId': organizerId},
    HostMembershipProgramView.fromResponse,
    action: 'manage membership program',
  );

  Future<List<HostMembershipPlan>> listPlans(String organizerId) =>
      _plans({'action': 'list', 'organizerId': organizerId});

  Future<List<HostMembershipPlan>> savePlan({
    required String organizerId,
    required HostMembershipPlanDraft draft,
    String? planId,
    int? expectedRevision,
  }) => _plans({
    'action': 'save',
    'organizerId': organizerId,
    'planId': planId,
    'expectedRevision': expectedRevision,
    'plan': draft.toPayload(),
  });

  Future<List<HostMembershipPlan>> publishPlan({
    required String organizerId,
    required String planId,
  }) => _plans({
    'action': 'publish',
    'organizerId': organizerId,
    'planId': planId,
  });

  Future<List<HostMembershipPlan>> archivePlan({
    required String organizerId,
    required String planId,
  }) => _plans({
    'action': 'archive',
    'organizerId': organizerId,
    'planId': planId,
  });

  Future<HostEventMembershipRules> eventRules(String eventId) => _call(
    'manageEventMembershipRules',
    {'action': 'get', 'eventId': eventId},
    HostEventMembershipRules.fromResponse,
    action: 'read event membership rules',
  );

  Future<HostEventMembershipRules> saveEventRules({
    required String eventId,
    required List<HostEventMemberPriceOverride> overrides,
    required int? earlyAccessHours,
    required bool membersOnly,
    required int? expectedRevision,
  }) => _call(
    'manageEventMembershipRules',
    {
      'action': 'save',
      'eventId': eventId,
      'memberPriceOverrides': [
        for (final entry in overrides) entry.toPayload(),
      ],
      'earlyAccessHours': earlyAccessHours,
      'membersOnly': membersOnly,
      'expectedRevision': expectedRevision,
    },
    HostEventMembershipRules.fromResponse,
    action: 'save event membership rules',
  );

  Future<HostEventMembershipRules> clearEventRules(String eventId) => _call(
    'manageEventMembershipRules',
    {'action': 'clear', 'eventId': eventId},
    HostEventMembershipRules.fromResponse,
    action: 'clear event membership rules',
  );

  Future<List<HostMembershipPlan>> _plans(Map<String, Object?> payload) =>
      _call('manageHostMembershipPlans', payload, (data) {
        final plans = membershipMap(data, 'membership plans')['plans'];
        if (plans is! List<Object?>) {
          throw const FormatException('Invalid membership plans.');
        }
        return List<HostMembershipPlan>.unmodifiable(
          plans.map((item) {
            final plan = membershipMap(item, 'plan');
            return HostMembershipPlan.fromMap(
              membershipString(plan, 'planId'),
              plan,
            );
          }),
        );
      }, action: 'manage membership plans');

  Future<T> _call<T>(
    String name,
    Map<String, Object?> payload,
    T Function(Object? data) parse, {
    required String action,
  }) => withBackendErrorContext(
    () async {
      final result = await _functions
          .httpsCallable(name)
          .call<Object?>(payload);
      return parse(result.data);
    },
    context: BackendErrorContext(
      service: BackendService.functions,
      action: action,
      resource: name,
    ),
  );
}

@riverpod
HostMembershipAdminRepository hostMembershipAdminRepository(Ref ref) =>
    HostMembershipAdminRepository(ref.watch(firebaseFunctionsProvider));
