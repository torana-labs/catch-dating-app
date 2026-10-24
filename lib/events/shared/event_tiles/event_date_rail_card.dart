import 'dart:math' as math;

import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/theme/activity_palette.dart';
import 'package:catch_dating_app/core/widgets/event_activity_visuals.dart';
import 'package:catch_dating_app/events/domain/event.dart';
import 'package:catch_dating_app/events/domain/event_capacity_labels.dart';
import 'package:catch_dating_app/events/domain/event_formatters.dart';
import 'package:catch_dating_app/events/shared/event_price_copy.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

const double _dateRailWidth = CatchLayout.eventDateRailWidth;
const double _ticketNotchRadius = CatchLayout.ticketNotchRadius;
const double _ticketNotchDepth = CatchLayout.ticketNotchDepth;

enum EventDateRailCardStripPosition { single, first, middle, last }

EventDateRailCardStripPosition eventDateRailCardStripPositionFor(
  int index,
  int total,
) {
  if (total <= 1) return EventDateRailCardStripPosition.single;
  if (index == 0) return EventDateRailCardStripPosition.first;
  if (index == total - 1) return EventDateRailCardStripPosition.last;
  return EventDateRailCardStripPosition.middle;
}

class EventDateRailCard extends StatelessWidget {
  const EventDateRailCard({
    super.key,
    required this.event,
    required this.kicker,
    this.title,
    this.supportingLabel,
    this.priceLabel,
    this.capacityLabel,
    this.statusLabel,
    this.showAttendeeSignal = false,
    this.stripPosition = EventDateRailCardStripPosition.single,
    this.heroTag,
    this.onTap,
  });

