import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';
import 'package:collection/collection.dart';

enum RouteMovementMode { run, walk, ride, mixed }

enum RouteShape { loop, outAndBack, pointToPoint }

enum RouteGroupStrategy { together, paceGroups, selfDirected }

enum RouteStopCadence { continuous, flexibleStops, hostedStops }

enum RouteStopKind {
  water,
  regroup,
  venue,
  photoSpot,
  viewpoint,
  hazard,
  turnaround,
}

enum RouteRoleKind { routeLead, sweep, pacer, stopHost, marshal, photographer }

enum RouteLiveTrackingMode { disabled, hostOnly, authorizedOperators }

class RoutePoint {
  const RoutePoint({required this.latitude, required this.longitude});

  factory RoutePoint.fromJson(Map<Object?, Object?> json) => RoutePoint(
    latitude: (json['latitude'] as num).toDouble(),
    longitude: (json['longitude'] as num).toDouble(),
  );

  final double latitude;
  final double longitude;

  Map<String, dynamic> toJson() => {
    'latitude': latitude,
    'longitude': longitude,
  };

  @override
  bool operator ==(Object other) =>
      other is RoutePoint &&
      latitude == other.latitude &&
      longitude == other.longitude;

  @override
  int get hashCode => Object.hash(latitude, longitude);
}

class RoutePaceGroup {
  const RoutePaceGroup({
    required this.id,
    required this.label,
    required this.sortOrder,
    this.targetPaceSecondsPerKm,
  });

  factory RoutePaceGroup.fromJson(Map<Object?, Object?> json) => RoutePaceGroup(
    id: json['id']! as String,
    label: json['label']! as String,
    sortOrder: json['sortOrder']! as int,
    targetPaceSecondsPerKm: json['targetPaceSecondsPerKm'] as int?,
  );

  final String id;
  final String label;
  final int sortOrder;
  final int? targetPaceSecondsPerKm;

  Map<String, dynamic> toJson() => {
    'id': id,
    'label': label,
    'sortOrder': sortOrder,
    'targetPaceSecondsPerKm': targetPaceSecondsPerKm,
  };

  @override
  bool operator ==(Object other) =>
      other is RoutePaceGroup &&
      id == other.id &&
      label == other.label &&
      sortOrder == other.sortOrder &&
      targetPaceSecondsPerKm == other.targetPaceSecondsPerKm;

  @override
  int get hashCode => Object.hash(id, label, sortOrder, targetPaceSecondsPerKm);
}

class RouteLiveTrackingPolicy {
  const RouteLiveTrackingPolicy({
    required this.mode,
    required this.staleAfterSeconds,
    required this.retentionMinutes,
  });

  static const disabled = RouteLiveTrackingPolicy(
    mode: RouteLiveTrackingMode.disabled,
    staleAfterSeconds: 120,
    retentionMinutes: 60,
  );

  factory RouteLiveTrackingPolicy.fromJson(Map<Object?, Object?> json) =>
      RouteLiveTrackingPolicy(
        mode: RouteLiveTrackingMode.values.byName(json['mode']! as String),
        staleAfterSeconds: json['staleAfterSeconds']! as int,
        retentionMinutes: json['retentionMinutes']! as int,
      );

  final RouteLiveTrackingMode mode;
  final int staleAfterSeconds;
  final int retentionMinutes;

  bool get enabled => mode != RouteLiveTrackingMode.disabled;

  Map<String, dynamic> toJson() => {
    'mode': mode.name,
    'staleAfterSeconds': staleAfterSeconds,
    'retentionMinutes': retentionMinutes,
  };

  @override
  bool operator ==(Object other) =>
      other is RouteLiveTrackingPolicy &&
      mode == other.mode &&
      staleAfterSeconds == other.staleAfterSeconds &&
      retentionMinutes == other.retentionMinutes;

  @override
  int get hashCode => Object.hash(mode, staleAfterSeconds, retentionMinutes);
}

/// Activity-agnostic operations for an event that moves through a route.
///
/// Activity type remains responsible for the broader event format. This plan
/// composes only how attendees move, stop, and stay accounted for, so runs,
/// walks, crawls, rides, and custom moving events can reuse one contract.
class RouteEventPlan {
  const RouteEventPlan({
    this.version = 1,
    required this.movementMode,
    required this.routeShape,
    required this.groupStrategy,
    required this.stopCadence,
    required this.stopKinds,
    required this.roleKinds,
    this.path = const [],
    this.paceGroups = const [],
    this.liveTrackingPolicy = RouteLiveTrackingPolicy.disabled,
  });

  static const socialRun = RouteEventPlan(
    movementMode: RouteMovementMode.run,
    routeShape: RouteShape.loop,
    groupStrategy: RouteGroupStrategy.paceGroups,
    stopCadence: RouteStopCadence.continuous,
    stopKinds: [
      RouteStopKind.water,
      RouteStopKind.regroup,
      RouteStopKind.hazard,
    ],
    roleKinds: [
      RouteRoleKind.routeLead,
      RouteRoleKind.sweep,
      RouteRoleKind.pacer,
    ],
  );

