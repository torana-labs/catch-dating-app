import 'dart:async';
import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:catch_dating_app/core/theme/activity_palette.dart';
import 'package:catch_dating_app/core/widgets/activity_map_pin.dart';
import 'package:catch_dating_app/events/domain/event.dart';
import 'package:catch_dating_app/events/domain/external_event.dart';
import 'package:catch_dating_app/events/presentation/event_map_view_model.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/locations/domain/location_coordinate.dart';
import 'package:catch_dating_app/locations/shared/location_map.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/foundation.dart' show listEquals;
import 'package:flutter/material.dart';

part 'event_pins_map_support.dart';

const double _placeholderPinSlotWidth = CatchLayout.activityMapPinFlagMaxWidth;

class EventPinsMap extends StatefulWidget {
  const EventPinsMap({
    super.key,
    required this.items,
    this.externalItems = const [],
    required this.initialCenter,
    this.initialZoom = 12.5,
    this.selectedEventId,
    this.selectedEventCenter,
    this.enableNetworkTiles = true,
    this.userLocation,
    this.distanceRingRadiusKm,
    this.distanceRingLabel,
    this.distanceRingSemanticHint,
    this.showOverviewControl = false,
    this.onEventSelected,
    this.onExternalEventSelected,
    this.onMapTapped,
    this.onCameraCenterChanged,
    this.onDistanceRingTapped,
  });

  final List<EventMapItem> items;
  final List<ExternalEventMapItem> externalItems;
  final LocationCoordinate initialCenter;
  final double initialZoom;
  final String? selectedEventId;
  final LocationCoordinate? selectedEventCenter;
  final bool enableNetworkTiles;
  final LocationCoordinate? userLocation;
  final double? distanceRingRadiusKm;
  final String? distanceRingLabel;
  final String? distanceRingSemanticHint;
  final bool showOverviewControl;
  final ValueChanged<Event>? onEventSelected;
  final ValueChanged<ExternalEvent>? onExternalEventSelected;
  final VoidCallback? onMapTapped;
  final ValueChanged<LocationCoordinate>? onCameraCenterChanged;
  final VoidCallback? onDistanceRingTapped;

  @override
  State<EventPinsMap> createState() => _EventPinsMapState();
}

class _EventPinsMapState extends State<EventPinsMap> {
  LocationMapController? _mapController;
  final Map<_EventMapPinIconKey, MapMarkerBitmap> _pinBitmaps =
      <_EventMapPinIconKey, MapMarkerBitmap>{};
  final Set<_EventMapPinIconKey> _pendingPinBitmapKeys =
      <_EventMapPinIconKey>{};
  final Set<_EventMapPinIconKey> _failedPinBitmapKeys = <_EventMapPinIconKey>{};
  final Map<int, MapMarkerBitmap> _clusterBitmaps = <int, MapMarkerBitmap>{};
  final Set<int> _pendingClusterBitmapCounts = <int>{};
  final Set<int> _failedClusterBitmapCounts = <int>{};
  late LocationCoordinate _lastAppliedCenter;
  late double _cameraZoom;
  LocationCoordinate? _pendingCameraCenter;
  double? _pendingCameraZoom;
  LocationCoordinate? _lastReportedCameraCenter;
  Offset? _distanceRingLabelOffset;
  int _distanceRingProjectionGeneration = 0;

