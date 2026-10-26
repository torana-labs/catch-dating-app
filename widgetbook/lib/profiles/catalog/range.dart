import 'package:catch_dating_app/core/schema_contracts/generated/callable_request_dtos.g.dart'
    show UpdateUserProfilePatch;
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/user_profile/domain/user_profile.dart';
import 'package:catch_dating_app/user_profile/presentation/widgets/profile_inline_editors.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../preview_layout_contracts.dart';
import 'fixtures.dart';
import 'preview.dart';

@widgetbook.UseCase(
  name: 'Inline range editor states',
  type: ProfileInlineRangeEditor,
  path: '[P1 product surfaces]/Profiles/Inline Editors',
)
Widget profileInlineRangeEditorStates(BuildContext context) {
  return WidgetbookProfileProfileCatalog(
    title: 'ProfileInlineRangeEditor',
    contractId: 'screen.profile.inline.range',
    children: [
      WidgetbookProfileStateCard(
        label: 'expanded range',
        child: WidgetbookProfileSectionFrame(
          height: WidgetbookPreviewLayout.stateViewportHeight,
          child: ProfileInlineRangeEditor(
            icon: CatchIcons.activity,
            title: 'Pace',
            minimumContract: CatchContractConstraints
                .updateUserProfilePatchActivityPreferencesRunningPaceMinSecsPerKm,
            maximumContract: CatchContractConstraints
                .updateUserProfilePatchActivityPreferencesRunningPaceMaxSecsPerKm,
            value: '5:15-6:30 min/km',
            currentMin: 315,
            currentMax: 390,
            sliderMin: 240,
            sliderMax: 540,
            divisions: 20,
            labelText: widgetbookProfilePaceLabel,
            isExpanded: true,
            onTap: () {},
            onSaved: () {},
            onCancel: () {},
            patchForRange: (min, max) => UpdateUserProfilePatch(
              activityPreferences: ActivityPreferences(
                running: RunningPreferences(
                  paceMinSecsPerKm: min,
                  paceMaxSecsPerKm: max,
                  version: currentRunPreferencesVersion,
                ),
              ),
            ),
          ),
        ),
      ),
    ],
  );
}
