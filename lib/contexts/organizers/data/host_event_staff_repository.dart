import 'dart:async';

import 'package:catch_dating_app/contexts/account/account.dart';
import 'package:catch_kernel/activity_taxonomy.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/schema_contracts/generated/callable_request_dtos.g.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_event_staff_repository.g.dart';

enum HostEventOperatorPermission {
  viewRoster,
  setAttendance,
  reviewRuntimeClaims,
  publishLiveLocation,
}

enum HostEventOperatorRole { manager, operator }

class HostEventOperatorAccess {
  const HostEventOperatorAccess({
    required this.eventId,
    required this.organizerId,
    required this.title,
    required this.startAt,
    required this.endAt,
    required this.eventStatus,
    required this.actorRole,
    required this.permissions,
    required this.grantExpiresAt,
  });

  final String eventId;
  final String organizerId;
  final String title;
  final DateTime startAt;
  final DateTime endAt;
  final String eventStatus;
  final HostEventOperatorRole actorRole;
  final Set<HostEventOperatorPermission> permissions;
  final DateTime? grantExpiresAt;

  bool has(HostEventOperatorPermission permission) =>
      permissions.contains(permission);
}

/// The event fields operator access needs, read directly from `events`.
///
/// Rules let organizer managers and active `viewRoster` staff read private
/// and published events, so no projection callable sits in between.
class HostOperatorEvent {
  const HostOperatorEvent({
    required this.eventId,
    required this.organizerId,
    required this.title,
    required this.startAt,
    required this.endAt,
    required this.status,
  });

  factory HostOperatorEvent.fromData(
    String eventId,
    Map<String, dynamic> data,
  ) {
    final organizerId = data['organizerId'];
    final startTime = data['startTime'];
    final endTime = data['endTime'];
    final status = data['status'];
    if (organizerId is! String || organizerId.isEmpty) {
      throw const FormatException('Event has no organizer.');
    }
    if (startTime is! Timestamp ||
        endTime is! Timestamp ||
        !endTime.toDate().isAfter(startTime.toDate())) {
      throw const FormatException('This event needs a valid time range.');
    }
    if (status is! String || status.isEmpty) {
      throw const FormatException('Invalid event status.');
    }
    return HostOperatorEvent(
      eventId: eventId,
      organizerId: organizerId,
      title: _eventTitle(data),
      startAt: startTime.toDate(),
      endAt: endTime.toDate(),
      status: status,
    );
  }

  final String eventId;
  final String organizerId;
  final String title;
  final DateTime startAt;
  final DateTime endAt;
  final String status;

  /// Same label the retired projection used: the authored name, else the
  /// event format's label.
  static String _eventTitle(Map<String, dynamic> data) {
    final name = data['name'];
    if (name is String && name.trim().isNotEmpty) return name.trim();
    final format = data['eventFormat'];
    if (format is Map) {
      return EventFormatSnapshot.fromJson(
        Map<String, dynamic>.from(format),
      ).eventTitleLabel;
    }
    return 'Event';
  }
}

/// The caller's own `eventStaffGrants/{eventId}__{uid}` document.
class HostOwnEventStaffGrant {
  const HostOwnEventStaffGrant({
    required this.eventId,
    required this.organizerId,
    required this.uid,
    required this.role,
    required this.status,
    required this.permissions,
    required this.expiresAt,
    required this.hasOperatorExpiry,
    required this.operatorExpiresAt,
  });

  factory HostOwnEventStaffGrant.fromData(Map<String, dynamic> data) {
    final expiresAt = data['expiresAt'];
    if (expiresAt is! Timestamp) {
      throw const FormatException('Invalid expiresAt.');
    }
    final operatorExpiresAt = data['operatorExpiresAt'];
    if (operatorExpiresAt != null && operatorExpiresAt is! Timestamp) {
      throw const FormatException('Invalid operatorExpiresAt.');
    }
    final permissions = data['permissions'];
    if (permissions is! List<Object?>) {
      throw const FormatException('Invalid permissions.');
    }
    return HostOwnEventStaffGrant(
      eventId: _requiredString(data, 'eventId'),
      organizerId: _requiredString(data, 'organizerId'),
      uid: _requiredString(data, 'uid'),
      role: _requiredString(data, 'role'),
      status: _requiredString(data, 'status'),
      permissions: {for (final value in permissions) ?_permissionByName(value)},
      expiresAt: expiresAt.toDate(),
      hasOperatorExpiry: data.containsKey('operatorExpiresAt'),
      operatorExpiresAt: (operatorExpiresAt as Timestamp?)?.toDate(),
    );
  }