  @override
  void initState() {
    super.initState();
    _lastAppliedCenter = _effectiveCameraCenter;
    _lastReportedCameraCenter = _lastAppliedCenter;
    _cameraZoom = widget.initialZoom;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      widget.onCameraCenterChanged?.call(_lastAppliedCenter);
    });
  }

  @override
  void dispose() {
    _distanceRingProjectionGeneration += 1;
    _mapController = null;
    super.dispose();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _pinBitmaps.clear();
    _pendingPinBitmapKeys.clear();
    _clusterBitmaps.clear();
    _pendingClusterBitmapCounts.clear();
  }

  @override
  void didUpdateWidget(covariant EventPinsMap oldWidget) {
    super.didUpdateWidget(oldWidget);
    final nextSelectedCenter = widget.selectedEventCenter;
    if (nextSelectedCenter != null &&
        !_samePoint(_lastAppliedCenter, nextSelectedCenter)) {
      _lastAppliedCenter = nextSelectedCenter;
      _lastReportedCameraCenter = nextSelectedCenter;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        widget.onCameraCenterChanged?.call(nextSelectedCenter);
        _moveCameraTo(nextSelectedCenter, animate: !_reduceMotion);
      });
    }
    if (!_sameEventMapCoordinates(
          [...oldWidget.items, ...oldWidget.externalItems],
          [...widget.items, ...widget.externalItems],
        ) ||
        oldWidget.userLocation != widget.userLocation ||
        oldWidget.distanceRingRadiusKm != widget.distanceRingRadiusKm ||
        oldWidget.distanceRingLabel != widget.distanceRingLabel) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        unawaited(_fitOverview(animate: !_reduceMotion));
        unawaited(_updateDistanceRingLabelOffset());
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final onEventSelected = widget.onEventSelected;
    final onExternalEventSelected = widget.onExternalEventSelected;
    final pinnedItems = _pinnedItems;

    if (!widget.enableNetworkTiles) {
      return EventPinsFallbackMap(
        items: pinnedItems,
        selectedEventId: widget.selectedEventId,
        userLocation: widget.userLocation,
        distanceRingRadiusKm: widget.distanceRingRadiusKm,
        distanceRingLabel: widget.distanceRingLabel,
        distanceRingSemanticHint: widget.distanceRingSemanticHint,
        onEventSelected: onEventSelected,
        onExternalEventSelected: onExternalEventSelected,
        onMapTapped: widget.onMapTapped,
        onDistanceRingTapped: widget.onDistanceRingTapped,
      );
    }

    final markerGroups = _eventMapMarkerGroups(pinnedItems, _cameraZoom);
    _ensureMapPinBitmaps(markerGroups);

    final ringLabel = widget.distanceRingLabel?.trim();
    return Stack(
      children: [
        Positioned.fill(
          child: LocationMap(
            initialCenter: widget.initialCenter,
            initialZoom: widget.initialZoom,
            markers: _markersFor(markerGroups).toSet(),
            circles: _mapCircles(context),
            rotateGesturesEnabled: false,
            tiltGesturesEnabled: false,
            onTap: widget.onMapTapped == null
                ? null
                : (_) => widget.onMapTapped!(),
            onCameraMove: _handleCameraMove,
            onCameraIdle: _handleCameraIdle,
            onMapCreated: (controller) {
              _mapController = controller;
              final selectedCenter = widget.selectedEventCenter;
              if (selectedCenter != null) {
                _moveCameraTo(selectedCenter, animate: false);
              } else {
                unawaited(_fitOverview(animate: false));
              }
              unawaited(_updateDistanceRingLabelOffset());
            },
          ),
        ),
        if (_distanceRingLabelOffset case final offset?
            when ringLabel != null && ringLabel.isNotEmpty)
          AnimatedPositioned(
            duration: _mapOverlayMotionDuration(context),
            curve: CatchMotion.standardCurve,
            left: offset.dx,
            top: offset.dy,
            child: FractionalTranslation(
              translation: const Offset(-0.5, -0.5),
              child: CatchDistanceOverlay.label(
                label: ringLabel,
                semanticHint: widget.distanceRingSemanticHint,
                onTap: widget.onDistanceRingTapped,
              ),
            ),
          ),
        if (widget.showOverviewControl)
          Positioned(
            top: 0,
            right: 0,
            child: SafeArea(
              child: Padding(
                padding: CatchInsets.eventMapOverviewControl,
                child: CatchIconAction(
                  variant: CatchIconActionVariant.float,
                  tooltip: context
                      .l10n
                      .eventsEventPinsMapTooltipShowAllEventsAndDistance,
                  onPressed: _restoreOverview,
                  child: Icon(CatchIcons.fitMap),
                ),
              ),
            ),
          ),
      ],
    );
  }

  Iterable<MapMarker> _markersFor(List<_MapMarkerGroup> groups) sync* {
    for (final group in groups) {
      final marker = _markerFor(group);
      if (marker != null) yield marker;
    }
  }

  List<EventMapPinItem> get _pinnedItems =>
      List.unmodifiable([...widget.items, ...widget.externalItems]);

  Set<MapCircle> _mapCircles(BuildContext context) {
    final userLocation = widget.userLocation;
    if (userLocation == null) return const <MapCircle>{};
    final t = CatchTokens.of(context);
    final ringRadiusKm = widget.distanceRingRadiusKm;
    return {
      if (ringRadiusKm != null && ringRadiusKm > 0)
        MapCircle(
          id: 'event-map-distance-ring',
          center: userLocation,
          radiusMeters: ringRadiusKm * 1000,
          strokeWidth: CatchStroke.focusRing.round(),
          strokeColor: t.ink.withValues(alpha: CatchOpacity.distanceRing),
          fillColor: Colors.transparent,
          consumeTapEvents: widget.onDistanceRingTapped != null,
          onTap: widget.onDistanceRingTapped,
        ),
      MapCircle(
        id: 'event-map-user-location',
        center: userLocation,
        radiusMeters: 42,
        strokeWidth: CatchStroke.selection.round(),
        strokeColor: CatchTokens.editorialWhite.withValues(
          alpha: CatchOpacity.mapUserLocationStroke,
        ),
        fillColor: t.primary,
      ),
    };
  }

  MapMarker? _markerFor(_MapMarkerGroup group) {
    if (group.isCluster) {
      final bitmap = _clusterBitmaps[group.items.length];
      if (bitmap == null &&
          !_failedClusterBitmapCounts.contains(group.items.length)) {
        return null;
      }
      return MapMarker(
        id: group.id,
        position: group.center,
        bitmap: bitmap,
        anchor: bitmap == null ? const Offset(0.5, 1) : const Offset(0.5, 0.5),
        zIndex: 3,
        infoTitle: context.l10n.eventsEventPinsMapSemanticsEventCluster(
          count: group.items.length,
        ),
        consumeTapEvents: true,
        onTap: () => _zoomToCluster(group),
      );
    }
    final item = group.items.single;
    final iconKey = _eventMapPinIconKey(item);
    final isSelected = item.mapId == widget.selectedEventId;
    final restingKey = _EventMapPinIconKey(
      activityKindName: item.activityKind.name,
      selected: false,
      label: null,
    );
    final bitmapState = eventMapPinBitmapState(
      selectedBitmap: _pinBitmaps[iconKey],
      restingBitmap: _pinBitmaps[restingKey],
      rasterFailed: _failedPinBitmapKeys.contains(iconKey),
    );
    if (!bitmapState.publish) return null;
    return MapMarker(
      id: item.mapId,
      position: item.coordinate,
      bitmap: bitmapState.bitmap,
      zIndex: isSelected ? 2 : 1,
      infoTitle: eventMapMarkerSemanticLabel(item),
      consumeTapEvents: true,
      onTap: _canSelect(item) ? () => _select(item) : null,
    );
  }

  void _moveCameraTo(LocationCoordinate center, {required bool animate}) {
    final controller = _mapController;
    if (controller == null) return;
    if (animate) {
      unawaited(controller.animateTo(center));
    } else {
      unawaited(controller.moveTo(center));
    }
  }

  void _zoomToCluster(_MapMarkerGroup group) {
    final controller = _mapController;
    if (controller == null) return;
    final nextZoom = math.min(_cameraZoom + 1.6, 15.5);
    unawaited(controller.animateTo(group.center, zoom: nextZoom));
  }

  bool get _reduceMotion =>
      MediaQuery.maybeOf(context)?.disableAnimations == true;

  void _restoreOverview() {
    catchTransitionHaptic();
    unawaited(_fitOverview(animate: !_reduceMotion));
  }

  Future<void> _fitOverview({required bool animate}) async {
    final controller = _mapController;
    if (controller == null) return;
    final coordinates = <LocationCoordinate>[
      for (final item in _pinnedItems) item.coordinate,
    ];
    final userLocation = widget.userLocation;
    final radiusKm = widget.distanceRingRadiusKm;
    if (userLocation != null && radiusKm != null && radiusKm > 0) {
      coordinates.addAll(
        eventMapRingBoundsCoordinates(
          userLocation,
          distanceMeters: radiusKm * 1000,
        ),
      );
    }
    if (coordinates.isEmpty) coordinates.add(widget.initialCenter);
    try {
      await controller.fitCoordinates(
        coordinates,
        padding: CatchSpacing.s16,
        animate: animate,
      );
    } catch (error, stackTrace) {
      FlutterError.reportError(
        FlutterErrorDetails(
          exception: error,
          stack: stackTrace,
          library: 'Catch event map',
          context: ErrorDescription('fitting the event map overview'),
        ),
      );
      _moveCameraTo(widget.initialCenter, animate: animate);
    }
  }

  void _handleCameraMove(MapCameraPosition position) {
    _pendingCameraCenter = position.center;
    _pendingCameraZoom = position.zoom;
    if (_distanceRingLabelOffset != null) {
      setState(() => _distanceRingLabelOffset = null);
    }
  }

  void _handleCameraIdle() {
    final nextCenter = _pendingCameraCenter;
    final nextZoom = _pendingCameraZoom;
    if (nextCenter != null &&
        (_lastReportedCameraCenter == null ||
            !_samePoint(_lastReportedCameraCenter!, nextCenter))) {
      _lastReportedCameraCenter = nextCenter;
      widget.onCameraCenterChanged?.call(nextCenter);
    }
    if (nextZoom != null && (nextZoom - _cameraZoom).abs() >= 0.05) {
      setState(() => _cameraZoom = nextZoom);
    }
    unawaited(_updateDistanceRingLabelOffset());
  }

  Future<void> _updateDistanceRingLabelOffset() async {
    final generation = ++_distanceRingProjectionGeneration;
    final controller = _mapController;
    final center = widget.userLocation;
    final radiusKm = widget.distanceRingRadiusKm;
    final label = widget.distanceRingLabel?.trim();
    if (controller == null ||
        center == null ||
        radiusKm == null ||
        radiusKm <= 0 ||
        label == null ||
        label.isEmpty) {
      if (mounted && _distanceRingLabelOffset != null) {
        setState(() => _distanceRingLabelOffset = null);
      }
      return;
    }

    try {
      final edge = eventMapCoordinateNorthOf(
        center,
        distanceMeters: radiusKm * 1000,
      );
      final pixelRatio = MediaQuery.maybeDevicePixelRatioOf(context) ?? 1;
      final offset = await controller.screenOffsetFor(
        edge,
        devicePixelRatio: pixelRatio,
      );
      if (!mounted || generation != _distanceRingProjectionGeneration) return;
      setState(() => _distanceRingLabelOffset = offset);
    } catch (error, stackTrace) {
      if (!mounted || generation != _distanceRingProjectionGeneration) return;
      FlutterError.reportError(
        FlutterErrorDetails(
          exception: error,
          stack: stackTrace,
          library: 'Catch event map',
          context: ErrorDescription('projecting the distance-ring label'),
        ),
      );
      setState(() => _distanceRingLabelOffset = null);
    }
  }

  LocationCoordinate get _effectiveCameraCenter =>
      widget.selectedEventCenter ?? widget.initialCenter;

  void _ensureMapPinBitmaps(List<_MapMarkerGroup> markerGroups) {
    final pixelRatio = MediaQuery.maybeDevicePixelRatioOf(context) ?? 1;
    final t = CatchTokens.of(context);
    final textStyle = CatchTextStyles.badge(context, color: t.primaryInk);
    final clusterTextStyle = CatchTextStyles.badge(context, color: t.bg);
    final mapLibraryLabel =
        context.l10n.eventsEventPinsMapVisiblecopyCatchEventMap;
    final buildingPinLabel =
        context.l10n.eventsEventPinsMapVisiblecopyBuildingEventMapPin;

    for (final group in markerGroups) {
      if (group.isCluster) {
        final count = group.items.length;
        if (_clusterBitmaps.containsKey(count) ||
            _pendingClusterBitmapCounts.contains(count) ||
            _failedClusterBitmapCounts.contains(count)) {
          continue;
        }
        _pendingClusterBitmapCounts.add(count);
        unawaited(
          buildEventMapClusterPinBitmap(
                count: count,
                fillColor: t.ink,
                borderColor: t.surface,
                pixelRatio: pixelRatio,
                textStyle: clusterTextStyle,
              )
              .then((bitmap) {
                if (!mounted) return;
                setState(() {
                  _pendingClusterBitmapCounts.remove(count);
                  _clusterBitmaps[count] = bitmap;
                });
              })
              .catchError((Object error, StackTrace stackTrace) {
                FlutterError.reportError(
                  FlutterErrorDetails(
                    exception: error,
                    stack: stackTrace,
                    library: 'Catch event map',
                    context: ErrorDescription('building event cluster marker'),
                  ),
                );
                if (!mounted) return;
                setState(() {
                  _pendingClusterBitmapCounts.remove(count);
                  _failedClusterBitmapCounts.add(count);
                });
              }),
        );
        continue;
      }
      final item = group.items.single;
      final key = _eventMapPinIconKey(item);
      if (_pinBitmaps.containsKey(key) ||
          _pendingPinBitmapKeys.contains(key) ||
          _failedPinBitmapKeys.contains(key)) {
        continue;
      }
      final activity = ActivityPalette.resolve(context, item.activityKind);
      _pendingPinBitmapKeys.add(key);
      unawaited(
        _buildEventMapPinBitmap(
              activityColor: activity.accent,
              inkColor: t.ink,
              shadowColor: t.ink.withValues(
                alpha: CatchOpacity.activityMapPinShadow,
              ),
              selected: key.selected,
              label: key.label,
              pixelRatio: pixelRatio,
              textStyle: textStyle,
            )
            .then((bitmap) {
              if (!mounted) return;
              setState(() {
                _pendingPinBitmapKeys.remove(key);
                _pinBitmaps[key] = bitmap;
              });
            })
            .catchError((Object error, StackTrace stackTrace) {
              FlutterError.reportError(
                FlutterErrorDetails(
                  exception: error,
                  stack: stackTrace,
                  library: mapLibraryLabel,
                  context: ErrorDescription(buildingPinLabel),
                ),
              );
              if (!mounted) return;
              setState(() {
                _pendingPinBitmapKeys.remove(key);
                _failedPinBitmapKeys.add(key);
              });
            }),
      );
    }
  }

  _EventMapPinIconKey _eventMapPinIconKey(EventMapPinItem item) {
    final selected = item.mapId == widget.selectedEventId;
    return _EventMapPinIconKey(
      activityKindName: item.activityKind.name,
      selected: selected,
      label: selected ? eventMapPinFlagLabel(item) : null,
    );
  }

  bool _canSelect(EventMapPinItem item) => switch (item) {
    EventMapItem() => widget.onEventSelected != null,
    ExternalEventMapItem() => widget.onExternalEventSelected != null,
  };

  void _select(EventMapPinItem item) {
    switch (item) {
      case EventMapItem(:final event):
        widget.onEventSelected?.call(event);
      case ExternalEventMapItem(:final event):
        widget.onExternalEventSelected?.call(event);
    }
  }
}

