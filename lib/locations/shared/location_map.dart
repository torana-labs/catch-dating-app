import 'dart:typed_data';

import 'package:catch_dating_app/kernel/location_coordinate.dart';
import 'package:catch_dating_app/locations/shared/google_maps_coordinate_adapter.dart';
import 'package:flutter/foundation.dart'
    show TargetPlatform, defaultTargetPlatform;
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart' as gmaps;

enum LocationMapType { normal, none }

abstract final class LocationMapStyle {
  // Map styling is sanctioned cartographic art. Keep the muted paper/ink
  // treatment centralized so event pins remain the map's only strong chroma.
  static const String light = '''
[
  {"elementType":"geometry","stylers":[{"color":"#f4f4f1"}]},
  {"elementType":"labels.icon","stylers":[{"visibility":"off"}]},
  {"elementType":"labels.text.fill","stylers":[{"color":"#544f47"}]},
  {"elementType":"labels.text.stroke","stylers":[{"color":"#f4f4f1"}]},
  {"featureType":"administrative","elementType":"geometry.stroke","stylers":[{"color":"#d6d3cc"}]},
  {"featureType":"poi","elementType":"geometry","stylers":[{"color":"#ecece7"}]},
  {"featureType":"road","elementType":"geometry","stylers":[{"color":"#ffffff"}]},
  {"featureType":"road","elementType":"geometry.stroke","stylers":[{"color":"#d8d6d0"}]},
  {"featureType":"road.highway","elementType":"geometry","stylers":[{"color":"#e5e3dc"}]},
  {"featureType":"transit","stylers":[{"visibility":"off"}]},
  {"featureType":"water","elementType":"geometry","stylers":[{"color":"#dfe3e2"}]}
]
''';

  static const String dark = '''
[
  {"elementType":"geometry","stylers":[{"color":"#18171a"}]},
  {"elementType":"labels.icon","stylers":[{"visibility":"off"}]},
  {"elementType":"labels.text.fill","stylers":[{"color":"#bab2a7"}]},
  {"elementType":"labels.text.stroke","stylers":[{"color":"#18171a"}]},
  {"featureType":"administrative","elementType":"geometry.stroke","stylers":[{"color":"#454147"}]},
  {"featureType":"poi","elementType":"geometry","stylers":[{"color":"#211f23"}]},
  {"featureType":"road","elementType":"geometry","stylers":[{"color":"#2b292d"}]},
  {"featureType":"road","elementType":"geometry.stroke","stylers":[{"color":"#3a373d"}]},
  {"featureType":"road.highway","elementType":"geometry","stylers":[{"color":"#353239"}]},
  {"featureType":"transit","stylers":[{"visibility":"off"}]},
  {"featureType":"water","elementType":"geometry","stylers":[{"color":"#101719"}]}
]
''';

  static String forBrightness(Brightness brightness) =>
      brightness == Brightness.dark ? dark : light;
}

enum MapMarkerHue { azure, green, orange, red, rose, yellow }

class MapCameraPosition {
  const MapCameraPosition({required this.center, required this.zoom});

  final LocationCoordinate center;
  final double zoom;
}

class MapMarker {
  const MapMarker({
    required this.id,
    required this.position,
    this.hue = MapMarkerHue.red,
    this.bitmap,
    this.anchor = const Offset(0.5, 1),
    this.zIndex = 0,
    this.infoTitle,
    this.infoSnippet,
    this.consumeTapEvents = false,
    this.onTap,
  });

  final String id;
  final LocationCoordinate position;
  final MapMarkerHue hue;
  final MapMarkerBitmap? bitmap;
  final Offset anchor;
  final int zIndex;
  final String? infoTitle;
  final String? infoSnippet;
  final bool consumeTapEvents;
  final VoidCallback? onTap;
}

class MapMarkerBitmap {
  const MapMarkerBitmap({
    required this.bytes,
    required this.logicalSize,
    required this.imagePixelRatio,
  });

  final Uint8List bytes;
  final Size logicalSize;
  final double imagePixelRatio;
}

class MapCircle {
  const MapCircle({
    required this.id,
    required this.center,
    required this.radiusMeters,
    required this.strokeWidth,
    required this.strokeColor,
    required this.fillColor,
    this.consumeTapEvents = false,
    this.onTap,
  });

  final String id;
  final LocationCoordinate center;
  final double radiusMeters;
  final int strokeWidth;
  final Color strokeColor;
  final Color fillColor;
  final bool consumeTapEvents;
  final VoidCallback? onTap;
}

