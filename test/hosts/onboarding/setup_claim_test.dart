import 'package:catch_dating_app/contexts/organizers/data/organizer_claims_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/claimable_organizer.dart';
import 'package:catch_dating_app/hosts/onboarding/onboarding_controller.dart';
import 'package:catch_dating_app/hosts/onboarding/setup_claim_body.dart';
import 'package:catch_dating_app/hosts/onboarding/setup_screen.dart';
import 'package:catch_dating_app/hosts/onboarding/setup_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_test_support/test_pump_helpers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'onboarding_fixtures.dart';

const _page = ClaimableOrganizer(
  organizerId: 'org-lantern',
  sources: [ClaimableOrganizerSource.salesCrmVerified],
  prefill: ClaimableOrganizerPrefill(
    name: 'Lantern Lane Social',
    cityName: 'Mumbai',
    categoryLabel: 'Quiz nights',
  ),
  filled: [ClaimableOrganizerField.name, ClaimableOrganizerField.city],
  missing: [ClaimableOrganizerField.description],
);

ProviderContainer _container() {
  final container = ProviderContainer(
    overrides: [
      appClockProvider.overrideWithValue(AppClock.custom(() => onboardingNow)),
    ],
  );
  addTearDown(container.dispose);
  container.listen(hostSetupControllerProvider, (_, _) {});
  return container;
}

class _ClaimsRepository extends Fake implements OrganizerClaimsRepository {
  _ClaimsRepository(this.found);

  final ClaimableOrganizers found;
  final claims = <String>[];

  @override
  Future<ClaimableOrganizers> findClaimableOrganizers() async => found;

  @override
  Future<String> requestClaim({
    required String organizerId,
    required String requesterName,
    required OrganizerClaimRole role,
  }) async {
    claims.add('$organizerId|$requesterName|${role.name}');
    return 'claim-req-1';
  }
}

Future<_ClaimsRepository> _pumpSetup(
  WidgetTester tester,
  ClaimableOrganizers found,
) async {
  tester.view.physicalSize = const Size(390, 1400);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  final repository = _ClaimsRepository(found);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        appClockProvider.overrideWithValue(
          AppClock.custom(() => onboardingNow),
        ),
        organizerClaimsRepositoryProvider.overrideWithValue(repository),
      ],
      child: const MaterialApp(
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: HostSetupScreen(restoreSavedDraft: false),
      ),
    ),
  );
  await pumpFeatureUi(tester);
  return repository;
}

