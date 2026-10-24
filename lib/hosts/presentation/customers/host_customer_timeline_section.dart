import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/core/time_formatters.dart';
import 'package:catch_dating_app/hosts/domain/crm/host_audience_contact.dart';
import 'package:catch_dating_app/hosts/domain/crm/host_audience_contact_detail.dart';
import 'package:catch_dating_app/hosts/domain/crm/host_communication_plan.dart';
import 'package:catch_dating_app/hosts/domain/crm/host_customer_memory.dart';
import 'package:catch_dating_app/hosts/domain/crm/host_customer_timeline.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

part 'host_customer_sources_section.dart';

class HostCustomerReachSection extends StatelessWidget {
  const HostCustomerReachSection({
    super.key,
    required this.customer,
    required this.communicationPlan,
    required this.communicationPlanLoading,
    required this.communicationPlanFailed,
    required this.messageLoading,
    required this.onMessage,
    required this.onRetryCommunicationPlan,
    required this.onMessagingEnabledChanged,
    this.messageActionInHeader = false,
    this.includeSources = true,
    this.onReviewDuplicates,
  });

  final HostAudienceContactDetail customer;
  final HostCommunicationPlan? communicationPlan;
  final bool communicationPlanLoading;
  final bool communicationPlanFailed;
  final bool messageLoading;
  final VoidCallback onMessage;
  final VoidCallback onRetryCommunicationPlan;
  final ValueChanged<bool>? onMessagingEnabledChanged;
  final bool messageActionInHeader;
  final bool includeSources;
  final VoidCallback? onReviewDuplicates;

  @override
  Widget build(BuildContext context) {
    final recipient = communicationPlan?.singleRecipient;
    final recommendedRoute = recipient?.recommendedRouteId;
    final l10n = context.l10n;
    final t = CatchTokens.of(context);
    return Column(
      key: const ValueKey('host-customer-reach-and-provenance'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        CatchSection.rows(
          title: l10n.hostCustomersMessaging,
          children: [
            if (communicationPlanLoading)
              CatchField.read(
                key: const ValueKey('host-customer-message-plan-loading'),
                content: CatchRecordLayout(
                  title: l10n.hostCustomersMessageOptionsLoading,
                  icon: CatchIcons.tabChats,
                ),
              )
            else if (communicationPlanFailed || recipient == null) ...[
              CatchField.read(
                key: const ValueKey('host-customer-message-plan-error'),
                secondaryAction: CatchFieldSecondaryAction.button(
                  key: const ValueKey('host-customer-message-plan-retry'),
                  label: l10n.hostCustomersCheckMessaging,
                  onActivate: onRetryCommunicationPlan,
                ),
                content: CatchRecordLayout(
                  title: l10n.hostCustomersMessageOptionsUnavailable,
                  metadata: l10n.hostCustomersMessageOptionsRetry,
                  icon: CatchIcons.tabChats,
                  color: t.warning,
                ),
              ),
            ] else if (recommendedRoute != null) ...[
              CatchField.read(
                key: const ValueKey('host-customer-message-availability'),
                secondaryAction: messageActionInHeader
                    ? null
                    : CatchFieldSecondaryAction.button(
                        key: const ValueKey('host-customer-message'),
                        label: l10n.hostCustomersMessagePerson(
                          name: customer.displayName,
                        ),
                        onActivate: messageLoading ? null : onMessage,
                        loading: messageLoading,
                      ),
                content: CatchRecordLayout(
                  title: _recommendedMessageTitle(context, recommendedRoute),
                  metadata: _recommendedMessageBody(context, recommendedRoute),
                  icon: CatchIcons.tabChats,
                ),
              ),
            ] else
              CatchField.read(
                key: const ValueKey('host-customer-message'),
                content: CatchRecordLayout(
                  title: l10n.hostCustomersMessageOptionsUnavailable,
                  metadata: _unavailableMessageBody(context, recipient),
                  icon: CatchIcons.tabChats,
                ),
              ),
            CatchField.read(
              key: const ValueKey('host-customer-whatsapp-permission'),
              content: CatchRecordLayout(
                title: l10n.hostCustomersWhatsappPermission,
                metadata: _permissionSummary(
                  context,
                  customer.whatsappPermission,
                ),
                icon: CatchIcons.verifiedUserOutlined,
                color: switch (customer.whatsappPermission.evidenceStatus) {
                  HostCustomerPermissionEvidenceStatus.unavailable => t.ink2,
                  HostCustomerPermissionEvidenceStatus.incomplete => t.warning,
                  _ => switch (customer.whatsappPermission.effectiveStatus) {
                    HostAudiencePermissionStatus.optedIn => t.success,
                    HostAudiencePermissionStatus.optedOut => t.danger,
                    HostAudiencePermissionStatus.unknown => t.ink2,
                  },
                },
              ),
            ),
            CatchField.toggle(
              copy: catchFieldCopy(context.l10n),
              key: const ValueKey('host-customer-organizer-messages'),
              title: l10n.hostCustomersPauseWhatsappHandoffs,
              titleMaxLines: 5,
              contract: CatchContractConstraints
                  .mutateOrganizerContactCallablePayloadWhatsappAdminSuppressed,
              value: customer.whatsappAdminSuppressed,
              onChanged: onMessagingEnabledChanged == null
                  ? null
                  : (paused) => onMessagingEnabledChanged!(!paused),
            ),
          ],
        ),
        gapH8,
        CatchSection.content(
          child: CatchText(
            l10n.hostCustomersPauseWhatsappHandoffsBody,
            variant: CatchTextVariant.bodyS,
            color: CatchTokens.of(context).ink2,
          ),
        ),
        if (includeSources) ...[
          gapH24,
          HostCustomerSourcesSection(
            customer: customer,
            onReviewDuplicates: onReviewDuplicates,
          ),
        ],
      ],
    );
  }
}