  final Event event;
  final String kicker;
  final String? title;
  final String? supportingLabel;
  final String? priceLabel;
  final String? capacityLabel;
  final String? statusLabel;
  final bool showAttendeeSignal;
  final EventDateRailCardStripPosition stripPosition;
  final Object? heroTag;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final visual = eventActivityVisual(event.activityKind, context: context);
    final capacity = EventCapacityLabels(event);
    final effectiveStatus = statusLabel?.trim();
    final effectiveSupporting = supportingLabel?.trim();
    final effectiveTitle = title?.trim().isNotEmpty == true
        ? title!.trim()
        : _eventIdentityTitle(event);
    final effectivePrice = (priceLabel ?? eventPriceLabel(context.l10n, event))
        .trim();
    final effectiveCapacity =
        capacityLabel?.trim() ?? capacity.goingAvailabilityLabel();
    final decisionLabel = [
      EventFormatters.time(event.startTime),
      effectiveCapacity,
    ].where((label) => label.trim().isNotEmpty).join(' · ');
    final showDecisionStatus =
        effectiveStatus != null &&
        effectiveStatus.isNotEmpty &&
        !decisionLabel.toLowerCase().contains(effectiveStatus.toLowerCase());
    final perforationTop =
        stripPosition == EventDateRailCardStripPosition.single ||
            stripPosition == EventDateRailCardStripPosition.first
        ? CatchSpacing.s4
        : 0.0;
    final perforationBottom =
        stripPosition == EventDateRailCardStripPosition.single ||
            stripPosition == EventDateRailCardStripPosition.last
        ? CatchSpacing.s4
        : 0.0;
    final physicalElevation =
        stripPosition == EventDateRailCardStripPosition.single
        ? CatchElevation.physicalTicket
        : 0.0;
    final semanticLabel = <String>[
      effectiveTitle,
      kicker,
      event.longDateLabel,
      if (effectiveSupporting != null && effectiveSupporting.isNotEmpty)
        effectiveSupporting,
      decisionLabel,
      if (showDecisionStatus) effectiveStatus,
      effectivePrice,
    ].whereType<String>().where((label) => label.isNotEmpty).join(', ');
    final ticket = PhysicalShape(
      clipper: _DateRailTicketClipper(position: stripPosition),
      clipBehavior: Clip.antiAlias,
      color: t.surface,
      shadowColor: CatchElevation.physicalShadow,
      child: CatchSurface(
        onTap: onTap,
        radius: CatchRadius.md,
        backgroundColor: Colors.transparent,
        padding: EdgeInsets.zero,
        child: Stack(
          children: [
            Padding(
              padding: const EdgeInsets.only(left: _dateRailWidth),
              child: Padding(
                padding: CatchInsets.eventTicketBody,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CatchMetadataText(
                      kicker,
                      color: visual.accent,
                      uppercase: true,
                    ),
                    gapH6,
                    Text(
                      effectiveTitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: CatchTextStyles.eventDisplay(
                        context,
                        step: CatchTextStylesSize.s,
                        height: 1.06,
                      ),
                    ),
                    if (effectiveSupporting != null &&
                        effectiveSupporting.isNotEmpty) ...[
                      gapH4,
                      CatchText(
                        effectiveSupporting,
                        maxLines: 2,

                        variant: CatchTextVariant.supporting,
                        color: t.ink2,
                      ),
                    ],
                    if (showAttendeeSignal && event.signedUpCount > 0) ...[
                      gapH8,
                      CatchAvatarRow(
                        countLabelBuilder: catchAvatarCountLabelBuilder(
                          context.l10n,
                        ),
                        items: const [],
                        totalCount: event.signedUpCount,
                        size: 24,
                        veiledCount: event.signedUpCount,
                        veiledColors: ActivityPalette.resolve(
                          context,
                          event.activityKind,
                        ).avatarColors,
                      ),
                    ],
                    gapH8,
                    EventTicketStubRow(
                      decisionLabel: decisionLabel,
                      statusLabel: effectiveStatus,
                      priceLabel: effectivePrice,
                      statusColor: visual.accent,
                    ),
                  ],
                ),
              ),
            ),
            Positioned(
              left: 0,
              top: 0,
              bottom: 0,
              width: _dateRailWidth,
              child: DateRail(
                startTime: event.startTime,
                color: visual.accent,
                activityIcon: visual.icon,
              ),
            ),
            Positioned(
              left: _dateRailWidth,
              top: perforationTop,
              bottom: perforationBottom,
              child: IgnorePointer(
                child: PerforationDivider(color: t.ticketPerforationLine),
              ),
            ),
            Positioned.fill(
              child: IgnorePointer(
                child: CustomPaint(
                  painter: _DateRailTicketBorderPainter(
                    color: t.line2,
                    position: stripPosition,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
    final card = physicalElevation == 0
        ? ticket
        : CustomPaint(
            painter: _DateRailTicketShadowPainter(
              color: CatchElevation.physicalShadow,
              elevation: physicalElevation,
              position: stripPosition,
            ),
            child: ticket,
          );
    final cardWithHero = heroTag == null
        ? card
        : CatchHeroViewport(tag: heroTag!, child: card);
    return Semantics(
      container: true,
      button: onTap != null,
      label: semanticLabel,
      hint: onTap == null
          ? null
          : context.l10n.eventsEventDateRailCardSemanticsOpensEventDetails,
      onTap: onTap,
      child: ExcludeSemantics(child: cardWithHero),
    );
  }
}

/// Canonical decision row used by date-rail and agenda ticket compositions.
class EventTicketStubRow extends StatelessWidget {
  const EventTicketStubRow({
    super.key,
    required this.decisionLabel,
    required this.priceLabel,
    required this.statusColor,
    this.statusLabel,
  });

  final String decisionLabel;
  final String? statusLabel;
  final String priceLabel;
  final Color statusColor;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final effectiveStatus = statusLabel?.trim();
    final showStatus =
        effectiveStatus != null &&
        effectiveStatus.isNotEmpty &&
        !decisionLabel.toLowerCase().contains(effectiveStatus.toLowerCase());
    final decisionSpan = TextSpan(
      style: CatchTextStyles.monoLabelS(context, color: t.ink2),
      children: [
        TextSpan(text: decisionLabel.toUpperCase()),
        if (showStatus)
          TextSpan(
            text: ' · ${effectiveStatus.toUpperCase()}',
            style: CatchTextStyles.monoLabelS(context, color: statusColor),
          ),
      ],
    );
    return LayoutBuilder(
      builder: (context, constraints) {
        final textScaler = MediaQuery.textScalerOf(context);
        final shouldStack =
            textScaler.scale(1) > 1.3 ||
            constraints.maxWidth <
                CatchLayout.eventTicketDecisionInlineMinWidth;
        Text decisionText({required int maxLines}) => Text.rich(
          decisionSpan,
          key: const ValueKey('event_date_rail_card.decision'),
          maxLines: maxLines,
          overflow: TextOverflow.ellipsis,
        );
        final priceText = Text(
          priceLabel.toUpperCase(),
          key: const ValueKey('event_date_rail_card.price'),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          textAlign: TextAlign.end,
          style: CatchTextStyles.monoCapsLabel(context, color: t.ink),
        );
        if (shouldStack) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              decisionText(maxLines: 2),
              gapH4,
              Align(
                alignment: AlignmentDirectional.centerEnd,
                child: priceText,
              ),
            ],
          );
        }
        return Row(
          crossAxisAlignment: CrossAxisAlignment.baseline,
          textBaseline: TextBaseline.alphabetic,
          children: [
            Expanded(child: decisionText(maxLines: 1)),
            gapW12,
            priceText,
          ],
        );
      },
    );
  }
}

Path _dateRailTicketPath(
  Size size, {
  required EventDateRailCardStripPosition position,
}) {
  final shapeTop =
      position == EventDateRailCardStripPosition.single ||
      position == EventDateRailCardStripPosition.first;
  final shapeBottom =
      position == EventDateRailCardStripPosition.single ||
      position == EventDateRailCardStripPosition.last;
  final radius = math.min(CatchRadius.md, size.shortestSide / 2);
  final notchCenterX = math.min(
    math.max(_dateRailWidth, radius + _ticketNotchRadius),
    size.width - radius - _ticketNotchRadius,
  );
  const circleKappa = 0.5522847498;
  final notchLeft = notchCenterX - _ticketNotchRadius;
  final notchRight = notchCenterX + _ticketNotchRadius;
  final bottom = size.height;

  final path = Path();
  path.moveTo(shapeTop ? radius : 0, 0);
  if (shapeTop) {
    path
      ..lineTo(notchLeft, 0)
      ..cubicTo(
        notchLeft,
        circleKappa * _ticketNotchDepth,
        notchCenterX - circleKappa * _ticketNotchRadius,
        _ticketNotchDepth,
        notchCenterX,
        _ticketNotchDepth,
      )
      ..cubicTo(
        notchCenterX + circleKappa * _ticketNotchRadius,
        _ticketNotchDepth,
        notchRight,
        circleKappa * _ticketNotchDepth,
        notchRight,
        0,
      )
      ..lineTo(size.width - radius, 0)
      ..quadraticBezierTo(size.width, 0, size.width, radius);
  } else {
    path.lineTo(size.width, 0);
  }

  path.lineTo(size.width, bottom - (shapeBottom ? radius : 0));
  if (shapeBottom) {
    path.quadraticBezierTo(size.width, bottom, size.width - radius, bottom);
  }

  if (shapeBottom) {
    path
      ..lineTo(notchRight, bottom)
      ..cubicTo(
        notchRight,
        bottom - circleKappa * _ticketNotchDepth,
        notchCenterX + circleKappa * _ticketNotchRadius,
        bottom - _ticketNotchDepth,
        notchCenterX,
        bottom - _ticketNotchDepth,
      )
      ..cubicTo(
        notchCenterX - circleKappa * _ticketNotchRadius,
        bottom - _ticketNotchDepth,
        notchLeft,
        bottom - circleKappa * _ticketNotchDepth,
        notchLeft,
        bottom,
      )
      ..lineTo(radius, bottom)
      ..quadraticBezierTo(0, bottom, 0, bottom - radius);
  } else {
    path
      ..lineTo(0, bottom)
      ..lineTo(0, bottom);
  }

  path.lineTo(0, shapeTop ? radius : 0);
  if (shapeTop) {
    path.quadraticBezierTo(0, 0, radius, 0);
  }
  return path..close();
}

class _DateRailTicketClipper extends CustomClipper<Path> {
  const _DateRailTicketClipper({required this.position});

