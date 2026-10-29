import 'dart:async';

import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_analytics.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_export.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_analytics_screen.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_operations_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_forms_controller.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations.dart';
import 'package:catch_dating_app/platform/device/external_links.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../test_pump_helpers.dart';

void main() {
  testWidgets('Results retains its version through export polling', (
    tester,
  ) async {
    final controller = _Exports();
    final opened = <Uri>[];
    await _pump(tester, controller, opened: opened);
    expect(find.text('Published version 3'), findsOneWidget);
    expect(find.text('70%'), findsOneWidget);
    expect(find.textContaining('84'), findsWidgets);
    final export = find.text('Export CSV');
    await tester.ensureVisible(export);
    await tester.tap(export);
    await tester.pump();
    expect(controller.requests, hasLength(1));
    await tester.pump(CatchMotion.formExportPoll);
    await pumpUntilFound(tester, find.text('Export CSV'));
    expect(controller.requests, hasLength(2));
    expect(
      controller.requests.map((r) => r.version),
      everyElement('version-3'),
    );
    expect(controller.requests.map((r) => r.id).toSet(), hasLength(1));
    expect(opened.single.toString(), 'https://catch.example/export.csv');
    expect(tester.takeException(), isNull);
  });

  testWidgets('Results with no starts does not invent a completion rate', (
    tester,
  ) async {
    await _pump(tester, _Exports(), starts: 0);
    expect(find.text('0%'), findsNothing);
    expect(find.text('—'), findsWidgets);
    expect(tester.takeException(), isNull);
  });
}

Future<void> _pump(
  WidgetTester tester,
  _Exports controller, {
  List<Uri>? opened,
  int starts = 120,
}) async {
  tester.view.physicalSize = const Size(390, 844);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        hostFormsControllerProvider.overrideWithValue(controller),
        hostFormEditorControllerProvider(
          'org-1',
          'form-1',
        ).overrideWith(_LoadingEditor.new),
        hostFormAnalyticsProvider(
          organizerId: 'org-1',
          formId: 'form-1',
        ).overrideWith(
          (_) async => HostFormAnalytics(
            formId: 'form-1',
            versionId: 'version-3',
            version: 3,
            opens: 240,
            starts: starts,
            submissions: starts == 0 ? 0 : 84,
            withdrawals: 0,
            completionRate: starts == 0 ? 0 : .7,
            medianCompletionMillis: null,
            questions: const [],
            sources: const [],
            privacyThreshold: 5,
          ),
        ),
        externalUrlLauncherProvider.overrideWithValue((
          uri, {
          mode = LaunchMode.platformDefault,
        }) async {
          opened?.add(uri);
          return true;
        }),
      ],
      child: MaterialApp(
        theme: AppTheme.light,
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context).copyWith(disableAnimations: true),
          child: child!,
        ),
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: const HostFormAnalyticsScreen(
          organizerId: 'org-1',
          formId: 'form-1',
        ),
      ),
    ),
  );
  await pumpUntilFound(tester, find.text('Published version 3'));
}

class _LoadingEditor extends HostFormEditorController {
  @override
  Future<HostFormEditorState> build(String organizerId, String formId) =>
      Completer<HostFormEditorState>().future;
}

class _Exports extends Fake implements HostFormsController {
  final requests = <({String id, String? version})>[];
  @override
  Future<HostFormExportReceipt> requestExport({
    required String organizerId,
    required String formId,
    required String requestId,
    required HostFormExportFormat format,
    Set<HostFormResponseStatus> statuses = const {},
    String? versionId,
  }) async {
    requests.add((id: requestId, version: versionId));
    return HostFormExportReceipt(
      exportId: 'export-1',
      status: requests.length == 1
          ? HostFormExportStatus.pending
          : HostFormExportStatus.completed,
      format: format,
      rowCount: 84,
      downloadUrl: 'https://catch.example/export.csv',
      expiresAt: DateTime(2026, 9, 7),
      errorMessage: null,
    );
  }
}
