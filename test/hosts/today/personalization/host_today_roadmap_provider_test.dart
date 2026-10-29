import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_contacts_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_crm_summary.dart';
import 'package:catch_dating_app/contexts/insights/domain/host_today_preference.dart';
import 'package:catch_dating_app/contexts/organizers/data/clubs_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_authority.dart';
import 'package:catch_dating_app/contexts/payments/data/host_payment_account_repository.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_payment_account.dart';
import 'package:catch_dating_app/hosts/today/personalization/presentation/host_today_personalization_state.dart';
import 'package:catch_dating_app/hosts/today/personalization/presentation/host_today_roadmap_provider.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../../clubs/clubs_test_helpers.dart' show buildClub;

void main() {
  final club = buildClub().copyWith(ownerUserId: 'owner');

  group('scoped provider', () {
    final scope = HostTodayPreferenceScope(
      accountId: 'owner',
      organizerId: club.id,
    );

    test('a stale account does not subscribe to organizer data', () {
      var organizerReads = 0;
      final container = ProviderContainer(
        overrides: [
          uidProvider.overrideWithValue(const AsyncData('other-owner')),
          hostOperableClubsProvider('owner').overrideWith((ref) {
            organizerReads++;
            return AsyncData([club]);
          }),
        ],
      );
      addTearDown(container.dispose);

      final evidence = container.read(hostTodayRoadmapProvider(scope));

      expect(organizerReads, 0);
      expect(evidence.audience, HostTodayMilestoneProgress.unknown);
      expect(evidence.payouts, HostTodayMilestoneProgress.unknown);
      expect(evidence.canManagePayouts, isFalse);
    });

    test('cached identity while loading or failed cannot authorize reads', () {
      for (final identity in _cachedUnavailable<String?>('owner')) {
        var organizerReads = 0;
        final container = ProviderContainer(
          overrides: [
            uidProvider.overrideWithValue(identity),
            hostOperableClubsProvider('owner').overrideWith((ref) {
              organizerReads++;
              return AsyncData([club]);
            }),
          ],
        );
        final evidence = container.read(hostTodayRoadmapProvider(scope));
        expect(organizerReads, 0);
        expect(evidence.organizerPage, HostTodayMilestoneProgress.unknown);
        expect(evidence.canManagePayouts, isFalse);
        container.dispose();
      }
    });

    test('missing or unavailable membership does not read CRM or payouts', () {
      for (final membership in <AsyncValue<List<Club>>>[
        const AsyncLoading(),
        AsyncError(StateError('Membership unavailable'), StackTrace.empty),
        ..._cachedUnavailable<List<Club>>([club]),
        const AsyncData([]),
        AsyncData([club.copyWith(id: 'different-organizer')]),
      ]) {
        var audienceReads = 0;
        var payoutReads = 0;
        final container = ProviderContainer(
          overrides: [
            uidProvider.overrideWithValue(const AsyncData('owner')),
            hostOperableClubsProvider('owner').overrideWithValue(membership),
            hostCrmSummaryProvider(club.id).overrideWith((ref) async {
              audienceReads++;
              return _summary(club.id, count: 1);
            }),
            watchHostPaymentAccountsProvider('owner').overrideWith((ref) {
              payoutReads++;
              return Stream.value([_account('owner', ready: true)]);
            }),
          ],
        );

        final evidence = container.read(hostTodayRoadmapProvider(scope));

        expect(audienceReads, 0);
        expect(payoutReads, 0);
        expect(evidence.organizerPage, HostTodayMilestoneProgress.unknown);
        expect(evidence.canManagePayouts, isFalse);
        container.dispose();
      }
    });

    test(
      'an authorized cohost reads CRM but not owner payment accounts',
      () async {
        final cohostScope = HostTodayPreferenceScope(
          accountId: 'cohost',
          organizerId: club.id,
        );
        var payoutReads = 0;
        final container = ProviderContainer(
          overrides: [
            uidProvider.overrideWithValue(const AsyncData('cohost')),
            hostTodayRehearsalCompletionProvider(
              cohostScope,
            ).overrideWith((ref) async => false),
            hostOperableClubsProvider(
              'cohost',
            ).overrideWithValue(AsyncData([club])),
            hostCrmSummaryProvider(
              club.id,
            ).overrideWith((ref) async => _summary(club.id, count: 1)),
            watchHostPaymentAccountsProvider('cohost').overrideWith((ref) {
              payoutReads++;
              return Stream.value([_account('cohost', ready: true)]);
            }),
          ],
        );
        addTearDown(container.dispose);
        container.listen(hostTodayRoadmapProvider(cohostScope), (_, _) {});
        await container.read(hostCrmSummaryProvider(club.id).future);

        final evidence = container.read(hostTodayRoadmapProvider(cohostScope));

        expect(evidence.audience, HostTodayMilestoneProgress.complete);
        expect(evidence.payouts, HostTodayMilestoneProgress.unknown);
        expect(evidence.canManagePayouts, isFalse);
        expect(payoutReads, 0);
      },
    );

    test(
      'pending evidence updates from real results and clears on sign-out',
      () async {
        final identity = StreamController<String?>();
        final audience = Completer<HostCrmSummary>();
        final accounts = StreamController<List<HostPaymentAccount>>();
        final container = ProviderContainer(
          overrides: [
            uidProvider.overrideWith((ref) => identity.stream),
            hostTodayRehearsalCompletionProvider(
              scope,
            ).overrideWith((ref) async => false),
            hostOperableClubsProvider(
              'owner',
            ).overrideWithValue(AsyncData([club])),
            hostCrmSummaryProvider(
              club.id,
            ).overrideWith((ref) => audience.future),
            watchHostPaymentAccountsProvider(
              'owner',
            ).overrideWith((ref) => accounts.stream),
          ],
        );
        addTearDown(() async {
          container.dispose();
          await accounts.close();
          await identity.close();
        });
        container.listen(hostTodayRoadmapProvider(scope), (_, _) {});
        identity.add('owner');
        await container.read(uidProvider.future);
        var evidence = container.read(hostTodayRoadmapProvider(scope));
        expect(evidence.audience, HostTodayMilestoneProgress.unknown);
        expect(evidence.payouts, HostTodayMilestoneProgress.unknown);

        audience.complete(_summary(club.id, count: 2));
        accounts.add([_account('owner', ready: true)]);
        await container.read(hostCrmSummaryProvider(club.id).future);
        await container.read(watchHostPaymentAccountsProvider('owner').future);
        evidence = container.read(hostTodayRoadmapProvider(scope));
        expect(evidence.audience, HostTodayMilestoneProgress.complete);
        expect(evidence.payouts, HostTodayMilestoneProgress.complete);

        final signedOut = Completer<void>();
        container.listen(uidProvider, (_, next) {
          if (next case AsyncData(value: null)) signedOut.complete();
        });
        identity.add(null);
        await signedOut.future;
        evidence = container.read(hostTodayRoadmapProvider(scope));
        expect(evidence.audience, HostTodayMilestoneProgress.unknown);
        expect(evidence.payouts, HostTodayMilestoneProgress.unknown);
        expect(evidence.canManagePayouts, isFalse);
      },
    );
  });

  test(
    'rehearsal summary failures stay unknown and success is authoritative',
    () async {
      final scope = HostTodayPreferenceScope(
        accountId: 'owner',
        organizerId: club.id,
      );
      for (final result in [true, false, null]) {
        final container = ProviderContainer(
          overrides: [
            uidProvider.overrideWithValue(const AsyncData('owner')),
            hostOperableClubsProvider(
              'owner',
            ).overrideWithValue(AsyncData([club])),
            hostCrmSummaryProvider(
              club.id,
            ).overrideWith((ref) async => _summary(club.id, count: 0)),
            watchHostPaymentAccountsProvider(
              'owner',
            ).overrideWith((ref) => Stream.value([])),
            hostTodayRehearsalCompletionProvider(scope).overrideWith((
              ref,
            ) async {
              if (result == null) throw StateError('Summary unavailable');
              return result;
            }),
          ],
        );
        container.listen(hostTodayRoadmapProvider(scope), (_, _) {});
        try {
          await container.read(
            hostTodayRehearsalCompletionProvider(scope).future,
          );
        } on StateError {
          /* Expected unavailable evidence. */
        }
        expect(
          container.read(hostTodayRoadmapProvider(scope)).rehearsal,
          result == null
              ? HostTodayMilestoneProgress.unknown
              : result
              ? HostTodayMilestoneProgress.complete
              : HostTodayMilestoneProgress.incomplete,
        );
        container.dispose();
      }
    },
  );

  test('unknown dependencies are not treated as completed or empty', () {
    final evidence = buildHostTodayRoadmapEvidence(
      organizer: club,
      accountId: 'owner',
      audience: null,
      paymentAccounts: null,
    );
    expect(evidence.audience, HostTodayMilestoneProgress.unknown);
    expect(evidence.rehearsal, HostTodayMilestoneProgress.unknown);
    expect(evidence.payouts, HostTodayMilestoneProgress.unknown);
    expect(evidence.canManagePayouts, isTrue);
  });

  test('only authoritative customer counts establish audience completion', () {
    for (final data in [
      (
        summary: _summary(club.id, count: 0),
        expected: HostTodayMilestoneProgress.incomplete,
      ),
      (
        summary: _summary(club.id, count: 1),
        expected: HostTodayMilestoneProgress.complete,
      ),
      (
        summary: _summary(club.id, count: 0, truncated: true),
        expected: HostTodayMilestoneProgress.unknown,
      ),
      (
        summary: _summary('other-organizer', count: 1),
        expected: HostTodayMilestoneProgress.unknown,
      ),
    ]) {
      final evidence = buildHostTodayRoadmapEvidence(
        organizer: club,
        accountId: 'owner',
        audience: data.summary,
        paymentAccounts: null,
      );
      expect(evidence.audience, data.expected);
    }
  });

  test('public website requires both publication and a canonical route', () {
    for (final data in [
      (status: 'draft', path: '/organizers/test', expected: false),
      (status: 'published', path: null, expected: false),
      (status: 'published', path: '/organizers/test', expected: true),
      (status: 'suppressed', path: '/organizers/test', expected: false),
    ]) {
      final evidence = buildHostTodayRoadmapEvidence(
        organizer: club.copyWith(
          publicPage: OrganizerPublicPage.fromJson({
            'publishStatus': data.status,
            'canonicalPath': data.path,
          }),
        ),
        accountId: 'owner',
        audience: null,
        paymentAccounts: null,
      );
      expect(
        evidence.organizerPage,
        data.expected
            ? HostTodayMilestoneProgress.complete
            : HostTodayMilestoneProgress.incomplete,
      );
    }
  });

  test(
    'cohost payment capability is not confused with organizer owner readiness',
    () {
      final evidence = buildHostTodayRoadmapEvidence(
        organizer: club,
        accountId: 'cohost',
        audience: null,
        paymentAccounts: [_account('cohost', ready: true)],
      );
      expect(evidence.canManagePayouts, isFalse);
      expect(evidence.payouts, HostTodayMilestoneProgress.unknown);
    },
  );

  test('payout completion needs this owner to be ready to accept payments', () {
    for (final data in [
      (accounts: <HostPaymentAccount>[], expected: false),
      (accounts: [_account('someone-else', ready: true)], expected: false),
      (accounts: [_account('owner', ready: false)], expected: false),
      (accounts: [_account('owner', ready: true)], expected: true),
    ]) {
      final evidence = buildHostTodayRoadmapEvidence(
        organizer: club,
        accountId: 'owner',
        audience: null,
        paymentAccounts: data.accounts,
        hasCompletedRehearsal: true,
      );
      expect(
        evidence.payouts,
        data.expected
            ? HostTodayMilestoneProgress.complete
            : HostTodayMilestoneProgress.incomplete,
      );
      expect(evidence.rehearsal, HostTodayMilestoneProgress.complete);
    }
  });
}

