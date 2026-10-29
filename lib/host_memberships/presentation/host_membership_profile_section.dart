import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/payments/data/host_membership_repository.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_membership.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/host_memberships/presentation/host_membership_badge.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// Own-profile membership badges and the entry to My memberships. Badges are
/// shown to the member only; the public dating profile never lists clubs.
class HostMembershipProfileSection extends ConsumerWidget {
  const HostMembershipProfileSection({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final uid = catchAsyncStateFromAsyncValue(ref.watch(uidProvider)).value;
    final memberships =
        (uid == null
            ? null
            : catchAsyncStateFromAsyncValue(
                ref.watch(watchMyHostMembershipsProvider(uid)),
              ).value) ??
        const <HostMembership>[];
    return hostMembershipProfileField(
      context,
      memberships: [
        for (final membership in memberships)
          if (membership.isCurrent) membership,
      ],
      onOpen: () => context.pushNamed(Routes.myMembershipsScreen.name),
    );
  }
}

/// Provider-free settings row: one badge per current membership. A typed
/// factory so the enclosing settings section keeps owning the field row.
CatchField hostMembershipProfileField(
  BuildContext context, {
  required List<HostMembership> memberships,
  required VoidCallback onOpen,
}) {
  final l10n = context.l10n;
  return CatchField.nav(
    copy: catchFieldCopy(l10n),
    key: const ValueKey('profile-my-memberships'),
    title: l10n.membershipsScreenTitle,
    valueText: memberships.isEmpty
        ? null
        : l10n.membershipsProfileCount(count: memberships.length),
    icon: CatchIcons.membership,
    actions: memberships.isEmpty
        ? null
        : Wrap(
            spacing: CatchSpacing.s1,
            runSpacing: CatchSpacing.s1,
            children: [
              for (final membership in memberships)
                HostMembershipBadge(
                  planName: membership.planName,
                  status: membership.status,
                ),
            ],
          ),
    onTap: onOpen,
  );
}
