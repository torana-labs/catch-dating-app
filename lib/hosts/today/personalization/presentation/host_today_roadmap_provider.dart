import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_contacts_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_crm_summary.dart';
import 'package:catch_dating_app/contexts/insights/domain/host_today_preference.dart';
import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/payments/data/host_payment_account_repository.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_payment_account.dart';
import 'package:catch_dating_app/hosts/today/personalization/presentation/host_today_personalization_state.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_today_roadmap_provider.g.dart';

@riverpod
HostTodayRoadmapEvidence hostTodayRoadmap(
  Ref ref,
  HostTodayPreferenceScope scope,
) {
  final identity = catchAsyncStateFromAsyncValue(ref.watch(uidProvider));
  final uid = identity.isSettledData ? identity.value : null;
  if (uid != scope.accountId) return const HostTodayRoadmapEvidence();
  final membership = catchAsyncStateFromAsyncValue(
    ref.watch(hostOperableOrganizersProvider(scope.accountId)),
  );
  final organizer = membership.isSettledData
      ? membership.value
            ?.where((organizer) => organizer.id == scope.organizerId)
            .firstOrNull
      : null;
  if (organizer == null) return const HostTodayRoadmapEvidence();
  final audience = catchAsyncStateFromAsyncValue(
    ref.watch(hostCrmSummaryProvider(scope.organizerId)),
  );
  final rehearsal = catchAsyncStateFromAsyncValue(
    ref.watch(hostTodayRehearsalCompletionProvider(scope)),
  );
  final accounts = catchAsyncStateFromAsyncValue(
    organizer.isOwnedBy(scope.accountId)
        ? ref.watch(watchHostPaymentAccountsProvider(scope.accountId))
        : const AsyncValue<List<HostPaymentAccount>>.data([]),
  );
  return buildHostTodayRoadmapEvidence(
    organizer: organizer,
    accountId: scope.accountId,
    audience: audience.isSettledData ? audience.value : null,
    paymentAccounts: accounts.isSettledData ? accounts.value : null,
    hasCompletedRehearsal: rehearsal.isSettledData ? rehearsal.value : null,
  );
}

/// A failed or unavailable summary stays unknown in the roadmap. Completion is
/// read from rehearsal's durable milestone, never inferred from opening a route.
@riverpod
Future<bool> hostTodayRehearsalCompletion(
  Ref ref,
  HostTodayPreferenceScope scope,
) {
  final identity = catchAsyncStateFromAsyncValue(ref.watch(uidProvider));
  final uid = identity.isSettledData ? identity.value : null;
  if (uid != scope.accountId) {
    throw StateError('Organizer access is unavailable.');
  }
  final membership = catchAsyncStateFromAsyncValue(
    ref.watch(hostOperableOrganizersProvider(scope.accountId)),
  );
  final organizers = membership.isSettledData ? membership.value : null;
  if (organizers == null ||
      !organizers.any((organizer) => organizer.id == scope.organizerId)) {
    throw StateError('Organizer access is unavailable.');
  }
  return ref
      .watch(eventRehearsalRepositoryProvider)
      .hasCompletedRehearsal(scope.organizerId);
}

HostTodayRoadmapEvidence buildHostTodayRoadmapEvidence({
  required Organizer organizer,
  required String accountId,
  required HostCrmSummary? audience,
  required List<HostPaymentAccount>? paymentAccounts,
  bool? hasCompletedRehearsal,
}) {
  final matchingAudience = audience?.organizerId == organizer.id
      ? audience
      : null;
  final hasContacts = matchingAudience == null
      ? null
      : matchingAudience.contactCount > 0
      ? true
      : matchingAudience.truncated
      ? null
      : false;
  final isOwner = organizer.isOwnedBy(accountId);
  final accounts = paymentAccounts
      ?.where((account) => account.userId == accountId)
      .toList();
  return HostTodayRoadmapEvidence(
    audience: _progress(hasContacts),
    rehearsal: _progress(hasCompletedRehearsal),
    organizerPage: _progress(
      organizer.publicPage?.isPublicWebsiteEnabled ?? false,
    ),
    payouts: _progress(
      !isOwner || accounts == null
          ? null
          : accounts.any((account) => account.canAcceptPayments),
    ),
    canManagePayouts: isOwner,
  );
}

HostTodayMilestoneProgress _progress(bool? complete) => switch (complete) {
  true => HostTodayMilestoneProgress.complete,
  false => HostTodayMilestoneProgress.incomplete,
  null => HostTodayMilestoneProgress.unknown,
};
