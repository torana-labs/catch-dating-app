part of 'event_pins_map.dart';

class _EventMapPinIconKey {
  const _EventMapPinIconKey({
    required this.activityKindName,
    required this.selected,
    required this.label,
  });

  final String activityKindName;
  final bool selected;
  final String? label;

  @override
  bool operator ==(Object other) {
    return other is _EventMapPinIconKey &&
        other.activityKindName == activityKindName &&
        other.selected == selected &&
        other.label == label;
  }

  @override
  int get hashCode => Object.hash(activityKindName, selected, label);
}

Future<MapMarkerBitmap> _buildEventMapPinBitmap({
  required Color activityColor,
  required Color inkColor,
  required Color shadowColor,
  required bool selected,
  required String? label,
  required double pixelRatio,
  required TextStyle textStyle,
}) async {
  final flagLabel = label?.trim();
  final hasFlag = selected && flagLabel != null && flagLabel.isNotEmpty;
  final pinSize = selected
      ? CatchLayout.activityMapPinSelectedSize
      : CatchLayout.activityMapPinRestingSize;
  final canvasPadding = CatchLayout.activityMapPinNativeCanvasPadding;
  final flagHorizontalPadding = CatchSpacing.s2;
  final flagVerticalPadding = CatchSpacing.s1;
  final flagGap = CatchSpacing.micro2;
  final maxFlagWidth = CatchLayout.activityMapPinFlagMaxWidth;
  final iconData = CatchIcons.location;

  TextPainter? flagPainter;
  double flagWidth = 0;
  double flagHeight = 0;
  if (hasFlag) {
    flagPainter = TextPainter(
      text: TextSpan(text: flagLabel, style: textStyle),
      maxLines: 1,
      ellipsis: '…',
      textDirection: TextDirection.ltr,
      textScaler: TextScaler.noScaling,
    )..layout(maxWidth: maxFlagWidth - flagHorizontalPadding * 2);
    flagWidth = math.min(
      maxFlagWidth,
      flagPainter.width + flagHorizontalPadding * 2,
    );
    flagHeight = flagPainter.height + flagVerticalPadding * 2;
  }

  final logicalWidth = math.max(pinSize, flagWidth) + canvasPadding * 2;
  final logicalHeight =
      pinSize + canvasPadding * 2 + (hasFlag ? flagHeight + flagGap : 0);
  final recorder = ui.PictureRecorder();
  final canvas = Canvas(recorder);
  canvas.scale(pixelRatio);

  if (hasFlag && flagPainter != null) {
    final flagRect = Rect.fromLTWH(
      (logicalWidth - flagWidth) / 2,
      canvasPadding,
      flagWidth,
      flagHeight,
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        flagRect,
        const Radius.circular(CatchRadius.pill),
      ),
      Paint()..color = inkColor,
    );
    flagPainter.paint(
      canvas,
      Offset(
        flagRect.left + flagHorizontalPadding,
        flagRect.top + flagVerticalPadding,
      ),
    );
  }

  final iconPainter = TextPainter(
    text: TextSpan(
      text: String.fromCharCode(iconData.codePoint),
      // Native map marker bitmaps serialize the icon font into a PNG through
      // the design-system's raster-art seam; this is not user-visible text.
      style: CatchTextStyles.iconRasterGlyph(
        icon: iconData,
        size: pinSize,
        color: activityColor,
        shadows: [
          Shadow(
            color: shadowColor,
            blurRadius: CatchLayout.activityMapPinShadowBlur,
            offset: const Offset(0, CatchLayout.activityMapPinShadowDy),
          ),
        ],
      ),
    ),
    textDirection: TextDirection.ltr,
    textScaler: TextScaler.noScaling,
  )..layout(minWidth: pinSize, maxWidth: pinSize);
  iconPainter.paint(
    canvas,
    Offset(
      (logicalWidth - pinSize) / 2,
      canvasPadding + (hasFlag ? flagHeight + flagGap : 0),
    ),
  );

  final picture = recorder.endRecording();
  final image = await picture.toImage(
    (logicalWidth * pixelRatio).ceil(),
    (logicalHeight * pixelRatio).ceil(),
  );
  final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
  image.dispose();
  picture.dispose();
  final bytes = byteData?.buffer.asUint8List();
  if (bytes == null || bytes.isEmpty) {
    throw StateError('Unable to render event map pin bitmap');
  }
  return MapMarkerBitmap(
    bytes: bytes,
    logicalSize: Size(logicalWidth, logicalHeight),
    imagePixelRatio: pixelRatio,
  );
}