@visibleForTesting
LocationCoordinate eventMapCoordinateNorthOf(
  LocationCoordinate center, {
  required double distanceMeters,
}) {
  const earthRadiusMeters = 6371008.8;
  final latitudeDeltaDegrees =
      (distanceMeters / earthRadiusMeters) * (180 / math.pi);
  return LocationCoordinate(
    (center.latitude + latitudeDeltaDegrees).clamp(-90.0, 90.0),
    center.longitude,
  );
}

@visibleForTesting
List<LocationCoordinate> eventMapRingBoundsCoordinates(
  LocationCoordinate center, {
  required double distanceMeters,
}) {
  const earthRadiusMeters = 6371008.8;
  final latitudeRadians = center.latitude * math.pi / 180;
  final latitudeDelta = (distanceMeters / earthRadiusMeters) * (180 / math.pi);
  final longitudeScale = math.max(math.cos(latitudeRadians).abs(), 0.01);
  final longitudeDelta =
      (distanceMeters / (earthRadiusMeters * longitudeScale)) * (180 / math.pi);
  return <LocationCoordinate>[
    LocationCoordinate(
      (center.latitude + latitudeDelta).clamp(-90.0, 90.0),
      center.longitude,
    ),
    LocationCoordinate(
      center.latitude,
      (center.longitude + longitudeDelta).clamp(-180.0, 180.0),
    ),
    LocationCoordinate(
      (center.latitude - latitudeDelta).clamp(-90.0, 90.0),
      center.longitude,
    ),
    LocationCoordinate(
      center.latitude,
      (center.longitude - longitudeDelta).clamp(-180.0, 180.0),
    ),
  ];
}

