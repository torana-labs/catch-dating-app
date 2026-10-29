import 'package:catch_dating_app/contexts/live/domain/event_assistance_delivery_scope.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_parsing.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_participation.dart';

enum AssistanceDeliveryStatus {
  notSubmitted,
  reserved,
  unknown,
  accepted,
  delivered,
  read,
  failed,
  notDispatched,
  revoked,
  conflictingEvidence,
}

enum AssistanceDeliveryAttemptState {
  reserved,
  unknown,
  accepted,
  delivered,
  read,
  failed,
  notDispatched,
  revoked,
}

enum AssistanceDeliveryChannel { sms, whatsapp, rcs }

enum AssistanceMessageLifecycle { active, cancelled, superseded, responded }

enum AssistanceMessagePurpose {
  joiningUpdate,
  joiningInstructions,
  planChanged,
  guestRequirement,
  assignmentChanged,
  participationCheck,
  eventCancelled,
  eventFinished,
  followUp,
}

enum AssistanceDeliveryOwnerAuthority { current, revoked }

enum AssistanceDeliveryStopReason {
  delivered,
  responded,
  cancelled,
  superseded,
  expired,
  eventClosed,
  permissionRevoked,
  guestPresent,
  guestDeclined,
  notAdmitted,
  hostStopped,
  participationInactive,
}

enum AssistanceDeliveryRetryReason {
  retryBackoff,
  eventFactsStale,
  routeFactsStale,
  workerUnavailable,
}

enum AssistanceDeliveryReviewReason {
  noEligibleRoute,
  attemptLimit,
  policyRejected,
  recipientNeedsReview,
  providerOwnsFallback,
  conflictingDeliveryEvidence,
  providerPending,
  workerUnavailable,
  recoveryLimit,
  eventFactsStale,
  routeFactsStale,
}

typedef AssistanceDeliveryAttempt = ({
  AssistanceDeliveryChannel channel,
  AssistanceDeliveryAttemptState state,
  int at,
});

sealed class AssistanceDeliveryCoordination {
  const AssistanceDeliveryCoordination();
  Object get _identity;
  @override
  bool operator ==(Object other) =>
      other is AssistanceDeliveryCoordination &&
      runtimeType == other.runtimeType &&
      _identity == other._identity;
  @override
  int get hashCode => Object.hash(runtimeType, _identity);
}

final class AssistanceDeliveryUntracked extends AssistanceDeliveryCoordination {
  const AssistanceDeliveryUntracked();
  @override
  Object get _identity => 'untracked';
}

final class AssistanceDeliveryQueued extends AssistanceDeliveryCoordination {
  const AssistanceDeliveryQueued._(this.dueAt);
  final int dueAt;
  @override
  int get _identity => dueAt;
}

final class AssistanceDeliveryAwaitingReceipt
    extends AssistanceDeliveryCoordination {
  const AssistanceDeliveryAwaitingReceipt._(this.dueAt);
  final int dueAt;
  @override
  int get _identity => dueAt;
}

final class AssistanceDeliveryRetrying extends AssistanceDeliveryCoordination {
  const AssistanceDeliveryRetrying._(this.reason, this.dueAt);
  final AssistanceDeliveryRetryReason reason;
  final int dueAt;
  @override
  Object get _identity => (reason, dueAt);
}

final class AssistanceDeliveryNeedsReview
    extends AssistanceDeliveryCoordination {
  const AssistanceDeliveryNeedsReview._(this.reason, this.dueAt);
  final AssistanceDeliveryReviewReason reason;
  final int dueAt;
  @override
  Object get _identity => (reason, dueAt);
}

final class AssistanceDeliveryComplete extends AssistanceDeliveryCoordination {
  const AssistanceDeliveryComplete._(this.reason);
  final AssistanceDeliveryStopReason reason;
  @override
  AssistanceDeliveryStopReason get _identity => reason;
}

sealed class AssistanceDeliveryHandling {
  const AssistanceDeliveryHandling();
}

/// No explicit manual owner; this does not imply automatic delivery is enabled.
final class AssistanceAutomaticDeliveryHandling
    extends AssistanceDeliveryHandling {
  const AssistanceAutomaticDeliveryHandling();
}

final class AssistanceManualDeliveryHandling
    extends AssistanceDeliveryHandling {
  const AssistanceManualDeliveryHandling._(
    this.actorUid,
    this.at,
    this.authority,
  );
  final String actorUid;
  final int at;
  final AssistanceDeliveryOwnerAuthority authority;
}

sealed class AssistanceHostDelivery {
  const AssistanceHostDelivery._(this._fields, this.scope);
  final AssistanceDeliveryEvidence _fields;
  final EventAssistanceDeliveryScope scope;
  AssistanceDeliveryEvidence get evidence => _fields;
  int get revision => _fields.revision;
  String get reviewHash => _fields.reviewHash;
  int get createdAt => _fields.createdAt;
  int get expiresAt => _fields.expiresAt;
  int get observedAt => _fields.observedAt;
  AssistanceMessageLifecycle get lifecycle => _fields.lifecycle;
  AssistanceMessagePurpose get purpose => _fields.purpose;
  AssistanceDeliveryStatus get status => _fields.status;
  List<AssistanceDeliveryAttempt> get attempts => _fields.attempts;
  AssistanceDeliveryCoordination get coordination => _fields.coordination;
  AssistanceDeliveryHandling get handling => _fields.handling;