  static const socialWalk = RouteEventPlan(
    movementMode: RouteMovementMode.walk,
    routeShape: RouteShape.loop,
    groupStrategy: RouteGroupStrategy.together,
    stopCadence: RouteStopCadence.flexibleStops,
    stopKinds: [
      RouteStopKind.regroup,
      RouteStopKind.viewpoint,
      RouteStopKind.hazard,
    ],
    roleKinds: [RouteRoleKind.routeLead, RouteRoleKind.sweep],
  );

  static const socialRide = RouteEventPlan(
    movementMode: RouteMovementMode.ride,
    routeShape: RouteShape.loop,
    groupStrategy: RouteGroupStrategy.paceGroups,
    stopCadence: RouteStopCadence.flexibleStops,
    stopKinds: [
      RouteStopKind.water,
      RouteStopKind.regroup,
      RouteStopKind.hazard,
      RouteStopKind.turnaround,
    ],
    roleKinds: [
      RouteRoleKind.routeLead,
      RouteRoleKind.sweep,
      RouteRoleKind.pacer,
      RouteRoleKind.marshal,
    ],
  );

  static const hostedWalk = RouteEventPlan(
    movementMode: RouteMovementMode.walk,
    routeShape: RouteShape.pointToPoint,
    groupStrategy: RouteGroupStrategy.together,
    stopCadence: RouteStopCadence.hostedStops,
    stopKinds: [
      RouteStopKind.venue,
      RouteStopKind.regroup,
      RouteStopKind.hazard,
    ],
    roleKinds: [
      RouteRoleKind.routeLead,
      RouteRoleKind.sweep,
      RouteRoleKind.stopHost,
    ],
  );

  static const customWalk = RouteEventPlan(
    movementMode: RouteMovementMode.walk,
    routeShape: RouteShape.loop,
    groupStrategy: RouteGroupStrategy.together,
    stopCadence: RouteStopCadence.hostedStops,
    stopKinds: [
      RouteStopKind.regroup,
      RouteStopKind.photoSpot,
      RouteStopKind.viewpoint,
      RouteStopKind.hazard,
    ],
    roleKinds: [
      RouteRoleKind.routeLead,
      RouteRoleKind.sweep,
      RouteRoleKind.stopHost,
      RouteRoleKind.photographer,
    ],
  );

  static RouteEventPlan? defaultForActivity(ActivityKind activityKind) =>
      switch (activityKind) {
        ActivityKind.socialRun || ActivityKind.running => socialRun,
        ActivityKind.walking => socialWalk,
        ActivityKind.cycling => socialRide,
        ActivityKind.barCrawl => hostedWalk,
        ActivityKind.pickleball ||
        ActivityKind.padel ||
        ActivityKind.tennis ||
        ActivityKind.badminton ||
        ActivityKind.spinClass ||
        ActivityKind.yoga ||
        ActivityKind.strengthTraining ||
        ActivityKind.pubQuiz ||
        ActivityKind.dinner ||
        ActivityKind.singlesMixer ||
        ActivityKind.openActivity => null,
      };

  static RouteEventPlan? tryFromJson(Object? value) {
    if (value is! Map<Object?, Object?>) return null;
    final version = value['version'];
    final movementMode = _enumByName(
      RouteMovementMode.values,
      value['movementMode'],
    );
    final routeShape = _enumByName(RouteShape.values, value['routeShape']);
    final groupStrategy = _enumByName(
      RouteGroupStrategy.values,
      value['groupStrategy'],
    );
    final stopCadence = _enumByName(
      RouteStopCadence.values,
      value['stopCadence'],
    );
    final stopKinds = _enumList(RouteStopKind.values, value['stopKinds']);
    final roleKinds = _enumList(RouteRoleKind.values, value['roleKinds']);
    final hasVersionTwoFields =
        value.containsKey('path') ||
        value.containsKey('paceGroups') ||
        value.containsKey('liveTrackingPolicy');
    if ((version != 1 && version != 2) ||
        (version == 2 && !hasVersionTwoFields) ||
        movementMode == null ||
        routeShape == null ||
        groupStrategy == null ||
        stopCadence == null ||
        stopKinds.isEmpty ||
        roleKinds.isEmpty) {
      return null;
    }
    final path = _objectMapList(
      value['path'],
    ).map(RoutePoint.fromJson).toList(growable: false);
    final paceGroups = _objectMapList(
      value['paceGroups'],
    ).map(RoutePaceGroup.fromJson).toList(growable: false);
    final liveTrackingPolicy = value['liveTrackingPolicy'];
    return RouteEventPlan(
      version: version as int,
      movementMode: movementMode,
      routeShape: routeShape,
      groupStrategy: groupStrategy,
      stopCadence: stopCadence,
      stopKinds: stopKinds,
      roleKinds: roleKinds,
      path: path,
      paceGroups: paceGroups,
      liveTrackingPolicy: liveTrackingPolicy is Map<Object?, Object?>
          ? RouteLiveTrackingPolicy.fromJson(liveTrackingPolicy)
          : RouteLiveTrackingPolicy.disabled,
    );
  }

