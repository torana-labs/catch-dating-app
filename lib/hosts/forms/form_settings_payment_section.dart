import 'dart:async';

import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_configuration.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_definition.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_payment.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_payment_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_platform/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_platform/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// The form's fee and the Razorpay account it collects through.
///
/// Reads the organizer's payment setup (the same single account as
/// Payouts) and runs its connect, reconnect, refresh and disconnect
/// commands. Set up fee opens the fee sheet; the fee itself saves into the
/// draft through [onChanged], and Remove fee clears it.
class HostFormSettingsPaymentSection extends ConsumerWidget {
  const HostFormSettingsPaymentSection({
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
    final l10n = context.l10n;
    final provider = hostFormPaymentControllerProvider(organizerId);
    final value = catchAsyncStateFromAsyncValue(ref.watch(provider));
    final setup = value.value;
    if (setup == null) {
      return CatchSection(
        title: l10n.hostFormPaymentTitle,
        children: [
          if (value.hasError)
            CatchLocalizedErrorState(
              value.error!,
              context: AppErrorContext.forms,
              mode: CatchErrorStateMode.compact,
              onRetry: () => ref.invalidate(provider),
            )
          else
            const CatchLoadingIndicator(),
        ],
      );
    }
    final notifier = ref.read(provider.notifier);
    return HostFormPaymentSetupSection(
      state: setup,
      definition: definition,
      onChanged: onChanged,
      onConnect: () => unawaited(notifier.connect()),
      onReconnect: () => unawaited(notifier.reconnect()),
      onRefresh: () =>
          unawaited(notifier.refresh(definition.payment?.connectionId)),
      onDisconnect: (id) => unawaited(notifier.disconnect(id)),
    );
  }
}

/// The fee section drawn from a payment setup, as plain values.
class HostFormPaymentSetupSection extends StatelessWidget {
  const HostFormPaymentSetupSection({
    super.key,
    required this.state,
    required this.definition,
    required this.onChanged,
    required this.onConnect,
    required this.onReconnect,
    required this.onRefresh,
    required this.onDisconnect,
  });

  final HostFormPaymentSetupState state;
  final HostFormDefinition definition;
  final ValueChanged<HostFormPayment?> onChanged;
  final VoidCallback onConnect;