class MapPolyline {
  const MapPolyline({
    required this.id,
    required this.points,
    required this.color,
    this.width = 5,
    this.geodesic = true,
  });

  final String id;
  final List<LocationCoordinate> points;
  final Color color;
  final int width;
  final bool geodesic;
}

class LocationMapController {
  const LocationMapController._(this._controller);

  final gmaps.GoogleMapController _controller;

  Future<void> moveTo(LocationCoordinate center) {
    return _controller.moveCamera(
      gmaps.CameraUpdate.newLatLng(center.toGoogleMapsLatLng()),
    );
  }

  Future<void> animateTo(LocationCoordinate center, {double? zoom}) {
    final update = zoom == null
        ? gmaps.CameraUpdate.newLatLng(center.toGoogleMapsLatLng())
        : gmaps.CameraUpdate.newLatLngZoom(center.toGoogleMapsLatLng(), zoom);
    return _controller.animateCamera(update);
  }

  Future<void> fitCoordinates(
    Iterable<LocationCoordinate> coordinates, {
    required double padding,
    required bool animate,
  }) {
    final points = coordinates.toList(growable: false);
    if (points.isEmpty) return Future<void>.value();
    if (points.length == 1) {
      return animate ? animateTo(points.single) : moveTo(points.single);
    }
    var south = points.first.latitude;
    var north = points.first.latitude;
    var west = points.first.longitude;
    var east = points.first.longitude;
    for (final point in points.skip(1)) {
      if (point.latitude < south) south = point.latitude;
      if (point.latitude > north) north = point.latitude;
      if (point.longitude < west) west = point.longitude;
      if (point.longitude > east) east = point.longitude;
    }
    final update = gmaps.CameraUpdate.newLatLngBounds(
      gmaps.LatLngBounds(
        southwest: gmaps.LatLng(south, west),
        northeast: gmaps.LatLng(north, east),
      ),
      padding,
    );
    return animate
        ? _controller.animateCamera(update)
        : _controller.moveCamera(update);
  }

  /// Projects a geographic coordinate into this map widget's logical pixels.
  ///
  /// Android's native Maps SDK reports physical pixels while iOS reports
  /// points, so the wrapper owns that platform normalization instead of
  /// leaking it into map feature code.
  Future<Offset> screenOffsetFor(
    LocationCoordinate coordinate, {
    required double devicePixelRatio,
  }) async {
    final point = await _controller.getScreenCoordinate(
      coordinate.toGoogleMapsLatLng(),
    );
    final scale = defaultTargetPlatform == TargetPlatform.android
        ? devicePixelRatio
        : 1.0;
    return Offset(point.x / scale, point.y / scale);
  }
}

class LocationMap extends StatelessWidget {
  const LocationMap({
    super.key,
    required this.initialCenter,
    required this.initialZoom,
    this.markers = const <MapMarker>{},
    this.circles = const <MapCircle>{},
    this.polylines = const <MapPolyline>{},
    this.mapType = LocationMapType.normal,
    this.myLocationButtonEnabled = false,
    this.mapToolbarEnabled = false,
    this.zoomControlsEnabled = false,
    this.compassEnabled = false,
    this.rotateGesturesEnabled = true,
    this.scrollGesturesEnabled = true,
    this.zoomGesturesEnabled = true,
    this.tiltGesturesEnabled = true,
    this.liteModeEnabled = false,
    this.useCatchStyle = true,
    this.padding = EdgeInsets.zero,
    this.onMapCreated,
    this.onTap,
    this.onCameraMove,
    this.onCameraIdle,
  });

  final LocationCoordinate initialCenter;
  final double initialZoom;
  final Set<MapMarker> markers;
  final Set<MapCircle> circles;
  final Set<MapPolyline> polylines;
  final LocationMapType mapType;
  final bool myLocationButtonEnabled;
  final bool mapToolbarEnabled;
  final bool zoomControlsEnabled;
  final bool compassEnabled;
  final bool rotateGesturesEnabled;
  final bool scrollGesturesEnabled;
  final bool zoomGesturesEnabled;
  final bool tiltGesturesEnabled;
  final bool liteModeEnabled;
  final bool useCatchStyle;
  final EdgeInsets padding;
  final ValueChanged<LocationMapController>? onMapCreated;
  final ValueChanged<LocationCoordinate>? onTap;
  final ValueChanged<MapCameraPosition>? onCameraMove;
  final VoidCallback? onCameraIdle;

