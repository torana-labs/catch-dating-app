import 'package:catch_dating_app/contexts/forms/domain/forms/form_operation_fields.dart';
import 'package:meta/meta.dart';

/// Where an applicant stands as a community member of the organizer.
enum HostCommunityMembershipState { none, active, revoked }

/// A manager's community membership decision.
enum HostCommunityMembershipAction { grant, revoke }

/// One applicant's community membership, as the reviewing manager sees it.
///
/// Members can book members-only events and skip review where an event
/// allows it. Only a native, organizer-wide application from a signed-in
/// applicant carries one.
@immutable
class HostCommunityMembership {
  const HostCommunityMembership({
    required this.uid,
    required this.state,
    required this.revision,
  });

  factory HostCommunityMembership.fromMap(Map<Object?, Object?> map) =>
      HostCommunityMembership(
        uid: formOperationRequiredString(map, 'uid'),
        state: formOperationEnumByName(
          HostCommunityMembershipState.values,
          formOperationRequiredString(map, 'state'),
          'community membership state',
        ),
        revision: formOperationRequiredInt(map, 'revision'),
      );

  /// Reads the optional `communityMembership` field of an application detail.
  static HostCommunityMembership? fromNullableMap(Object? value) =>
      value == null
      ? null
      : HostCommunityMembership.fromMap(
          formOperationRequiredMap(value, 'community membership'),
        );

  /// The applicant account a decision names.
  final String uid;
  final HostCommunityMembershipState state;

  /// The revision the next decision must expect; 0 before any decision.
  final int revision;

  bool get isMember => state == HostCommunityMembershipState.active;
}

/// The result of one community membership decision.
@immutable
class HostCommunityMembershipDecision {
  const HostCommunityMembershipDecision({
    required this.membershipId,
    required this.decisionId,
    required this.currentState,
    required this.currentRevision,
    required this.replayed,
  });

  factory HostCommunityMembershipDecision.fromCallableData(Object? data) {
    final map = formOperationRequiredMap(data, 'community membership decision');
    return HostCommunityMembershipDecision(
      membershipId: formOperationRequiredString(map, 'membershipId'),
      decisionId: formOperationRequiredString(map, 'decisionId'),
      currentState: formOperationEnumByName(
        HostCommunityMembershipState.values,
        formOperationRequiredString(map, 'currentState'),
        'community membership state',
      ),
      currentRevision: formOperationRequiredInt(map, 'currentRevision'),
      replayed: formOperationRequiredBool(map, 'replayed'),
    );
  }

  final String membershipId;
  final String decisionId;
  final HostCommunityMembershipState currentState;
  final int currentRevision;

  /// The same request was already decided; the state is current anyway.
  final bool replayed;
}
