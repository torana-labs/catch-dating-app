import 'package:catch_dating_app/contexts/live/domain/event_assistance_joining_option.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_observation.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_parsing.dart';

/// A live group scope. Rehearsal commands use a separate simulated boundary.
final class EventAssistanceGroupScope {
  EventAssistanceGroupScope({
    required this.organizerId,
    required this.eventId,
    required this.groupId,
  }) {
    assistanceText(organizerId);
    if (organizerId.contains('/')) {
      throw const FormatException('Invalid departure organizer identity.');
    }
    assistanceId(eventId);
    assistanceId(groupId);
  }

  final String organizerId;
  final String eventId;
  final String groupId;

  Map<String, Object?> get context => {
    'mode': 'live',
    'organizerId': organizerId,
    'eventId': eventId,
  };

  void requireMatch(Object? rawContext, Object? rawGroupId) {
    final value = assistanceObject(rawContext, {
      'mode',
      'organizerId',
      'eventId',
    });
    if (value['mode'] != 'live' ||
        value['organizerId'] != organizerId ||
        value['eventId'] != eventId ||
        rawGroupId != groupId) {
      throw const FormatException('Group progress scope mismatch.');
    }
  }

  @override
  bool operator ==(Object other) =>
      other is EventAssistanceGroupScope &&
      other.organizerId == organizerId &&
      other.eventId == eventId &&
      other.groupId == groupId;
  @override
  int get hashCode => Object.hash(organizerId, eventId, groupId);
}

enum AssistanceCheckpointReporter { selfOnly, anyAuthorizedOperator }

sealed class AssistanceDepartureAuthority {
  const AssistanceDepartureAuthority(this.validUntil);
  final int validUntil;

  factory AssistanceDepartureAuthority.fromJson(Object? value) {
    final map = assistanceObject(value);
    final expiry = assistanceInteger(map['validUntil']);
    return switch (map['kind']) {
      'readOnly' => () {
        assistanceObject(map, {'kind', 'validUntil'});
        return AssistanceDepartureReadOnly(expiry);
      }(),
      'canConfirm' => () {
        assistanceObject(map, {'kind', 'validUntil', 'checkpointReporter'});
        return AssistanceCanConfirmDeparture(
          expiry,
          assistanceEnum(
            AssistanceCheckpointReporter.values,
            map['checkpointReporter'],
          ),
        );
      }(),
      _ => throw const FormatException('Unknown departure authority.'),
    };
  }
}

final class AssistanceDepartureReadOnly extends AssistanceDepartureAuthority {
  const AssistanceDepartureReadOnly(super.validUntil);
}

final class AssistanceCanConfirmDeparture extends AssistanceDepartureAuthority {
  const AssistanceCanConfirmDeparture(
    super.validUntil,
    this.checkpointReporter,
  );
  final AssistanceCheckpointReporter checkpointReporter;
}

enum AssistanceProgressFreshness { unconfirmed, current, sourceChanged }

enum AssistanceProgressOutcome { read, applied, replayed }

typedef AssistanceDepartureDestination = AssistanceJoiningOption;

/// A confirmed fact, not an inference from the event schedule or a GPS fix.
final class AssistanceConfirmedProgress {
  const AssistanceConfirmedProgress._({
    required this.revision,
    required this.destination,
    required this.sourceHash,
    required this.confirmedBy,
    required this.confirmedAt,
    required this.departureRosterId,
  });

  final int revision;
  final AssistanceJoiningTarget destination;
  final String sourceHash;
  final String confirmedBy;
  final int confirmedAt;
  final String? departureRosterId;

  static AssistanceConfirmedProgress? _parse(
    Object? value,
    EventAssistanceGroupScope scope,
    int serverTime,
  ) {
    if (value == null) return null;
    final map = assistanceObject(value);
    assistanceObject(map, {
      'schemaVersion',
      'progressId',
      'context',
      'groupId',
      'revision',
      'destination',
      'sourceHash',
      'confirmedBy',
      'confirmedAt',
      'operationId',
      'requestHash',
      'createdAt',
      'updatedAt',
      if (map.containsKey('departureRosterId')) 'departureRosterId',
    });
    scope.requireMatch(map['context'], map['groupId']);
    final revision = assistanceInteger(map['revision']);
    final confirmedAt = assistanceInteger(map['confirmedAt']);
    final createdAt = assistanceInteger(map['createdAt']);
    final updatedAt = assistanceInteger(map['updatedAt']);
    if (map['schemaVersion'] != 1 ||
        revision < 1 ||
        createdAt > confirmedAt ||
        confirmedAt != updatedAt ||
        updatedAt > serverTime) {
      throw const FormatException('Invalid confirmed departure.');
    }
    _recordId(map['progressId'], 'progress');
    assistanceHash(map['requestHash']);
    assistanceId(map['operationId']);
    return AssistanceConfirmedProgress._(
      revision: revision,
      destination: _target(map['destination'], scope),
      sourceHash: assistanceHash(map['sourceHash']),
      confirmedBy: assistanceText(map['confirmedBy']),
      confirmedAt: confirmedAt,
      departureRosterId: map.containsKey('departureRosterId')
          ? _recordId(map['departureRosterId'], 'departure-roster')
          : null,
    );
  }
}

/// Read permission, runtime readiness and observed progress stay separate.
final class EventAssistanceGroupProgressView {
  const EventAssistanceGroupProgressView._({
    required this.scope,
    required this.actorUid,
    required this.authority,
    required this.serverTime,
    required this.revision,
    required this.sourceHash,
    required this.eventOpen,
    required this.runtimeLive,
    required this.freshness,
    required this.progress,
    required this.guidance,
    required this.destinations,
  });