  final int version;
  final RouteMovementMode movementMode;
  final RouteShape routeShape;
  final RouteGroupStrategy groupStrategy;
  final RouteStopCadence stopCadence;
  final List<RouteStopKind> stopKinds;
  final List<RouteRoleKind> roleKinds;
  final List<RoutePoint> path;
  final List<RoutePaceGroup> paceGroups;
  final RouteLiveTrackingPolicy liveTrackingPolicy;

  RouteEventPlan copyWith({
    int? version,
    RouteMovementMode? movementMode,
    RouteShape? routeShape,
    RouteGroupStrategy? groupStrategy,
    RouteStopCadence? stopCadence,
    List<RouteStopKind>? stopKinds,
    List<RouteRoleKind>? roleKinds,
    List<RoutePoint>? path,
    List<RoutePaceGroup>? paceGroups,
    RouteLiveTrackingPolicy? liveTrackingPolicy,
  }) => RouteEventPlan(
    version:
        version ??
        (path != null || paceGroups != null || liveTrackingPolicy != null
            ? 2
            : this.version),
    movementMode: movementMode ?? this.movementMode,
    routeShape: routeShape ?? this.routeShape,
    groupStrategy: groupStrategy ?? this.groupStrategy,
    stopCadence: stopCadence ?? this.stopCadence,
    stopKinds: stopKinds ?? this.stopKinds,
    roleKinds: roleKinds ?? this.roleKinds,
    path: path ?? this.path,
    paceGroups: paceGroups ?? this.paceGroups,
    liveTrackingPolicy: liveTrackingPolicy ?? this.liveTrackingPolicy,
  );

  Map<String, dynamic> toJson() => {
    'version': version,
    'movementMode': movementMode.name,
    'routeShape': routeShape.name,
    'groupStrategy': groupStrategy.name,
    'stopCadence': stopCadence.name,
    'stopKinds': stopKinds.map((value) => value.name).toList(growable: false),
    'roleKinds': roleKinds.map((value) => value.name).toList(growable: false),
    if (version >= 2) ...{
      if (path.isNotEmpty)
        'path': path.map((value) => value.toJson()).toList(growable: false),
      if (paceGroups.isNotEmpty)
        'paceGroups': paceGroups
            .map((value) => value.toJson())
            .toList(growable: false),
      'liveTrackingPolicy': liveTrackingPolicy.toJson(),
    },
  };

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is RouteEventPlan &&
          version == other.version &&
          movementMode == other.movementMode &&
          routeShape == other.routeShape &&
          groupStrategy == other.groupStrategy &&
          stopCadence == other.stopCadence &&
          const ListEquality<RouteStopKind>().equals(
            stopKinds,
            other.stopKinds,
          ) &&
          const ListEquality<RouteRoleKind>().equals(
            roleKinds,
            other.roleKinds,
          ) &&
          const ListEquality<RoutePoint>().equals(path, other.path) &&
          const ListEquality<RoutePaceGroup>().equals(
            paceGroups,
            other.paceGroups,
          ) &&
          liveTrackingPolicy == other.liveTrackingPolicy;

  @override
  int get hashCode => Object.hash(
    version,
    movementMode,
    routeShape,
    groupStrategy,
    stopCadence,
    const ListEquality<RouteStopKind>().hash(stopKinds),
    const ListEquality<RouteRoleKind>().hash(roleKinds),
    const ListEquality<RoutePoint>().hash(path),
    const ListEquality<RoutePaceGroup>().hash(paceGroups),
    liveTrackingPolicy,
  );
}

extension RouteEventFormatX on EventFormatSnapshot {
  RouteEventPlan? get routePlan =>
      RouteEventPlan.tryFromJson(activityDetails['routePlan']);
}

T? _enumByName<T extends Enum>(List<T> values, Object? rawName) {
  if (rawName is! String) return null;
  for (final value in values) {
    if (value.name == rawName) return value;
  }
  return null;
}

List<T> _enumList<T extends Enum>(List<T> values, Object? rawValues) {
  if (rawValues is! List<Object?>) return const [];
  final resolved = <T>[];
  for (final rawValue in rawValues) {
    final value = _enumByName(values, rawValue);
    if (value != null && !resolved.contains(value)) resolved.add(value);
  }
  return resolved;
}

List<Map<Object?, Object?>> _objectMapList(Object? rawValues) {
  if (rawValues is! List<Object?>) return const [];
  return rawValues.whereType<Map<Object?, Object?>>().toList(growable: false);
}
