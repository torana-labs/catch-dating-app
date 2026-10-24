import 'package:catch_dating_app/locations/domain/location_coordinate.dart';
import 'package:catch_dating_app/locations/shared/location_map.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// A read-only, attribution-safe Google Maps viewport for compact previews.
///
/// The preview deliberately owns all gesture and map-control configuration so
/// feature call sites cannot accidentally turn a compact map into a second
/// interactive map screen. [enableNetworkTiles] is an explicit deterministic
/// seam for Widgetbook, golden tests, and offline captures.
class MapPreview extends StatelessWidget {
  const MapPreview({
    super.key,
    required this.coordinate,
    required this.fallbackLabel,
    this.markerHue = MapMarkerHue.orange,
    this.path = const [],
    this.markers = const [],
    this.enableNetworkTiles = true,
    this.zoom = 15.5,
  });

  final LocationCoordinate? coordinate;
  final String fallbackLabel;
  final MapMarkerHue markerHue;
  final List<LocationCoordinate> path;
  final List<MapMarker> markers;
  final bool enableNetworkTiles;
  final double zoom;

  bool get showsGoogleMap => coordinate != null && enableNetworkTiles;

  @override
  Widget build(BuildContext context) {
    final coordinate = this.coordinate;
    if (coordinate == null || !enableNetworkTiles) {
      final t = CatchTokens.of(context);
      return ColoredBox(
        color: t.bg,
        child: Center(
          child: Padding(
            padding: CatchInsets.content,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(CatchIcons.mapOutlined, color: t.ink3, size: CatchIcon.lg),
                if (fallbackLabel.trim().isNotEmpty) ...[
                  gapH6,
                  CatchText(
                    fallbackLabel,
                    maxLines: 2,
                    textAlign: TextAlign.center,
                    variant: CatchTextVariant.supporting,
                    color: t.ink3,
                  ),
                ],
              ],
            ),
          ),
        ),
      );
    }

    return Semantics(
      image: true,
      label: fallbackLabel,
      child: IgnorePointer(
        child: LocationMap(
          initialCenter: _previewCenter(coordinate, path, markers),
          initialZoom: path.length >= 2 || markers.isNotEmpty ? 13.5 : zoom,
          markers: {
            MapMarker(
              id: 'catch-map-preview-location',
              position: coordinate,
              hue: markerHue,
            ),
            ...markers,
          },
          polylines: {
            if (path.length >= 2)
              MapPolyline(
                id: 'catch-map-preview-route',
                points: path,
                color: CatchTokens.of(context).primary,
              ),
          },
          rotateGesturesEnabled: false,
          scrollGesturesEnabled: false,
          zoomGesturesEnabled: false,
          tiltGesturesEnabled: false,
          liteModeEnabled: Theme.of(context).platform == TargetPlatform.android,
          // Keep Google's attribution clear of the preview caption, which is
          // rendered outside this viewport by the owning surface.
          padding: const EdgeInsets.only(bottom: CatchSpacing.s2),
        ),
      ),
    );
  }
}

LocationCoordinate _previewCenter(
  LocationCoordinate meetingPoint,
  List<LocationCoordinate> path,
  List<MapMarker> markers,
) {
  final points = [
    if (path.isEmpty) meetingPoint else ...path,
    ...markers.map((marker) => marker.position),
  ];
  final latitude = points.fold<double>(0, (sum, point) => sum + point.latitude);
  final longitude = points.fold<double>(
    0,
    (sum, point) => sum + point.longitude,
  );
  return LocationCoordinate(
    latitude / points.length,
    longitude / points.length,
  );
}
