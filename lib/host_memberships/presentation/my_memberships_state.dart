import 'package:catch_dating_app/contexts/payments/domain/host_membership.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_membership_benefit_use.dart';

/// One membership with the savings its member-priced bookings produced.
class MyMembershipRow {
  const MyMembershipRow({required this.membership, required this.savedInPaise});

  final HostMembership membership;
  final int savedInPaise;
}

/// Provider-free display state for My memberships.
class MyMembershipsState {
  const MyMembershipsState({
    required this.rows,
    required this.totalSavedInPaise,
  });

  factory MyMembershipsState.from({
    required List<HostMembership> memberships,
    required List<HostMembershipBenefitUse> benefitUses,
  }) {
    final rows =
        memberships
            .map(
              (membership) => MyMembershipRow(
                membership: membership,
                savedInPaise: hostMembershipSavingsInPaise(
                  benefitUses,
                  membershipId: membership.id,
                ),
              ),
            )
            .toList()
          ..sort((a, b) {
            final current =
                (b.membership.isCurrent ? 1 : 0) -
                (a.membership.isCurrent ? 1 : 0);
            return current != 0
                ? current
                : a.membership.planName.compareTo(b.membership.planName);
          });
    return MyMembershipsState(
      rows: List.unmodifiable(rows),
      totalSavedInPaise: hostMembershipSavingsInPaise(benefitUses),
    );
  }

  final List<MyMembershipRow> rows;
  final int totalSavedInPaise;

  bool get isEmpty => rows.isEmpty;

  List<HostMembership> get currentMemberships => [
    for (final row in rows)
      if (row.membership.isCurrent) row.membership,
  ];
}