  /// Replaces a connection that cannot take payments.
  final VoidCallback onReconnect;
  final VoidCallback onRefresh;
  final ValueChanged<String> onDisconnect;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final fee = definition.payment;
    final setup = state.setup;
    final collection = setup.collection;
    final throughCatch = collection?.throughCatch ?? false;
    final oauth = collection == null || collection.throughOrganizer;
    final ready = [
      for (final connection in setup.connections)
        if (connection.ready &&
            (collection?.mode == null || connection.mode == collection!.mode))
          connection,
    ];
    final canCollect = throughCatch
        ? collection!.ready
        : oauth &&
              setup.available &&
              (collection?.ready ?? true) &&
              ready.isNotEmpty;
    final phoneVerified =
        definition.identityPolicy == HostFormIdentityPolicy.phoneVerified;
    final busy = state.pending;
    return CatchSection(
      title: l10n.hostFormPaymentTitle,
      dividers: CatchSectionPlacement.none,
      children: [
        CatchText(
          fee == null
              ? l10n.hostFormPaymentHelp
              : l10n.hostFormPaymentPublishHelp,
          variant: CatchTextVariant.bodySmall,
          tone: CatchTextTone.secondary,
        ),
        CatchIndexRow(
          key: const ValueKey<String>('host-form-fee'),
          title: fee == null
              ? l10n.hostFormPaymentFree
              : '₹${fee.rupees} · ${fee.description}',
          titleMaxLines: 3,
          subtitle: fee?.refundPolicy,
          onTap: null,
        ),
        CatchButton(
          key: const ValueKey<String>('host-form-fee-edit'),
          label: fee == null
              ? l10n.hostFormPaymentConfigure
              : l10n.hostFormPaymentEdit,
          variant: CatchButtonVariant.secondary,
          fullWidth: true,
          onPressed: busy || !canCollect || !phoneVerified
              ? null
              : () => unawaited(_edit(context, ready)),
        ),
        if (fee != null)
          CatchButton(
            key: const ValueKey<String>('host-form-fee-remove'),
            label: l10n.hostFormPaymentRemove,
            variant: CatchButtonVariant.quiet,
            fullWidth: true,
            onPressed: busy ? null : () => onChanged(null),
          ),
        if (!phoneVerified)
          CatchNotice.inline(
            title: l10n.hostFormIdentityLabel,
            body: l10n.hostFormPaymentPhoneRequired,
            tone: CatchNoticeTone.warning,
          ),
        if (throughCatch)
          CatchNotice.inline(
            title: l10n.hostFormPaymentCatchCollection,
            body: collection!.ready
                ? l10n.hostFormPaymentCatchCollectionHelp
                : l10n.hostFormPaymentCatchSetupRequired,
          )
        else if (!oauth || !setup.available)
          CatchNotice.inline(
            title: l10n.hostFormPaymentConnect,
            body: !oauth
                ? l10n.hostFormPaymentCollectionUnavailable
                : l10n.hostFormPaymentUnavailable,
          )
        else ...[
          // The same single organizer account as Payouts: events, forms and
          // memberships all collect through it.
          for (final connection in setup.liveConnections) ...[
            CatchIndexRow(
              key: ValueKey<String>(
                'host-form-connection-${connection.connectionId}',
              ),
              title: connection.accountId ?? l10n.hostFormPaymentConnect,
              subtitle:
                  '${_connectionStatus(l10n, connection)} · '
                  '${connection.mode == HostFormPaymentMode.test ? l10n.hostFormPaymentTest : l10n.hostFormPaymentLive}',
              onTap: null,
            ),
            CatchButton(
              key: ValueKey<String>(
                'host-form-disconnect-${connection.connectionId}',
              ),
              label: l10n.hostFormPaymentDisconnect,
              variant: CatchButtonVariant.quiet,
              fullWidth: true,
              onPressed: busy
                  ? null
                  : () => unawaited(
                      _confirmDisconnect(context, connection.connectionId),
                    ),
            ),
          ],
          if (setup.liveConnections.isEmpty) ...[
            CatchText(
              l10n.hostFormPaymentConnectHelp,
              variant: CatchTextVariant.bodySmall,
              tone: CatchTextTone.secondary,
            ),
            CatchButton(
              key: const ValueKey<String>('host-form-connect'),
              label: l10n.hostFormPaymentConnect,
              leading: CatchIcon(CatchIcons.openExternal),
              fullWidth: true,
              status: busy ? CatchButtonStatus.loading : CatchButtonStatus.idle,
              onPressed: busy ? null : onConnect,
            ),
          ] else if (setup.razorpayConnectionState !=
              HostRazorpayConnectionState.ready) ...[
            CatchText(
              l10n.hostFormPaymentConnectHelp,
              variant: CatchTextVariant.bodySmall,
              tone: CatchTextTone.secondary,
            ),
            CatchButton(
              key: const ValueKey<String>('host-form-reconnect'),
              label: l10n.hostPayoutsRazorpayReconnectTitle,
              leading: CatchIcon(CatchIcons.openExternal),
              fullWidth: true,
              status: busy ? CatchButtonStatus.loading : CatchButtonStatus.idle,
              onPressed: busy ? null : onReconnect,
            ),
          ],
          if (ready.isEmpty)
            CatchNotice.inline(
              title: l10n.hostFormPaymentConfigure,
              body: l10n.hostFormPaymentConnectionRequired,
              tone: CatchNoticeTone.warning,
            ),
        ],
        CatchIndexRow(
          key: const ValueKey<String>('host-form-payment-refresh'),
          title: l10n.hostFormPaymentRefresh,
          icon: CatchIcons.refresh,
          onTap: busy ? null : onRefresh,
        ),
        if (state.error case final error?)
          CatchLocalizedErrorState(
            error,
            context: AppErrorContext.forms,
            mode: CatchErrorStateMode.compact,
            onRetry: onRefresh,
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
      builder: (_) => HostFormFeeSheet(
        payment: definition.payment,
        connections: ready,
        collectThroughCatch: state.setup.collection?.throughCatch ?? false,
        collectionMode: state.setup.collection?.mode,
      ),
    );
    if (fee != null) onChanged(fee);
  }

  Future<void> _confirmDisconnect(BuildContext context, String id) async {
    final l10n = context.l10n;
    final confirmed = await showCatchAdaptiveDialog<bool>(
      context: context,
      title: l10n.hostFormPaymentDisconnect,
      message: l10n.hostFormPaymentDisconnectHelp,
      actions: [
        CatchDialogAction(
          label: l10n.coreCatchAdaptiveDialogVisiblecopyCancel,
          value: false,
          isDefault: true,
        ),
        CatchDialogAction(
          label: l10n.hostFormPaymentDisconnect,
          value: true,
          isDestructive: true,
        ),
      ],
    );
    if (confirmed == true) onDisconnect(id);
  }
}

/// How a Razorpay connection stands; a ready status with a refresh or
/// setup error still needs reconnecting.
String _connectionStatus(
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

/// The fee sheet: the account it collects through, the amount in rupees,
/// what it is for and the refund policy. Save returns the fee; it saves
/// nothing itself.
class HostFormFeeSheet extends StatefulWidget {
  const HostFormFeeSheet({
    super.key,
    required this.payment,
    required this.connections,
    this.collectThroughCatch = false,
    this.collectionMode,
  });

  final HostFormPayment? payment;

  /// Ready accounts the fee can collect through.
  final List<HostFormPaymentConnection> connections;

  /// Catch collects instead of an organizer account.
  final bool collectThroughCatch;
  final HostFormPaymentMode? collectionMode;

  @override
  State<HostFormFeeSheet> createState() => _HostFormFeeSheetState();
}

class _HostFormFeeSheetState extends State<HostFormFeeSheet> {
  late String? _connectionId = widget.collectThroughCatch
      ? null
      : widget.connections.any(
          (c) => c.connectionId == widget.payment?.connectionId,
        )
      ? widget.payment!.connectionId
      : widget.connections.firstOrNull?.connectionId;
  late String _amount = widget.payment?.rupees ?? '100';
  late String? _description = widget.payment?.description;
  late String _refundPolicy = widget.payment?.refundPolicy ?? '';

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final copy = catchFieldCopy(l10n);
    final amount = HostFormPayment.parseRupees(_amount);
    final description = (_description ?? l10n.hostFormPaymentDescriptionDefault)
        .trim();
    final refund = _refundPolicy.trim();
    final canSave =
        (widget.collectThroughCatch || _connectionId != null) &&
        amount != null &&
        description.isNotEmpty &&
        description.length <= 160 &&
        refund.isNotEmpty &&
        refund.length <= 1000;
    final selected = widget.connections
        .where((c) => c.connectionId == _connectionId)
        .firstOrNull;
    return CatchSheet.standard(
      title: l10n.hostFormPaymentConfigure,
      subtitle: l10n.hostFormPaymentHelp,
      footer: CatchButton(
        key: const ValueKey<String>('host-form-fee-save'),
        label: l10n.hostFormPaymentSave,
        fullWidth: true,
        onPressed: !canSave
            ? null
            : () => Navigator.of(context).pop(
                HostFormPayment(
                  connectionId: _connectionId,
                  amountPaise: amount,
                  description: description,
                  refundPolicy: refund,
                ),
              ),
      ),
      child: CatchSection(
        dividers: CatchSectionPlacement.none,
        children: [
          if (widget.collectThroughCatch)
            CatchField.read(
              copy: copy,
              title: l10n.hostFormPaymentCatchCollection,
              body: widget.collectionMode == HostFormPaymentMode.test
                  ? l10n.hostFormPaymentTest
                  : l10n.hostFormPaymentLive,
            )
          else
            CatchField<String>.select(
              copy: copy,
              title: l10n.hostFormPaymentAccount,
              value: _connectionId,
              values: [for (final c in widget.connections) c.connectionId],
              contract: CatchContractConstraints
                  .organizerFormDraftDocumentDefinitionPaymentConnectionId,
              contractValueBuilder: (value) => value,
              itemLabelBuilder: (value) =>
                  widget.connections
                      .firstWhere((c) => c.connectionId == value)
                      .accountId ??
                  value,
              helperText: selected == null
                  ? null
                  : selected.mode == HostFormPaymentMode.test
                  ? l10n.hostFormPaymentTest
                  : l10n.hostFormPaymentLive,
              onChanged: (value) {
                if (value != null) setState(() => _connectionId = value);
              },
            ),
          CatchField.input(
            key: const ValueKey<String>('host-form-fee-amount'),
            copy: copy,
            title: l10n.hostFormPaymentAmount,
            initialValue: _amount,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            contractExemption:
                'Exact decimal INR input maps to contract-validated integer '
                'paise.',
            helperText: l10n.hostFormPaymentAmountHelp,
            errorText: amount == null ? l10n.hostFormPaymentAmountHelp : null,
            onChanged: (value) => setState(() => _amount = value),
          ),
          CatchField.input(
            key: const ValueKey<String>('host-form-fee-description'),
            copy: copy,
            title: l10n.hostFormPaymentDescription,
            initialValue: description,
            contract: CatchContractConstraints
                .organizerFormDraftDocumentDefinitionPaymentDescription,
            onChanged: (value) => setState(() => _description = value),
          ),
          CatchField.input(
            key: const ValueKey<String>('host-form-fee-refund'),
            copy: copy,
            title: l10n.hostFormPaymentRefundPolicy,
            initialValue: _refundPolicy,
            maxLines: 4,
            helperText: l10n.hostFormPaymentRefundHelp,
            contract: CatchContractConstraints
                .organizerFormDraftDocumentDefinitionPaymentRefundPolicy,
            onChanged: (value) => setState(() => _refundPolicy = value),
          ),
        ],
      ),
    );
  }
}
