import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_payment.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_payment_controller.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/errors/app_error_message.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Organizer payout setup: the organizer connects their own Razorpay account,
/// so guest payments for events, forms and memberships settle there, never
/// with Catch. One connection serves all three.
class HostRazorpayConnectionCard extends ConsumerWidget {
  const HostRazorpayConnectionCard({
    super.key,
    required this.organizerId,
    this.routeAccountSetup,
  });

  final String organizerId;

  /// Catch-collected Route payout setup. Shown only when the payment routing
  /// policy explicitly selects `razorpayRoute`; never offered otherwise.
  final WidgetBuilder? routeAccountSetup;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final provider = hostFormPaymentControllerProvider(organizerId);
    return CatchAsyncBoundary<HostFormPaymentSetupState>(
      value: ref.watch(provider),
      onRetry: () => ref.invalidate(provider),
      errorContext: AppErrorContext.payments,
      initialLoadTimeout: null,
      builder: (context, state) {
        final section = HostRazorpayConnectionSection(
          state: state,
          onConnect: () => ref.read(provider.notifier).connect(),
          onReconnect: () => ref.read(provider.notifier).reconnect(),
          onRefresh: () => ref.read(provider.notifier).refresh(),
          onDisconnect: (id) => ref.read(provider.notifier).disconnect(id),
        );
        final routeSetup = routeAccountSetup;
        if (routeSetup == null ||
            state.setup.collection?.throughCatch != true) {
          return section;
        }
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [section, routeSetup(context)],
        );
      },
    );
  }
}

class HostRazorpayConnectionSection extends StatelessWidget {
  const HostRazorpayConnectionSection({
    super.key,
    required this.state,
    required this.onConnect,
    required this.onReconnect,
    required this.onRefresh,
    required this.onDisconnect,
  });