String _recommendedMessageTitle(
  BuildContext context,
  HostCommunicationRouteId route,
) => switch (route) {
  HostCommunicationRouteId.catchChat =>
    context.l10n.hostsHostOrganizerCrmCatchApp,
  HostCommunicationRouteId.personalWhatsappHandoff =>
    context.l10n.hostCustomersWhatsappAppChannel,
  HostCommunicationRouteId.personalEmailHandoff =>
    context.l10n.hostCustomersEmailAppChannel,
  _ => context.l10n.hostCustomersMessageOptionsUnavailable,
};

String _recommendedMessageBody(
  BuildContext context,
  HostCommunicationRouteId route,
) => switch (route) {
  HostCommunicationRouteId.catchChat =>
    context.l10n.hostCustomersMessagePersonCatch,
  HostCommunicationRouteId.personalWhatsappHandoff =>
    context.l10n.hostCustomersMessagePersonHandoff,
  HostCommunicationRouteId.personalEmailHandoff =>
    context.l10n.hostCustomersMessagePersonEmail,
  _ => context.l10n.hostCustomersMessageOptionsUnavailable,
};

String _unavailableMessageBody(
  BuildContext context,
  HostCommunicationRecipientPlan recipient,
) {
  final blockers = recipient.routes
      .map((route) => route.blocker)
      .whereType<HostCommunicationRouteBlocker>()
      .toList(growable: false);
  final blocker =
      blockers.contains(HostCommunicationRouteBlocker.contactOptedOut)
      ? HostCommunicationRouteBlocker.contactOptedOut
      : blockers.contains(HostCommunicationRouteBlocker.organizerSuppressed)
      ? HostCommunicationRouteBlocker.organizerSuppressed
      : blockers.firstOrNull;
  return _communicationRouteBlockerLabel(context, blocker);
}

