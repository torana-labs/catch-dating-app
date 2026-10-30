import 'dart:ui' show SemanticsAction;

import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_authority.dart';
import 'package:catch_dating_app/organizers/presentation/detail/organizer_detail_read_only_preview.dart';
import 'package:catch_dating_app/organizers/presentation/detail/organizer_detail_view_model.dart';
import 'package:catch_dating_app/organizers/presentation/detail/widgets/organizer_detail_body.dart';
import 'package:catch_dating_app/organizers/presentation/detail/widgets/organizer_host_section.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'organizers_test_helpers.dart';

void main() {
  testWidgets('loading preview uses the consumer initial-club fallback', (
    tester,
  ) async {
    final organizer = buildOrganizer();

    await _pumpPreview(
      tester,
      organizer: organizer,
      viewModel: const AsyncLoading(),
    );

    expect(
      find.byKey(const ValueKey('club-detail-hero-module')),
      findsOneWidget,
    );
    expect(find.text(organizer.description), findsOneWidget);
    expect(find.byType(SliverIgnorePointer), findsOneWidget);
  });

  testWidgets('failed preview exposes the consumer retry error state', (
    tester,
  ) async {
    final organizer = buildOrganizer();

    await _pumpPreview(
      tester,
      organizer: organizer,
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
    final organizer = buildOrganizer();

    await _pumpPreview(
      tester,
      organizer: organizer,
      viewModel: const AsyncData(null),
    );

    expect(find.text('Organizer not found'), findsOneWidget);
    expect(find.byKey(const ValueKey('club-detail-hero-module')), findsNothing);
  });

  testWidgets('loaded preview renders canonical content behind one boundary', (
    tester,
  ) async {
    final organizer = buildOrganizer(
      description: 'A consumer-facing club description.',
    );
    final viewModel = OrganizerDetailViewModel(
      organizer: organizer,
      isHost: true,
      isMember: true,
      upcomingEvents: [buildEvent(clubId: organizer.id)],
      reviews: const [],
      userProfile: null,
      uid: 'host-1',
      isAuthenticated: true,
    );

    await _pumpPreview(
      tester,
      organizer: organizer,
      viewModel: AsyncData(viewModel),
    );

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
        find.byType(OrganizerNextRunBanner),
      );
      expect(nextRunSemantics.flagsCollection.isButton, isFalse);
      expect(
        nextRunSemantics.getSemanticsData().hasAction(SemanticsAction.tap),
        isFalse,
      );
      final hostSemantics = tester.getSemantics(find.byType(OrganizerHostRow));
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
      final organizer =
          buildOrganizer(
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
      final viewModel = OrganizerDetailViewModel(
        organizer: organizer,
        isHost: false,
        isMember: false,
        upcomingEvents: const [],
        reviews: const [],
        userProfile: null,
        uid: null,
        isAuthenticated: false,
      );

      await _pumpPreview(
        tester,
        organizer: organizer,
        viewModel: AsyncData(viewModel),
      );

      expect(find.text('SOURCE BACKED'), findsOneWidget);
      expect(find.text('Your hosts'), findsNothing);
      expect(find.byType(OrganizerHostRow), findsNothing);
    },
  );

  testWidgets('owner verification is derived from authority state', (
    tester,
  ) async {
    final organizer = buildOrganizer().copyWith(
      claim: OrganizerClaim.fromJson({'state': 'verified'}),
      provenance: OrganizerProvenance.fromJson({
        'origin': 'scraper',
        'sourceConfidence': 'ownerVerified',
        'verificationStatus': 'ownerVerified',
      }),
    );
    final viewModel = OrganizerDetailViewModel(
      organizer: organizer,
      isHost: false,
      isMember: false,
      upcomingEvents: const [],
      reviews: const [],
      userProfile: null,
      uid: null,
      isAuthenticated: false,
    );

    await _pumpPreview(
      tester,
      organizer: organizer,
      viewModel: AsyncData(viewModel),
    );

    expect(find.text('OWNER VERIFIED'), findsOneWidget);
  });
}

Future<void> _pumpPreview(
  WidgetTester tester, {
  required Organizer organizer,
  required AsyncValue<OrganizerDetailViewModel?> viewModel,
}) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        organizerDetailViewModelProvider(
          organizer.id,
        ).overrideWithValue(viewModel),
      ],
      child: MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: CustomScrollView(
            slivers: [
              OrganizerDetailReadOnlyPreview(
                initialOrganizer: organizer,
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
