import 'package:catch_dating_app/events/domain/route_event_plan.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/locations/domain/location_coordinate.dart';
import 'package:catch_dating_app/locations/shared/location_map.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// Tap-to-build route geometry used by moving event formats.
class RoutePathBuilderScreen extends StatefulWidget {
  const RoutePathBuilderScreen({
    super.key,
    required this.initialCenter,
    this.initialPath = const [],
    this.enableNetworkTiles = true,
  });

  final LocationCoordinate initialCenter;
  final List<RoutePoint> initialPath;
  final bool enableNetworkTiles;

  @override
  State<RoutePathBuilderScreen> createState() => _RoutePathBuilderScreenState();
}

class _RoutePathBuilderScreenState extends State<RoutePathBuilderScreen> {
  late List<RoutePoint> _path;

  @override
  void initState() {
    super.initState();
    _path = List<RoutePoint>.of(widget.initialPath);
  }

  List<LocationCoordinate> get _coordinates => _path
      .map((point) => LocationCoordinate(point.latitude, point.longitude))
      .toList(growable: false);

  void _addPoint(LocationCoordinate coordinate) {
    setState(
      () => _path.add(
        RoutePoint(
          latitude: coordinate.latitude,
          longitude: coordinate.longitude,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final coordinates = _coordinates;
    return CatchRouteScaffold(
      topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
        title: context.l10n.hostsRoutePathBuilderTitle,
        navigation: const CatchTopBarNavigation(
          mode: CatchTopBarNavigationMode.close,
        ),
        emphasis: scrolledUnder
            ? CatchTopBarEmphasis.divided
            : CatchTopBarEmphasis.plain,
      ),
      body: CatchRouteBody.fullBleed(
        child: Stack(
          children: [
            Positioned.fill(
              child: LocationMap(
                initialCenter: coordinates.isEmpty
                    ? widget.initialCenter
                    : coordinates.first,
                initialZoom: coordinates.isEmpty ? 14 : 15,
                mapType: widget.enableNetworkTiles
                    ? LocationMapType.normal
                    : LocationMapType.none,
                markers: {
                  for (var index = 0; index < coordinates.length; index++)
                    MapMarker(
                      id: 'route-point-$index',
                      position: coordinates[index],
                      hue: index == 0
                          ? MapMarkerHue.green
                          : index == coordinates.length - 1
                          ? MapMarkerHue.orange
                          : MapMarkerHue.azure,
                      infoTitle: context.l10n.hostsRoutePathBuilderPoint(
                        index: index + 1,
                      ),
                    ),
                },
                polylines: {
                  if (coordinates.length >= 2)
                    MapPolyline(
                      id: 'route-builder-path',
                      points: coordinates,
                      color: t.primary,
                    ),
                },
                onTap: _addPoint,
              ),
            ),
            Positioned(
              left: CatchSpacing.s4,
              right: CatchSpacing.s4,
              bottom: CatchSpacing.s4,
              child: SafeArea(
                top: false,
                child: CatchSurface(
                  backgroundColor: t.surface,
                  borderRole: CatchBorderRole.separator,
                  emphasis: CatchSurfaceEmphasis.floating,
                  padding: CatchInsets.content,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      CatchText(
                        coordinates.isEmpty
                            ? context.l10n.hostsRoutePathBuilderEmpty
                            : context.l10n.hostsRoutePathBuilderCount(
                                count: coordinates.length,
                              ),
                        variant: CatchTextVariant.supporting,
                      ),
                      gapH12,
                      Row(
                        children: [
                          Expanded(
                            child: CatchButton(
                              label: context.l10n.hostsRoutePathBuilderUndo,
                              variant: CatchButtonVariant.secondary,
                              onPressed: coordinates.isEmpty
                                  ? null
                                  : () => setState(_path.removeLast),
                            ),
                          ),
                          gapW8,
                          Expanded(
                            child: CatchButton(
                              label: context.l10n.hostsRoutePathBuilderClear,
                              variant: CatchButtonVariant.ghost,
                              onPressed: coordinates.isEmpty
                                  ? null
                                  : () => setState(_path.clear),
                            ),
                          ),
                        ],
                      ),
                      gapH8,
                      CatchButton(
                        label: context.l10n.hostsRoutePathBuilderSave,
                        fullWidth: true,
                        onPressed: coordinates.length == 1
                            ? null
                            : () => Navigator.of(
                                context,
                              ).pop(List<RoutePoint>.unmodifiable(_path)),
                      ),
                    ],
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
