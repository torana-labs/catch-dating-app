part of 'event_detail_fact_list.dart';

class TicketStubTileData {
  const TicketStubTileData({
    required this.label,
    required this.value,
    this.detail,
    this.icon,
  });

  final String label;
  final String value;
  final String? detail;
  final IconData? icon;
}

class _TicketStubNotchPainter extends CustomPainter {
  const _TicketStubNotchPainter({required this.color});

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = color;
    final y = size.height / 2;
    canvas.drawCircle(Offset(-8, y), 14, paint);
    canvas.drawCircle(Offset(size.width + 8, y), 14, paint);
  }

  @override
  bool shouldRepaint(covariant _TicketStubNotchPainter oldDelegate) =>
      oldDelegate.color != color;
}

class _VerticalDashedPainter extends CustomPainter {
  const _VerticalDashedPainter({required this.color});

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 1.2
      ..style = PaintingStyle.stroke;
    var y = CatchSpacing.s2;
    while (y < size.height - CatchSpacing.s2) {
      canvas.drawLine(Offset(0, y), Offset(0, y + 5), paint);
      y += 11;
    }
  }

  @override
  bool shouldRepaint(covariant _VerticalDashedPainter oldDelegate) =>
      oldDelegate.color != color;
}

List<TicketStubTileData> _ticketStubCells(Event event, AppLocalizations l10n) {
  final locationDetail = event.locationNotes;
  return [
    TicketStubTileData(
      label: l10n.eventsEventDetailDesignPrimitivesLabelWhen,
      value: event.shortDateLabel,
      detail: [event.compactTimeRangeLabel, ?event.eventTimezone].join(' · '),
      icon: CatchIcons.addToCalendar,
    ),
    TicketStubTileData(
      label: l10n.eventsEventDetailDesignPrimitivesLabelWhere,
      value: event.locationName,
      detail: locationDetail == null || locationDetail.isEmpty
          ? null
          : locationDetail,
    ),
    if (event.eventFormat.isDistanceBased)
      TicketStubTileData(
        label: l10n.eventsEventDetailDesignPrimitivesVisiblecopyPace,
        value: event.pace.label,
        detail: event.activitySummaryLabel,
      ),
  ];
}

List<String> _hintsFor(Event event, AppLocalizations l10n) {
  final remaining = event.spotsRemaining;
  final capacityHint = remaining == 0
      ? l10n.eventsEventDetailDesignPrimitivesVisiblecopyThisEventIsCurrently
      : remaining <= 3
      ? l10n.eventsEventDetailDesignPrimitivesVisiblecopyOnlyRemainingValue2Left(
          remaining: remaining,
          value2: remaining == 1
              ? l10n.eventsEventDetailDesignPrimitivesVisiblecopySpot
              : l10n.eventsEventDetailDesignPrimitivesVisiblecopySpots,
        )
      : l10n.eventsEventDetailDesignPrimitivesVisiblecopySpotslabelSpotsAreAlready(
          spotsLabel: event.spotsLabel,
        );
  return [
    capacityHint,
    _interactionHint(event.eventFormat.interactionModel, l10n),
  ];
}

List<ItineraryStep> _itineraryFor(Event event, AppLocalizations l10n) {
  return event.itinerary
      .map(
        (entry) => ItineraryStep(
          time: EventFormatters.time(
            event.localTime(entry.startsAt(event.startTime)),
          ),
          title: entry.title,
          detail: _itineraryDetail(entry, l10n),
        ),
      )
      .toList(growable: false);
}

String _itineraryDetail(EventItineraryItem entry, AppLocalizations l10n) {
  final kind = switch (entry.kind) {
    EventItineraryKind.gather => l10n.hostsEventItineraryKindGather,
    EventItineraryKind.activity => l10n.hostsEventItineraryKindActivity,
    EventItineraryKind.stop => l10n.hostsEventItineraryKindStop,
    EventItineraryKind.breakTime => l10n.hostsEventItineraryKindBreak,
    EventItineraryKind.transition => l10n.hostsEventItineraryKindTransition,
    EventItineraryKind.finish => l10n.hostsEventItineraryKindFinish,
  };
  return [
    kind,
    if (entry.durationMinutes case final duration?)
      EventFormatters.durationMinutes(duration),
    if (entry.routeDistanceMeters case final meters?)
      l10n.eventsItineraryRouteDistance(
        distance: EventFormatters.distanceKm(meters / 1000),
      ),
    if (entry.location?.name.trim() case final name? when name.isNotEmpty) name,
    if (entry.description?.trim() case final description?
        when description.isNotEmpty)
      description,
  ].join(' · ');
}

String _interactionHint(EventInteractionModel model, AppLocalizations l10n) {
  return switch (model) {
    EventInteractionModel.pacePods =>
      l10n.eventsEventDetailDesignPrimitivesVisiblecopyTheFormatKeepsThe,
    EventInteractionModel.pairedRotations =>
      l10n.eventsEventDetailDesignPrimitivesVisiblecopyRotationsGiveYouNatural,
    EventInteractionModel.teamRotations =>
      l10n.eventsEventDetailDesignPrimitivesVisiblecopyTeamStructureCreatesLow,
    EventInteractionModel.seatedTable =>
      l10n.eventsEventDetailDesignPrimitivesVisiblecopyASeatedFormatAnd,
    EventInteractionModel.freeFormMixer =>
      l10n.eventsEventDetailDesignPrimitivesVisiblecopyHostNudgesKeepThe,
    EventInteractionModel.hostLedProgram =>
      l10n.eventsEventDetailDesignPrimitivesVisiblecopyTheHostRunsThe,
    EventInteractionModel.openFormat =>
      l10n.eventsEventDetailDesignPrimitivesVisiblecopyTheHostShapesThe,
  };
}
