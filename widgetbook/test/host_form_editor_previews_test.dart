import 'package:catch_dating_app/hosts/presentation/forms/host_form_availability_field.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_editor_notice.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_editor_viewport.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_number_field.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_question_section.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_questions_page_body.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_settings_section_list.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_validation_field_lanes.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_validation_text_field.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:widgetbook_workspace/hosts/host_form_editor_use_cases.dart';

import '../../test/test_pump_helpers.dart';

void main() {
  for (final scale in [1.0, 2.0]) {
    for (final (name, builder, type, count)
        in <(String, WidgetBuilder, Type, int)>[
          (
            'settings pane',
            hostFormSettingsSectionListPreview,
            HostFormSettingsSectionList,
            1,
          ),
          (
            'availability fields',
            hostFormAvailabilityFieldPreview,
            HostFormAvailabilityField,
            2,
          ),
          (
            'question editing',
            hostFormQuestionSectionPreview,
            HostFormQuestionSection,
            2,
          ),
          (
            'text rules',
            hostFormTextValidationPreview,
            HostFormValidationFieldLanes,
            1,
          ),
          (
            'number rules',
            hostFormNumberValidationPreview,
            HostFormValidationFieldLanes,
            1,
          ),
          (
            'date rules',
            hostFormDateValidationPreview,
            HostFormValidationFieldLanes,
            1,
          ),
          (
            'choice rules',
            hostFormChoicesValidationPreview,
            HostFormValidationFieldLanes,
            1,
          ),
          (
            'file rules',
            hostFormFileValidationPreview,
            HostFormValidationFieldLanes,
            1,
          ),
          ('number fields', hostFormNumberFieldPreview, HostFormNumberField, 2),
          (
            'validation text fields',
            hostFormValidationTextFieldPreview,
            HostFormValidationTextField,
            2,
          ),
          (
            'Phone questions workspace',
            hostFormQuestionsPageBodyPreview,
            HostFormQuestionsPageBody,
            1,
          ),
          (
            'Sections with editable question rows',
            hostFormQuestionSectionListPreview,
            HostFormQuestionSectionList,
            1,
          ),
          (
            'Form section with an expanded question',
            hostFormSectionAccordionPreview,
            HostFormSectionAccordion,
            1,
          ),
          (
            'Reorderable question rows',
            hostFormQuestionRowListPreview,
            HostFormQuestionRowList,
            1,
          ),
          (
            'Settings and respondent preview links',
            hostFormSettingsMenuPreview,
            HostFormSettingsMenu,
            1,
          ),
          (
            'Question count and publication prompt',
            hostFormPublishTextPreview,
            HostFormPublishText,
            1,
          ),
          (
            'Desktop section and question selection',
            hostFormOutlineMenuPreview,
            HostFormOutlineMenu,
            1,
          ),
          (
            'Section title and question actions',
            hostFormSectionFieldPreview,
            HostFormSectionField,
            1,
          ),
          (
            'inspector selection',
            hostFormInspectorSectionPreview,
            HostFormInspectorSection,
            3,
          ),
          (
            'desktop viewport',
            hostFormEditorViewportPreview,
            HostFormEditorViewport,
            1,
          ),
          (
            'editor notices',
            hostFormEditorNoticePreview,
            HostFormEditorNotice,
            3,
          ),
        ]) {
      testWidgets('$name previews fit at text scale $scale', (tester) async {
        tester.view.devicePixelRatio = 1;
        tester.view.physicalSize = const Size(520, 2000);
        addTearDown(tester.view.resetDevicePixelRatio);
        addTearDown(tester.view.resetPhysicalSize);
        for (final theme in [AppTheme.light, AppTheme.dark]) {
          await tester.pumpWidget(
            MaterialApp(
              theme: theme,
              localizationsDelegates: const [
                AppLocalizations.delegate,
                GlobalMaterialLocalizations.delegate,
                GlobalWidgetsLocalizations.delegate,
                GlobalCupertinoLocalizations.delegate,
              ],
              supportedLocales: AppLocalizations.supportedLocales,
              home: Builder(
                builder: (context) => MediaQuery(
                  data: MediaQuery.of(context).copyWith(
                    textScaler: TextScaler.linear(scale),
                    disableAnimations: true,
                  ),
                  child: Builder(builder: builder),
                ),
              ),
            ),
          );
          await pumpUntilFound(tester, find.byType(type));
          await pumpFeatureUi(tester);
          expect(tester.takeException(), isNull);
          expect(find.byType(type), findsNWidgets(count));
          await tester.pumpWidget(const SizedBox.shrink());
          await tester.pump();
        }
      });
    }
  }
}