Duration _mapOverlayMotionDuration(BuildContext context) {
  return MediaQuery.maybeOf(context)?.disableAnimations == true
      ? Duration.zero
      : CatchMotion.calendarScroll;
}

@visibleForTesting
String eventMapPinFlagLabel(EventMapPinItem item) => item.pinFlagLabel;

@visibleForTesting
String eventMapMarkerSemanticLabel(EventMapPinItem item) =>
    item.markerSemanticLabel;

@visibleForTesting
({MapMarkerBitmap? bitmap, bool publish}) eventMapPinBitmapState({
  required MapMarkerBitmap? selectedBitmap,
  required MapMarkerBitmap? restingBitmap,
  required bool rasterFailed,
}) {
  final bitmap = selectedBitmap ?? restingBitmap;
  return (bitmap: bitmap, publish: bitmap != null || rasterFailed);
}

class EventPinsFallbackMap extends StatelessWidget {
  const EventPinsFallbackMap({
    super.key,
    required this.items,
    required this.selectedEventId,
    required this.userLocation,
    required this.distanceRingRadiusKm,
    this.distanceRingLabel,
    this.distanceRingSemanticHint,
    required this.onEventSelected,
    this.onExternalEventSelected,
    this.onMapTapped,
    this.onDistanceRingTapped,
  });