  @override
  Widget build(BuildContext context) {
    return gmaps.GoogleMap(
      initialCameraPosition: gmaps.CameraPosition(
        target: initialCenter.toGoogleMapsLatLng(),
        zoom: initialZoom,
      ),
      markers: {for (final marker in markers) _googleMarker(marker)},
      circles: {for (final circle in circles) _googleCircle(circle)},
      polylines: {for (final polyline in polylines) _googlePolyline(polyline)},
      myLocationButtonEnabled: myLocationButtonEnabled,
      mapToolbarEnabled: mapToolbarEnabled,
      zoomControlsEnabled: zoomControlsEnabled,
      compassEnabled: compassEnabled,
      rotateGesturesEnabled: rotateGesturesEnabled,
      scrollGesturesEnabled: scrollGesturesEnabled,
      zoomGesturesEnabled: zoomGesturesEnabled,
      tiltGesturesEnabled: tiltGesturesEnabled,
      liteModeEnabled: liteModeEnabled,
      padding: padding,
      style: useCatchStyle
          ? LocationMapStyle.forBrightness(Theme.of(context).brightness)
          : null,
      mapType: _googleMapType(mapType),
      onMapCreated: onMapCreated == null
          ? null
          : (controller) => onMapCreated!(LocationMapController._(controller)),
      onTap: onTap == null
          ? null
          : (point) => onTap!(point.toLocationCoordinate()),
      onCameraMove: onCameraMove == null
          ? null
          : (position) => onCameraMove!(
              MapCameraPosition(
                center: position.target.toLocationCoordinate(),
                zoom: position.zoom,
              ),
            ),
      onCameraIdle: onCameraIdle,
    );
  }
}

gmaps.Marker _googleMarker(MapMarker marker) {
  final bitmap = marker.bitmap;
  return gmaps.Marker(
    markerId: gmaps.MarkerId(marker.id),
    position: marker.position.toGoogleMapsLatLng(),
    icon: bitmap == null
        ? gmaps.BitmapDescriptor.defaultMarkerWithHue(
            _googleMarkerHue(marker.hue),
          )
        : gmaps.BitmapDescriptor.bytes(
            bitmap.bytes,
            imagePixelRatio: bitmap.imagePixelRatio,
            width: bitmap.logicalSize.width,
            height: bitmap.logicalSize.height,
          ),
    anchor: marker.anchor,
    infoWindow: gmaps.InfoWindow(
      title: marker.infoTitle,
      snippet: marker.infoSnippet,
    ),
    consumeTapEvents: marker.consumeTapEvents,
    zIndexInt: marker.zIndex,
    onTap: marker.onTap,
  );
}

gmaps.Circle _googleCircle(MapCircle circle) {
  return gmaps.Circle(
    circleId: gmaps.CircleId(circle.id),
    center: circle.center.toGoogleMapsLatLng(),
    radius: circle.radiusMeters,
    strokeWidth: circle.strokeWidth,
    strokeColor: circle.strokeColor,
    fillColor: circle.fillColor,
    consumeTapEvents: circle.consumeTapEvents,
    onTap: circle.onTap,
  );
}

gmaps.Polyline _googlePolyline(MapPolyline polyline) {
  return gmaps.Polyline(
    polylineId: gmaps.PolylineId(polyline.id),
    points: polyline.points
        .map((point) => point.toGoogleMapsLatLng())
        .toList(growable: false),
    color: polyline.color,
    width: polyline.width,
    geodesic: polyline.geodesic,
  );
}

gmaps.MapType _googleMapType(LocationMapType type) {
  return switch (type) {
    LocationMapType.normal => gmaps.MapType.normal,
    LocationMapType.none => gmaps.MapType.none,
  };
}

double _googleMarkerHue(MapMarkerHue hue) {
  return switch (hue) {
    MapMarkerHue.azure => gmaps.BitmapDescriptor.hueAzure,
    MapMarkerHue.green => gmaps.BitmapDescriptor.hueGreen,
    MapMarkerHue.orange => gmaps.BitmapDescriptor.hueOrange,
    MapMarkerHue.red => gmaps.BitmapDescriptor.hueRed,
    MapMarkerHue.rose => gmaps.BitmapDescriptor.hueRose,
    MapMarkerHue.yellow => gmaps.BitmapDescriptor.hueYellow,
  };
}
