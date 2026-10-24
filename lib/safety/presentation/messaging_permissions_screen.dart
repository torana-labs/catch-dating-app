import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/safety/domain/messaging_permission.dart';
import 'package:catch_dating_app/safety/presentation/messaging_permissions_controller.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class MessagingPermissionsScreen extends ConsumerWidget {
  const MessagingPermissionsScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) => CatchRouteScaffold(
    topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
      title: context.l10n.messagingPermissionsTitle,
      navigation: const CatchTopBarNavigation(
        mode: CatchTopBarNavigationMode.back,
      ),
      emphasis: scrolledUnder
          ? CatchTopBarEmphasis.divided
          : CatchTopBarEmphasis.plain,
    ),
    body: CatchRouteBody.standardConstrained(
      child: CatchAsyncBoundary<MessagingPermissionsState>(
        value: ref.watch(messagingPermissionsControllerProvider),
        retainDataOn: const {},
        onRetry: () => ref.invalidate(messagingPermissionsControllerProvider),
        builder: (context, state) => MessagingPermissionsPageBody(
          state: state,
          onRefresh: () =>
              ref.invalidate(messagingPermissionsControllerProvider),
          onLoadMore: () => ref
              .read(messagingPermissionsControllerProvider.notifier)
              .loadMore(),
          onWithdraw: (permission) => ref
              .read(messagingPermissionsControllerProvider.notifier)
              .withdraw(state.uid, permission),
          onWithdrawPurpose: (permission, purpose) => ref
              .read(messagingPermissionsControllerProvider.notifier)
              .withdraw(state.uid, permission, purpose: purpose),
        ),
      ),
    ),
  );
}

class MessagingPermissionsPageBody extends StatelessWidget {
  const MessagingPermissionsPageBody({
    super.key,
    required this.state,
    required this.onWithdraw,
    this.onWithdrawPurpose,
    required this.onRefresh,
    required this.onLoadMore,
  });
  final MessagingPermissionsState state;
  final ValueChanged<MessagingPermission> onWithdraw;
  final void Function(MessagingPermission, MessagingPermissionPurpose)?
  onWithdrawPurpose;
  final VoidCallback onRefresh;
  final VoidCallback onLoadMore;
  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        CatchText(
          l10n.messagingPermissionsDescription,
          variant: CatchTextVariant.bodyM,
          color: CatchTokens.of(context).ink,
        ),
        gapH24,
        CatchSectionList(
          emptyStateOmitted: true,
          children: [
            for (final permission in [
              state.page.catchPermission,
              ...state.page.organizers,
            ])
              CatchSection.fieldRows(
                first: true,
                footer:
                    permission.effectiveStatus ==
                        MessagingPermissionStatus.optedOut
                    ? null
                    : CatchButton(
                        key: ValueKey('withdraw-${permission.key}'),
                        label: l10n.messagingPermissionsStop,
                        variant: CatchButtonVariant.secondary,
                        fullWidth: true,
                        status: state.pendingKey == permission.key
                            ? CatchButtonStatus.loading
                            : CatchButtonStatus.idle,
                        onPressed: state.busy
                            ? null
                            : () => onWithdraw(permission),
                      ),
                children: [
                  CatchField.content(
                    copy: catchFieldCopy(l10n),
                    key: ValueKey(permission.key),
                    title: permission.organizerId == null
                        ? l10n.messagingPermissionsCatch
                        : permission.organizerName ??
                              l10n.formProfilesOrganizerFallback,
                    body: [
                      switch (permission.effectiveStatus) {
                        MessagingPermissionStatus.optedIn =>
                          l10n.messagingPermissionsOn,
                        MessagingPermissionStatus.optedOut =>
                          l10n.messagingPermissionsOff,
                        MessagingPermissionStatus.unknown =>
                          l10n.messagingPermissionsUnknown,
                      },
                      permission.organizerId == null
                          ? l10n.messagingPermissionsCatchHelp
                          : l10n.messagingPermissionsOrganizerHelp,
                    ].join('\n'),
                    titleMaxLines: 3,
                    bodyMaxLines: 10,
                  ),
                  for (final purpose in MessagingPermissionPurpose.values)
                    if (permission.purposes[purpose] case final decision?) ...[
                      CatchField.content(
                        copy: catchFieldCopy(l10n),
                        key: ValueKey('${permission.key}-${purpose.name}'),
                        title: switch (purpose) {
                          MessagingPermissionPurpose.eventOperations =>
                            l10n.messagingPermissionsOperations,
                          MessagingPermissionPurpose.marketing =>
                            permission.organizerId == null
                                ? l10n.messagingPermissionsCatchMarketing
                                : l10n.messagingPermissionsOrganizerMarketing,
                        },
                        body: switch (decision.status) {
                          MessagingPermissionStatus.optedIn =>
                            l10n.messagingPermissionsOn,
                          MessagingPermissionStatus.optedOut =>
                            l10n.messagingPermissionsOff,
                          MessagingPermissionStatus.unknown =>
                            l10n.messagingPermissionsUnknown,
                        },
                      ),
                      if (decision.status ==
                              MessagingPermissionStatus.optedIn &&
                          onWithdrawPurpose != null)
                        CatchField.action(
                          copy: catchFieldCopy(l10n),
                          key: ValueKey(
                            'withdraw-${permission.key}-${purpose.name}',
                          ),
                          title: l10n.messagingPermissionsStopPurpose,
                          onTap: state.busy
                              ? null
                              : () => onWithdrawPurpose!(permission, purpose),
                        ),
                    ],
                ],
              ),
          ],
        ),
        if (state.error case final error?) ...[
          gapH24,
          CatchLocalizedErrorState(
            error,
            mode: CatchErrorStateMode.compact,
            onRetry: state.busy ? null : onRefresh,
            retryLabel: l10n.messagingPermissionsRefresh,
          ),
        ],
        if (state.page.nextCursor != null) ...[
          gapH24,
          CatchButton(
            label: l10n.formProfilesLoadMore,
            variant: CatchButtonVariant.secondary,
            status: state.loadingMore
                ? CatchButtonStatus.loading
                : CatchButtonStatus.idle,
            onPressed: state.busy ? null : onLoadMore,
          ),
        ],
      ],
    );
  }
}
