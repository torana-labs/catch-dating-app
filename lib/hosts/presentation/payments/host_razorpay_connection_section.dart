import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/hosts/domain/forms/host_form_payment.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_payment_controller.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Organizer payout setup: the organizer connects their own Razorpay account,
/// so guest payments for events and forms settle there, never with Catch.
class HostRazorpayConnectionCard extends ConsumerWidget {
  const HostRazorpayConnectionCard({super.key, required this.organizerId});

  final String organizerId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final provider = hostFormPaymentControllerProvider(organizerId);
    return CatchAsyncBoundary<HostFormPaymentSetupState>(
      value: ref.watch(provider),
      onRetry: () => ref.invalidate(provider),
      errorContext: AppErrorContext.payments,
      initialLoadTimeout: null,
      builder: (context, state) => HostRazorpayConnectionSection(
        state: state,
        onConnect: () => ref.read(provider.notifier).connect(),
        onRefresh: () => ref.read(provider.notifier).refresh(),
        onDisconnect: (id) => ref.read(provider.notifier).disconnect(id),
      ),
    );
  }
}

class HostRazorpayConnectionSection extends StatelessWidget {
  const HostRazorpayConnectionSection({
    super.key,
    required this.state,
    required this.onConnect,
    required this.onRefresh,
    required this.onDisconnect,
  });

  final HostFormPaymentSetupState state;
  final VoidCallback onConnect;
  final VoidCallback onRefresh;
  final ValueChanged<String> onDisconnect;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final setup = state.setup;
    final connections = setup.connections
        .where(
          (connection) =>
              connection.status != HostFormPaymentConnectionStatus.disconnected,
        )
        .toList();
    final ready = connections.any((connection) => connection.ready);
    return CatchSection.fieldRows(
      title: l10n.hostsHostPaymentAccountCardTitlePayouts,
      trailing: CatchBadge.functional(
        label: ready
            ? l10n.hostsHostPaymentAccountCardVisiblecopyReady
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
                  '${_statusLabel(l10n, connection.status)} · '
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

String _statusLabel(
  AppLocalizations l10n,
  HostFormPaymentConnectionStatus status,
) => switch (status) {
  HostFormPaymentConnectionStatus.connecting => l10n.hostFormPaymentConnecting,
  HostFormPaymentConnectionStatus.ready => l10n.hostFormPaymentReady,
  HostFormPaymentConnectionStatus.needsAttention =>
    l10n.hostFormPaymentAttention,
  HostFormPaymentConnectionStatus.disconnected =>
    l10n.hostFormPaymentDisconnected,
};
