import 'package:catch_dating_app/core/theme/activity_palette.dart';
import 'package:catch_dating_app/events/domain/event.dart';
import 'package:catch_dating_app/events/domain/event_formatters.dart';
import 'package:catch_dating_app/hosts/domain/host_events_policy.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class HostTodayEventSection extends StatelessWidget {
  const HostTodayEventSection({
    super.key,
    required this.event,
    required this.now,
    required this.taskCount,
    this.taskCountIsComplete = true,
    required this.onPressed,
    this.onRehearse,
    this.contained = true,
  });

  final Event event;
  final DateTime now;
  final int taskCount;
  final bool taskCountIsComplete;
  final VoidCallback onPressed;
  final VoidCallback? onRehearse;
  final bool contained;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final activity = ActivityPalette.resolve(context, event.activityKind);

    final content = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        CatchBadge.functional(
          label: _eventStartLeadLabel(context, event, now),
          backgroundColor: activity.soft,
          foregroundColor: t.ink,
          borderColor: Colors.transparent,
        ),
        gapH16,
        Text(
          event.title,
          style: CatchTextStyles.eventTitle(context, color: t.ink),
        ),
        gapH14,
        HostTodayEventMetadataRow(event: event, now: now),
        gapH20,
        const CatchDivider.section(),
        gapH20,
        Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            HostTodayEventMetricTile(
              value: taskCountIsComplete
                  ? context.l10n.hostsHostTodayVisiblecopyTaskcount(
                      taskCount: taskCount,
                    )
                  : taskCount > 0
                  ? context.l10n.hostTodayTaskCountPartial(count: taskCount)
                  : '—',
              label: context.l10n.hostsHostTodayLabelNeedsYou,
              supporting: taskCountIsComplete
                  ? context.l10n.hostTodayTaskSummary
                  : context.l10n.hostTodayTaskCoverageIncomplete,
              icon: CatchIcons.factCheckOutlined,
              accent: activity,
            ),
            gapH20,
            HostTodayEventMetricTile(
              value: context.l10n.hostsHostTodayVisiblecopySignedupcount(
                signedUpCount: event.signedUpCount,
              ),
              label: context.l10n.hostsHostTodayLabelGoing,
              supporting: context.l10n.hostTodayCheckedIn(
                count: event.attendedCount,
              ),
              icon: CatchIcons.groupsOutlined,
              accent: activity,
            ),
          ],
        ),
        gapH20,
        const CatchDivider.section(),
        gapH20,
        CatchButton(
          label: !event.startTime.isAfter(now) && event.endTime.isAfter(now)
              ? context.l10n.hostsHostTodayLabelOpenRunOfShow
              : context.l10n.hostsHostTodayLabelSetUpRun,
          fullWidth: true,
          mode: CatchButtonMode.rounded,
          backgroundColor: activity.deep,
          foregroundColor: CatchTokens.editorialWhite,
          borderColor: Colors.transparent,
          onPressed: onPressed,
        ),
        if (onRehearse != null) ...[
          gapH8,
          CatchButton(
            key: const ValueKey<String>('host-today-rehearse-event'),
            label: context.l10n.hostTodayRehearseThisEvent,
            leading: Icon(CatchIcons.scienceOutlined, size: CatchIcon.sm),
            fullWidth: true,
            mode: CatchButtonMode.rounded,
            variant: CatchButtonVariant.secondary,
            onPressed: onRehearse,
          ),
        ],
      ],
    );
    return !contained
        ? content
        : CatchSurface(
            borderRole: CatchBorderRole.separator,
            backgroundColor: t.surface,
            borderRadius: BorderRadius.circular(CatchRadius.md),
            clipBehavior: Clip.antiAlias,
            padding: CatchInsets.contentRelaxed,
            child: content,
          );
  }
}

class HostTodayEventMetadataRow extends StatelessWidget {
  const HostTodayEventMetadataRow({
    super.key,
    required this.event,
    required this.now,
  });

  final Event event;
  final DateTime now;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final metadataStyle = CatchTextStyles.supporting(context, color: t.ink2);
    final time = Text(
      context.l10n.hostsHostTodayTextEventdaylabelTime(
        eventDayLabel: _eventDayLabel(context, event, now),
        time: EventFormatters.time(event.startTime),
      ),
      style: metadataStyle,
    );
    final location = Text(event.locationName, style: metadataStyle);
    return Wrap(
      spacing: CatchSpacing.s3,
      runSpacing: CatchSpacing.s1,
      children: [time, location],
    );
  }
}

class HostTodayEventMetricTile extends StatelessWidget {
  const HostTodayEventMetricTile({
    super.key,
    required this.value,
    required this.label,
    this.supporting,
    this.icon,
    this.accent,
    this.valueColor,
  });

  final String value;
  final String label;
  final String? supporting;
  final IconData? icon;
  final ActivityStyle? accent;
  final Color? valueColor;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final metric = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text.rich(
          TextSpan(
            children: [
              TextSpan(
                text: value,
                style: CatchTextStyles.titleL(
                  context,
                  color: valueColor ?? t.ink,
                ),
              ),
              TextSpan(
                text: ' $label',
                style: CatchTextStyles.sectionTitle(context, color: t.ink),
              ),
            ],
          ),
        ),
        if (supporting != null) ...[
          gapH2,
          CatchText(
            supporting!,
            variant: CatchTextVariant.supporting,
            color: t.ink2,
          ),
        ],
      ],
    );
    if (icon == null || accent == null) return metric;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        CatchIconTile(
          icon: icon!,
          iconColor: t.ink,
          backgroundColor: accent!.soft,
          borderColor: Colors.transparent,
          size: CatchSpacing.s12,
          iconSize: CatchIcon.md,
          radius: CatchRadius.pill,
        ),
        gapW12,
        Expanded(child: metric),
      ],
    );
  }
}

String _eventDayLabel(BuildContext context, Event event, DateTime now) {
  if (DateUtils.isSameDay(event.startTime, now) && event.startTime.hour >= 17) {
    return context.l10n.hostTodayTonight;
  }
  return MaterialLocalizations.of(context).formatMediumDate(event.startTime);
}

String _eventStartLeadLabel(BuildContext context, Event event, DateTime now) {
  final l10n = context.l10n;
  if (!event.startTime.isAfter(now) && event.endTime.isAfter(now)) {
    return l10n.hostTodayLiveNow;
  }
  final lead = event.startTime.difference(now);
  if (!lead.isNegative && lead < hostEventsImminentEventLeadTime) {
    return l10n.hostTodayStartsInMinutes(minutes: lead.inMinutes.clamp(1, 59));
  }
  if (DateUtils.isSameDay(event.startTime, now) && !lead.isNegative) {
    return l10n.hostTodayStartsInHours(
      hours: lead.inHours,
      minutes: lead.inMinutes.remainder(60),
    );
  }
  return l10n.hostTodayStartsOn(
    date: MaterialLocalizations.of(context).formatMediumDate(event.startTime),
    time: EventFormatters.time(event.startTime),
  );
}