  final String eventId;
  final String organizerId;
  final String uid;
  final String role;
  final String status;
  final Set<HostEventOperatorPermission> permissions;
  final DateTime expiresAt;

  /// Whether the document carries `operatorExpiresAt`, even as null.
  final bool hasOperatorExpiry;
  final DateTime? operatorExpiresAt;

  /// When event-wide permissions end. Group duties never prolong them: a
  /// missing legacy value uses `expiresAt` for check-in operators only, and
  /// null grants no event-wide permissions.
  DateTime? get operatorExpiry {
    final DateTime? value = hasOperatorExpiry
        ? operatorExpiresAt
        : (role == 'checkInOperator' ? expiresAt : null);
    if (value == null) return null;
    return value.isBefore(expiresAt) ? value : expiresAt;
  }

  static HostEventOperatorPermission? _permissionByName(Object? value) {
    for (final permission in HostEventOperatorPermission.values) {
      if (permission.name == value) return permission;
    }
    return null;
  }
}

/// Resolves what the signed-in account may do at one event.
///
/// Organizer managers get every permission. Anyone else needs an active,
/// unexpired grant for this event and organizer that includes `viewRoster`.
/// [managerUserIds] is null when rules deny the organizer read, which means
/// the caller is not a manager.
HostEventOperatorAccess resolveHostEventOperatorAccess({
  required HostOperatorEvent event,
  required String uid,
  required Set<String>? managerUserIds,
  required HostOwnEventStaffGrant? grant,
  required DateTime now,
}) {
  if (managerUserIds?.contains(uid) ?? false) {
    return HostEventOperatorAccess(
      eventId: event.eventId,
      organizerId: event.organizerId,
      title: event.title,
      startAt: event.startAt,
      endAt: event.endAt,
      eventStatus: event.status,
      actorRole: HostEventOperatorRole.manager,
      permissions: HostEventOperatorPermission.values.toSet(),
      grantExpiresAt: null,
    );
  }
  final expiry = grant?.operatorExpiry;
  if (grant == null ||
      grant.eventId != event.eventId ||
      grant.organizerId != event.organizerId ||
      grant.uid != uid ||
      grant.status != 'active' ||
      expiry == null ||
      !expiry.isAfter(now) ||
      !grant.permissions.contains(HostEventOperatorPermission.viewRoster)) {
    throw const PermissionException(
      'This account does not have active event-operator access.',
    );
  }
  return HostEventOperatorAccess(
    eventId: event.eventId,
    organizerId: event.organizerId,
    title: event.title,
    startAt: event.startAt,
    endAt: event.endAt,
    eventStatus: event.status,
    actorRole: HostEventOperatorRole.operator,
    permissions: grant.permissions,
    grantExpiresAt: expiry,
  );
}

enum HostEventStaffStatus { active, revoked, expired }

enum HostEventStaffGrantWindow {
  fourHours(4),
  twelveHours(12),
  oneDay(24),
  sevenDays(168);

  const HostEventStaffGrantWindow(this.hours);

  final int hours;

  DateTime expiresFrom(DateTime now) => now.add(Duration(hours: hours));
}

class HostEventStaffMember {
  const HostEventStaffMember({
    required this.uid,
    required this.displayName,
    required this.phoneLastFour,
    required this.status,
    required this.expiresAt,
    required this.revision,
  });

  factory HostEventStaffMember.fromMap(Map<Object?, Object?> map) =>
      HostEventStaffMember(
        uid: _requiredString(map, 'uid'),
        displayName: _requiredString(map, 'displayName'),
        phoneLastFour: _requiredString(map, 'phoneLastFour'),
        status: HostEventStaffStatus.values.byName(
          _requiredString(map, 'status'),
        ),
        expiresAt: _requiredDateTime(map, 'expiresAtMillis'),
        revision: _requiredInt(map, 'revision'),
      );

  final String uid;
  final String displayName;
  final String phoneLastFour;
  final HostEventStaffStatus status;
  final DateTime expiresAt;
  final int revision;
}

class HostEventStaffList {
  const HostEventStaffList({required this.eventId, required this.members});

