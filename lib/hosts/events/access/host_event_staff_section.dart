import 'dart:async';

import 'package:catch_dating_app/contexts/organizers/data/host_event_staff_repository.dart';
import 'package:catch_dating_app/hosts/events/access/host_event_staff_controller.dart';
import 'package:catch_dating_app/hosts/events/access/host_event_staff_grant_sheet.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/device/clipboard.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_platform/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_platform/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_platform/routing/app_deep_links.dart';
import 'package:catch_platform/time/time_formatters.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Temporary event staff on the event's door screen: the host grants a phone
/// number door access for a set window, copies the operator workspace link,
/// and revokes active access. The list loads when the field opens, through
/// [hostEventStaffControllerProvider]; the server owns every grant.
class HostEventStaffSection extends ConsumerStatefulWidget {
  const HostEventStaffSection({
    super.key,
    required this.organizerId,
    required this.eventId,
  });

  final String organizerId;
  final String eventId;

  @override
  ConsumerState<HostEventStaffSection> createState() =>
      _HostEventStaffSectionState();
}

class _HostEventStaffSectionState extends ConsumerState<HostEventStaffSection> {
  AsyncValue<HostEventStaffList> _staff = const AsyncLoading();
  var _loaded = false;
  var _mutationPending = false;
  Object? _mutationError;

