import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/hosts/forms/responses_filter_sheet.dart';
import 'package:catch_dating_app/hosts/forms/responses_state.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import 'operations/preview.dart';

@widgetbook.UseCase(
  name: 'Version and answer filters',
  type: HostResponsesFilterSheet,
  path: '[P1 product surfaces]/Host operations/Forms',
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