  factory AssistanceHostDelivery.fromJson(
    Object? value, {
    required EventAssistanceDeliveryScope scope,
    required int serverTime,
  }) {
    final fields = AssistanceDeliveryEvidence.fromJson(
      value,
      observedAt: serverTime,
    );
    if (fields.messageId != scope.messageId) {
      throw const FormatException('Delivery message scope mismatch.');
    }
    final attendeeId = fields.attendeeId;
    if (attendeeId == null) return AssistanceStaleDelivery._(fields, scope);
    final guest = EventAssistanceGuestScope(
      organizerId: scope.organizerId,
      eventId: scope.eventId,
      attendeeId: attendeeId,
    );
    return fields.offersManualHandoff
        ? AssistanceActionableDelivery._(fields, scope, guest)
        : AssistanceObservedDelivery._(fields, scope, guest);
  }
}

final class AssistanceActionableDelivery extends AssistanceHostDelivery {
  const AssistanceActionableDelivery._(
    super.fields,
    super.scope,
    this.guestScope,
  ) : super._();
  final EventAssistanceGuestScope guestScope;
}

final class AssistanceObservedDelivery extends AssistanceHostDelivery {
  const AssistanceObservedDelivery._(super.fields, super.scope, this.guestScope)
    : super._();
  final EventAssistanceGuestScope guestScope;
}

final class AssistanceStaleDelivery extends AssistanceHostDelivery {
  const AssistanceStaleDelivery._(super.fields, super.scope) : super._();
}

/// Immutable delivery evidence shared by live and rehearsal projections.
/// Context-specific wrappers own the authority to construct a command.
final class AssistanceDeliveryEvidence {
  const AssistanceDeliveryEvidence._({
    required this.messageId,
    required this.attendeeId,
    required this.displayName,
    required this.offersManualHandoff,
    required this.revision,
    required this.reviewHash,
    required this.createdAt,
    required this.expiresAt,
    required this.observedAt,
    required this.lifecycle,
    required this.purpose,
    required this.status,
    required this.attempts,
    required this.coordination,
    required this.handling,
  });
  final String messageId;
  final String? attendeeId;
  final String? displayName;
  final bool offersManualHandoff;
  final int revision, createdAt, expiresAt, observedAt;
  final String reviewHash;
  final AssistanceMessageLifecycle lifecycle;
  final AssistanceMessagePurpose purpose;
  final AssistanceDeliveryStatus status;
  final List<AssistanceDeliveryAttempt> attempts;
  final AssistanceDeliveryCoordination coordination;
  final AssistanceDeliveryHandling handling;

