import 'dart:async';

import 'package:catch_dating_app/contexts/programmes/data/program_read_snapshots.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/theme/app_theme.dart';
import 'package:catch_test_support/catch_test_fonts.dart';
import 'package:catch_test_support/test_pump_helpers.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../planner_captures.dart';

// The composer clears itself as it hands a reply over. A reply that lands
// while the host is typing the next one must leave that text alone, and a
// reply that fails gives its text back.

final _composer = find.descendant(
  of: find.byKey(const ValueKey<String>('host-programme-inbox-composer')),
  matching: find.byType(TextField),
);

String _composerText(WidgetTester tester) =>
    tester.widget<TextField>(_composer).controller!.text;

void main() {
  setUpAll(loadCatchTestFonts);

  testWidgets('a reply that lands while the host types keeps the new text', (
    tester,
  ) async {
    final inbox = await _Inbox.open(tester);
    await inbox.send('On our way');
    expect(_composerText(tester), isEmpty);

    await tester.enterText(_composer, 'Also, the bus leaves at 6');
    await tester.pump();
    expect(inbox.sendEnabled, isFalse, reason: 'the reply is in flight');
    inbox.reply.complete({'messageId': 'message-1'});
    await tester.pump();
    await tester.pump();

    expect(tester.takeException(), isNull);
    expect(inbox.sendEnabled, isTrue, reason: 'the reply landed');
    expect(inbox.sent, ['On our way']);
    expect(_composerText(tester), 'Also, the bus leaves at 6');
  });

  testWidgets('a reply that fails puts its text back', (tester) async {
    final inbox = await _Inbox.open(tester);
    await inbox.send('On our way');

    inbox.reply.completeError(
      FirebaseFunctionsException(code: 'unavailable', message: 'offline'),
    );
    await tester.pump();
    await tester.pump();

    expect(tester.takeException(), isNull);
    expect(_composerText(tester), 'On our way');
  });

  testWidgets('a reply that fails after the host typed again keeps the new '
      'text', (tester) async {
    final inbox = await _Inbox.open(tester);
    await inbox.send('On our way');

    await tester.enterText(_composer, 'Sorry, one more thing');
    inbox.reply.completeError(
      FirebaseFunctionsException(code: 'unavailable', message: 'offline'),
    );
    await tester.pump();
    await tester.pump();

    expect(_composerText(tester), 'Sorry, one more thing');
  });

  testWidgets('a reply that lands or fails after the screen closes is safe', (
    tester,
  ) async {
    final inbox = await _Inbox.open(tester);
    await inbox.send('On our way');
    await tester.pumpWidget(const SizedBox());

    inbox.reply.completeError(
      FirebaseFunctionsException(code: 'unavailable', message: 'offline'),
    );
    await tester.pump();

    expect(tester.takeException(), isNull);
  });
}

class _Inbox {
  _Inbox._(this.tester);

  final WidgetTester tester;
  final reply = Completer<Object?>();
  final sent = <String>[];

  static Future<_Inbox> open(WidgetTester tester) async {
    tester.view.physicalSize = plannerDesktopSize;
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    SharedPreferences.setMockInitialValues({});
    final inbox = _Inbox._(tester);
    final commands = ProgramWorkRepository(
      _Functions((name, payload) {
        if (name == 'sendProgramWhatsappReply') {
          inbox.sent.add((payload! as Map)['text'] as String);
          return inbox.reply.future;
        }
        return Future.value({'revision': 1});
      }),
      SharedPreferencesProgramReadSnapshotStore(),
      () => 'meher',
    );
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          ...plannerCaptureOverrides(),
          programmeInboxCommandsProvider.overrideWithValue(commands),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: plannerInboxCapture(),
        ),
      ),
    );
    await pumpFeatureUi(tester);
    return inbox;
  }

  /// Whether the composer's send action is live: off while a reply is in
  /// flight (the screen is busy), on again once it landed.
  bool get sendEnabled =>
      tester
          .widget<CatchComposerInput>(
            find.byKey(const ValueKey<String>('host-programme-inbox-composer')),
          )
          .onSend !=
      null;

  Future<void> send(String text) async {
    await tester.enterText(_composer, text);
    await tester.pump();
    await tester.testTextInput.receiveAction(TextInputAction.send);
    await tester.pump();
  }
}

class _Functions extends Fake implements FirebaseFunctions {
  _Functions(this.respond);

  final Future<Object?> Function(String name, Object? payload) respond;

  @override
  HttpsCallable httpsCallable(String name, {HttpsCallableOptions? options}) =>
      _Callable((payload) => respond(name, payload));
}

class _Callable extends Fake implements HttpsCallable {
  _Callable(this.respond);

  final Future<Object?> Function(Object?) respond;

  @override
  Future<HttpsCallableResult<T>> call<T>([dynamic parameters]) async =>
      _Result(await respond(parameters) as T);
}

class _Result<T> extends Fake implements HttpsCallableResult<T> {
  _Result(this.data);

  @override
  final T data;
}
