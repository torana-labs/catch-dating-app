import 'package:catch_dating_app/contexts/payments/data/host_membership_admin_repository.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_membership_plan.dart';
import 'package:catch_dating_app/hosts/domain/host_membership_admin.dart';
import 'package:catch_dating_app/hosts/presentation/memberships/host_memberships_state.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_memberships_controller.g.dart';

/// Organizer program and plan administration for the Memberships spoke.
@riverpod
class HostMembershipsController extends _$HostMembershipsController {
  static final programMutation = Mutation<void>();
  static final planMutation = Mutation<void>();

  @override
  Future<HostMembershipsState> build(String organizerId) async {
    final repository = ref.watch(hostMembershipAdminRepositoryProvider);
    final program = await repository.program(organizerId: organizerId);
    final plans = await repository.listPlans(organizerId);
    return HostMembershipsState(program: program, plans: plans);
  }

  HostMembershipAdminRepository get _repository =>
      ref.read(hostMembershipAdminRepositoryProvider);

  Future<void> runProgram(HostMembershipProgramCommand command) async {
    final program = await _repository.program(
      organizerId: organizerId,
      command: command,
    );
    final current = await future;
    state = AsyncData(current.withProgram(program));
  }

  Future<void> savePlan({
    required HostMembershipPlanDraft draft,
    HostMembershipPlan? existing,
  }) async {
    final plans = await _repository.savePlan(
      organizerId: organizerId,
      draft: draft,
      planId: existing?.id,
      expectedRevision: existing?.revision,
    );
    final current = await future;
    state = AsyncData(current.withPlans(plans));
  }

  Future<void> publishPlan(String planId) async {
    final plans = await _repository.publishPlan(
      organizerId: organizerId,
      planId: planId,
    );
    final current = await future;
    state = AsyncData(current.withPlans(plans));
  }

  Future<void> archivePlan(String planId) async {
    final plans = await _repository.archivePlan(
      organizerId: organizerId,
      planId: planId,
    );
    final current = await future;
    state = AsyncData(current.withPlans(plans));
  }
}