void main() {
  group('claim state', () {
    test('a claim needs a found page, a name and a role', () {
      final container = _container();
      final setup = container.read(hostSetupControllerProvider.notifier)
        ..chooseClaim(_page);
      expect(container.read(hostSetupControllerProvider).claim.canSend, false);

      setup
        ..setClaimantName('Riya Kapoor')
        ..setClaimRole(OrganizerClaimRole.founder);
      final claim = container.read(hostSetupControllerProvider).claim;
      expect(claim.canSend, isTrue);
      expect(claim.organizer?.organizerId, 'org-lantern');
      expect(claim.sent, isFalse);
    });

    test('back from the form keeps what was typed; sent freezes it', () {
      final container = _container();
      container.read(hostSetupControllerProvider.notifier)
        ..chooseClaim(_page)
        ..setClaimantName('Riya Kapoor')
        ..cancelClaim();
      var claim = container.read(hostSetupControllerProvider).claim;
      expect(claim.organizer, isNull);
      expect(claim.claimantName, 'Riya Kapoor');

      container.read(hostSetupControllerProvider.notifier)
        ..chooseClaim(_page)
        ..setClaimRole(OrganizerClaimRole.owner)
        ..claimSent('claim-req-1')
        ..setClaimantName('Changed')
        ..cancelClaim();
      claim = container.read(hostSetupControllerProvider).claim;
      expect(claim.requestId, 'claim-req-1');
      expect(claim.claimantName, 'Riya Kapoor');
      expect(claim.sent, isTrue);
    });

    test('a page already waiting for review goes straight to sent', () {
      final container = _container();
      container
          .read(hostSetupControllerProvider.notifier)
          .chooseClaim(
            const ClaimableOrganizer(
              organizerId: 'org-lantern',
              prefill: ClaimableOrganizerPrefill(name: 'Lantern Lane Social'),
              claimPending: true,
            ),
          );
      expect(container.read(hostSetupControllerProvider).claim.sent, isTrue);
    });

    test('Not me starts a new page', () {
      final container = _container();
      container.read(hostSetupControllerProvider.notifier).dismissClaim();
      final state = container.read(hostSetupControllerProvider);
      expect(state.claim.dismissed, isTrue);
      expect(state.step, HostSetupStep.start);
    });
  });

  group('bodies', () {
    testWidgets('found pages show why and offer This is me and Not me', (
      tester,
    ) async {
      final calls = <String>[];
      await pumpOnboardingBody(
        tester,
        HostSetupFoundBody(
          candidates: const [_page],
          onClaim: (page) => calls.add('claim:${page.organizerId}'),
          onNotMe: () => calls.add('not-me'),
        ),
      );

      expect(find.text('Lantern Lane Social'), findsOneWidget);
      expect(find.text('Mumbai · Quiz nights'), findsOneWidget);
      expect(find.text('Catch’s team confirmed your number'), findsOneWidget);
      await tester.tap(find.text('This is me'));
      await tester.tap(find.text('None of these, start a new page'));
      expect(calls, ['claim:org-lantern', 'not-me']);
    });

    testWidgets('sent shows what the page has, what it needs, and the check', (
      tester,
    ) async {
      var verified = 0;
      await pumpOnboardingBody(
        tester,
        HostSetupClaimSentBody(organizer: _page, onVerify: () => verified++),
      );

      expect(find.text('Claim sent'), findsOneWidget);
      expect(find.text('Already on the page'), findsOneWidget);
      expect(find.text('You add once it is yours'), findsOneWidget);
      expect(find.text('Name · City'), findsOneWidget);
      expect(find.text('A line about your nights'), findsOneWidget);
      await tester.tap(find.text('Verify on the website now'));
      expect(verified, 1);
    });
  });

  group('setup', () {
    testWidgets('with the read off, setup starts a page exactly as before', (
      tester,
    ) async {
      await _pumpSetup(tester, ClaimableOrganizers.none);

      expect(find.byKey(const ValueKey('host-setup-find')), findsOneWidget);
      expect(find.text('Start your page'), findsOneWidget);
      expect(find.text('Is this you?'), findsNothing);
    });

    testWidgets('a found page is claimed with a name and a role', (
      tester,
    ) async {
      final repository = await _pumpSetup(
        tester,
        const ClaimableOrganizers(enabled: true, candidates: [_page]),
      );

      expect(find.text('Is this you?'), findsOneWidget);
      await tester.tap(find.text('This is me'));
      await pumpFeatureUi(tester);

      expect(find.text('Claim your page'), findsOneWidget);
      await tester.enterText(
        find.descendant(
          of: find.byKey(const ValueKey('host-setup-claim-name')),
          matching: find.byType(EditableText),
        ),
        'Riya Kapoor',
      );
      await tester.tap(find.text('Founder'));
      await tester.pump();
      await tester.tap(find.text('Send claim'));
      await pumpFeatureUi(tester);

      expect(repository.claims, ['org-lantern|Riya Kapoor|founder']);
      expect(
        find.byKey(const ValueKey('host-setup-claim-sent')),
        findsOneWidget,
      );
      expect(
        find.text(
          'Lantern Lane Social is waiting for review. Catch’s team checks '
          'claims and lets you know once the page is yours.',
        ),
        findsOneWidget,
      );
      expect(find.text('You add once it is yours'), findsOneWidget);
    });

    testWidgets('Not me goes to Start your page', (tester) async {
      await _pumpSetup(
        tester,
        const ClaimableOrganizers(enabled: true, candidates: [_page]),
      );

      await tester.tap(find.text('None of these, start a new page'));
      await pumpFeatureUi(tester);
      expect(find.text('Start your page'), findsOneWidget);
    });
  });
}
