import 'dart:async';

import 'package:catch_dating_app/contexts/payments/data/host_membership_admin_repository.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_membership_plan.dart';
import 'package:catch_dating_app/hosts/organizer/memberships_body.dart';
import 'package:catch_dating_app/hosts/organizer/memberships_state.dart';
import 'package:catch_dating_app/hosts/organizer/organizer_controller.dart';
import 'package:catch_dating_app/hosts/organizer/organizer_screen.dart';
import 'package:catch_dating_app/hosts/presentation/memberships/host_membership_plan_editor_sheet.dart';
import 'package:catch_dating_app/hosts/presentation/memberships/host_memberships_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// Paid memberships for one organizer: the programme, payouts, the billing
/// pause and the plans, through the existing memberships controller. A plan
/// opens the existing plan editor sheet; payouts open Payments and billing.
class MembershipsScreen extends ConsumerWidget {
  const MembershipsScreen({super.key, required this.organizerId});

  final String organizerId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final read = watchHostOrganizerScope(ref, organizerId: organizerId);
    final scope = read.scope;
    final organizer = scope?.organizer;
    final pending =
        ref.watch(HostMembershipsController.programMutation).isPending ||
        ref.watch(HostMembershipsController.planMutation).isPending;
    listenToCatchMutationErrors(
      context,
      ref,
      mutations: [
        HostMembershipsController.programMutation,
        HostMembershipsController.planMutation,
      ],
      errorContext: AppErrorContext.payments,
    );
    final Widget body;
    if (scope == null || organizer == null) {
      body = HostOrganizerScopeFallback(
        gap: read.gap,
        error: read.error,
        onRetry: () => retryHostOrganizerScope(ref),
      );
    } else {
      final provider = hostMembershipsControllerProvider(organizer.id);
      final value = catchAsyncStateFromAsyncValue(ref.watch(provider));
      body = MembershipsBody(
        state: MembershipsState(
          program: value.value?.program,
          plans: value.value?.plans ?? const <HostMembershipPlan>[],
          isOwner: scope.isOwner,
          pending: pending,
          error: value.error,
        ),
        onAction: (action) => _act(context, ref, action),
        onOpenPlan: (plan) => unawaited(_openPlan(context, plan)),
      );
    }
    return CatchRoot(
      child: CatchScreen(
        key: const ValueKey<String>('host-organizer-memberships-screen'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          title: l10n.hostMembershipsScreenTitle,
          kicker: organizer?.name,
          back: CatchTopBarBack(label: l10n.hostOrganizerBack),
        ),
        body: body,
      ),
    );
  }

  void _act(BuildContext context, WidgetRef ref, MembershipsAction action) {
    final provider = hostMembershipsControllerProvider(organizerId);
    void run(HostMembershipProgramCommand command) => unawaited(
      HostMembershipsController.programMutation
          .run(ref, (tx) => tx.get(provider.notifier).runProgram(command))
          .catchError((Object _) {
            // The mutation listener shows the error.
          }),
    );
    switch (action) {
      case MembershipsAction.enable:
        run(HostMembershipProgramCommand.enable);
      case MembershipsAction.pauseBilling:
        run(HostMembershipProgramCommand.pauseBilling);
      case MembershipsAction.resumeBilling:
        run(HostMembershipProgramCommand.resumeBilling);
      case MembershipsAction.newPlan:
        unawaited(_openPlan(context, null));
      case MembershipsAction.setUpPayouts:
        context.pushNamed(
          Routes.hostOrganizerPaymentsScreen.name,
          queryParameters: {'organizerId': organizerId},
        );
      case MembershipsAction.retry:
        ref.invalidate(provider);
    }
  }

  Future<void> _openPlan(BuildContext context, HostMembershipPlan? plan) =>
      showCatchBottomSheet<void>(
        context: context,
        builder: (_) =>
            HostMembershipPlanEditorSheet(organizerId: organizerId, plan: plan),
      );
}