  @override
  Widget build(BuildContext context) {
    return CatchFieldLanes.single(
      child: CatchField.control(
        copy: catchFieldCopy(context.l10n),
        key: const ValueKey<String>('host_event_staff_access_field'),
        title: context.l10n.hostsEventStaffTitle,
        body: context.l10n.hostsEventStaffSubtitle,
        icon: CatchIcons.adminPanelSettingsOutlined,
        contractExemption:
            'Disclosure and mutation surface for server-owned temporary event '
            'access; the field itself does not persist a scalar value.',
        onOpenChanged: (open) {
          if (open && !_loaded) unawaited(_load());
        },
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Wrap(
              spacing: CatchSpacing.s2,
              runSpacing: CatchSpacing.s2,
              children: [
                CatchButton(
                  label: context.l10n.hostsEventStaffAdd,
                  leading: CatchIcon(CatchIcons.personAddAlt1Outlined),
                  variant: CatchButtonVariant.secondary,
                  onPressed: _mutationPending
                      ? null
                      : () => unawaited(_grant()),
                ),
                CatchButton(
                  label: context.l10n.hostsEventStaffCopyLink,
                  leading: CatchIcon(CatchIcons.linkRounded),
                  variant: CatchButtonVariant.quiet,
                  onPressed: () => unawaited(_copyLink()),
                ),
              ],
            ),
            gapH12,
            if (_mutationError case final error?) ...[
              CatchLocalizedErrorBanner(error, context: AppErrorContext.event),
              gapH12,
            ],
            if (_loaded)
              CatchAsyncBoundary<HostEventStaffList>(
                value: _staff,
                errorContext: AppErrorContext.event,
                onRetry: _load,
                builder: (context, list) {
                  if (list.members.isEmpty) {
                    return CatchEmptyState(
                      variant: CatchEmptyStateVariant.inline,
                      icon: CatchIcons.groupsOutlined,
                      title: context.l10n.hostsEventStaffEmptyTitle,
                      message: context.l10n.hostsEventStaffEmptyMessage,
                    );
                  }
                  return CatchSection.containedRows(
                    children: [
                      for (final indexed in list.members.indexed)
                        CatchField.read(
                          key: ValueKey(indexed.$2.uid),
                          content: CatchPersonLayout(
                            name: indexed.$2.displayName,
                            supportingText: context.l10n
                                .hostsEventStaffPhoneEnding(
                                  digits: indexed.$2.phoneLastFour,
                                ),
                            context: context.l10n.hostsEventStaffExpires(
                              date: AppTimeFormatters.dateTime(
                                indexed.$2.expiresAt,
                              ),
                            ),
                            badges: [
                              if (indexed.$2.status !=
                                  HostEventStaffStatus.active)
                                CatchRowBadge(
                                  label: _statusLabel(
                                    context,
                                    indexed.$2.status,
                                  ),
                                  tone:
                                      indexed.$2.status ==
                                          HostEventStaffStatus.expired
                                      ? CatchBadgeTone.warning
                                      : CatchBadgeTone.neutral,
                                ),
                            ],
                          ),
                          secondaryAction:
                              indexed.$2.status == HostEventStaffStatus.active
                              ? CatchFieldSecondaryAction.button(
                                  label: context.l10n.hostsEventStaffRevoke,
                                  onActivate: _mutationPending
                                      ? null
                                      : () => unawaited(_revoke(indexed.$2)),
                                )
                              : null,
                        ),
                    ],
                  );
                },
              ),
          ],
        ),
      ),
    );
  }

  Future<void> _load() async {
    if (mounted) {
      setState(() {
        _loaded = true;
        _staff = const AsyncLoading();
      });
    }
    try {
      // provider-graph: ownership-widget-async:_HostEventStaffSectionState._load:await:hostEventStaffControllerProvider.list watch CAT156 -- Existing bounded review signal at _HostEventStaffSectionState._load (await:hostEventStaffControllerProvider.list). The method combines local completion publication with an awaited provider seam or declared Future callback. Its mutated fields/caller contract need focused classification: navigation, form/media/animation feedback may be mechanical, while loaded data, authorization, server pending/error or retry identity need a generated owner. This watch disposition does not certify compliance or declare a confirmed violation; inspect the exact responsibility before its CAT156 migration.
      final list = await ref
          .read(hostEventStaffControllerProvider)
          .list(organizerId: widget.organizerId, eventId: widget.eventId);
      if (mounted) setState(() => _staff = AsyncData(list));
    } catch (error, stackTrace) {
      if (mounted) setState(() => _staff = AsyncError(error, stackTrace));
    }
  }

  Future<void> _grant() async {
    final request = await showCatchBottomSheet<HostEventStaffGrantInput>(
      context: context,
      builder: (context) => const HostEventStaffGrantSheet(),
    );
    if (request == null || !mounted) return;
    setState(() {
      _mutationPending = true;
      _mutationError = null;
    });
    try {
      // provider-graph: ownership-widget-async:_HostEventStaffSectionState._grant:await:hostEventStaffControllerProvider.grant watch CAT156 -- Existing bounded review signal at _HostEventStaffSectionState._grant (await:hostEventStaffControllerProvider.grant). The method combines local completion publication with an awaited provider seam or declared Future callback. Its mutated fields/caller contract need focused classification: navigation, form/media/animation feedback may be mechanical, while loaded data, authorization, server pending/error or retry identity need a generated owner. This watch disposition does not certify compliance or declare a confirmed violation; inspect the exact responsibility before its CAT156 migration.
      final list = await ref
          .read(hostEventStaffControllerProvider)
          .grant(
            eventId: widget.eventId,
            phoneNumber: request.phoneNumber,
            window: request.window,
          );
      if (!mounted) return;
      setState(() => _staff = AsyncData(list));
      await _copyLink();
    } catch (error) {
      if (mounted) setState(() => _mutationError = error);
    } finally {
      if (mounted) setState(() => _mutationPending = false);
    }
  }

  Future<void> _revoke(HostEventStaffMember member) async {
    final confirmed = await showCatchConfirmDialog(
      copy: catchDialogCopy(context.l10n),
      context: context,
      title: context.l10n.hostsEventStaffRevokeTitle,
      message: context.l10n.hostsEventStaffRevokeMessage(
        name: member.displayName,
      ),
      confirmLabel: context.l10n.hostsEventStaffRevoke,
      danger: true,
    );
    if (confirmed != true || !mounted) return;
    setState(() {
      _mutationPending = true;
      _mutationError = null;
    });
    try {
      // provider-graph: ownership-widget-async:_HostEventStaffSectionState._revoke:await:hostEventStaffControllerProvider.revoke watch CAT156 -- Existing bounded review signal at _HostEventStaffSectionState._revoke (await:hostEventStaffControllerProvider.revoke). The method combines local completion publication with an awaited provider seam or declared Future callback. Its mutated fields/caller contract need focused classification: navigation, form/media/animation feedback may be mechanical, while loaded data, authorization, server pending/error or retry identity need a generated owner. This watch disposition does not certify compliance or declare a confirmed violation; inspect the exact responsibility before its CAT156 migration.
      final list = await ref
          .read(hostEventStaffControllerProvider)
          .revoke(eventId: widget.eventId, member: member);
      if (mounted) setState(() => _staff = AsyncData(list));
    } catch (error) {
      if (mounted) setState(() => _mutationError = error);
    } finally {
      if (mounted) setState(() => _mutationPending = false);
    }
  }

  Future<void> _copyLink() async {
    try {
      await ref
          .read(clipboardControllerProvider)
          .copyText(AppDeepLinks.hostOperatorEvent(widget.eventId).toString());
      if (mounted) {
        showCatchNotice(
          context,
          context.l10n.hostsEventStaffLinkCopied,
          tone: CatchNoticeTone.success,
        );
      }
    } catch (error) {
      if (mounted) showCatchNoticeError(context, error);
    }
  }
}

String _statusLabel(BuildContext context, HostEventStaffStatus status) =>
    switch (status) {
      HostEventStaffStatus.active => context.l10n.hostsEventStaffStatusActive,
      HostEventStaffStatus.revoked => context.l10n.hostsEventStaffStatusRevoked,
      HostEventStaffStatus.expired => context.l10n.hostsEventStaffStatusExpired,
    };