  final List<EventMapPinItem> items;
  final String? selectedEventId;
  final LocationCoordinate? userLocation;
  final double? distanceRingRadiusKm;
  final String? distanceRingLabel;
  final String? distanceRingSemanticHint;
  final ValueChanged<Event>? onEventSelected;
  final ValueChanged<ExternalEvent>? onExternalEventSelected;
  final VoidCallback? onMapTapped;
  final VoidCallback? onDistanceRingTapped;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final ringRadiusKm = distanceRingRadiusKm;
    final showDistanceRing =
        userLocation != null && ringRadiusKm != null && ringRadiusKm > 0;
    return CatchSurface(
      duration: Duration.zero,
      radius: CatchRadius.none,
      backgroundColor: t.primarySoft,
      child: Semantics(
        container: true,
        explicitChildNodes: true,
        label: context.l10n.eventsEventPinsMapLabelEventMapPreview,
        button: onMapTapped != null,
        onTap: onMapTapped,
        child: Stack(
          children: [
            Positioned.fill(
              child: Listener(
                behavior: HitTestBehavior.opaque,
                onPointerUp: onMapTapped == null ? null : (_) => onMapTapped!(),
                child: const SizedBox.expand(),
              ),
            ),
            if (showDistanceRing)
              Positioned.fill(
                child: Center(
                  child: CatchDistanceOverlay(
                    size: _eventMapFixtureRequestedRingSize(ringRadiusKm),
                    fitAvailable: true,
                    label: distanceRingLabel,
                    semanticHint: distanceRingSemanticHint,
                    onTap: onDistanceRingTapped,
                  ),
                ),
              ),
            Positioned.fill(
              child: CustomMultiChildLayout(
                delegate: _EventFixturePinLayoutDelegate(
                  selected: [
                    for (final item in items) selectedEventId == item.mapId,
                  ],
                ),
                children: [
                  for (final indexed in items.indexed)
                    LayoutId(
                      id: indexed.$1,
                      child: Semantics(
                        button: _canSelectMapItem(
                          indexed.$2,
                          onEventSelected: onEventSelected,
                          onExternalEventSelected: onExternalEventSelected,
                        ),
                        selected: selectedEventId == indexed.$2.mapId,
                        label:
                            !_canSelectMapItem(
                              indexed.$2,
                              onEventSelected: onEventSelected,
                              onExternalEventSelected: onExternalEventSelected,
                            )
                            ? context.l10n
                                  .eventsEventPinsMapLabelLocationnameLocation(
                                    locationName: indexed.$2.locationName,
                                  )
                            : context.l10n
                                  .eventsEventPinsMapLabelSelectLocationname(
                                    locationName: indexed.$2.locationName,
                                  ),
                        child: GestureDetector(
                          onTap:
                              !_canSelectMapItem(
                                indexed.$2,
                                onEventSelected: onEventSelected,
                                onExternalEventSelected:
                                    onExternalEventSelected,
                              )
                              ? null
                              : () => _selectMapItem(
                                  indexed.$2,
                                  onEventSelected: onEventSelected,
                                  onExternalEventSelected:
                                      onExternalEventSelected,
                                ),
                          child: Center(
                            child: ActivityMapPin(
                              activityKind: indexed.$2.activityKind,
                              selected: selectedEventId == indexed.$2.mapId,
                              label: selectedEventId == indexed.$2.mapId
                                  ? eventMapPinFlagLabel(indexed.$2)
                                  : null,
                              size: selectedEventId == indexed.$2.mapId
                                  ? CatchLayout.activityMapPinSelectedSize
                                  : CatchLayout.activityMapPinRestingSize,
                            ),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
