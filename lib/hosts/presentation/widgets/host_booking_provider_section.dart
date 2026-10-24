import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/core/time_formatters.dart';
import 'package:catch_dating_app/events/domain/event.dart';
import 'package:catch_dating_app/hosts/data/host_provider_repository.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class HostBookingProviderSection extends StatelessWidget {
  const HostBookingProviderSection({
    super.key,
    required this.value,
    required this.provider,
    required this.mutationPending,
    required this.allowChanges,
    required this.onRetry,
    required this.onConnect,
    required this.onSync,
    required this.onDisconnect,
    required this.onImport,
  });

  final AsyncValue<HostProviderSetup>? value;
  final ExternalBookingProvider provider;
  final bool mutationPending;
  final bool allowChanges;
  final VoidCallback onRetry;
  final VoidCallback onConnect;
  final VoidCallback onSync;
  final VoidCallback onDisconnect;
  final VoidCallback onImport;

  @override
  Widget build(BuildContext context) {
    final setupValue = value;
    if (setupValue == null) {
      return CatchText(
        context.l10n.hostsOperationalRosterProviderOpenToLoad,
        variant: CatchTextVariant.supporting,
      );
    }
    return CatchAsyncBoundary<HostProviderSetup>(
      value: setupValue,
      errorContext: AppErrorContext.event,
      onRetry: onRetry,
      builder: (context, setup) {
        final entry = setup.catalogFor(provider);
        if (entry == null) {
          return CatchBanner.error(
            message: context.l10n.hostsOperationalRosterProviderUnavailable,
          );
        }
        final mapping = setup.mapping;
        final connection = setup.mappedConnection;
        if (provider == ExternalBookingProvider.luma &&
            mapping != null &&
            connection != null &&
            mapping.status == 'active') {
          final reconnectRequired =
              connection.status == 'credentialRevoked' ||
              connection.status == 'disconnected';
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Align(
                alignment: Alignment.centerLeft,
                child: CatchBadge.functional(
                  label: _providerConnectionStatus(context, connection.status),
                  tone: connection.status == 'active'
                      ? CatchBadgeTone.success
                      : CatchBadgeTone.warning,
                ),
              ),
              gapH8,
              CatchFieldLanes.divided(
                children: [
                  CatchField.read(
                    copy: catchFieldCopy(context.l10n),
                    title: context.l10n.hostsOperationalRosterProviderAccount,
                    body: connection.externalAccountName,
                    icon: CatchIcons.linkOutlined,
                  ),
                  CatchField.read(
                    copy: catchFieldCopy(context.l10n),
                    title: context.l10n.hostsOperationalRosterProviderCoverage,
                    body: _providerCoverage(context, connection.capabilities),
                    icon: CatchIcons.groupsOutlined,
                  ),
                  CatchField.read(
                    copy: catchFieldCopy(context.l10n),
                    title: context.l10n.hostsOperationalRosterProviderLastSync,
                    body: mapping.lastSuccessfulSyncAt == null
                        ? context.l10n.hostsOperationalRosterProviderNeverSynced
                        : AppTimeFormatters.dateTime(
                            mapping.lastSuccessfulSyncAt!.toLocal(),
                          ),
                    icon: CatchIcons.refresh,
                  ),
                  CatchField.read(
                    copy: catchFieldCopy(context.l10n),
                    title: context.l10n.hostsOperationalRosterProviderLimits,
                    body: context.l10n.hostsOperationalRosterProviderLumaLimits,
                    icon: CatchIcons.infoOutline,
                  ),
                ],
              ),
              if (allowChanges) ...[
                gapH12,
                Wrap(
                  spacing: CatchSpacing.s2,
                  runSpacing: CatchSpacing.s2,
                  children: [
                    if (reconnectRequired)
                      CatchButton(
                        label: context
                            .l10n
                            .hostsOperationalRosterProviderReconnect,
                        onPressed: mutationPending ? null : onConnect,
                        status: (mutationPending)
                            ? CatchButtonStatus.loading
                            : CatchButtonStatus.idle,
                        size: CatchButtonSize.sm,
                        leading: Icon(CatchIcons.keyOutlined),
                      )
                    else
                      CatchButton(
                        label:
                            context.l10n.hostsOperationalRosterProviderSyncNow,
                        onPressed: mutationPending ? null : onSync,
                        status: (mutationPending)
                            ? CatchButtonStatus.loading
                            : CatchButtonStatus.idle,
                        size: CatchButtonSize.sm,
                        leading: Icon(CatchIcons.syncRounded),
                      ),
                    CatchButton(
                      label:
                          context.l10n.hostsOperationalRosterProviderDisconnect,
                      onPressed: mutationPending ? null : onDisconnect,
                      size: CatchButtonSize.sm,
                      variant: CatchButtonVariant.ghost,
                    ),
                  ],
                ),
              ],
            ],
          );
        }
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Align(
              alignment: Alignment.centerLeft,
              child: CatchBadge.functional(
                label: _providerAvailability(context, entry.availability),
                tone: entry.availability == HostProviderAvailability.available
                    ? CatchBadgeTone.brand
                    : CatchBadgeTone.neutral,
              ),
            ),
            gapH8,
            CatchText(entry.requirement, variant: CatchTextVariant.supporting),
            if (entry.importSupport ==
                HostProviderImportSupport.sampleRequired) ...[
              gapH8,
              CatchBanner.error(
                message:
                    context.l10n.hostsOperationalRosterAdapterSampleRequired,
              ),
            ],
            if (allowChanges) ...[
              gapH12,
              Wrap(
                spacing: CatchSpacing.s2,
                runSpacing: CatchSpacing.s2,
                children: [
                  if (provider == ExternalBookingProvider.luma &&
                      entry.availability == HostProviderAvailability.available)
                    CatchButton(
                      label: context.l10n.hostsOperationalRosterProviderConnect,
                      onPressed: mutationPending ? null : onConnect,
                      status: (mutationPending)
                          ? CatchButtonStatus.loading
                          : CatchButtonStatus.idle,
                      size: CatchButtonSize.sm,
                      leading: Icon(CatchIcons.keyOutlined),
                    ),
                  if (entry.capabilities.fileImport)
                    CatchButton(
                      label: context.l10n.hostsOperationalRosterProviderImport,
                      onPressed: mutationPending ? null : onImport,
                      size: CatchButtonSize.sm,
                      variant: CatchButtonVariant.secondary,
                      leading: Icon(CatchIcons.cloudUploadOutlined),
                    ),
                ],
              ),
            ],
          ],
        );
      },
    );
  }
}

