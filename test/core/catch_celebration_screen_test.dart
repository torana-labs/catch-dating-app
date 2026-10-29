import 'package:catch_dating_app/pages/celebration/celebration_effects_controller.dart';
import 'package:catch_dating_app/pages/celebration/celebration_screen.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('renders celebration content and dispatches effects once', (
    tester,
  ) async {
    final effects = _FakeCelebrationEffectsController();
    var primaryPressed = 0;
    var secondaryPressed = 0;

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          celebrationEffectsControllerProvider.overrideWithValue(effects),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          home: CelebrationScreen(
            kind: CelebrationMomentKind.eventJoined,
            eyebrow: 'Booking confirmed',
            title: "You're in.",
            message: 'Your spot is confirmed.',
            details: [
              CelebrationDetail(
                icon: CatchIcons.location,
                label: 'Where',
                value: 'Carter Road',
              ),
            ],
            note: 'Arrive by the meeting time.',
            primaryAction: CelebrationAction(
              label: 'View event',
              onPressed: () => primaryPressed++,
            ),
            secondaryAction: CelebrationAction(
              label: 'Back to home',
              onPressed: () => secondaryPressed++,
            ),
          ),
        ),
      ),
    );
    await tester.pump();

    expect(effects.playedKinds, [CelebrationMomentKind.eventJoined]);
    expect(find.text('BOOKING CONFIRMED'), findsOneWidget);
    expect(find.text("You're in."), findsOneWidget);
    expect(find.text('Your spot is confirmed.'), findsOneWidget);
    expect(find.text('Where'), findsOneWidget);
    expect(find.text('Carter Road'), findsOneWidget);
    expect(find.text('Arrive by the meeting time.'), findsOneWidget);
    expect(
      tester.widget<Icon>(find.byIcon(CatchIcons.check)).color,
      Colors.white,
    );
    expect(
      tester.widget<Icon>(find.byIcon(CatchIcons.location)).color,
      Colors.white,
    );
    expect(
      tester.widget<Icon>(find.byIcon(CatchIcons.instant)).color,
      Colors.white,
    );
    expect(
      tester.widget<Text>(find.text('Where')).style?.color,
      Colors.white.withValues(alpha: 0.74),
    );
    expect(
      tester.widget<Text>(find.text('Carter Road')).style?.color,
      Colors.white,
    );
    expect(
      tester
          .widget<Text>(find.text('Arrive by the meeting time.'))
          .style
          ?.color,
      Colors.white,
    );

    // The screen scrolls; the D19 display title can push actions below the
    // 600px test window.
    await tester.ensureVisible(find.text('View event'));
    await tester.tap(find.text('View event'));
    await tester.pump();
    await tester.ensureVisible(find.text('Back to home'));
    await tester.tap(find.text('Back to home'));
    await tester.pump();

    expect(primaryPressed, 1);
    expect(secondaryPressed, 1);
    expect(effects.playedKinds, [CelebrationMomentKind.eventJoined]);
  });

  testWidgets('can suppress effects for deterministic surfaces', (
    tester,
  ) async {
    final effects = _FakeCelebrationEffectsController();

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          celebrationEffectsControllerProvider.overrideWithValue(effects),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          home: CelebrationScreen(
            kind: CelebrationMomentKind.match,
            title: "It's a Catch.",
            message: 'You both liked each other.',
            playEffects: false,
            primaryAction: CelebrationAction(
              label: 'Continue',
              onPressed: () {},
            ),
          ),
        ),
      ),
    );
    await tester.pump();

    expect(effects.playedKinds, isEmpty);
  });

  testWidgets('paper confirmation renders as its own full-screen surface', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: const PaperCelebrationScaffold(
          eyebrow: 'Event created',
          title: 'Your event is live.',
          message: 'The event is ready to manage.',
          details: [CelebrationDetail(label: 'When', value: 'Sunday morning')],
          primaryAction: CelebrationAction(
            label: 'Manage event',
            onPressed: _noop,
          ),
        ),
      ),
    );

    expect(find.byType(Scaffold), findsOneWidget);
    expect(find.text('EVENT CREATED'), findsOneWidget);
    expect(find.text('Your event is live.'), findsOneWidget);
    expect(find.text('Sunday morning'), findsOneWidget);
    expect(find.text('Manage event'), findsOneWidget);
  });

  testWidgets('keeps long celebration content scrollable on short screens', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(390, 520);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          celebrationEffectsControllerProvider.overrideWithValue(
            _FakeCelebrationEffectsController(),
          ),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          home: CelebrationScreen(
            kind: CelebrationMomentKind.eventJoined,
            eyebrow: 'Booking confirmed',
            title: "You're in.",
            message: 'Your spot is confirmed for a longer event name.',
            details: const [
              CelebrationDetail(label: 'When', value: 'Thursday evening'),
              CelebrationDetail(label: 'Where', value: 'Carter Road'),
              CelebrationDetail(label: 'Event', value: '8km · Easy'),
              CelebrationDetail(label: 'Paid', value: '₹299'),
            ],
            note: 'Arrive by the meeting time.',
            supplementalChildren: const [
              SizedBox(height: 120, child: Text('Calendar and directions')),
              SizedBox(height: 120, child: Text('Invite a friend')),
            ],
            primaryAction: CelebrationAction(
              label: 'View event',
              onPressed: () {},
            ),
            secondaryAction: CelebrationAction(
              label: 'Back to home',
              onPressed: () {},
            ),
          ),
        ),
      ),
    );
    await tester.pump();

    expect(tester.takeException(), isNull);
    expect(find.byType(SingleChildScrollView), findsOneWidget);

    await tester.scrollUntilVisible(
      find.text('Back to home'),
      220,
      scrollable: find.byType(Scrollable),
    );

    expect(find.text('Back to home').hitTestable(), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}

void _noop() {}

class _FakeCelebrationEffectsController extends CelebrationEffectsController {
  _FakeCelebrationEffectsController();

  final List<CelebrationMomentKind> playedKinds = [];

  @override
  Future<void> play(CelebrationMomentKind kind) async {
    playedKinds.add(kind);
  }
}
