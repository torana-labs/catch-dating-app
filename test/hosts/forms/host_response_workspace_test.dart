import 'dart:async';
import 'dart:io';

import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_response_query.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_response_query_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_response_query_capability.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_response_query_workspace_section.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/catch_test_fonts.dart';
import '../../test_pump_helpers.dart';
import '../../ui_captures/support/capture_device.dart';
import '../../ui_captures/support/capture_pump.dart';

const _request = HostResponseQueryRequest(
  organizerId: 'organizer',
  formId: 'form',
  versionId: 'form_v1',
);
const _captureDirectory = String.fromEnvironment('RSVP_CAPTURE_DIRECTORY');

void main() {
  if (_captureDirectory.isNotEmpty) {
    TestWidgetsFlutterBinding.ensureInitialized();
    setUpAll(loadCatchTestFonts);
    for (final device in [
      CaptureDevice.iphone17Pro,
      CaptureDevice.auditDesktop,
    ]) {
      testWidgets('capture response workspace ${device.id}', (tester) async {
        final controller = HostResponseQueryController(_Gateway());
        addTearDown(controller.dispose);
        await captureCatchWidget(
          tester,
          id: 'response-workspace-${device.id}',
          device: device,
          outputDirectory: Directory(_captureDirectory),
          builder: (context) => _workspace(context, controller),
        );
      });
    }
    testWidgets('capture response workspace large text', (tester) async {
      final controller = HostResponseQueryController(_Gateway());
      addTearDown(controller.dispose);
      await captureCatchWidget(
        tester,
        id: 'response-workspace-large-text',
        device: CaptureDevice.iphone17Pro,
        textScale: 2,
        outputDirectory: Directory(_captureDirectory),
        builder: (context) => _workspace(context, controller),
      );
      expect(tester.takeException(), isNull);
    });
    return;
  }

  testWidgets('opens response without selecting it', (tester) async {
    final controller = HostResponseQueryController(_Gateway());
    addTearDown(controller.dispose);
    String? opened;
    await _pump(tester, controller, onOpen: (id) => opened = id);
    await tester.tap(find.text('Maya Kapoor'));
    expect(opened, 'response-0');
    expect(controller.view.selectedIds, isEmpty);
  });

  testWidgets('selection control does not open the response', (tester) async {
    final controller = HostResponseQueryController(_Gateway());
    addTearDown(controller.dispose);
    String? opened;
    await _pump(tester, controller, onOpen: (id) => opened = id);
    await tester.tap(find.byTooltip('Select response: Maya Kapoor'));
    await pumpFeatureUi(tester);
    expect(opened, isNull);
    expect(controller.selectionIntent?.ids, ['response-0']);
    await tester.tap(find.byTooltip('Deselect response: Maya Kapoor'));
    await pumpFeatureUi(tester);
    expect(controller.view.selectedIds, isEmpty);
  });

  testWidgets(
    'pagination stays below rows and busy until the next page arrives',
    (tester) async {
      final gateway = _Gateway()..pendingPage = Completer();
      final controller = HostResponseQueryController(gateway);
      addTearDown(controller.dispose);
      await _pump(tester, controller);
      final loadMore = find.byWidgetPredicate(
        (widget) =>
            widget is CatchButton && widget.label == 'Load more responses',
      );
      expect(
        tester.getTopLeft(loadMore).dy,
        greaterThan(tester.getBottomLeft(find.text('Aisha Khan')).dy),
      );
      await tester.ensureVisible(loadMore);
      await tester.tap(loadMore);
      await tester.pump();
      expect(find.text('Maya Kapoor'), findsOneWidget);
      expect(loadMore, findsOneWidget);
      final button = tester.widget<CatchButton>(loadMore);
      expect(button.status, CatchButtonStatus.loading);
      expect(button.onPressed, isNull);
      gateway.pendingPage!.complete(_page(3));
      await pumpFeatureUi(tester);
      expect(find.text('Kabir Sen'), findsOneWidget);
      expect(loadMore, findsNothing);
      expect(gateway.requests.last.cursor, 'page-2');
    },
  );

  testWidgets(
    'answer sorting uses value directions and clears stale selection',
    (tester) async {
      final gateway = _Gateway();
      final controller = HostResponseQueryController(gateway);
      addTearDown(controller.dispose);
      await _pump(tester, controller);
      controller.toggleSelection('response-0');
      await tester.tap(find.text('Sort: Newest first'));
      await pumpFeatureUi(tester);
      expect(find.text('Age · Ascending'), findsOneWidget);
      expect(find.text('Age · Descending'), findsOneWidget);
      await tester.tap(find.text('Age · Ascending'));
      await pumpFeatureUi(tester);
      expect(gateway.requests.last.sort.questionId, 'age');
      expect(gateway.requests.last.sort.direction, 'asc');
      expect(controller.view.selectedIds, isEmpty);
    },
  );
}