String _communicationRouteBlockerLabel(
  BuildContext context,
  HostCommunicationRouteBlocker? blocker,
) => switch (blocker) {
  HostCommunicationRouteBlocker.catchAccountRequired =>
    context.l10n.hostCustomersConversationUnlinked,
  HostCommunicationRouteBlocker.identityAmbiguous =>
    context.l10n.hostCustomersConversationAmbiguous,
  HostCommunicationRouteBlocker.missingPhone =>
    context.l10n.hostCustomersWhatsappMissingPhone,
  HostCommunicationRouteBlocker.missingEmail =>
    context.l10n.hostCustomersEmailMissingEmail,
  HostCommunicationRouteBlocker.organizerSuppressed =>
    context.l10n.hostCustomersWhatsappOrganizerSuppressed,
  HostCommunicationRouteBlocker.contactOptedOut =>
    context.l10n.hostCustomersWhatsappContactOptedOut,
  HostCommunicationRouteBlocker.permissionRequired =>
    context.l10n.hostCustomersMessagePermissionRequired,
  HostCommunicationRouteBlocker.senderUnavailable =>
    context.l10n.hostCustomersMessageSenderUnavailable,
  HostCommunicationRouteBlocker.contactUnavailable ||
  HostCommunicationRouteBlocker.endpointChanged ||
  HostCommunicationRouteBlocker.intentUnsupported ||
  null => context.l10n.hostCustomersMessageOptionsUnavailable,
};

String _permissionSummary(
  BuildContext context,
  HostCustomerWhatsappPermission permission,
) {
  final scoped = <String>[];
  for (final entry in permission.purposes.entries) {
    final label = switch (entry.key) {
      'eventOperations' => context.l10n.hostCustomersWhatsappOperations,
      'marketing' => context.l10n.hostCustomersWhatsappMarketing,
      _ => null,
    };
    if (label == null) continue;
    final purpose = entry.value;
    final status =
        purpose.evidenceStatus ==
            HostCustomerPermissionEvidenceStatus.incomplete
        ? context.l10n.hostCustomersWhatsappPermissionIncomplete
        : _permissionStatusLabel(context, purpose.status);
    scoped.add('$label: $status');
    if (purpose.status == HostAudiencePermissionStatus.optedIn &&
        !purpose.deliveryAvailable) {
      scoped.add(context.l10n.hostCustomersMessageOptionsUnavailable);
    }
  }
  final broad = _broadPermissionSummary(context, permission);
  if (scoped.isEmpty) return broad;
  if (permission.status == HostAudiencePermissionStatus.unknown ||
      permission.effectiveStatus != permission.status) {
    return scoped.join('\n');
  }
  return [broad, ...scoped].join('\n');
}

String _broadPermissionSummary(
  BuildContext context,
  HostCustomerWhatsappPermission permission,
) {
  if (permission.evidenceStatus ==
      HostCustomerPermissionEvidenceStatus.unavailable) {
    return context.l10n.hostCustomersWhatsappPermissionUnavailable;
  }
  if (permission.evidenceStatus ==
      HostCustomerPermissionEvidenceStatus.incomplete) {
    return '${_permissionStatusLabel(context, permission.status)}\n${context.l10n.hostCustomersWhatsappPermissionIncomplete}';
  }
  final date = permission.decisionAt == null
      ? null
      : AppTimeFormatters.shortDate(permission.decisionAt!);
  return switch (permission.status) {
    HostAudiencePermissionStatus.unknown =>
      context.l10n.hostCustomersWhatsappPermissionUnknown,
    HostAudiencePermissionStatus.optedIn
        when permission.sourceFormTitle != null && date != null =>
      context.l10n.hostCustomersWhatsappPermissionGrantedByForm(
        formTitle: permission.sourceFormTitle!,
        date: date,
      ),
    HostAudiencePermissionStatus.optedIn when date != null =>
      context.l10n.hostCustomersWhatsappPermissionGranted(date: date),
    HostAudiencePermissionStatus.optedOut when date != null =>
      context.l10n.hostCustomersWhatsappPermissionRevoked(date: date),
    HostAudiencePermissionStatus.optedIn =>
      context.l10n.hostCustomersWhatsappPermissionGrantedUndated,
    HostAudiencePermissionStatus.optedOut =>
      context.l10n.hostCustomersWhatsappPermissionRevokedUndated,
  };
}

String _permissionStatusLabel(
  BuildContext context,
  HostAudiencePermissionStatus status,
) => switch (status) {
  HostAudiencePermissionStatus.optedIn =>
    context.l10n.hostCustomersWhatsappPermissionGrantedUndated,
  HostAudiencePermissionStatus.optedOut =>
    context.l10n.hostCustomersWhatsappPermissionRevokedUndated,
  HostAudiencePermissionStatus.unknown =>
    context.l10n.hostCustomersWhatsappPermissionUnknown,
};

