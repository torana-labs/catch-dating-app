import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';
import 'package:catch_dating_app/core/media/uploaded_photo.dart';
import 'package:catch_dating_app/core/theme/activity_palette.dart';
import 'package:catch_dating_app/events/domain/event.dart';
import 'package:catch_dating_app/events/domain/event_formatters.dart';
import 'package:catch_dating_app/events/domain/event_itinerary.dart';
import 'package:catch_dating_app/events/domain/route_event_plan.dart';
import 'package:catch_dating_app/events/presentation/event_detail_information_state.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/locations/domain/location_coordinate.dart';
import 'package:catch_dating_app/locations/shared/location_map.dart';
import 'package:catch_dating_app/locations/shared/map_preview.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

part 'event_detail_design_support.dart';
part 'event_detail_itinerary_row.dart';

class EventDetailTicketStubRow extends StatelessWidget {
  const EventDetailTicketStubRow({
    super.key,
    required this.event,
    this.notchBackgroundColor,
  });

  final Event event;
  final Color? notchBackgroundColor;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final cells = _ticketStubCells(event, context.l10n);

    return ColoredBox(
      color: t.surface,
      child: ConstrainedBox(
        constraints: const BoxConstraints(
          minHeight: CatchLayout.eventDetailTicketStubBandHeight,
        ),
        child: Stack(
          children: [
            Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                IntrinsicHeight(
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      for (var index = 0; index < cells.length; index++)
                        Expanded(
                          child: TicketStubTile(
                            cell: cells[index],
                            showDivider: index > 0,
                          ),
                        ),
                    ],
                  ),
                ),
                const CatchDivider.section(),
              ],
            ),
            Positioned.fill(
              child: IgnorePointer(
                child: CustomPaint(
                  painter: _TicketStubNotchPainter(
                    color: notchBackgroundColor ?? t.bg,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class EventDetailHintList extends StatelessWidget {
  const EventDetailHintList({
    super.key,
    required this.event,
    this.textColor,
    this.dividerColor,
  });

  final Event event;
  final Color? textColor;
  final Color? dividerColor;

  @override
  Widget build(BuildContext context) {
    final hints = _hintsFor(event, context.l10n);
    final t = CatchTokens.of(context);
    final activity = ActivityPalette.resolve(context, event.activityKind);

    return HairlineList(
      itemCount: hints.length,
      dividerColor: dividerColor,
      itemBuilder: (context, index) => Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(
              top: CatchLayout.eventDetailHintDotTopInset,
            ),
            child: CatchSurface(
              width: CatchLayout.eventDetailHintDotExtent,
              height: CatchLayout.eventDetailHintDotExtent,
              radius: CatchRadius.pill,
              backgroundColor: activity.accent,
              child: const SizedBox.shrink(),
            ),
          ),
          gapW12,
          Expanded(
            child: Text(
              hints[index],
              style: CatchTextStyles.hint(context, color: textColor ?? t.ink),
            ),
          ),
        ],
      ),
    );
  }
}

class EventDetailItineraryList extends StatelessWidget {
  const EventDetailItineraryList({
    super.key,
    required this.event,
    this.titleColor,
    this.detailColor,
    this.dotBackgroundColor,
  });

  final Event event;
  final Color? titleColor;
  final Color? detailColor;
  final Color? dotBackgroundColor;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final activity = ActivityPalette.resolve(context, event.activityKind);
    final steps = _itineraryFor(event, context.l10n);

    return Column(
      children: [
        for (var index = 0; index < steps.length; index++)
          ItineraryRow(
            step: steps[index],
            isLast: index == steps.length - 1,
            accent: activity.accent,
            railColor: t.line2,
            titleColor: titleColor,
            detailColor: detailColor,
            dotBackgroundColor: dotBackgroundColor,
          ),
      ],
    );
  }
}

class EventDetailMapCard extends StatelessWidget {
  const EventDetailMapCard({
    super.key,
    required this.event,
    this.onTap,
    this.surfaceColor,
    this.borderColor,
    this.enableNetworkTiles = true,
  });

