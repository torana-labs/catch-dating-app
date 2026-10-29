import 'dart:async';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_participant_context_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_sender_preference_repository.dart';
import 'package:catch_dating_app/event_success/presentation/event_message_preferences_navigation_section.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/catch_test_fonts.dart';
import '../test_pump_helpers.dart';
import 'event_message_preferences_ui_fixtures.dart';
import 'event_sender_preference_fixtures.dart';

void main() {
  setUpAll(loadCatchTestFonts);
  for (final scale in [1.0, 2.0]) {
    testWidgets(
      'independent consent and exact retry after dismissal at $scale',
      (tester) async {
        final fixtures = _Ui();
        final capture = GlobalKey();
        await _pump(tester, fixtures, scale: scale, boundary: capture);
        expect(fixtures.identity.reads, 0);
        expect(fixtures.senders.smsReadCount, 0);
        await _tap(tester, find.byKey(const ValueKey('event.messages.open')));
        expect(fixtures.identity.reads, 1);
        expect(fixtures.senders.smsReadCount, 1);
        expect(fixtures.senders.writes, isEmpty);
        expect(fixtures.senders.writes, isEmpty);
        await _capture(tester, capture, 'initial-$scale');
        await _tap(tester, find.text('SMS'));
        expect(find.text('Fixture consent for this event.'), findsOneWidget);
        await _tap(tester, find.byKey(const ValueKey('messages.sms.enable')));
        expect(fixtures.senders.writes, hasLength(1));
        final original = fixtures.senders.writes.single.change;
        fixtures.senders.writes.single.result.completeError(
          const NetworkException('unavailable', 'Lost confirmation'),
        );
        await pumpFeatureUi(tester);
        expect(find.text('Confirm your previous choice'), findsOneWidget);
        await _capture(tester, capture, 'uncertain-$scale');
        tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
        tester.binding.handleAppLifecycleStateChanged(
          AppLifecycleState.resumed,
        );
        await pumpFeatureUi(tester);
        expect(fixtures.senders.smsReadCount, 1);
        Navigator.of(
          tester.element(find.text('Fixture consent for this event.')),
        ).pop();
        await pumpFeatureUi(tester);
        await _tap(tester, find.byKey(const ValueKey('event.messages.open')));
        // The unresolved owner's private lease survives the sheet and fresh
        // identity read; no new grant or review replaces the frozen request.
        expect(fixtures.senders.smsReadCount, 1);
        final retry = find.byKey(const ValueKey('messages.sms.retry'));
        if (retry.evaluate().isEmpty) await _tap(tester, find.text('SMS'));
        await _tap(tester, retry);
        expect(fixtures.senders.writes, hasLength(2));
        expect(fixtures.senders.writes.last.change, same(original));
        fixtures.senders.writes.last.result.complete(
          senderApplied(
            original,
            outcome: 'replayed',
            patch: {'revision': 3, 'preference': 'disabled'},
          ),
        );
        await pumpFeatureUi(tester);
        expect(find.text('Messages are off'), findsWidgets);
        expect(fixtures.senders.writes, hasLength(2));
        expect(tester.takeException(), isNull);
      },
    );
  }
  testWidgets('previous sender can be withdrawn but never silently granted', (
    tester,
  ) async {
    final fixtures = _Ui()..senders.history = true;
    await _pump(tester, fixtures);
    await _tap(tester, find.byKey(const ValueKey('event.messages.open')));
    await _tap(tester, find.text('WhatsApp'));
    expect(find.text('Current Organizer'), findsOneWidget);
    expect(
      find.byKey(const ValueKey('messages.whatsapp.enable')),
      findsOneWidget,
    );
    await _tap(tester, find.text('Review other senders'));
    expect(find.text('Previous Organizer'), findsOneWidget);
    expect(find.text('sender-prior'), findsNothing);
    expect(
      find.byKey(const ValueKey('messages.whatsapp.enable')),
      findsNothing,
    );
    await _tap(tester, find.byKey(const ValueKey('messages.whatsapp.disable')));
    final write = fixtures.senders.writes.single;
    expect(write.change.snapshot.senderId, 'sender-prior');
    write.result.complete(senderApplied(write.change));
    await pumpFeatureUi(tester);
    expect(find.text('Messages are off'), findsWidgets);
    expect(fixtures.senders.writes, hasLength(1));
  });
  for (final resolution in ['unlinked', 'ambiguous']) {
    testWidgets('$resolution identity offers recovery without channel reads', (
      tester,
    ) async {
      final fixtures = _Ui()..identity.resolution = resolution;
      await _pump(tester, fixtures);
      await _tap(tester, find.byKey(const ValueKey('event.messages.open')));
      expect(fixtures.senders.smsReadCount, 0);
      expect(fixtures.senders.pageCount, 0);
      expect(find.text('SMS'), findsNothing);
      expect(find.text('Reload'), findsOneWidget);
      fixtures.identity.resolution = 'linked';
      await _tap(tester, find.text('Reload'));
      expect(fixtures.senders.smsReadCount, 1);
      expect(fixtures.senders.pageCount, 3);
    });
  }
  testWidgets('sign-out removes the old terms and grant actions', (
    tester,
  ) async {
    final auth = StreamController<String?>.broadcast();
    addTearDown(auth.close);
    final fixtures = _Ui();
    await _pump(tester, fixtures, auth: auth.stream);
    await tester.tap(find.byKey(const ValueKey('event.messages.open')));
    await tester.pump();
    auth.add('guest-1');
    await pumpFeatureUi(tester);
    await _tap(tester, find.text('SMS'));
    expect(find.byKey(const ValueKey('messages.sms.enable')), findsOneWidget);
    auth.add(null);
    await pumpFeatureUi(tester);
    expect(find.text('Fixture consent for this event.'), findsNothing);
    expect(find.byKey(const ValueKey('messages.sms.enable')), findsNothing);
    expect(fixtures.senders.writes, isEmpty);
  });
}