  factory AssistanceDeliveryEvidence.fromJson(
    Object? value, {
    required int observedAt,
  }) {
    final now = assistanceInteger(observedAt);
    final map = assistanceObject(value, {
      'messageId',
      'revision',
      'reviewHash',
      'createdAt',
      'expiresAt',
      'lifecycle',
      'deliveryStatus',
      'purpose',
      'attempts',
      'coordination',
      'handling',
      'availability',
      'attendeeId',
      if (assistanceObject(value).containsKey('displayName')) 'displayName',
      'actions',
    });
    final messageId = assistanceMessageIdentity(map['messageId']);
    final created = assistanceInteger(map['createdAt']);
    final expiry = assistanceInteger(map['expiresAt']);
    if (created > now || expiry <= created) {
      throw const FormatException('Invalid delivery window.');
    }
    final rows = map['attempts'];
    if (rows is! List || rows.length > 6) {
      throw const FormatException('Invalid delivery attempt history.');
    }
    final attempts = <AssistanceDeliveryAttempt>[];
    for (final raw in rows) {
      final row = assistanceObject(raw, {'channel', 'state', 'at'});
      final at = assistanceInteger(row['at']);
      if (at < created || at > now) {
        throw const FormatException('Delivery attempt time is invalid.');
      }
      attempts.add((
        channel: assistanceEnum(
          AssistanceDeliveryChannel.values,
          row['channel'],
        ),
        state: assistanceEnum(
          AssistanceDeliveryAttemptState.values,
          row['state'],
        ),
        at: at,
      ));
    }
    final status = assistanceEnum(
      AssistanceDeliveryStatus.values,
      map['deliveryStatus'],
    );
    if (status != AssistanceDeliveryStatus.conflictingEvidence &&
        status.name != _summary(attempts)) {
      throw const FormatException('Delivery summary contradicts its attempts.');
    }
    final handlingMap = assistanceObject(map['handling']);
    final AssistanceDeliveryHandling handling;
    switch (handlingMap['kind']) {
      case 'automatic':
        assistanceObject(handlingMap, {'kind'});
        handling = const AssistanceAutomaticDeliveryHandling();
      case 'manual':
        assistanceObject(handlingMap, {'kind', 'actorUid', 'at', 'authority'});
        final at = assistanceInteger(handlingMap['at']);
        if (at < created || at > now) {
          throw const FormatException('Invalid handoff time.');
        }
        handling = AssistanceManualDeliveryHandling._(
          assistanceId(handlingMap['actorUid']),
          at,
          assistanceEnum(
            AssistanceDeliveryOwnerAuthority.values,
            handlingMap['authority'],
          ),
        );
      default:
        throw const FormatException('Unknown delivery handling.');
    }
    final revision = assistanceInteger(map['revision']);
    if (handling is AssistanceManualDeliveryHandling && revision == 0) {
      throw const FormatException(
        'Manual ownership has no committed revision.',
      );
    }
    final lifecycle = assistanceEnum(
      AssistanceMessageLifecycle.values,
      map['lifecycle'],
    );
    final actions = map['actions'];
    if (actions is! List ||
        actions.length > 1 ||
        actions.any((a) => a != 'manualHandoff')) {
      throw const FormatException('Unsupported delivery action.');
    }
    final String? attendeeId;
    switch (map['availability']) {
      case 'sourceChanged':
        if (map['attendeeId'] != null ||
            map['displayName'] != null ||
            actions.isNotEmpty) {
          throw const FormatException(
            'Stale delivery exposed guest authority.',
          );
        }
        attendeeId = null;
      case 'current':
        attendeeId = assistanceId(map['attendeeId']);
      default:
        throw const FormatException('Unknown delivery availability.');
    }
    if (actions.isNotEmpty &&
        (lifecycle != AssistanceMessageLifecycle.active ||
            now >= expiry ||
            attempts.any(
              (a) =>
                  a.state == AssistanceDeliveryAttemptState.read ||
                  a.state == AssistanceDeliveryAttemptState.delivered,
            ) ||
            handling is AssistanceManualDeliveryHandling &&
                handling.authority ==
                    AssistanceDeliveryOwnerAuthority.current)) {
      throw const FormatException('Delivery offered an impossible handoff.');
    }
    return AssistanceDeliveryEvidence._(
      messageId: messageId,
      attendeeId: attendeeId,
      displayName: map['displayName'] == null
          ? null
          : assistanceText(map['displayName'], 120),
      offersManualHandoff: actions.isNotEmpty,
      revision: revision,
      reviewHash: assistanceHash(map['reviewHash']),
      createdAt: created,
      expiresAt: expiry,
      observedAt: now,
      lifecycle: lifecycle,
      purpose: assistanceEnum(AssistanceMessagePurpose.values, map['purpose']),
      status: status,
      attempts: List.unmodifiable(attempts),
      coordination: _coordination(map['coordination'], created, expiry),
      handling: handling,
    );
  }
}

String _summary(List<AssistanceDeliveryAttempt> attempts) {
  for (final state in [
    AssistanceDeliveryAttemptState.read,
    AssistanceDeliveryAttemptState.delivered,
    AssistanceDeliveryAttemptState.unknown,
    AssistanceDeliveryAttemptState.accepted,
    AssistanceDeliveryAttemptState.reserved,
  ]) {
    if (attempts.any((a) => a.state == state)) return state.name;
  }
  return attempts.lastOrNull?.state.name ?? 'notSubmitted';
}

AssistanceDeliveryCoordination _coordination(
  Object? value,
  int created,
  int expiry,
) {
  final map = assistanceObject(value);
  if (map['kind'] == 'untracked') {
    assistanceObject(map, {'kind'});
    return const AssistanceDeliveryUntracked();
  }
  assistanceObject(map, {'kind', 'phase', 'reason', 'dueAt'});
  if (map['kind'] != 'tracked') {
    throw const FormatException('Unknown delivery coordinator.');
  }
  if (map['phase'] == 'complete') {
    if (map['dueAt'] != null) {
      throw const FormatException(
        'Completed delivery work cannot be scheduled.',
      );
    }
    return AssistanceDeliveryComplete._(
      assistanceEnum(AssistanceDeliveryStopReason.values, map['reason']),
    );
  }
  final dueAt = assistanceInteger(map['dueAt']);
  if (dueAt < created || dueAt > expiry) {
    throw const FormatException('Delivery work exceeds the message window.');
  }
  switch (map['phase']) {
    case 'queued':
      if (map['reason'] != null) {
        throw const FormatException('Unexpected queued delivery reason.');
      }
      return AssistanceDeliveryQueued._(dueAt);
    case 'receipt':
      if (map['reason'] != 'providerPending') {
        throw const FormatException('Unknown receipt wait.');
      }
      return AssistanceDeliveryAwaitingReceipt._(dueAt);
    case 'retry':
      return AssistanceDeliveryRetrying._(
        assistanceEnum(AssistanceDeliveryRetryReason.values, map['reason']),
        dueAt,
      );
    case 'review':
      if (dueAt != expiry) {
        throw const FormatException('Invalid delivery review deadline.');
      }
      return AssistanceDeliveryNeedsReview._(
        assistanceEnum(AssistanceDeliveryReviewReason.values, map['reason']),
        dueAt,
      );
    default:
      throw const FormatException('Unknown delivery coordination phase.');
  }
}
