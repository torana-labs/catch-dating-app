import 'dart:async';

import 'package:catch_dating_app/contexts/forms/data/host_forms_repository.dart';
import 'package:catch_dating_app/contexts/forms/data/host_response_query_repository.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_export.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_response_query.dart';
import 'package:catch_dating_app/hosts/forms/responses_filter_sheet.dart';
import 'package:catch_dating_app/hosts/forms/responses_query_body.dart';
import 'package:catch_dating_app/hosts/forms/responses_query_editor.dart';
import 'package:catch_dating_app/hosts/forms/responses_query_workspace.dart';
import 'package:catch_dating_app/hosts/forms/responses_state.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_response_query_controller.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import 'operations/preview.dart';

const _path = '[P1 product surfaces]/Host operations/Forms';

Widget _frame(Widget child) => WidgetbookHostDeviceFrame(
  child: CatchRoot(
    child: CatchScreen(body: CatchPageBody.screen(child: child)),
  ),
);

const _fields = [
  HostResponseQueryField(
    questionId: 'pace',
    label: 'Your easy pace',
    kind: 'singleChoice',
    operators: {HostResponseOperator.choiceAny, HostResponseOperator.present},
    sortable: false,
    options: {'easy': 'Easy', 'steady': 'Steady'},
  ),
  HostResponseQueryField(
    questionId: 'distance',
    label: 'How far',
    kind: 'number',
    operators: {HostResponseOperator.numberBetween},
    sortable: true,
    options: {},
  ),
];

final _row = HostResponseQueryRow(
  responseId: 'preview-response',
  formId: 'preview-form',
  formTitle: 'Join the Sunday run',
  versionId: 'preview-form_v2',
  version: 2,
  status: HostFormResponseStatus.submitted,
  identityKind: HostFormResponseIdentityKind.phoneVerified,
  identity: const HostFormResponseIdentity(
    displayName: 'Tara Menon',
    email: null,
    phoneE164: null,
    origin: HostFormDataOrigin.respondentGranted,
  ),
  sourceLinkId: null,
  submittedAt: DateTime.utc(2026, 11, 20, 9),
  withdrawnAt: null,
);

class _PreviewQuery implements HostResponseQueryGateway {
  @override
  Future<HostResponseQueryPage> query(HostResponseQueryRequest request) async =>
      HostResponseQueryPage(
        form: const HostResponseQueryForm(
          formId: 'preview-form',
          title: 'Join the Sunday run',
          versionId: 'preview-form_v2',
          version: 2,
        ),
        items: [_row],
        nextCursor: null,
        total: 1,
        selectedIds: const {'preview-response'},
        queryHash: 'preview-query',
        resultHash: 'preview-result',
        fieldCatalog: _fields,
      );
}

class _PreviewExports implements HostResponseExportGateway {
  @override
  Future<HostResponseExportCommand?> pending({
    required String accountId,
    required String organizerId,
    required String formId,
  }) async => null;

  @override
  Future<HostFormExportReceipt> execute(HostResponseExportCommand command) =>
      Completer<HostFormExportReceipt>().future;
}

@widgetbook.UseCase(
  name: 'Filter by answers',
  type: HostResponsesQueryWorkspace,
  path: _path,
)
Widget hostResponsesQueryWorkspacePreview(BuildContext context) =>
    ProviderScope(
      overrides: [
        hostResponseQueryGatewayProvider.overrideWithValue(_PreviewQuery()),
        hostResponseExportGatewayProvider.overrideWithValue(_PreviewExports()),
      ],
      child: WidgetbookHostDeviceFrame(
        child: CatchRoot(
          child: CatchScreen(
            body: HostResponsesQueryWorkspace(
              organizerId: 'preview-organizer',
              formId: 'preview-form',
              versionId: 'preview-form_v2',
              accountId: 'preview-host',
              onExit: () {},
              onOpenResponse: (_) {},
              onOffer: (_) {},
            ),
          ),
        ),
      ),
    );

@widgetbook.UseCase(
  name: 'Filter by answers results',
  type: HostResponsesQueryBody,
  path: _path,
)
Widget hostResponsesQueryBodyPreview(BuildContext context) =>
    WidgetbookHostDeviceFrame(
      child: CatchRoot(
        child: CatchScreen(
          body: HostResponsesQueryBody(
            view: HostResponseQueryView(
              status: HostResponseQueryStatus.ready,
              request: null,
              rows: [_row],
              catalog: _fields,
              total: 1,
              availableIds: const {'preview-response'},
              selectedIds: const {'preview-response'},
            ),
            version: 2,
            sortLabel: 'Newest first',
            filterCount: 1,
            now: DateTime.utc(2026, 11, 22),
            onExit: () {},
            onSort: () {},
            onFilter: () {},
            onClearFilter: () {},
            onRefresh: () {},
            onOpen: (_) {},
            onToggle: (_) {},
            onClearSelection: () {},
            onLoadMore: () {},
            onOffer: () {},
            onExport: (_) {},
          ),
        ),
      ),
    );

@widgetbook.UseCase(
  name: 'Answer filter editor',
  type: HostResponsesQueryEditor,
  path: _path,
)
Widget hostResponsesQueryEditorPreview(BuildContext context) => _frame(
  HostResponsesQueryEditor(
    fields: _fields,
    initial: const HostResponseGroup(
      match: HostResponseMatch.all,
      children: [
        HostResponseCondition(
          questionId: 'pace',
          operator: HostResponseOperator.choiceAny,
          values: ['easy'],
        ),
      ],
    ),
    onApply: (_) {},
  ),
);

@widgetbook.UseCase(
  name: 'Answer filter group',
  type: HostResponsesQueryGroupSection,
  path: _path,
)
Widget hostResponsesQueryGroupPreview(BuildContext context) => _frame(
  HostResponsesQueryGroupSection(
    group: const HostResponseGroup(
      match: HostResponseMatch.any,
      children: [
        HostResponseCondition(
          questionId: 'pace',
          operator: HostResponseOperator.present,
        ),
      ],
    ),
    path: const [],
    fields: _fields,
    conditionCount: 1,
    onChanged: (_, _) {},
    onReplace: (_, _) {},
  ),
);

@widgetbook.UseCase(
  name: 'Answer filter condition',
  type: HostResponsesQueryConditionCard,
  path: _path,
)
Widget hostResponsesQueryConditionPreview(BuildContext context) => _frame(
  HostResponsesQueryConditionCard(
    path: const [0],
    condition: const HostResponseCondition(
      questionId: 'distance',
      operator: HostResponseOperator.numberBetween,
      minimum: 3,
      maximum: 10,
    ),
    fields: _fields,
    onReplace: (_, _) {},
  ),
);

@widgetbook.UseCase(
  name: 'Version and answer filters',
  type: HostResponsesFilterSheet,
  path: _path,
)
Widget hostResponsesFilterSheetPreview(BuildContext context) =>
    WidgetbookHostDeviceFrame(
      child: CatchRoot(
        child: CatchScreen(
          body: CatchPageBody.screen(
            child: HostResponsesFilterSheet(
              version: const HostResponsesVersion(published: 4, selected: 4),
              options: const [
                HostFormResponseFilterOption(
                  questionId: 'pace',
                  label: 'Your easy pace',
                  options: {'easy': 'Easy', 'steady': 'Steady'},
                ),
              ],
              answers: const {
                'pace': {'easy'},
              },
              onVersion: (_) {},
              onAnswers: (_, _) {},
              onReset: () {},
            ),
          ),
        ),
      ),
    );
