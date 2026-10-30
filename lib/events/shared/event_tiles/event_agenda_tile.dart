import 'package:catch_dating_app/events/shared/event_price_copy.dart';
import 'package:catch_dating_app/events/shared/event_tiles/event_date_rail_card.dart';
import 'package:catch_dating_app/events/shared/event_tiles/event_tile_atoms.dart';
import 'package:catch_dating_app/events/shared/event_tiles/event_tile_data.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:flutter/material.dart';

class EventAgendaTile extends StatelessWidget {
  const EventAgendaTile({
    super.key,
    required this.data,
    this.onTap,
    this.showOrganizerName = false,
    this.badgeLabel,
    this.stripPosition = EventDateRailCardStripPosition.single,
  });

  final EventTileData data;
  final VoidCallback? onTap;
  final bool showOrganizerName;
  final String? badgeLabel;
  final EventDateRailCardStripPosition stripPosition;

  @override
  Widget build(BuildContext context) {
    return EventDateRailCard(
      event: data.event,
      kicker: eventTileKickerLabel(data, showOrganizerName: showOrganizerName),
      supportingLabel: eventTileSupportingLabel(
        data,
        showOrganizerName: showOrganizerName,
      ),
      priceLabel: eventPriceLabel(context.l10n, data.event),
      statusLabel: eventTileCardStatusLabel(
        data.status,
        context.l10n,
        label: badgeLabel,
      ),
      stripPosition: stripPosition,
      onTap: onTap,
    );
  }
}