  final HostFormPaymentSetupState state;
  final VoidCallback onConnect;
  final VoidCallback onReconnect;
  final VoidCallback onRefresh;
  final ValueChanged<String> onDisconnect;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final setup = state.setup;
    final connections = setup.liveConnections;
    final connection = setup.razorpayConnectionState;
    final ready = connection == HostRazorpayConnectionState.ready;
    final needsReconnect =
        connection == HostRazorpayConnectionState.needsReconnect;
    return CatchSection.fieldRows(
      title: l10n.hostsHostPaymentAccountCardTitlePayouts,
      trailing: CatchBadge.functional(
        label: ready
            ? l10n.hostsHostPaymentAccountCardVisiblecopyReady
            : needsReconnect
            ? l10n.hostPayoutsRazorpayNeedsReconnect
            : l10n.hostsHostPaymentAccountCardVisiblecopyNotSetUp,
        tone: ready ? CatchBadgeTone.success : CatchBadgeTone.warning,
      ),
      children: [
        CatchField.content(
          copy: catchFieldCopy(l10n),
          title: l10n.hostPayoutsRazorpayIntroTitle,
          body: l10n.hostPayoutsRazorpayIntroBody,
          bodyMaxLines: 12,
          icon: CatchIcons.payment,
        ),
        if (!setup.available)
          CatchField.content(
            copy: catchFieldCopy(l10n),
            title: l10n.hostFormPaymentConnect,
            body: l10n.hostPayoutsRazorpayUnavailable,
            bodyMaxLines: 12,
          )
        else ...[
          for (final connection in connections) ...[
            CatchField.read(
              copy: catchFieldCopy(l10n),
              title: connection.accountId ?? l10n.hostFormPaymentConnect,
              body:
                  '${hostRazorpayConnectionStatusLabel(l10n, connection)} · '
                  '${connection.mode == HostFormPaymentMode.test ? l10n.hostFormPaymentTest : l10n.hostFormPaymentLive}',
              bodyMaxLines: 4,
            ),
            CatchField.action(
              copy: catchFieldCopy(l10n),
              title: l10n.hostFormPaymentDisconnect,
              onTap: state.pending
                  ? null
                  : () => _confirmDisconnect(context, connection.connectionId),
            ),
          ],
          // A connection that cannot take payments is replaced, not added to:
          // event checkout needs exactly one connected merchant.
          if (connections.isNotEmpty && !ready)
            CatchField.action(
              copy: catchFieldCopy(l10n),
              title: l10n.hostPayoutsRazorpayReconnectTitle,
              body: needsReconnect
                  ? l10n.hostPayoutsRazorpayReconnectBody
                  : l10n.hostPayoutsRazorpayConnectingBody,
              bodyMaxLines: 12,
              icon: CatchIcons.openExternal,
              status: state.pending
                  ? CatchFieldStatus.saving
                  : CatchFieldStatus.idle,
              onTap: state.pending ? null : onReconnect,
            ),
          // Event checkout needs exactly one connected merchant, so a second
          // connection is only offered after the current one is disconnected.
          if (connections.isEmpty) ...[
            CatchField.content(
              copy: catchFieldCopy(l10n),
              title: l10n.hostPayoutsRazorpayNoAccountTitle,
              body: l10n.hostPayoutsRazorpayNoAccountBody,
              bodyMaxLines: 12,
            ),
            CatchField.content(
              copy: catchFieldCopy(l10n),
              title: l10n.hostPayoutsRazorpayPermissionsTitle,
              body: l10n.hostPayoutsRazorpayConnectHelp,
              bodyMaxLines: 20,
            ),
            CatchField.action(
              copy: catchFieldCopy(l10n),
              title: l10n.hostFormPaymentConnect,
              icon: CatchIcons.openExternal,
              status: state.pending
                  ? CatchFieldStatus.saving
                  : CatchFieldStatus.idle,
              onTap: state.pending ? null : onConnect,
            ),
          ],
        ],
        CatchField.action(
          copy: catchFieldCopy(l10n),
          title: l10n.hostFormPaymentRefresh,
          icon: CatchIcons.refresh,
          onTap: state.pending ? null : onRefresh,
        ),
        if (state.error case final error?)
          CatchLocalizedErrorState(
            error,
            context: AppErrorContext.payments,
            mode: CatchErrorStateMode.compact,
            onRetry: onRefresh,
          ),
      ],
    );
  }

  Future<void> _confirmDisconnect(BuildContext context, String id) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => CatchDialog(
        title: context.l10n.hostFormPaymentDisconnect,
        actions: [
          CatchButton(
            label: context.l10n.coreCatchAdaptiveDialogVisiblecopyCancel,
            variant: CatchButtonVariant.secondary,
            onPressed: () => Navigator.of(dialogContext).pop(false),
          ),
          CatchButton(
            label: context.l10n.hostFormPaymentDisconnect,
            variant: CatchButtonVariant.secondary,
            onPressed: () => Navigator.of(dialogContext).pop(true),
          ),
        ],
        child: CatchText(
          context.l10n.hostPayoutsRazorpayDisconnectHelp,
          variant: CatchTextVariant.bodyM,
          color: CatchTokens.of(context).ink,
        ),
      ),
    );
    if (confirmed == true) onDisconnect(id);
  }
}

/// A `ready` status with a refresh or setup error still needs reconnecting.
String hostRazorpayConnectionStatusLabel(
  AppLocalizations l10n,
  HostFormPaymentConnection connection,
) => switch (connection.status) {
  HostFormPaymentConnectionStatus.connecting => l10n.hostFormPaymentConnecting,
  HostFormPaymentConnectionStatus.ready =>
    connection.ready
        ? l10n.hostFormPaymentReady
        : l10n.hostFormPaymentAttention,
  HostFormPaymentConnectionStatus.needsAttention =>
    l10n.hostFormPaymentAttention,
  HostFormPaymentConnectionStatus.disconnected =>
    l10n.hostFormPaymentDisconnected,
};
