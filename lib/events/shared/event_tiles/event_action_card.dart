import 'package:catch_dating_app/events/domain/event.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class EventActionCard extends StatelessWidget {
  const EventActionCard({
    super.key,
    required this.event,
    required this.badges,
    required this.metaRows,
    required this.actions,
    this.title,
    this.subtitle,
    this.indexLabel,
    this.headerAccessory,
    this.urgent = false,
    this.backgroundColor,
    this.borderColor,
    this.gradientColors,
    this.topAccentColors,
    this.radius = CatchRadius.lg,
    this.onTap,
  });

  final Event event;
  final List<EventActionCardBadge> badges;
  final List<List<CatchMetaEntry>> metaRows;
  final List<EventActionCardAction> actions;
  final String? title;
  final String? subtitle;
  final String? indexLabel;
  final Widget? headerAccessory;
  final bool urgent;
  final Color? backgroundColor;
  final Color? borderColor;
  final List<Color>? gradientColors;

  /// Optional activity-pigment top accent bar (design-system DashboardEventCard,
  /// `linear-gradient(accent, deep)`). When set, a 6px bar reads the event's
  /// activity at the card's top edge.
  final List<Color>? topAccentColors;
  final double radius;

  /// Whole-card tap target. Inner [actions] stay separately reachable.
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final effectiveGradientColors =
        gradientColors ??
        [
          urgent
              ? t.primarySoft.withValues(alpha: CatchOpacity.gradientBand)
              : t.primarySoft.withValues(alpha: CatchOpacity.gradientBandSoft),
          t.surface,
          t.raised.withValues(alpha: CatchOpacity.gradientBand),
        ];

    return CatchSurface(
      padding: EdgeInsets.zero,
      backgroundColor: backgroundColor ?? t.surface,
      borderSpec: CatchBorder.resolve(
        t,
        CatchBorderRole.boundary,
        color:
            borderColor ??
            (urgent
                ? t.primary.withValues(alpha: CatchOpacity.mutedBorderUrgent)
                : t.line2),
      ),
      radius: radius,
      emphasis: CatchSurfaceEmphasis.subtle,
      gradient: LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: effectiveGradientColors,
      ),
      clipBehavior: Clip.antiAlias,
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          if (topAccentColors != null && topAccentColors!.isNotEmpty)
            SizedBox(
              height: CatchSpacing.micro6,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(colors: topAccentColors!),
                ),
              ),
            ),
          Padding(
            padding: CatchInsets.tileContent,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                EventActionCardHeader(badges: badges, indexLabel: indexLabel),
                if (headerAccessory != null) ...[gapH10, headerAccessory!],
                gapH12,
                Text(
                  title ?? event.title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: CatchTextStyles.headlineS(context),
                ),
                if (subtitle != null && subtitle!.trim().isNotEmpty) ...[
                  gapH4,
                  CatchText(
                    subtitle!,
                    maxLines: 1,

                    variant: CatchTextVariant.supporting,
                    color: t.ink2,
                  ),
                ],
                if (metaRows.isNotEmpty) ...[
                  gapH12,
                  for (var index = 0; index < metaRows.length; index += 1) ...[
                    if (index > 0) gapH6,
                    CatchMetaRow.group(entries: metaRows[index]),
                  ],
                ],
                if (actions.isNotEmpty) ...[
                  gapH16,
                  EventActionList(actions: actions),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class EventActionCardBadge {
  const EventActionCardBadge({
    required this.label,
    required this.tone,
    this.icon,
  });

  final String label;
  final CatchBadgeTone tone;
  final IconData? icon;
}

class EventActionCardAction {
  const EventActionCardAction({
    required this.label,
    required this.icon,
    required this.onPressed,
    this.key,
    this.variant = CatchButtonVariant.secondary,
    this.isLoading = false,
    this.semanticsLabel,
    this.accentColor,
  });

  final Key? key;
  final String label;
  final IconData icon;
  final VoidCallback? onPressed;
  final CatchButtonVariant variant;
  final bool isLoading;
  final String? semanticsLabel;

  /// Activity pigment for a primary action (design-system DashboardEventCard).
  final Color? accentColor;
}

class EventActionCardHeader extends StatelessWidget {
  const EventActionCardHeader({
    super.key,
    required this.badges,
    required this.indexLabel,
  });

  final List<EventActionCardBadge> badges;
  final String? indexLabel;

  @override
  Widget build(BuildContext context) {
    final effectiveIndex = indexLabel?.trim();
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Wrap(
            spacing: CatchSpacing.s2,
            runSpacing: CatchSpacing.s1,
            children: [
              for (final badge in badges)
                CatchBadge(
                  label: badge.label,
                  tone: badge.tone,
                  icon: badge.icon,
                ),
            ],
          ),
        ),
        if (effectiveIndex != null && effectiveIndex.isNotEmpty) ...[
          gapW8,
          CatchBadge(label: effectiveIndex),
        ],
      ],
    );
  }
}

class EventActionList extends StatelessWidget {
  const EventActionList({super.key, required this.actions});

  final List<EventActionCardAction> actions;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (var index = 0; index < actions.length; index += 1) ...[
          if (index > 0) gapH10,
          CatchButton(
            key: actions[index].key,
            label: actions[index].label,
            leading: Icon(actions[index].icon, size: CatchIcon.md),
            variant: actions[index].variant,
            accentColor: actions[index].accentColor,
            fullWidth: true,
            status: (actions[index].isLoading)
                ? CatchButtonStatus.loading
                : CatchButtonStatus.idle,
            semanticsLabel: actions[index].semanticsLabel,
            onPressed: actions[index].isLoading
                ? null
                : actions[index].onPressed,
          ),
        ],
      ],
    );
  }
}