  factory HostEventStaffList.fromCallableData(Object? value) {
    final map = _requiredMap(value, 'event staff list');
    final members = map['members'];
    if (members is! List<Object?>) {
      throw const FormatException('Invalid event staff members.');
    }
    return HostEventStaffList(
      eventId: _requiredString(map, 'eventId'),
      members: members
          .map(
            (member) => HostEventStaffMember.fromMap(
              _requiredMap(member, 'event staff member'),
            ),
          )
          .toList(growable: false),
    );
  }

  final String eventId;
  final List<HostEventStaffMember> members;
}

class HostEventStaffRepository {
  const HostEventStaffRepository(this._functions, this._db);

  final FirebaseFunctions _functions;
  final FirebaseFirestore _db;

  /// The event's operator fields. A missing document only counts once the
  /// server confirms it, so an offline open keeps loading instead of failing.
  Stream<HostOperatorEvent> watchOperatorEvent(String eventId) =>
      withBackendErrorStream(
        () => _db
            .collection('events')
            .doc(eventId)
            .snapshots()
            .where((doc) => doc.exists || !doc.metadata.isFromCache)
            .map((doc) {
              final data = doc.data();
              if (data == null) {
                throw const DocumentNotFoundException('this event');
              }
              return HostOperatorEvent.fromData(doc.id, data);
            }),
        context: const BackendErrorContext(
          service: BackendService.firestore,
          action: 'load event operator access',
          resource: 'events',
        ),
      );

  /// The organizer's manager ids, or null when rules deny the read because
  /// the caller is not on the organizer team.
  Stream<Set<String>?> watchOrganizerManagerIds(String organizerId) =>
      _nullWhenDenied(
        withBackendErrorStream(
          () => _db
              .collection('organizers')
              .doc(organizerId)
              .snapshots()
              .where((doc) => doc.exists || !doc.metadata.isFromCache)
              .map((doc) => organizerManagerUserIds(doc.data())),
          context: const BackendErrorContext(
            service: BackendService.firestore,
            action: 'load event operator access',
            resource: 'organizers',
          ),
        ),
      );

  /// The caller's own staff grant for [eventId], or null when there is none.
  /// Rules deny a get of a missing grant, so a denial also means none.
  Stream<HostOwnEventStaffGrant?> watchOwnGrant({
    required String eventId,
    required String uid,
  }) => _nullWhenDenied(
    withBackendErrorStream(
      () => _db
          .collection('eventStaffGrants')
          .doc(eventStaffGrantId(eventId, uid))
          .snapshots()
          .where((doc) => doc.exists || !doc.metadata.isFromCache)
          .map((doc) {
            final data = doc.data();
            return data == null ? null : HostOwnEventStaffGrant.fromData(data);
          }),
      context: const BackendErrorContext(
        service: BackendService.firestore,
        action: 'load event operator access',
        resource: 'eventStaffGrants',
      ),
    ),
  );

  Future<HostEventStaffList> listStaff(String eventId) => _call(
    name: 'listEventStaff',
    payload: EventOperatorAccessCallableRequest(eventId: eventId).toJson(),
    action: 'load event staff',
    parse: HostEventStaffList.fromCallableData,
  );

  Future<HostEventStaffList> grant({
    required String eventId,
    required String phoneNumber,
    required DateTime expiresAt,
  }) => _call(
    name: 'grantEventStaff',
    payload: GrantEventStaffCallableRequest(
      eventId: eventId,
      phoneNumber: phoneNumber,
      expiresAtMillis: expiresAt.millisecondsSinceEpoch,
    ).toJson(),
    action: 'grant event staff access',
    parse: HostEventStaffList.fromCallableData,
  );

  Future<HostEventStaffList> revoke({
    required String eventId,
    required HostEventStaffMember member,
  }) => _call(
    name: 'revokeEventStaff',
    payload: RevokeEventStaffCallableRequest(
      eventId: eventId,
      uid: member.uid,
      expectedRevision: member.revision,
    ).toJson(),
    action: 'revoke event staff access',
    parse: HostEventStaffList.fromCallableData,
  );

  Future<T> _call<T>({
    required String name,
    required Map<String, Object?> payload,
    required String action,
    required T Function(Object?) parse,
  }) => withBackendErrorContext(
    () async {
      final result = await _functions
          .httpsCallable(name)
          .call<Object?>(payload);
      return parse(result.data);
    },
    context: BackendErrorContext(
      service: BackendService.functions,
      action: action,
      resource: name,
    ),
  );
}