String _originKindLabel(
  BuildContext context,
  HostCustomerOriginSourceKind kind,
) => switch (kind) {
  HostCustomerOriginSourceKind.catchBooking =>
    context.l10n.hostCustomersOriginCatchBooking,
  HostCustomerOriginSourceKind.hostImport =>
    context.l10n.hostCustomersOriginHostImport,
  HostCustomerOriginSourceKind.hostManual =>
    context.l10n.hostCustomersOriginHostManual,
  HostCustomerOriginSourceKind.webOtp => context.l10n.hostCustomersOriginWebOtp,
  HostCustomerOriginSourceKind.providerSync =>
    context.l10n.hostCustomersOriginProviderSync,
  HostCustomerOriginSourceKind.hostForm =>
    context.l10n.hostCustomersTimelineFormFallback,
};

String _originLabel(BuildContext context, HostCustomerOrigin origin) =>
    switch (origin.sourceKind) {
      HostCustomerOriginSourceKind.catchBooking =>
        origin.eventTitle ?? context.l10n.hostCustomersOriginCatchBooking,
      HostCustomerOriginSourceKind.hostImport =>
        context.l10n.hostCustomersOriginHostImport,
      HostCustomerOriginSourceKind.hostManual =>
        context.l10n.hostCustomersOriginHostManual,
      HostCustomerOriginSourceKind.webOtp =>
        origin.eventTitle ?? context.l10n.hostCustomersOriginWebOtp,
      HostCustomerOriginSourceKind.providerSync =>
        origin.eventTitle ?? context.l10n.hostCustomersOriginProviderSync,
      HostCustomerOriginSourceKind.hostForm =>
        context.l10n.hostCustomersOriginHostForm(
          formTitle:
              origin.formTitle ??
              context.l10n.hostCustomersTimelineFormFallback,
        ),
    };

enum HostCustomerHistoryKind { all, forms, events, messages, outreach }

class HostCustomerHistoryFilterSection extends StatefulWidget {
  const HostCustomerHistoryFilterSection({super.key, required this.builder});

  final Widget Function(HostCustomerHistoryKind filter) builder;

  @override
  State<HostCustomerHistoryFilterSection> createState() =>
      _HostCustomerHistoryFilterSectionState();
}

class _HostCustomerHistoryFilterSectionState
    extends State<HostCustomerHistoryFilterSection> {
  HostCustomerHistoryKind selected = HostCustomerHistoryKind.all;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      CatchSection.content(
        child: Align(
          alignment: AlignmentDirectional.centerStart,
          child: CatchSelectionMenu<HostCustomerHistoryKind>.control(
            title: context.l10n.hostCustomersTimeline,
            tooltip: context.l10n.hostCustomersTimeline,
            buttonKey: const ValueKey('host-customer-history-filter'),
            value: selected,
            labelBuilder: (item) => item.label,
            onSelected: (value) => setState(() => selected = value),
            items: [
              CatchSelectionMenuItem(
                value: HostCustomerHistoryKind.all,
                label: context.l10n.hostCustomersAllActivity,
              ),
              CatchSelectionMenuItem(
                value: HostCustomerHistoryKind.forms,
                label: context.l10n.hostFormsViewForms,
              ),
              CatchSelectionMenuItem(
                value: HostCustomerHistoryKind.events,
                label: context.l10n.hostNavigationEvents,
              ),
              CatchSelectionMenuItem(
                value: HostCustomerHistoryKind.messages,
                label: context.l10n.hostCustomersMessageHistory,
              ),
              CatchSelectionMenuItem(
                value: HostCustomerHistoryKind.outreach,
                label: context.l10n.hostCustomersOutreach,
              ),
            ],
          ),
        ),
      ),
      gapH16,
      widget.builder(selected),
    ],
  );
}

class HostCustomerTimelineSection extends StatelessWidget {
  const HostCustomerTimelineSection({
    super.key,
    required this.customer,
    required this.onOpenFormResponse,
    required this.onOpenEvent,
    required this.onOpenCatchThread,
    required this.onOpenWhatsappThread,
    this.filter = HostCustomerHistoryKind.all,
  });