HostCrmSummary _summary(
  String organizerId, {
  required int count,
  bool truncated = false,
}) => HostCrmSummary(
  organizerId: organizerId,
  contactCount: count,
  pastAttendeeCount: 0,
  repeatAttendeeCount: 0,
  linkedAccountCount: 0,
  importedContactCount: 0,
  whatsappOptInCount: 0,
  smsOptInCount: 0,
  truncated: truncated,
  inAppReadiness: HostCrmChannelReadiness.currentEventOnly,
  whatsappReadiness: HostCrmChannelReadiness.providerSetupRequired,
  smsReadiness: HostCrmChannelReadiness.providerAndDltSetupRequired,
);

HostPaymentAccount _account(String userId, {required bool ready}) =>
    HostPaymentAccount(
      userId: userId,
      country: 'IN',
      defaultCurrency: 'INR',
      chargesEnabled: ready,
      payoutsEnabled: ready,
      detailsSubmitted: ready,
      onboardingStatus: ready
          ? HostPaymentOnboardingStatus.complete
          : HostPaymentOnboardingStatus.pending,
    );

// Like core async-state tests, construct Riverpod's cached transition snapshots
// directly so authorization is checked during refresh, reload and stale error.
List<AsyncValue<T>> _cachedUnavailable<T>(T value) {
  final previous = AsyncData(value);
  return [
    // ignore: invalid_use_of_internal_member
    AsyncLoading<T>().copyWithPrevious(previous),
    // ignore: invalid_use_of_internal_member
    AsyncLoading<T>().copyWithPrevious(previous, isRefresh: false),
    AsyncError<T>(StateError('Refresh failed'), StackTrace.empty)
    // ignore: invalid_use_of_internal_member
    .copyWithPrevious(previous),
  ];
}
