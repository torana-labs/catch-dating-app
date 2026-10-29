import 'package:catch_dating_app/core/backend_error_util.dart';
import 'package:catch_dating_app/core/firebase_providers.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callable_request_dtos.g.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part '../../../hosts/data/host_event_staff_repository.g.dart';

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

  factory HostEventOperatorAccess.fromCallableData(Object? value) {
    final map = _requiredMap(value, 'event operator access');
    return HostEventOperatorAccess(
      eventId: _requiredString(map, 'eventId'),
      organizerId: _requiredString(map, 'organizerId'),
      title: _requiredString(map, 'title'),
      startAt: _requiredDateTime(map, 'startAtMillis'),
      endAt: _requiredDateTime(map, 'endAtMillis'),
      eventStatus: _requiredString(map, 'eventStatus'),
      actorRole: HostEventOperatorRole.values.byName(
        _requiredString(map, 'actorRole'),
      ),
      permissions: _requiredStringList(
        map,
        'permissions',
      ).map(HostEventOperatorPermission.values.byName).toSet(),
      grantExpiresAt: _nullableDateTime(map['grantExpiresAtMillis']),
    );
  }

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
  const HostEventStaffRepository(this._functions);

  final FirebaseFunctions _functions;

  Future<HostEventOperatorAccess> getAccess(String eventId) => _call(
    name: 'getEventOperatorAccess',
    payload: EventOperatorAccessCallableRequest(eventId: eventId).toJson(),
    action: 'load event operator access',
    parse: HostEventOperatorAccess.fromCallableData,
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
    HostEventStaffRepository(ref.watch(firebaseFunctionsProvider));

@riverpod
Future<HostEventOperatorAccess> hostEventOperatorAccess(
  Ref ref,
  String eventId,
) => ref.read(hostEventStaffRepositoryProvider).getAccess(eventId);

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

DateTime? _nullableDateTime(Object? value) {
  if (value == null) return null;
  if (value is num) return DateTime.fromMillisecondsSinceEpoch(value.toInt());
  throw const FormatException('Invalid nullable date.');
}

List<String> _requiredStringList(Map<Object?, Object?> map, String field) {
  final value = map[field];
  if (value is List<Object?> && value.every((item) => item is String)) {
    return value.cast<String>();
  }
  throw FormatException('Invalid $field.');
}