  final HostAudienceContactDetail customer;
  final ValueChanged<String> onOpenFormResponse;
  final ValueChanged<String> onOpenEvent;
  final ValueChanged<String> onOpenCatchThread;
  final ValueChanged<String> onOpenWhatsappThread;
  final HostCustomerHistoryKind filter;

  @override
  Widget build(BuildContext context) {
    final entries = customer.timeline
        .where(
          (entry) => switch (filter) {
            HostCustomerHistoryKind.all => true,
            HostCustomerHistoryKind.forms =>
              entry is HostCustomerFormTimelineEntry,
            HostCustomerHistoryKind.events =>
              entry is HostCustomerEventTimelineEntry,
            HostCustomerHistoryKind.messages =>
              entry is HostCustomerSendTimelineEntry ||
                  entry is HostCustomerReplyTimelineEntry,
            HostCustomerHistoryKind.outreach =>
              entry is HostCustomerOutreachTimelineEntry,
          },
        )
        .toList(growable: false);
    final coverage = customer.timelineCoverage;
    final selectedCoverage = switch (filter) {
      HostCustomerHistoryKind.all => [
        coverage.forms,
        coverage.events,
        coverage.sends,
        coverage.replies,
        coverage.outreach,
      ],
      HostCustomerHistoryKind.forms => [coverage.forms],
      HostCustomerHistoryKind.events => [coverage.events],
      HostCustomerHistoryKind.messages => [coverage.sends, coverage.replies],
      HostCustomerHistoryKind.outreach => [coverage.outreach],
    };
    final hasGap =
        customer.timelineTruncated ||
        selectedCoverage.any(
          (value) => value != HostCustomerTimelineCoverageValue.exact,
        );
    final showMessageBoundary =
        filter == HostCustomerHistoryKind.all ||
        filter == HostCustomerHistoryKind.messages;
    return CatchSection.plain(
      key: const ValueKey('host-customer-timeline'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (entries.isEmpty)
            CatchSection.content(
              child: CatchText(
                hasGap
                    ? context.l10n.hostCustomersTimelineUnavailable
                    : context.l10n.hostCustomersTimelineEmpty,
                variant: CatchTextVariant.supporting,
              ),
            )
          else
            HostCustomerTimelineList(
              entries: entries,
              onOpenFormResponse: onOpenFormResponse,
              onOpenEvent: onOpenEvent,
              onOpenCatchThread: onOpenCatchThread,
              onOpenWhatsappThread: onOpenWhatsappThread,
            ),
          if (hasGap && entries.isNotEmpty) ...[
            gapH12,
            CatchSection.content(
              child: CatchText(
                context.l10n.hostCustomersTimelinePartialBody,
                variant: CatchTextVariant.bodyS,
                color: CatchTokens.of(context).ink2,
              ),
            ),
          ],
          if (showMessageBoundary) ...[
            gapH12,
            CatchSection.content(
              child: CatchText(
                context.l10n.hostCustomersTimelineReplyBoundary,
                variant: CatchTextVariant.bodyS,
                color: CatchTokens.of(context).ink2,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class HostCustomerTimelineList extends StatelessWidget {
  const HostCustomerTimelineList({
    super.key,
    required this.entries,
    required this.onOpenFormResponse,
    required this.onOpenEvent,
    required this.onOpenCatchThread,
    required this.onOpenWhatsappThread,
  });

  final List<HostCustomerTimelineEntry> entries;
  final ValueChanged<String> onOpenFormResponse;
  final ValueChanged<String> onOpenEvent;
  final ValueChanged<String> onOpenCatchThread;
  final ValueChanged<String> onOpenWhatsappThread;

  @override
  Widget build(BuildContext context) {
    final ordered = [...entries]
      ..sort((a, b) {
        final time = b.occurredAt.compareTo(a.occurredAt);
        return time != 0 ? time : a.timelineId.compareTo(b.timelineId);
      });
    final days = <DateTime, List<HostCustomerTimelineEntry>>{};
    for (final entry in ordered) {
      final local = entry.occurredAt.toLocal();
      final day = DateTime(local.year, local.month, local.day);
      days.putIfAbsent(day, () => []).add(entry);
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final day in days.entries) ...[
          if (day.key != days.keys.first) gapH24,
          CatchSection.rows(
            title: MaterialLocalizations.of(context).formatFullDate(day.key),
            children: [
              for (final entry in day.value)
                hostCustomerTimelineField(
                  context,
                  entry: entry,
                  onOpenFormResponse: onOpenFormResponse,
                  onOpenEvent: onOpenEvent,
                  onOpenCatchThread: onOpenCatchThread,
                  onOpenWhatsappThread: onOpenWhatsappThread,
                ),
            ],
          ),
        ],
      ],
    );
  }
}

CatchField hostCustomerTimelineField(
  BuildContext context, {
  required HostCustomerTimelineEntry entry,
  required ValueChanged<String> onOpenFormResponse,
  required ValueChanged<String> onOpenEvent,
  required ValueChanged<String> onOpenCatchThread,
  required ValueChanged<String> onOpenWhatsappThread,
}) {
  final t = CatchTokens.of(context);
  final key = ValueKey('host-customer-timeline-${entry.timelineId}');
  return switch (entry) {
    HostCustomerFormTimelineEntry() => CatchField.navigate(
      key: key,
      onActivate: () => onOpenFormResponse(entry.responseId),
      content: CatchRecordLayout(
        title:
            entry.formTitle ?? context.l10n.hostCustomersTimelineFormFallback,
        metadata: entry.action == HostCustomerFormTimelineAction.submitted
            ? context.l10n.hostCustomersTimelineFormSubmitted(
                answerCount: entry.answeredQuestionCount,
              )
            : context.l10n.hostFormResponsesWithdrawn,
        icon: CatchIcons.tabForms,
        color: t.primary,
      ),
    ),
    HostCustomerEventTimelineEntry() => CatchField.navigate(
      key: key,
      onActivate: () => onOpenEvent(entry.eventId),
      content: CatchRecordLayout(
        title: entry.eventName,
        metadata: context.l10n.hostCustomersTimelineEventStatus(
          status: entry.checkedIn ? 'checkedIn' : entry.status,
        ),
        icon: CatchIcons.eventAvailable,
        color: entry.checkedIn ? t.success : t.ink2,
      ),
    ),
    HostCustomerSendTimelineEntry() => CatchField.read(
      key: key,
      content: CatchRecordLayout(
        title: entry.sendKind == HostCustomerTimelineSendKind.manualHandoff
            ? context.l10n.hostCustomersTimelineManualHandoff
            : entry.name,
        metadata: context.l10n.hostCustomersTimelineSendStatus(
          status: entry.status,
        ),
        icon: CatchIcons.sendRounded,
        color: entry.status == 'failed' ? t.danger : t.ink2,
      ),
    ),
    HostCustomerReplyTimelineEntry() => CatchField.navigate(
      key: key,
      onActivate: () => entry.transport == HostCustomerReplyTransport.catchChat
          ? onOpenCatchThread(entry.threadId)
          : onOpenWhatsappThread(entry.threadId),
      content: CatchRecordLayout(
        title: context.l10n.hostCustomersTimelineDirection(
          direction: entry.direction.name,
        ),
        metadata: entry.transport == HostCustomerReplyTransport.catchChat
            ? context.l10n.hostCustomersTimelineCatchMessage
            : context.l10n.hostCustomersTimelineManagedWhatsapp,
        description: entry.bodyPreview,
        icon: CatchIcons.tabChats,
        color: t.primary,
      ),
    ),
    HostCustomerOutreachTimelineEntry() => CatchField.read(
      key: key,
      content: CatchRecordLayout(
        title: context.l10n.hostCustomersOutreachChannel(
          channel: entry.channel.name,
        ),
        metadata: context.l10n.hostCustomersOutreachOutcome(
          outcome: entry.outcome.name,
        ),
        description: entry.notePreview,
        icon: CatchIcons.callOutlined,
        color: t.ink2,
      ),
    ),
  };
}