class _Ui {
  final identity = MessageIdentityRepository();
  final senders = MessageSenderRepository();
}

Future<void> _pump(
  WidgetTester tester,
  _Ui fixtures, {
  double scale = 1,
  GlobalKey? boundary,
  Stream<String?>? auth,
}) async {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = const Size(390, 844);
  addTearDown(tester.view.resetDevicePixelRatio);
  addTearDown(tester.view.resetPhysicalSize);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        uidProvider.overrideWith((ref) => auth ?? Stream.value('guest-1')),
        eventParticipantContextRepositoryProvider.overrideWith(
          (ref) => fixtures.identity,
        ),
        eventSenderPreferenceRepositoryProvider.overrideWith(
          (ref) => fixtures.senders,
        ),
      ],
      child: RepaintBoundary(
        key: boundary,
        child: MaterialApp(
          theme: AppTheme.light,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(
              context,
            ).copyWith(textScaler: TextScaler.linear(scale)),
            child: child!,
          ),
          home: const Scaffold(
            body: EventMessagePreferencesNavigationSection(eventId: 'event-1'),
          ),
        ),
      ),
    ),
  );
  await pumpFeatureUi(tester);
}

Future<void> _tap(WidgetTester tester, Finder target) async {
  await tester.ensureVisible(target);
  await tester.tap(target);
  await pumpFeatureUi(tester);
}

Future<void> _capture(
  WidgetTester tester,
  GlobalKey boundary,
  String name,
) async {
  if (Platform.environment['CAPTURE_EVENT_MESSAGES'] != '1') return;
  await tester.runAsync(() async {
    final image =
        await (boundary.currentContext!.findRenderObject()!
                as RenderRepaintBoundary)
            .toImage();
    final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
    await File(
      '/tmp/event-messages-$name.png',
    ).writeAsBytes(bytes!.buffer.asUint8List());
    image.dispose();
  });
}