  final EventDateRailCardStripPosition position;

  @override
  Path getClip(Size size) => _dateRailTicketPath(size, position: position);

  @override
  bool shouldReclip(covariant _DateRailTicketClipper oldClipper) {
    return oldClipper.position != position;
  }
}

class _DateRailTicketShadowPainter extends CustomPainter {
  const _DateRailTicketShadowPainter({
    required this.color,
    required this.elevation,
    required this.position,
  });

  final Color color;
  final double elevation;
  final EventDateRailCardStripPosition position;

  @override
  void paint(Canvas canvas, Size size) {
    if (size.isEmpty || elevation <= 0) return;
    canvas.drawShadow(
      _dateRailTicketPath(size, position: position),
      color,
      elevation,
      false,
    );
  }

  @override
  bool shouldRepaint(covariant _DateRailTicketShadowPainter oldDelegate) {
    return oldDelegate.color != color ||
        oldDelegate.elevation != elevation ||
        oldDelegate.position != position;
  }
}

class _DateRailTicketBorderPainter extends CustomPainter {
  const _DateRailTicketBorderPainter({
    required this.color,
    required this.position,
  });

  final Color color;
  final EventDateRailCardStripPosition position;

  @override
  void paint(Canvas canvas, Size size) {
    final excludeBottomEdge =
        position == EventDateRailCardStripPosition.first ||
        position == EventDateRailCardStripPosition.middle;
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = CatchStroke.hairline;
    if (excludeBottomEdge) {
      canvas.save();
      canvas.clipRect(Rect.fromLTRB(0, 0, size.width, size.height - 1));
    }
    canvas.drawPath(_dateRailTicketPath(size, position: position), paint);
    if (excludeBottomEdge) canvas.restore();
  }

