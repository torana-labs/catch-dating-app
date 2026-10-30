import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_configuration.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_definition.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_payment.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_payment_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_payment_sheet.dart';
import 'package:catch_dating_app/hosts/presentation/payments/host_razorpay_connection_section.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/errors/app_error_message.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class HostFormPaymentSection extends ConsumerWidget {
  const HostFormPaymentSection({
    super.key,
    required this.organizerId,
    required this.definition,
    required this.onChanged,
  });
  final String organizerId;
  final HostFormDefinition definition;
  final ValueChanged<HostFormPayment?> onChanged;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final provider = hostFormPaymentControllerProvider(organizerId);
    return CatchAsyncBoundary<HostFormPaymentSetupState>(
      value: ref.watch(provider),
      onRetry: () => ref.invalidate(provider),
      errorContext: AppErrorContext.forms,
      initialLoadTimeout: null,
      builder: (context, state) => HostFormPaymentSetupSection(
        state: state,
        definition: definition,
        onChanged: onChanged,
        onConnect: () => ref.read(provider.notifier).connect(),
        onReconnect: () => ref.read(provider.notifier).reconnect(),
        onRefresh: () => ref
            .read(provider.notifier)
            .refresh(definition.payment?.connectionId),
        onDisconnect: (id) => ref.read(provider.notifier).disconnect(id),
      ),
    );
  }
}

class HostFormPaymentSetupSection extends StatelessWidget {
  const HostFormPaymentSetupSection({
    super.key,
    required this.state,
    required this.definition,
    required this.onChanged,
    required this.onConnect,
    required this.onRefresh,
    required this.onDisconnect,
    this.onReconnect,
  });
  final HostFormPaymentSetupState state;
  final HostFormDefinition definition;
  final ValueChanged<HostFormPayment?> onChanged;
  final VoidCallback onConnect;

  /// Replaces connections that cannot take payments; see Payouts.
  final VoidCallback? onReconnect;
  final VoidCallback onRefresh;
  final ValueChanged<String> onDisconnect;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final fee = definition.payment;
    final collection = state.setup.collection;
    final throughCatch = collection?.throughCatch ?? false;
    final oauth = collection == null || collection.throughOrganizer;
    final ready = state.setup.connections
        .where(
          (connection) =>
              connection.ready &&
              (collection?.mode == null || connection.mode == collection!.mode),
        )
        .toList();
    final canCollect = throughCatch
        ? collection!.ready
        : oauth &&
              state.setup.available &&
              (collection?.ready ?? true) &&
              ready.isNotEmpty;
    final phoneVerified =
        definition.identityPolicy == HostFormIdentityPolicy.phoneVerified;
    return CatchSection.fieldRows(
      title: l10n.hostFormPaymentTitle,
      footer: fee == null
          ? null
          : CatchText(
              l10n.hostFormPaymentPublishHelp,
              variant: CatchTextVariant.supporting,
            ),
      children: [
        CatchField.content(
          copy: catchFieldCopy(l10n),
          title: fee == null
              ? l10n.hostFormPaymentFree
              : '₹${fee.rupees} · ${fee.description}',
          titleMaxLines: 3,
          body: l10n.hostFormPaymentHelp,
          bodyMaxLines: 6,
        ),
        if (throughCatch)
          CatchField.content(
            copy: catchFieldCopy(l10n),
            title: l10n.hostFormPaymentCatchCollection,
            body: collection!.ready
                ? l10n.hostFormPaymentCatchCollectionHelp
                : l10n.hostFormPaymentCatchSetupRequired,
            bodyMaxLines: 6,
          )
        else if (!oauth || !state.setup.available)
          CatchField.content(
            copy: catchFieldCopy(l10n),
            title: l10n.hostFormPaymentConnect,
            body: !oauth
                ? l10n.hostFormPaymentCollectionUnavailable
                : l10n.hostFormPaymentUnavailable,
            bodyMaxLines: 6,
          )
        else ...[
          // The same single organizer account as Payouts: events, forms and
          // memberships all collect through it.
          for (final connection in state.setup.liveConnections) ...[
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
          if (state.setup.liveConnections.isEmpty)
            CatchField.action(
              copy: catchFieldCopy(l10n),
              title: l10n.hostFormPaymentConnect,
              body: l10n.hostFormPaymentConnectHelp,
              bodyMaxLines: 12,
              icon: CatchIcons.openExternal,
              status: state.pending
                  ? CatchFieldStatus.saving
                  : CatchFieldStatus.idle,
              onTap: state.pending ? null : onConnect,
            )
          else if (state.setup.razorpayConnectionState !=
                  HostRazorpayConnectionState.ready &&
              onReconnect != null)
            CatchField.action(
              copy: catchFieldCopy(l10n),
              title: l10n.hostPayoutsRazorpayReconnectTitle,
              body: l10n.hostFormPaymentConnectHelp,
              bodyMaxLines: 12,
              icon: CatchIcons.openExternal,
              status: state.pending
                  ? CatchFieldStatus.saving
                  : CatchFieldStatus.idle,
              onTap: state.pending ? null : onReconnect,
            ),
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
            context: AppErrorContext.forms,
            mode: CatchErrorStateMode.compact,
            onRetry: onRefresh,
          ),
        if (!phoneVerified)
          CatchField.content(
            copy: catchFieldCopy(l10n),
            title: l10n.hostFormIdentityLabel,
            body: l10n.hostFormPaymentPhoneRequired,
            bodyMaxLines: 5,
          ),
        if (oauth && state.setup.available && ready.isEmpty)
          CatchField.content(
            copy: catchFieldCopy(l10n),
            title: l10n.hostFormPaymentConfigure,
            body: l10n.hostFormPaymentConnectionRequired,
            bodyMaxLines: 4,
          ),
        CatchField.action(
          copy: catchFieldCopy(l10n),
          title: fee == null
              ? l10n.hostFormPaymentConfigure
              : l10n.hostFormPaymentEdit,
          body: fee?.refundPolicy,
          bodyMaxLines: 6,
          onTap: state.pending || !canCollect || !phoneVerified
              ? null
              : () => _edit(context, ready),
        ),
        if (fee != null)
          CatchField.action(
            copy: catchFieldCopy(l10n),
            title: l10n.hostFormPaymentRemove,
            onTap: state.pending ? null : () => onChanged(null),
          ),
      ],
    );
  }

  Future<void> _edit(
    BuildContext context,
    List<HostFormPaymentConnection> ready,
  ) async {
    final fee = await showCatchBottomSheet<HostFormPayment>(
      context: context,
      builder: (_) => HostFormPaymentSheet(
        payment: definition.payment,
        connections: ready,
        collectThroughCatch: state.setup.collection?.throughCatch ?? false,
        collectionMode: state.setup.collection?.mode,
      ),
    );
    if (fee != null) onChanged(fee);
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
          context.l10n.hostFormPaymentDisconnectHelp,
          variant: CatchTextVariant.bodyM,
          color: CatchTokens.of(context).ink,
        ),
      ),
    );
    if (confirmed == true) onDisconnect(id);
  }
}