@visibleForTesting
Future<MapMarkerBitmap> buildEventMapClusterPinBitmap({
  required int count,
  required Color fillColor,
  required Color borderColor,
  required double pixelRatio,
  required TextStyle textStyle,
}) async {
  const logicalSize = CatchSpacing.s10;
  final recorder = ui.PictureRecorder();
  final canvas = Canvas(recorder)..scale(pixelRatio);
  const center = Offset(logicalSize / 2, logicalSize / 2);
  canvas.drawCircle(center, logicalSize / 2, Paint()..color = borderColor);
  canvas.drawCircle(
    center,
    logicalSize / 2 - CatchStroke.selection,
    Paint()..color = fillColor,
  );
  final painter = TextPainter(
    text: TextSpan(text: '$count', style: textStyle),
    textDirection: TextDirection.ltr,
    textScaler: TextScaler.noScaling,
  )..layout(maxWidth: logicalSize);
  painter.paint(
    canvas,
    Offset(
      (logicalSize - painter.width) / 2,
      (logicalSize - painter.height) / 2,
    ),
  );
  final picture = recorder.endRecording();
  final image = await picture.toImage(
    (logicalSize * pixelRatio).ceil(),
    (logicalSize * pixelRatio).ceil(),
  );
  final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
  image.dispose();
  picture.dispose();
  final bytes = byteData?.buffer.asUint8List();
  if (bytes == null || bytes.isEmpty) {
    throw StateError('Unable to render event cluster marker bitmap');
  }
  return MapMarkerBitmap(
    bytes: bytes,
    logicalSize: const Size.square(logicalSize),
    imagePixelRatio: pixelRatio,
  );
}

class _MapMarkerGroup {
  _MapMarkerGroup._({
    required this.id,
    required this.items,
    required this.center,
    required this.isCluster,
  });

  factory _MapMarkerGroup.single(EventMapPinItem item) {
    return _MapMarkerGroup._(
      id: item.mapId,
      items: [item],
      center: item.coordinate,
      isCluster: false,
    );
  }

  factory _MapMarkerGroup.cluster({
    required String id,
    required List<EventMapPinItem> items,
  }) {
    final lat =
        items
            .map((item) => item.coordinate.latitude)
            .reduce((left, right) => left + right) /
        items.length;
    final lng =
        items
            .map((item) => item.coordinate.longitude)
            .reduce((left, right) => left + right) /
        items.length;
    return _MapMarkerGroup._(
      id: id,
      items: List.unmodifiable(items),
      center: LocationCoordinate(lat, lng),
      isCluster: true,
    );
  }

  final String id;
  final List<EventMapPinItem> items;
  final LocationCoordinate center;
  final bool isCluster;
}

List<_MapMarkerGroup> _eventMapMarkerGroups(
  List<EventMapPinItem> pinnedItems,
  double cameraZoom,
) {
  if (pinnedItems.length < 6 || cameraZoom >= 14) {
    return [for (final item in pinnedItems) _MapMarkerGroup.single(item)];
  }
  final cellDegrees = _clusterCellDegrees(cameraZoom);
  final buckets = <String, List<EventMapPinItem>>{};
  for (final item in pinnedItems) {
    final lat = item.coordinate.latitude;
    final lng = item.coordinate.longitude;
    final key = '${(lat / cellDegrees).floor()}:${(lng / cellDegrees).floor()}';
    buckets.putIfAbsent(key, () => <EventMapPinItem>[]).add(item);
  }

  return [
    for (final entry in buckets.entries)
      if (entry.value.length == 1)
        _MapMarkerGroup.single(entry.value.single)
      else
        _MapMarkerGroup.cluster(
          id: 'cluster-${entry.key}-${entry.value.length}',
          items: entry.value,
        ),
  ];
}

