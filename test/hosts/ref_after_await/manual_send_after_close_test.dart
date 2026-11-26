import 'dart:async';

import 'package:catch_dating_app/contexts/audience/domain/crm/host_manual_send_task.dart';
import 'package:catch_dating_app/hosts/presentation/host_audience_controller.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_manual_send_list.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/device/external_links.dart';
import 'package:catch_platform/theme/app_theme.dart';
import 'package:catch_test_support/catch_test_fonts.dart';
import 'package:catch_test_support/test_pump_helpers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:url_launcher/url_launcher.dart' show LaunchMode;

// A manual send opens WhatsApp, then records that the handoff opened. The
// host can close the sheet while WhatsApp is opening; the handoff must still
// be recorded, or the task stays "not opened" though the message went out.

void main() {
  setUpAll(loadCatchTestFonts);

  testWidgets('a handoff that opens after the sheet closes is still recorded', (
    tester,
  ) async {
    final probe = await _Probe.open(tester);
    await tester.tap(
      find.byKey(const ValueKey('host-manual-send-open-whatsapp')),
    );
    await tester.pump();
    expect(probe.commands.validated, 1);
    expect(probe.launches, isNotEmpty, reason: 'WhatsApp is opening');

    await probe.close();
    probe.launch.complete(true);
    await tester.pump();
    await tester.pump();

    expect(tester.takeException(), isNull);
    expect(probe.commands.recorded, 1);
    await tester.pump(const Duration(minutes: 1));
  });

  testWidgets('nothing opens when the sheet closes while the number is '
      'checked', (tester) async {
    final probe = await _Probe.open(tester, holdValidation: true);
    await tester.tap(
      find.byKey(const ValueKey('host-manual-send-open-whatsapp')),
    );
    await tester.pump();
    expect(probe.commands.validated, 1);

    await probe.close();
    probe.commands.validation.complete(_task);
    await tester.pump();
    await tester.pump();

    expect(tester.takeException(), isNull);
    expect(probe.launches, isEmpty);
    expect(probe.commands.recorded, 0);
    await tester.pump(const Duration(minutes: 1));
  });
}

final _task = HostManualSendTask(
  organizerId: 'organizer-1',
  taskId: 'task-1',
  contactId: 'contact-1',
  displayName: 'Asha Example',
  status: HostManualSendTaskStatus.queued,
  active: true,
  revision: 1,
  phoneE164: '+919800000001',
  prefillText: 'See you on Saturday!',
  openCount: 0,
  createdAt: DateTime(2026, 11, 26, 9),
  updatedAt: DateTime(2026, 11, 26, 9),
  openedAt: null,
  expiresAt: DateTime(2026, 12, 3, 9),
);

class _Probe {
  _Probe._(this.tester, this.commands);

  final WidgetTester tester;
  final _Commands commands;
  final launch = Completer<bool>();
  final launches = <Uri>[];
  late final ProviderContainer container;

  static Future<_Probe> open(
    WidgetTester tester, {
    bool holdValidation = false,
  }) async {
    final probe = _Probe._(tester, _Commands(holdValidation: holdValidation));
    probe.container = ProviderContainer(
      overrides: [
        hostAudienceControllerProvider.overrideWithValue(probe.commands),
        externalLinkControllerProvider.overrideWithValue(
          ExternalLinkController((uri, {mode = LaunchMode.platformDefault}) {
            probe.launches.add(uri);
            return probe.launch.future;
          }),
        ),
      ],
    );
    addTearDown(probe.container.dispose);
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: probe.container,
        child: MaterialApp(
          theme: AppTheme.light,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: Scaffold(body: HostManualSendTaskSheet(task: _task)),
        ),
      ),
    );
    await pumpFeatureUi(tester);
    return probe;
  }

  Future<void> close() => tester.pumpWidget(
    UncontrolledProviderScope(container: container, child: const SizedBox()),
  );
}

class _Commands extends Fake implements HostAudienceController {
  _Commands({required this.holdValidation});

  final bool holdValidation;
  final validation = Completer<HostManualSendTask>();
  var validated = 0;
  var recorded = 0;

  @override
  Future<HostManualSendTask> validateManualSendTaskLaunch(
    HostManualSendTask task,
  ) {
    validated++;
    return holdValidation ? validation.future : Future.value(task);
  }

  @override
  Future<HostManualSendTask> recordManualHandoffOpened(
    HostManualSendTask task,
  ) async {
    recorded++;
    return task;
  }
}