Future<void> _pump(
  WidgetTester tester,
  HostResponseQueryController controller, {
  ValueChanged<String>? onOpen,
}) async {
  await tester.pumpWidget(
    MaterialApp(
      theme: AppTheme.light,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: Builder(
        builder: (context) => _workspace(context, controller, onOpen: onOpen),
      ),
    ),
  );
  await pumpFeatureUi(tester);
}

Widget _workspace(
  BuildContext context,
  HostResponseQueryController controller, {
  ValueChanged<String>? onOpen,
}) => Scaffold(
  body: SafeArea(
    child: SingleChildScrollView(
      child: HostResponseQueryWorkspaceSection(
        controller: controller,
        request: _request,
        copy: hostResponseQueryCapability(
          context.l10n,
          versionId: 'form_v1',
        ).copy,
        onOpenResponse: onOpen ?? (_) {},
        onReviewSelection: (_, _) {},
      ),
    ),
  ),
);

class _Gateway implements HostResponseQueryGateway {
  final requests = <HostResponseQueryRequest>[];
  Completer<HostResponseQueryPage>? pendingPage;

  @override
  Future<HostResponseQueryPage> query(HostResponseQueryRequest request) async {
    requests.add(request);
    if (request.cursor != null && pendingPage != null) {
      return pendingPage!.future;
    }
    return _page(request.cursor == null ? 0 : 3);
  }
}

HostResponseQueryPage _page(int start) => HostResponseQueryPage(
  form: const HostResponseQueryForm(
    formId: 'form',
    title: 'Saturday Social',
    versionId: 'form_v1',
    version: 1,
  ),
  items: [
    for (var i = start; i < start + 3; i++)
      HostResponseQueryRow(
        responseId: 'response-$i',
        formId: 'form',
        formTitle: 'Saturday Social',
        versionId: 'form_v1',
        version: 1,
        status: HostFormResponseStatus.submitted,
        identityKind: HostFormResponseIdentityKind.phoneVerified,
        identity: HostFormResponseIdentity(
          displayName: [
            'Maya Kapoor',
            'Rohan Mehta',
            'Aisha Khan',
            'Dev Shah',
            'Nia Rao',
            'Kabir Sen',
          ][i],
          email: null,
          phoneE164: null,
          origin: HostFormDataOrigin.respondentGranted,
        ),
        sourceLinkId: null,
        submittedAt: DateTime.utc(2026, 9, 25, 10, i),
        withdrawnAt: null,
      ),
  ],
  nextCursor: start == 0 ? 'page-2' : null,
  total: 6,
  selectedIds: {for (var i = 0; i < 6; i++) 'response-$i'},
  queryHash: 'query-hash',
  resultHash: 'result-hash',
  fieldCatalog: const [
    HostResponseQueryField(
      questionId: 'age',
      label: 'Age',
      kind: 'number',
      operators: {HostResponseOperator.numberGte},
      sortable: true,
      options: {},
    ),
    HostResponseQueryField(
      questionId: 'city',
      label: 'City',
      kind: 'singleChoice',
      operators: {HostResponseOperator.choiceAny},
      sortable: false,
      options: {'delhi': 'Delhi', 'mumbai': 'Mumbai'},
    ),
  ],
);