@visibleForTesting
List<int> eventMapMarkerGroupSizes(
  List<EventMapPinItem> pinnedItems, {
  required double cameraZoom,
}) => _eventMapMarkerGroups(
  pinnedItems,
  cameraZoom,
).map((group) => group.items.length).toList(growable: false);

class _EventFixturePinLayoutDelegate extends MultiChildLayoutDelegate {
  _EventFixturePinLayoutDelegate({required this.selected});

  final List<bool> selected;

  @override
  void performLayout(Size size) {
    final markerTop = size.height * 0.32;
    final markerLaneWidth = size.width / (selected.length + 1);
    for (var index = 0; index < selected.length; index += 1) {
      if (!hasChild(index)) continue;
      layoutChild(index, CatchLayout.activityMapPinSlotConstraints);
      positionChild(
        index,
        Offset(
          (markerLaneWidth * (index + 1)) - _placeholderPinSlotWidth / 2,
          markerTop +
              (index.isEven ? 0 : CatchSpacing.s6) -
              _placeholderPinAnchorOffset(selected[index]),
        ),
      );
    }
  }

  @override
  bool shouldRelayout(covariant _EventFixturePinLayoutDelegate oldDelegate) =>
      !listEquals(selected, oldDelegate.selected);
}

@visibleForTesting
double eventMapFixtureRingSize({
  required double? radiusKm,
  required Size viewport,
}) {
  final requested = _eventMapFixtureRequestedRingSize(radiusKm);
  final available = CatchLayout.distanceRingAvailableDiameterFor(viewport);
  return math.min(requested, available);
}

double _eventMapFixtureRequestedRingSize(double? radiusKm) {
  return switch (radiusKm) {
    null => CatchLayout.distanceRingDefaultSize,
    <= 1 => 150.0,
    <= 3 => 290.0,
    <= 5 => 460.0,
    _ => 640.0,
  };
}

double _placeholderPinAnchorOffset(bool selected) =>
    CatchLayout.activityMapPinAnchorOffset(selected);

bool _canSelectMapItem(
  EventMapPinItem item, {
  required ValueChanged<Event>? onEventSelected,
  required ValueChanged<ExternalEvent>? onExternalEventSelected,
}) => switch (item) {
  EventMapItem() => onEventSelected != null,
  ExternalEventMapItem() => onExternalEventSelected != null,
};

void _selectMapItem(
  EventMapPinItem item, {
  required ValueChanged<Event>? onEventSelected,
  required ValueChanged<ExternalEvent>? onExternalEventSelected,
}) {
  switch (item) {
    case EventMapItem(:final event):
      onEventSelected?.call(event);
    case ExternalEventMapItem(:final event):
      onExternalEventSelected?.call(event);
  }
}

bool _samePoint(LocationCoordinate a, LocationCoordinate b) =>
    a.latitude == b.latitude && a.longitude == b.longitude;

bool _sameEventMapCoordinates(
  List<EventMapPinItem> previous,
  List<EventMapPinItem> next,
) {
  if (identical(previous, next)) return true;
  if (previous.length != next.length) return false;
  final previousCoordinates = {
    for (final item in previous)
      '${item.mapId}:${item.coordinate.latitude}:${item.coordinate.longitude}',
  };
  final nextCoordinates = {
    for (final item in next)
      '${item.mapId}:${item.coordinate.latitude}:${item.coordinate.longitude}',
  };
  return previousCoordinates.length == nextCoordinates.length &&
      previousCoordinates.containsAll(nextCoordinates);
}

double _clusterCellDegrees(double zoom) {
  final clampedZoom = zoom.clamp(10.0, 14.0);
  final t = (clampedZoom - 10.0) / 4.0;
  return 0.045 - (0.033 * t);
}
