import 'dart:ui' show SemanticsAction;

import 'package:catch_dating_app/clubs/presentation/detail/club_detail_read_only_preview.dart';
import 'package:catch_dating_app/clubs/presentation/detail/club_detail_view_model.dart';
import 'package:catch_dating_app/clubs/presentation/detail/widgets/club_detail_body.dart';
import 'package:catch_dating_app/clubs/presentation/detail/widgets/club_host_section.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_authority.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'clubs_test_helpers.dart';

void main() {
  testWidgets('loading preview uses the consumer initial-club fallback', (
    tester,
  ) async {
    final club = buildClub();

    await _pumpPreview(tester, club: club, viewModel: const AsyncLoading());

    expect(
      find.byKey(const ValueKey('club-detail-hero-module')),
      findsOneWidget,
    );
    expect(find.text(club.description), findsOneWidget);
    expect(find.byType(SliverIgnorePointer), findsOneWidget);
  });

  testWidgets('failed preview exposes the consumer retry error state', (
    tester,
  ) async {
    final club = buildClub();

    await _pumpPreview(
      tester,
      club: club,
      viewModel: AsyncError(StateError('load failed'), StackTrace.current),
    );

    expect(
      find.byWidgetPredicate((widget) => widget is CatchSliverErrorState),
      findsOneWidget,
    );
    expect(find.text('Reload organizer'), findsOneWidget);
    expect(find.byKey(const ValueKey('club-detail-hero-module')), findsNothing);
  });

  testWidgets('missing preview uses the consumer not-found state', (
    tester,
  ) async {
    final club = buildClub();

    await _pumpPreview(tester, club: club, viewModel: const AsyncData(null));

    expect(find.text('Organizer not found'), findsOneWidget);
    expect(find.byKey(const ValueKey('club-detail-hero-module')), findsNothing);
  });

  testWidgets('loaded preview renders canonical content behind one boundary', (
    tester,
  ) async {
    final club = buildClub(description: 'A consumer-facing club description.');
    final viewModel = ClubDetailViewModel(
      club: club,
      isHost: true,
      isMember: true,
      upcomingEvents: [buildEvent(clubId: club.id)],
      reviews: const [],
      userProfile: null,
      uid: 'host-1',
      isAuthenticated: true,
    );

    await _pumpPreview(tester, club: club, viewModel: AsyncData(viewModel));

    expect(
      find.byKey(const ValueKey('club-detail-hero-module')),
      findsOneWidget,
    );
    expect(find.text('A consumer-facing club description.'), findsOneWidget);
    expect(find.byType(SliverIgnorePointer), findsOneWidget);
    expect(find.byTooltip('Back'), findsNothing);
    expect(find.byTooltip('Share club'), findsNothing);
    expect(find.text('HOSTED'), findsNothing);

    final semantics = tester.ensureSemantics();
    try {
      final nextRunSemantics = tester.getSemantics(
        find.byType(ClubNextRunBanner),
      );
      expect(nextRunSemantics.flagsCollection.isButton, isFalse);
      expect(
        nextRunSemantics.getSemanticsData().hasAction(SemanticsAction.tap),
        isFalse,
      );
      final hostSemantics = tester.getSemantics(find.byType(ClubHostRow));
      expect(hostSemantics.flagsCollection.isButton, isFalse);
      expect(
        hostSemantics.getSemanticsData().hasAction(SemanticsAction.tap),
        isFalse,
      );
    } finally {
      semantics.dispose();
    }
  });

  testWidgets(
    'unclaimed no-host preview shows provenance without empty hosts',
    (tester) async {
      final club =
          buildClub(
            hostUserId: null,
            hostUserIds: const [],
            hostProfiles: const [],
          ).copyWith(
            claim: OrganizerClaim.fromJson({'state': 'unclaimed'}),
            provenance: OrganizerProvenance.fromJson({
              'origin': 'scraper',
              'sourceConfidence': 'high',
              'verificationStatus': 'sourceBacked',
            }),
          );
      final viewModel = ClubDetailViewModel(
        club: club,
        isHost: false,
        isMember: false,
        upcomingEvents: const [],
        reviews: const [],
        userProfile: null,
        uid: null,
        isAuthenticated: false,
      );

      await _pumpPreview(tester, club: club, viewModel: AsyncData(viewModel));

      expect(find.text('SOURCE BACKED'), findsOneWidget);
      expect(find.text('Your hosts'), findsNothing);
      expect(find.byType(ClubHostRow), findsNothing);
    },
  );

  testWidgets('owner verification is derived from authority state', (
    tester,
  ) async {
    final club = buildClub().copyWith(
      claim: OrganizerClaim.fromJson({'state': 'verified'}),
      provenance: OrganizerProvenance.fromJson({
        'origin': 'scraper',
        'sourceConfidence': 'ownerVerified',
        'verificationStatus': 'ownerVerified',
      }),
    );
    final viewModel = ClubDetailViewModel(
      club: club,
      isHost: false,
      isMember: false,
      upcomingEvents: const [],
      reviews: const [],
      userProfile: null,
      uid: null,
      isAuthenticated: false,
    );

    await _pumpPreview(tester, club: club, viewModel: AsyncData(viewModel));

    expect(find.text('OWNER VERIFIED'), findsOneWidget);
  });
}

Future<void> _pumpPreview(
  WidgetTester tester, {
  required Club club,
  required AsyncValue<ClubDetailViewModel?> viewModel,
}) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        clubDetailViewModelProvider(club.id).overrideWithValue(viewModel),
      ],
      child: MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: CustomScrollView(
            slivers: [
              ClubDetailReadOnlyPreview(
                initialClub: club,
                currentUid: 'host-1',
              ),
            ],
          ),
        ),
      ),
    ),
  );
  await tester.pump();
}
