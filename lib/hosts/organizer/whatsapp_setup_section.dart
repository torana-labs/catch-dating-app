import 'dart:async';
import 'package:catch_dating_app/contexts/audience/data/crm/host_whatsapp_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_messaging_setup.dart';
import 'package:catch_dating_app/contexts/messaging/data/host_whatsapp_embedded_signup.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/hosts/presentation/host_audience_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/app_config.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_platform/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_platform/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_platform/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// The organizer own WhatsApp sender: connect it through Meta embedded
/// signup, sync and read its templates, send a test and disconnect, through
/// the existing messaging setup commands. The Inbox messaging setup shows it.
class HostWhatsappSetupSection extends ConsumerStatefulWidget {
  const HostWhatsappSetupSection({
    super.key,
    required this.organizer,
    this.onBusyChanged,
  });

  final Organizer organizer;
  final ValueChanged<bool>? onBusyChanged;

  @override
  ConsumerState<HostWhatsappSetupSection> createState() =>
      _HostWhatsappSetupSectionState();
}

class _HostWhatsappSetupSectionState
    extends ConsumerState<HostWhatsappSetupSection> {
  final _testPhoneController = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
    _testPhoneController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final messaging = ref.watch(
      hostMessagingSetupProvider(widget.organizer.id),
    );
    final loadedSetup = catchAsyncStateFromAsyncValue(messaging).value;
    if (loadedSetup != null &&
        !loadedSetup.canManageWhatsappSender(
          embeddedSignupSupported: hostWhatsappEmbeddedSignupSupported,
        )) {
      return const SizedBox.shrink();
    }
    return CatchSection.divided(
      title: context.l10n.hostsHostAudienceWhatsappSender,
      child: CatchAsyncBoundary<HostMessagingSetup>(
        value: messaging,
        onRetry: () =>
            ref.invalidate(hostMessagingSetupProvider(widget.organizer.id)),
        initialLoadTimeout: null,
        loadingBuilder: (_) => const CatchLoadingIndicator(),
        errorBuilder: (_, error, _, onBoundaryRetry) =>
            CatchLocalizedErrorState(
              error,
              context: AppErrorContext.organizer,
              mode: CatchErrorStateMode.compact,
              onRetry: onBoundaryRetry,
            ),
        builder: (context, setup) {
          final connection = setup.connection;
          return CatchFieldLanes.custom(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CatchLegacyText(
                  context.l10n.hostsHostAudienceWhatsappOwnedSender,
                  variant: CatchLegacyTextVariant.supporting,
                  color: CatchTokens.of(context).ink2,
                ),
                gapH12,
                if (connection == null)
                  CatchButton(
                    label: context.l10n.hostsHostAudienceConnectWhatsapp,
                    onPressed: _busy ? null : () => _connectWhatsapp(setup),
                    status: (_busy)
                        ? CatchButtonStatus.loading
                        : CatchButtonStatus.idle,
                  )
                else ...[
                  CatchField.read(
                    copy: catchFieldCopy(context.l10n),
                    title:
                        connection.verifiedName ??
                        context.l10n.hostsHostAudienceWhatsappSender,
                    body: connection.displayPhoneNumber,
                    valueText: _connectionStatusLabel(context, connection),
                  ),
                  CatchField.read(
                    copy: catchFieldCopy(context.l10n),
                    title: context.l10n.hostsHostAudienceTemplates,
                    body: context.l10n.hostsHostAudienceApprovedTemplates(
                      count: setup.approvedTemplates.length,
                    ),
                    valueText: connection.templateSyncStatus,
                  ),
                  Wrap(
                    spacing: CatchSpacing.s2,
                    runSpacing: CatchSpacing.s2,
                    children: [
                      CatchButton(
                        label: context.l10n.hostsHostAudienceSyncTemplates,
                        variant: CatchButtonVariant.secondary,
                        size: CatchButtonSize.md,
                        onPressed: _busy
                            ? null
                            : () => _syncTemplates(connection.connectionId),
                        status: (_busy)
                            ? CatchButtonStatus.loading
                            : CatchButtonStatus.idle,
                      ),
                      CatchButton(
                        label: context.l10n.hostsHostAudienceDisconnect,
                        variant: CatchButtonVariant.quiet,
                        size: CatchButtonSize.md,
                        onPressed: _busy
                            ? null
                            : () =>
                                  _disconnectWhatsapp(connection.connectionId),
                      ),
                    ],
                  ),
                  if (!connection.isActive &&
                      setup.approvedTemplates.isNotEmpty) ...[
                    gapH16,
                    CatchField.input(
                      copy: catchFieldCopy(context.l10n),
                      title: context.l10n.hostsHostAudienceTestPhone,
                      contract: CatchContractConstraints
                          .sendOrganizerWhatsappTestCallablePayloadToE164,
                      controller: _testPhoneController,
                      keyboardType: TextInputType.phone,
                      placeholder: '+919876543210',
                      helperText: context.l10n.hostsHostAudienceTestPhoneHelp,
                    ),
                    gapH8,
                    CatchButton(
                      label: context.l10n.hostsHostAudienceSendTest,
                      onPressed: _busy
                          ? null
                          : () =>
                                _sendTest(setup, setup.approvedTemplates.first),
                      status: (_busy)
                          ? CatchButtonStatus.loading
                          : CatchButtonStatus.idle,
                    ),
                  ],
                ],
              ],
            ),
          );
        },
      ),
    );
  }

  // The commands are read before the signup: a signup that finishes after the
  // section closed still completes the connection.
  Future<void> _connectWhatsapp(HostMessagingSetup setup) {
    final commands = ref.read(hostAudienceControllerProvider);
    return _run(() async {
      final result = await startHostWhatsappEmbeddedSignup(
        setup.embeddedSignup,
      );
      await commands.completeWhatsappConnection(
        organizerId: widget.organizer.id,
        result: result,
      );
    });
  }

  Future<void> _syncTemplates(String connectionId) => _run(() async {
    await ref
        .read(hostAudienceControllerProvider)
        .syncWhatsappTemplates(
          organizerId: widget.organizer.id,
          connectionId: connectionId,
        );
  });

  Future<void> _disconnectWhatsapp(String connectionId) => _run(() async {
    await ref
        .read(hostAudienceControllerProvider)
        .disconnectWhatsapp(
          organizerId: widget.organizer.id,
          connectionId: connectionId,
        );
  });

  Future<void> _sendTest(
    HostMessagingSetup setup,
    HostWhatsappTemplate template,
  ) => _run(() async {
    final connection = setup.connection!;
    final variables = {
      for (final variable in template.variableNames)
        variable: _isInviteVariable(variable)
            ? variable == 'invite_token'
                  ? 'catch-test'
                  : AppConfig.publicSiteUrl.toString()
            : 'Catch test',
    };
    await ref
        .read(hostAudienceControllerProvider)
        .sendWhatsappTest(
          organizerId: widget.organizer.id,
          connectionId: connection.connectionId,
          templateId: template.templateId,
          toE164: _testPhoneController.text.trim(),
          templateVariables: variables,
        );
    if (mounted) {
      showCatchNotice(context, context.l10n.hostsHostAudienceTestPending);
    }
  });

  Future<void> _run(Future<void> Function() action) async {
    if (_busy) return;
    setState(() => _busy = true);
    widget.onBusyChanged?.call(true);
    try {
      // provider-graph: ownership-widget-async-callback:_HostWhatsappSetupSectionState._run:await:action watch CAT156 -- Existing bounded review signal at _HostWhatsappSetupSectionState._run (await:action). The method combines local completion publication with an awaited provider seam or declared Future callback. Its mutated fields/caller contract need focused classification: navigation, form/media/animation feedback may be mechanical, while loaded data, authorization, server pending/error or retry identity need a generated owner. This watch disposition does not certify compliance or declare a confirmed violation; inspect the exact responsibility before its CAT156 migration.
      await action();
    } on Object catch (error) {
      if (mounted) {
        showCatchNoticeError(
          context,
          error,
          errorContext: AppErrorContext.organizer,
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
      widget.onBusyChanged?.call(false);
    }
  }
}

bool _isInviteVariable(String name) =>
    name == 'invite_url' || name == 'invite_token';

String _connectionStatusLabel(
  BuildContext context,
  HostWhatsappConnection connection,
) => switch (connection.status) {
  'active' => context.l10n.hostsHostAudienceSenderActive,
  'testing' => context.l10n.hostsHostAudienceSenderTesting,
  'degraded' => context.l10n.hostsHostAudienceSenderDegraded,
  'blocked' ||
  'tokenRevoked' => context.l10n.hostsHostAudienceSenderNeedsAttention,
  _ => connection.status,
};
