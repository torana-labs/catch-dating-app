import 'package:catch_dating_app/auth/data/auth_repository.dart';
import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/host_memberships/domain/host_membership.dart';
import 'package:catch_dating_app/host_memberships/presentation/host_membership_copy.dart';
import 'package:catch_dating_app/host_memberships/presentation/host_membership_section.dart';
import 'package:catch_dating_app/host_memberships/presentation/my_memberships_controller.dart';
import 'package:catch_dating_app/host_memberships/presentation/my_memberships_state.dart';
import 'package:catch_dating_app/host_memberships/presentation/my_memberships_view_model.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Consumer "My memberships": every paid membership, its savings and the
/// self-serve pause, resume and cancel actions.
class MyMembershipsScreen extends ConsumerWidget {
  const MyMembershipsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return CatchRouteScaffold(
      topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
        title: context.l10n.membershipsScreenTitle,
        navigation: const CatchTopBarNavigation(
          mode: CatchTopBarNavigationMode.back,
        ),
        emphasis: scrolledUnder
            ? CatchTopBarEmphasis.divided
            : CatchTopBarEmphasis.plain,
      ),
      body: CatchRouteBody.standardConstrained(
        child: CatchAsyncBoundary<String?>(
          value: ref.watch(uidProvider),
          errorContext: AppErrorContext.auth,
          onRetry: () => ref.invalidate(uidProvider),
          builder: (context, uid) => uid == null
              ? Center(
                  child: CatchEmptyState(
                    icon: CatchIcons.locked,
                    title: context.l10n.membershipsSignInTitle,
                    message: context.l10n.membershipsSignInBody,
                  ),
                )
              : MyMembershipsBody(uid: uid),
        ),
      ),
    );
  }
}

class MyMembershipsBody extends ConsumerWidget {
  const MyMembershipsBody({super.key, required this.uid});

  final String uid;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final provider = myMembershipsViewModelProvider(uid);
    final change = ref.watch(MyMembershipsController.changeMutation);
    return CatchAsyncBoundary<MyMembershipsState>(
      value: ref.watch(provider),
      errorContext: AppErrorContext.payments,
      onRetry: () => ref.invalidate(provider),
      builder: (context, state) => MyMembershipsList(
        state: state,
        now: DateTime.now(),
        pending: change.isPending,
        error: change.hasError
            ? CatchLocalizedErrorBanner.mutation(
                mutation: change,
                context: AppErrorContext.payments,
              )
            : null,
        onAction: (membership, action) async {
          if (!await _confirm(context, membership, action)) return;
          if (!context.mounted) return;
          await MyMembershipsController.changeMutation.run(
            ref,
            (tx) => tx
                .get(myMembershipsControllerProvider.notifier)
                .change(membershipId: membership.id, action: action),
          );
        },
      ),
    );
  }

  /// Pause and cancel ask first; resume runs straight away.
  Future<bool> _confirm(
    BuildContext context,
    HostMembership membership,
    HostMembershipAction action,
  ) async {
    final l10n = context.l10n;
    if (action != HostMembershipAction.resume) {
      final confirmed = await showCatchConfirmDialog(
        context: context,
        copy: catchDialogCopy(l10n),
        title: action == HostMembershipAction.pause
            ? l10n.membershipsConfirmPauseTitle
            : l10n.membershipsConfirmCancelTitle,
        message: action == HostMembershipAction.pause
            ? l10n.membershipsConfirmPauseBody(planName: membership.planName)
            : l10n.membershipsConfirmCancelBody(planName: membership.planName),
        confirmLabel: action == HostMembershipAction.pause
            ? l10n.membershipsActionPause
            : l10n.membershipsActionCancel,
        danger: action == HostMembershipAction.cancelAtPeriodEnd,
      );
      return confirmed == true;
    }
    return true;
  }
}

/// Provider-free list for previews and tests.
class MyMembershipsList extends StatelessWidget {
  const MyMembershipsList({
    super.key,
    required this.state,
    required this.now,
    required this.onAction,
    this.pending = false,
    this.error,
  });

  final MyMembershipsState state;
  final DateTime now;
  final void Function(HostMembership membership, HostMembershipAction action)
  onAction;
  final bool pending;
  final Widget? error;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    if (state.isEmpty) {
      return Center(
        child: CatchEmptyState(
          icon: CatchIcons.membership,
          title: l10n.membershipsEmptyTitle,
          message: l10n.membershipsEmptyBody,
        ),
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ?error,
        CatchSection.fieldRows(
          first: true,
          child: CatchField.read(
            copy: catchFieldCopy(l10n),
            key: const ValueKey('host-membership-total-saved'),
            title: l10n.membershipsTotalSavedTitle,
            body: l10n.membershipsTotalSavedBody,
            valueText: hostMembershipPrice(state.totalSavedInPaise),
            icon: CatchIcons.wallet,
          ),
        ),
        for (final row in state.rows)
          HostMembershipSection(
            row: row,
            now: now,
            onAction: pending
                ? (_) {}
                : (action) => onAction(row.membership, action),
          ),
      ],
    );
  }
}
