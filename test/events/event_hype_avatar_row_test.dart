import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/events/presentation/widgets/event_hype_avatar_row.dart';
import 'package:catch_dating_app/swipes/data/swipe_candidate_repository.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'events_test_helpers.dart';

void main() {
  testWidgets(
    'EventHypeAvatarRow renders veiled activity placeholders when obscured',
    (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            theme: AppTheme.light,
            home: const Scaffold(
              body: EventHypeAvatarRow(
                eventId: 'event-1',
                totalCount: 4,
                size: 42,
                limit: 3,
                activityKind: ActivityKind.yoga,
                showOverflowCount: true,
              ),
            ),
          ),
        ),
      );

      expect(find.byIcon(CatchIcons.person), findsNWidgets(3));
      expect(find.text('+1'), findsOneWidget);
    },
  );

  test(
    'eventHypeAvatars uses the server-owned candidate order and thumbnails',
    () async {
      final repository = FakeSwipeCandidateRepository([
        buildPublicProfile(
          uid: 'runner-new',
          name: 'New Runner',
          photoUrls: const ['https://full.test/new.jpg'],
          photoThumbnailUrls: const ['https://thumb.test/new.jpg'],
        ),
        buildPublicProfile(
          uid: 'runner-old',
          name: 'Old Runner',
          photoUrls: const ['https://full.test/old.jpg'],
          photoThumbnailUrls: const ['https://thumb.test/old.jpg'],
        ),
      ]);

      final container = ProviderContainer(
        overrides: [
          swipeCandidateRepositoryProvider.overrideWith((ref) => repository),
        ],
      );
      addTearDown(container.dispose);

      final avatars = await container.read(
        eventHypeAvatarsProvider(
          const EventHypeAvatarQuery(eventId: 'event-1'),
        ).future,
      );

      expect(repository.lastEventId, 'event-1');
      expect(avatars.map((avatar) => avatar.name), [
        'New Runner',
        'Old Runner',
      ]);
      expect(avatars.map((avatar) => avatar.imageUrl), [
        'https://thumb.test/new.jpg',
        'https://thumb.test/old.jpg',
      ]);
    },
  );

  test(
    'eventHypeAvatars falls back to full photo while thumbnails backfill',
    () async {
      final repository = FakeSwipeCandidateRepository([
        buildPublicProfile(
          name: 'Runner One',
          photoUrls: const ['https://full.test/runner-1.jpg'],
        ),
      ]);

      final container = ProviderContainer(
        overrides: [
          swipeCandidateRepositoryProvider.overrideWith((ref) => repository),
        ],
      );
      addTearDown(container.dispose);

      final avatars = await container.read(
        eventHypeAvatarsProvider(
          const EventHypeAvatarQuery(eventId: 'event-1'),
        ).future,
      );

      expect(avatars.single.name, 'Runner One');
      expect(avatars.single.imageUrl, 'https://full.test/runner-1.jpg');
    },
  );
}
