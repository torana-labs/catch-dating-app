import 'package:catch_dating_app/contexts/connections/domain/match.dart';
import 'package:catch_dating_app/contexts/profiles/data/public_profile_repository.dart';
import 'package:catch_dating_app/matches/shared/match_celebration_dialog.dart';
import 'package:catch_dating_app/pages/celebration/celebration_effects_controller.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart';

void main() {
  testWidgets('renders full-screen match celebration actions', (tester) async {
    final profile = buildPublicProfile(uid: 'runner-2', name: 'Taylor');
    final effects = _FakeCelebrationEffectsController();
    var sendPressed = 0;
    var keepSwipingPressed = 0;

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          watchPublicProfileProvider(
            'runner-2',
          ).overrideWith((ref) => Stream.value(profile)),
          celebrationEffectsControllerProvider.overrideWithValue(effects),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          home: MatchCelebrationDialog(
            match: Match(
              id: 'match-1',
              user1Id: 'runner-1',
              user2Id: 'runner-2',
              eventIds: const ['event-1'],
              createdAt: DateTime(2026, 5, 6),
            ),
            otherUid: 'runner-2',
            onSendMessage: () => sendPressed++,
            onKeepSwiping: () => keepSwipingPressed++,
          ),
        ),
      ),
    );
    await tester.pump();

    expect(effects.playedKinds, [CelebrationMomentKind.match]);
    expect(find.text('NEW CATCH'), findsOneWidget);
    expect(find.text("It's a Catch."), findsOneWidget);
    expect(find.text('You and Taylor both liked each other.'), findsOneWidget);

    await tester.tap(find.text('Send a message'));
    await tester.pump();
    await tester.ensureVisible(find.text('Keep catching'));
    await tester.tap(find.text('Keep catching'));
    await tester.pump();

    expect(sendPressed, 1);
    expect(keepSwipingPressed, 1);
  });
}

class _FakeCelebrationEffectsController extends CelebrationEffectsController {
  _FakeCelebrationEffectsController();

  final List<CelebrationMomentKind> playedKinds = [];

  @override
  Future<void> play(CelebrationMomentKind kind) async {
    playedKinds.add(kind);
  }
}