  final Event event;
  final VoidCallback? onTap;
  final Color? surfaceColor;
  final Color? borderColor;
  final bool enableNetworkTiles;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final coordinate = LocationCoordinate.fromNullable(
      latitude: event.effectiveStartingPointLat,
      longitude: event.effectiveStartingPointLng,
    );
    final canOpen = coordinate != null && onTap != null;
    final routePath =
        event.eventFormat.routePlan?.path
            .map((point) => LocationCoordinate(point.latitude, point.longitude))
            .toList(growable: false) ??
        const <LocationCoordinate>[];
    final itineraryMarkers = event.itinerary
        .where((item) => item.location != null)
        .map(
          (item) => MapMarker(
            id: 'event-itinerary-${item.id}',
            position: LocationCoordinate(
              item.location!.latitude,
              item.location!.longitude,
            ),
            hue: MapMarkerHue.azure,
            infoTitle: item.title,
            infoSnippet: item.location!.name,
          ),
        )
        .toList(growable: false);
    final trailingLabel =
        context.l10n.eventsEventDetailDesignPrimitivesActionViewMap;

    return Semantics(
      button: canOpen,
      label: event.locationName,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(CatchRadius.md),
          onTap: canOpen ? onTap : null,
          child: Ink(
            height: CatchLayout.eventDetailMapCardHeight,
            decoration: BoxDecoration(
              color: surfaceColor ?? t.surface,
              border: Border.all(color: borderColor ?? t.line),
              borderRadius: BorderRadius.circular(CatchRadius.md),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(CatchRadius.md - 1),
              child: Column(
                children: [
                  Expanded(
                    child: MapPreview(
                      coordinate: coordinate,
                      path: routePath,
                      markers: itineraryMarkers,
                      fallbackLabel:
                          context.l10n.eventsEventPinsMapLabelEventMapPreview,
                      enableNetworkTiles: enableNetworkTiles,
                    ),
                  ),
                  CatchDivider.fieldRow(indent: 0, color: borderColor),
                  Padding(
                    padding: CatchInsets.compactControlContent,
                    child: Row(
                      children: [
                        Expanded(
                          child: Text(
                            event.locationName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: CatchTextStyles.labelL(
                              context,
                              color: t.ink,
                            ),
                          ),
                        ),
                        gapW8,
                        Text(
                          trailingLabel.toUpperCase(),
                          maxLines: 1,
                          style: CatchTextStyles.monoLabelS(
                            context,
                            color: t.ink2,
                          ),
                        ),
                        if (canOpen) ...[
                          gapW4,
                          Icon(
                            CatchIcons.chevronRightRounded,
                            color: t.ink2,
                            size: CatchIcon.xs,
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class EventDetailMechanismList extends StatelessWidget {
  const EventDetailMechanismList({
    super.key,
    required this.rows,
    required this.activityKind,
    this.dividerColor,
    this.titleColor,
    this.bodyColor,
  });

  final List<EventDetailFactRow> rows;
  final ActivityKind activityKind;
  final Color? dividerColor;
  final Color? titleColor;
  final Color? bodyColor;

  @override
  Widget build(BuildContext context) {
    return EventDetailFactList.stacked(
      rows: rows,
      activityKind: activityKind,
      dividerColor: dividerColor,
      titleColor: titleColor,
      bodyColor: bodyColor,
    );
  }
}

class EventDetailGoodToKnowList extends StatelessWidget {
  const EventDetailGoodToKnowList({
    super.key,
    required this.rows,
    required this.activityKind,
    this.dividerColor,
    this.titleColor,
    this.bodyColor,
  });

  final List<EventDetailFactRow> rows;
  final ActivityKind activityKind;
  final Color? dividerColor;
  final Color? titleColor;
  final Color? bodyColor;

  @override
  Widget build(BuildContext context) {
    return EventDetailFactList.inline(
      rows: rows,
      activityKind: activityKind,
      dividerColor: dividerColor,
      titleColor: titleColor,
      bodyColor: bodyColor,
    );
  }
}

/// Flat Event Detail fact rows with structural stacked and inline modes.
///
/// Callers supply only rows resolved by [EventDetailInformationState]. The
/// named constructors keep typography and icon treatment tied to the section
/// role rather than exposing independent visual switches.
class EventDetailFactList extends StatelessWidget {
  const EventDetailFactList.stacked({
    super.key,
    required this.rows,
    required this.activityKind,
    this.dividerColor,
    this.titleColor,
    this.bodyColor,
  }) : _inline = false,
       _useActivityColor = true;

  const EventDetailFactList.inline({
    super.key,
    required this.rows,
    required this.activityKind,
    this.dividerColor,
    this.titleColor,
    this.bodyColor,
  }) : _inline = true,
       _useActivityColor = false;

  final List<EventDetailFactRow> rows;
  final ActivityKind activityKind;
  final Color? dividerColor;
  final Color? titleColor;
  final Color? bodyColor;
  final bool _inline;
  final bool _useActivityColor;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final activity = ActivityPalette.resolve(context, activityKind);

    return HairlineList(
      itemCount: rows.length,
      dividerColor: dividerColor,
      itemBuilder: (context, index) {
        final row = rows[index];
        final resolvedTitleColor = titleColor ?? t.ink;
        final resolvedBodyColor = bodyColor ?? t.ink2;
        final iconColor = _useActivityColor ? activity.deep : resolvedBodyColor;

        return Padding(
          padding: CatchInsets.eventDetailFactRow(
            isFirst: index == 0,
            isLast: index == rows.length - 1,
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(
                width: CatchIcon.row,
                child: Icon(
                  _eventDetailFactIcon(row.icon, activityIcon: activity.glyph),
                  size: CatchIcon.md,
                  color: iconColor,
                ),
              ),
              gapW8,
              Expanded(
                child: _inline
                    ? Text.rich(
                        TextSpan(
                          style: CatchTextStyles.supporting(
                            context,
                            color: resolvedBodyColor,
                          ),
                          children: [
                            TextSpan(
                              text: _inlineFactLead(row.title),
                              style: CatchTextStyles.fieldRowTitle(
                                context,
                                color: resolvedTitleColor,
                              ),
                            ),
                            TextSpan(text: row.body),
                          ],
                        ),
                      )
                    : Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            row.title,
                            style: CatchTextStyles.fieldRowTitle(
                              context,
                              color: resolvedTitleColor,
                            ),
                          ),
                          gapH2,
                          CatchText(
                            row.body,
                            variant: CatchTextVariant.supporting,
                            color: resolvedBodyColor,
                          ),
                        ],
                      ),
              ),
            ],
          ),
        );
      },
    );
  }
}

String _inlineFactLead(String title) {
  final trimmed = title.trim();
  final hasTerminalPunctuation =
      trimmed.endsWith('.') || trimmed.endsWith('?') || trimmed.endsWith('!');
  return '$trimmed${hasTerminalPunctuation ? ' ' : '. '}';
}

IconData _eventDetailFactIcon(
  EventDetailFactIcon icon, {
  required IconData activityIcon,
}) {
  return switch (icon) {
    EventDetailFactIcon.openSignup => CatchIcons.personAddAlt1Outlined,
    EventDetailFactIcon.inviteOnly => CatchIcons.keyOutlined,
    EventDetailFactIcon.hostApproval => CatchIcons.personSearchOutlined,
    EventDetailFactIcon.cohortCaps => CatchIcons.groupsOutlined,
    EventDetailFactIcon.balancedBooking => CatchIcons.balanceOutlined,
    EventDetailFactIcon.membersOnly => CatchIcons.cardMembershipOutlined,
    EventDetailFactIcon.waitlist => CatchIcons.hourglassEmptyRounded,
    EventDetailFactIcon.pricing => CatchIcons.priceChangeOutlined,
    EventDetailFactIcon.requirements => CatchIcons.ruleOutlined,
    EventDetailFactIcon.activity => activityIcon,
    EventDetailFactIcon.attendance => CatchIcons.qrCode2Outlined,
    EventDetailFactIcon.cancellation => CatchIcons.refreshRounded,
  };
}

const _photoStripTileCount = 3;

class EventDetailPhotoGrid extends StatelessWidget {
  const EventDetailPhotoGrid({super.key, required this.event});

  final Event event;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final activity = ActivityPalette.resolve(context, event.activityKind);
    final photos = event.eventPhotos;
    if (photos.isEmpty) return const SizedBox.shrink();

    return Column(
      children: [
        for (
          var start = 0;
          start < photos.length;
          start += _photoStripTileCount
        ) ...[
          if (start > 0) gapH8,
          Row(
            children: [
              for (
                var index = start;
                index < photos.length && index < start + _photoStripTileCount;
                index++
              ) ...[
                if (index > start) gapW8,
                Expanded(
                  child: EventDetailPhotoTile(
                    index: index,
                    photo: photos[index],
                    backgroundColor: activity.soft,
                    iconColor: activity.deep,
                    icon: activity.glyph,
                  ),
                ),
              ],
            ],
          ),
        ],
        gapH8,
        Row(
          children: [
            Text(
              context.l10n.eventsEventDetailDesignPrimitivesTextEventPhotos,
              style: CatchTextStyles.monoLabelS(context, color: t.ink),
            ),
            const Spacer(),
            Text(
              context.l10n.eventsEventDetailDesignPrimitivesTextLengthUploaded(
                length: event.eventPhotos.length,
              ),
              style: CatchTextStyles.monoLabelS(context, color: t.ink3),
            ),
          ],
        ),
      ],
    );
  }
}

class EventDetailPhotoTile extends StatelessWidget {
  const EventDetailPhotoTile({
    super.key,
    required this.index,
    required this.photo,
    required this.backgroundColor,
    required this.iconColor,
    required this.icon,
  });

  final int index;
  final UploadedPhoto? photo;
  final Color backgroundColor;
  final Color iconColor;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      key: ValueKey('event-photo-strip-tile-$index'),
      height: CatchLayout.eventDetailPhotoStripTileHeight,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(CatchRadius.infoTile),
        child: photo == null
            ? ColoredBox(
                key: ValueKey('event-photo-strip-placeholder-$index'),
                color: backgroundColor,
                child: Icon(icon, color: iconColor, size: CatchIcon.lg),
              )
            : ColoredBox(
                color: backgroundColor,
                child: CatchNetworkImage(
                  photo!.thumbnailOrUrl,
                  key: ValueKey('event-photo-strip-image-$index'),
                  errorBuilder: (_, _, _) =>
                      Icon(icon, color: iconColor, size: CatchIcon.lg),
                ),
              ),
      ),
    );
  }
}

class TicketStubTile extends StatelessWidget {
  const TicketStubTile({
    super.key,
    required this.cell,
    required this.showDivider,
  });

  final TicketStubTileData cell;
  final bool showDivider;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return Stack(
      children: [
        if (showDivider)
          Positioned.fill(
            child: CustomPaint(painter: _VerticalDashedPainter(color: t.line2)),
          ),
        Padding(
          padding: CatchInsets.eventTicketStubCell(divided: showDivider),
          child: Stack(
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    cell.label.toUpperCase(),
                    style: CatchTextStyles.monoLabelS(context),
                  ),
                  gapH6,
                  Text(
                    cell.value,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: CatchTextStyles.mono(
                      context,
                      color: t.ink,
                    ).copyWith(fontWeight: FontWeight.w700, height: 1.25),
                  ),
                  if (cell.detail != null) ...[
                    const SizedBox(height: CatchSpacing.micro2),
                    Text(
                      cell.detail!,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: CatchTextStyles.numericMeta(
                        context,
                        color: t.ink2,
                      ),
                    ),
                  ],
                ],
              ),
              if (cell.icon != null)
                Positioned(
                  right: 0,
                  top: 0,
                  child: Icon(
                    cell.icon,
                    size: CatchIcon.heroSignalChip,
                    color: t.ink3,
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }
}

class HairlineList extends StatelessWidget {
  const HairlineList({
    super.key,
    required this.itemCount,
    required this.itemBuilder,
    this.dividerColor,
  });

  final int itemCount;
  final IndexedWidgetBuilder itemBuilder;
  final Color? dividerColor;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        for (var index = 0; index < itemCount; index++) ...[
          if (index > 0) CatchDivider.fieldRow(indent: 0, color: dividerColor),
          itemBuilder(context, index),
        ],
      ],
    );
  }
}