String _providerCoverage(
  BuildContext context,
  HostProviderCapabilities capabilities,
) {
  final values = <String>[
    if (capabilities.rosterIdentity)
      context.l10n.hostsOperationalRosterProviderCapabilityGuests,
    if (capabilities.registrationStatus)
      context.l10n.hostsOperationalRosterProviderCapabilityStatus,
    if (capabilities.providerCheckIn)
      context.l10n.hostsOperationalRosterProviderCapabilityCheckIn,
  ];
  return values.join(' · ');
}

String _providerAvailability(
  BuildContext context,
  HostProviderAvailability value,
) => switch (value) {
  HostProviderAvailability.available =>
    context.l10n.hostsOperationalRosterProviderAvailable,
  HostProviderAvailability.exportOnly =>
    context.l10n.hostsOperationalRosterProviderExportOnly,
  HostProviderAvailability.configurationRequired =>
    context.l10n.hostsOperationalRosterProviderConfigurationRequired,
  HostProviderAvailability.partnerAccessRequired =>
    context.l10n.hostsOperationalRosterProviderPartnerRequired,
  HostProviderAvailability.sampleRequired =>
    context.l10n.hostsOperationalRosterProviderSampleRequired,
  HostProviderAvailability.manualOnly =>
    context.l10n.hostsOperationalRosterProviderManualOnly,
};

String _providerConnectionStatus(BuildContext context, String value) =>
    switch (value) {
      'active' => context.l10n.hostsOperationalRosterProviderStatusActive,
      'degraded' => context.l10n.hostsOperationalRosterProviderStatusDegraded,
      'credentialRevoked' =>
        context.l10n.hostsOperationalRosterProviderStatusReconnect,
      _ => context.l10n.hostsOperationalRosterProviderStatusDisconnected,
    };