@riverpod
HostEventStaffRepository hostEventStaffRepository(Ref ref) =>
    HostEventStaffRepository(
      ref.watch(firebaseFunctionsProvider),
      ref.watch(firebaseFirestoreProvider),
    );

@riverpod
Stream<HostOperatorEvent> hostOperatorEvent(Ref ref, String eventId) =>
    ref.watch(hostEventStaffRepositoryProvider).watchOperatorEvent(eventId);

@riverpod
Stream<Set<String>?> hostOperatorOrganizerManagerIds(
  Ref ref,
  String organizerId,
) => ref
    .watch(hostEventStaffRepositoryProvider)
    .watchOrganizerManagerIds(organizerId);

@riverpod
Stream<HostOwnEventStaffGrant?> hostOwnEventStaffGrant(
  Ref ref, {
  required String eventId,
  required String uid,
}) => ref
    .watch(hostEventStaffRepositoryProvider)
    .watchOwnGrant(eventId: eventId, uid: uid);

/// Live operator access for the signed-in account, from three documents the
/// rules already expose: the event, its organizer and the caller's own grant.
/// Rebuilds when any of them changes, and again when a grant expires.
@riverpod
Future<HostEventOperatorAccess> hostEventOperatorAccess(
  Ref ref,
  String eventId,
) async {
  final uid = await ref.watch(uidProvider.future);
  if (uid == null) {
    throw const SignInRequiredException('open this event');
  }
  final event = await ref.watch(hostOperatorEventProvider(eventId).future);
  final managerUserIds = await ref.watch(
    hostOperatorOrganizerManagerIdsProvider(event.organizerId).future,
  );
  final grant = managerUserIds?.contains(uid) ?? false
      ? null
      : await ref.watch(
          hostOwnEventStaffGrantProvider(eventId: eventId, uid: uid).future,
        );
  final clock = ref.watch(appClockProvider);
  final now = clock.now();
  final access = resolveHostEventOperatorAccess(
    event: event,
    uid: uid,
    managerUserIds: managerUserIds,
    grant: grant,
    now: now,
  );
  if (access.grantExpiresAt case final expiresAt?) {
    final timer = clock.timer(expiresAt.difference(now), ref.invalidateSelf);
    ref.onDispose(timer.cancel);
  }
  return access;
}

/// Document id of one account's staff grant for one event.
String eventStaffGrantId(String eventId, String uid) => '${eventId}__$uid';

/// Manager ids from the same organizer fields as the rules'
/// `isOrganizerHostData` and the callables' `organizerManagerUserIds`.
Set<String> organizerManagerUserIds(Map<String, dynamic>? data) {
  if (data == null) return const {};
  final hostUserIds = data['hostUserIds'];
  return {
    if (data['hostUserId'] case final String id when id.isNotEmpty) id,
    if (data['ownerUserId'] case final String id when id.isNotEmpty) id,
    if (hostUserIds is List<Object?>)
      for (final id in hostUserIds)
        if (id is String && id.isNotEmpty) id,
  };
}

/// Ends [source] with null when rules deny the read. Runs after
/// [withBackendErrorStream], so it sees the normalized Firestore denial.
Stream<T?> _nullWhenDenied<T>(Stream<T?> source) => source.transform(
  StreamTransformer<T?, T?>.fromHandlers(
    handleError: (error, stackTrace, sink) {
      if (error is AppException && error.code == _firestoreDenied) {
        sink
          ..add(null)
          ..close();
        return;
      }
      sink.addError(error, stackTrace);
    },
  ),
);

/// The code [withBackendErrorStream] gives a Firestore permission denial.
const _firestoreDenied = 'backend-permission-denied';

Map<Object?, Object?> _requiredMap(Object? value, String label) {
  if (value is Map<Object?, Object?>) return value;
  throw FormatException('Invalid $label.');
}

String _requiredString(Map<Object?, Object?> map, String field) {
  final value = map[field];
  if (value is String && value.isNotEmpty) return value;
  throw FormatException('Invalid $field.');
}

int _requiredInt(Map<Object?, Object?> map, String field) {
  final value = map[field];
  if (value is int) return value;
  if (value is num) return value.toInt();
  throw FormatException('Invalid $field.');
}

DateTime _requiredDateTime(Map<Object?, Object?> map, String field) =>
    DateTime.fromMillisecondsSinceEpoch(_requiredInt(map, field));