  @override
  bool shouldRepaint(covariant _DateRailTicketBorderPainter oldDelegate) {
    return oldDelegate.color != color || oldDelegate.position != position;
  }
}

class PerforationDivider extends StatelessWidget {
  const PerforationDivider({super.key, required this.color});

  final Color color;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: CatchStroke.hairline,
      child: CustomPaint(painter: _PerforationPainter(color: color)),
    );
  }
}

class _PerforationPainter extends CustomPainter {
  const _PerforationPainter({required this.color});

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = CatchStroke.underline
      ..strokeCap = StrokeCap.round;
    var y = CatchLayout.ticketPerforationStartOffset;
    while (y < size.height) {
      canvas.drawLine(
        Offset(0, y),
        Offset(0, y + CatchLayout.ticketPerforationDashLength),
        paint,
      );
      y += CatchLayout.ticketPerforationStride;
    }
  }

  @override
  bool shouldRepaint(covariant _PerforationPainter oldDelegate) =>
      oldDelegate.color != color;
}

class DateRail extends StatelessWidget {
  const DateRail({
    super.key,
    required this.startTime,
    required this.color,
    required this.activityIcon,
  });

  final DateTime startTime;
  final Color color;
  final IconData activityIcon;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final onColor = t.onFill(color);
    final mutedOnColor = t.onFillMuted(color);
    return SizedBox(
      width: _dateRailWidth,
      child: Stack(
        fit: StackFit.expand,
        children: [
          ColoredBox(color: color),
          Positioned(
            left: -CatchSpacing.s2,
            bottom: -CatchSpacing.micro10,
            child: IgnorePointer(
              child: ExcludeSemantics(
                child: Icon(
                  activityIcon,
                  key: const ValueKey('event_date_rail_card.activity_glyph'),
                  size: CatchLayout.eventDateRailGlyphSize,
                  color: onColor.withValues(
                    alpha: CatchOpacity.eventDateRailGlyph,
                  ),
                ),
              ),
            ),
          ),
          Padding(
            padding: CatchInsets.tileVertical,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  EventFormatters.shortWeekday(startTime).toUpperCase(),
                  style: CatchTextStyles.monoLabelS(
                    context,
                    color: mutedOnColor,
                  ),
                ),
                gapH4,
                Text(
                  context.l10n.eventsEventDateRailCardTextDay(
                    day: startTime.day,
                  ),
                  style: CatchTextStyles.eventDisplay(
                    context,
                    step: CatchTextStylesSize.l,
                    height: 0.9,
                    color: onColor,
                  ),
                ),
                gapH3,
                Text(
                  EventFormatters.shortMonth(startTime).toUpperCase(),
                  style: CatchTextStyles.monoLabelS(
                    context,
                    color: mutedOnColor,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

String _eventIdentityTitle(Event event) {
  return event.eventFormat.customActivityLabel == null
      ? event.eventFormat.label
      : event.eventFormat.eventTitleLabel;
}
