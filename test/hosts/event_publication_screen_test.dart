import 'package:catch_dating_app/contexts/events/data/event_publication_repository.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../test_pump_helpers.dart';
import 'event_controller_test_support.dart';
import 'event_publication_test.dart' show publicationEvent;

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));
  testWidgets('publication action remains reachable with 200% text', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(720, 1280);
    tester.view.devicePixelRatio = 2;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });
    EventPublicationRequest? sent;
    final controller = TestEventPublicationController(
      userId: 'host1',
      organizerId: 'org1',
      eventId: 'event1',
      read: ({required organizerId, required eventId}) async =>
          publicationEvent(),
      currentUserId: () => 'host1',
      write: (request) async {
        sent = request;
        throw StateError('response lost');
      },
    );
    addTearDown(controller.dispose);
    await controller.load();
    await tester.pumpWidget(
      MaterialApp(
        theme: CatchTheme.light,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: MediaQuery(
          data: const MediaQueryData(textScaler: TextScaler.linear(2)),
          child: controller.screen(onBack: () {}),
        ),
      ),
    );
    await pumpFeatureUi(tester);
    expect(tester.takeException(), isNull);
    expect(find.text('Publish event').hitTestable(), findsOneWidget);
    await tester.tap(find.text('Publish event').hitTestable());
    await pumpFeatureUi(tester);
    expect(sent?.publicationState, 'published');
    expect(controller.pending, isNotNull);
    expect(
      find.text('Recover visibility change').hitTestable(),
      findsOneWidget,
    );
    expect(tester.takeException(), isNull);
  });
}
