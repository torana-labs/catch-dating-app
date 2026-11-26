import 'package:catch_dating_app/contexts/events/domain/route_event_plan.dart';
import 'package:catch_dating_app/pages/event/location/location_map.dart';
import 'package:catch_kernel/location_coordinate.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// Drawing a moving event's route: each tap on the map adds a point, the
/// first green and the last orange, joined by a line. Undo and Clear sit
/// over Save route, which returns the points; a single point cannot be
/// saved. Nothing is written here; the route plan section keeps the path.
class CreateRoutePathScreen extends StatefulWidget {
  const CreateRoutePathScreen({
    super.key,
    required this.initialCenter,
    this.initialPath = const [],
    this.enableNetworkTiles = true,
  });

  /// Where the map opens when there is no path yet.
  final LocationCoordinate initialCenter;
  final List<RoutePoint> initialPath;

  /// False draws the map's no-network fallback (previews and captures).
  final bool enableNetworkTiles;

  @override
  State<CreateRoutePathScreen> createState() => _CreateRoutePathScreenState();
}

class _CreateRoutePathScreenState extends State<CreateRoutePathScreen> {
  late final List<RoutePoint> _path = List<RoutePoint>.of(widget.initialPath);

  List<LocationCoordinate> get _coordinates => [
    for (final point in _path)
      LocationCoordinate(point.latitude, point.longitude),
  ];

  void _add(LocationCoordinate coordinate) => setState(
    () => _path.add(
      RoutePoint(
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
      ),
    ),
  );

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final tokens = CatchTokens.of(context);
    final coordinates = _coordinates;
    final empty = coordinates.isEmpty;
    return CatchRoot(
      child: CatchScreen(
        key: const ValueKey<String>('create-route-path'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          title: l10n.hostsRoutePathBuilderTitle,
          back: CatchTopBarBack(label: l10n.hostCreateClose, close: true),
        ),
        bodyScrolls: false,
        body: LocationMap(
          initialCenter: empty ? widget.initialCenter : coordinates.first,
          initialZoom: empty ? 14 : 15,
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
                infoTitle: l10n.hostsRoutePathBuilderPoint(index: index + 1),
              ),
          },
          polylines: {
            if (coordinates.length >= 2)
              MapPolyline(
                id: 'route-builder-path',
                points: coordinates,
                color: tokens.ink,
              ),
          },
          onTap: _add,
        ),
        dock: CatchDock(
          placement: CatchDockPlacement.bar,
          header: CatchStack(
            direction: CatchStackDirection.row,
            gap: CatchStackGap.g8,
            align: CatchStackAlign.center,
            children: [
              Expanded(
                child: CatchText(
                  empty
                      ? l10n.hostsRoutePathBuilderEmpty
                      : l10n.hostsRoutePathBuilderCount(
                          count: coordinates.length,
                        ),
                  variant: CatchTextVariant.bodySmall,
                  tone: CatchTextTone.secondary,
                ),
              ),
              CatchButton(
                key: const ValueKey<String>('create-route-path-undo'),
                label: l10n.hostsRoutePathBuilderUndo,
                variant: CatchButtonVariant.quiet,
                size: CatchButtonSize.sm,
                onPressed: empty ? null : () => setState(_path.removeLast),
              ),
              CatchButton(
                key: const ValueKey<String>('create-route-path-clear'),
                label: l10n.hostsRoutePathBuilderClear,
                variant: CatchButtonVariant.quiet,
                size: CatchButtonSize.sm,
                onPressed: empty ? null : () => setState(_path.clear),
              ),
            ],
          ),
          primary: CatchDockAction(
            label: l10n.hostsRoutePathBuilderSave,
            onPressed: coordinates.length == 1
                ? null
                : () => Navigator.of(
                    context,
                  ).pop(List<RoutePoint>.unmodifiable(_path)),
          ),
        ),
      ),
    );
  }
}