  final EventAssistanceGroupScope scope;
  final String actorUid;
  final AssistanceDepartureAuthority authority;
  final int serverTime;
  final int revision;
  final String sourceHash;
  final bool eventOpen;
  final bool runtimeLive;
  final AssistanceProgressFreshness freshness;
  final AssistanceConfirmedProgress? progress;
  final AssistanceJoiningGuidance? guidance;
  final List<AssistanceDepartureDestination> destinations;

  bool get canConfirm =>
      authority is AssistanceCanConfirmDeparture &&
      authority.validUntil > serverTime &&
      eventOpen &&
      runtimeLive &&
      destinations.isNotEmpty &&
      revision < 9007199254740991;
}

final class EventAssistanceGroupProgressResult {
  const EventAssistanceGroupProgressResult._({
    required this.outcome,
    required this.operationRevision,
    required this.view,
  });

  factory EventAssistanceGroupProgressResult.fromCallableData(
    Object? value, {
    required EventAssistanceGroupScope expectedScope,
    required String expectedActorUid,
  }) {
    final root = assistanceObject(value, {
      'outcome',
      'operationRevision',
      'view',
      'actorUid',
      'departureAuthority',
    });
    final actorUid = assistanceText(root['actorUid'], 128);
    if (actorUid != expectedActorUid) {
      throw const FormatException('Departure response account mismatch.');
    }
    final map = assistanceObject(root['view'], {
      'context',
      'groupId',
      'serverTime',
      'revision',
      'sourceHash',
      'eventOpen',
      'runtimeLive',
      'freshness',
      'progress',
      'guidance',
      'destinations',
    });
    expectedScope.requireMatch(map['context'], map['groupId']);
    final now = assistanceInteger(map['serverTime']);
    final revision = assistanceInteger(map['revision']);
    final sourceHash = assistanceHash(map['sourceHash']);
    final authority = AssistanceDepartureAuthority.fromJson(
      root['departureAuthority'],
    );
    if (authority.validUntil <= now) {
      throw const FormatException('Expired departure read authority.');
    }
    final freshness = assistanceEnum(
      AssistanceProgressFreshness.values,
      map['freshness'],
    );
    final progress = AssistanceConfirmedProgress._parse(
      map['progress'],
      expectedScope,
      now,
    );
    final consistent = switch (freshness) {
      AssistanceProgressFreshness.unconfirmed =>
        progress == null && revision == 0,
      AssistanceProgressFreshness.current =>
        progress != null &&
            progress.revision == revision &&
            progress.sourceHash == sourceHash,
      AssistanceProgressFreshness.sourceChanged =>
        progress != null &&
            progress.revision == revision &&
            progress.sourceHash != sourceHash,
    };
    final outcome = assistanceEnum(
      AssistanceProgressOutcome.values,
      root['outcome'],
    );
    final receipt = assistanceNullableInteger(root['operationRevision']);
    if (!consistent ||
        (outcome == AssistanceProgressOutcome.read
            ? receipt != null
            : receipt == null || receipt < 1 || receipt > revision)) {
      throw const FormatException('Inconsistent group progress response.');
    }
    final rawDestinations = map['destinations'];
    if (rawDestinations is! List || rawDestinations.length > 41) {
      throw const FormatException('Invalid departure destinations.');
    }
    final destinations = rawDestinations
        .map((raw) {
          return parseAssistanceJoiningOption(
            raw,
            expectedGroupId: expectedScope.groupId,
          );
        })
        .toList(growable: false);
    if (destinations.map((item) => item.target).toSet().length !=
        destinations.length) {
      throw const FormatException('Duplicate departure destination.');
    }
    final open = assistanceBoolean(map['eventOpen']);
    final live = assistanceBoolean(map['runtimeLive']);
    final guidance = map['guidance'] == null
        ? null
        : AssistanceJoiningGuidance.fromJson(map['guidance']);
    final currentDestination =
        progress != null &&
        destinations.any((item) => item.target == progress.destination);
    final guidanceExpected =
        freshness == AssistanceProgressFreshness.current &&
        currentDestination &&
        open &&
        live;
    if (guidanceExpected != (guidance != null) ||
        (guidance != null &&
            (guidance.revision != revision ||
                guidance.destination != progress?.destination ||
                guidance.validUntil <= now))) {
      throw const FormatException('Inconsistent current joining guidance.');
    }
    return EventAssistanceGroupProgressResult._(
      outcome: outcome,
      operationRevision: receipt,
      view: EventAssistanceGroupProgressView._(
        scope: expectedScope,
        actorUid: actorUid,
        authority: authority,
        serverTime: now,
        revision: revision,
        sourceHash: sourceHash,
        eventOpen: open,
        runtimeLive: live,
        freshness: freshness,
        progress: progress,
        guidance: guidance,
        destinations: List.unmodifiable(destinations),
      ),
    );
  }

  final AssistanceProgressOutcome outcome;
  final int? operationRevision;
  final EventAssistanceGroupProgressView view;
}

AssistanceJoiningTarget _target(
  Object? value,
  EventAssistanceGroupScope scope,
) {
  final target = AssistanceJoiningTarget.fromJson(value);
  if (target case AssistanceGroupCheckpoint(
    :final groupId,
  ) when groupId != scope.groupId) {
    throw const FormatException('Departure target belongs to another group.');
  }
  return target;
}

String _recordId(Object? value, String prefix) {
  final text = assistanceText(value);
  if (!text.startsWith('$prefix:')) {
    throw const FormatException('Invalid departure record identity.');
  }
  assistanceHash(text.substring(prefix.length + 1));
  return text;
}
