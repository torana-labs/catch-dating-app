import 'package:catch_dating_app/core/schema_contracts/generated/callable_request_dtos.g.dart'
    show UpdateUserProfilePatch;
import 'package:catch_dating_app/user_profile/presentation/widgets/profile_inline_editors.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../preview_layout_contracts.dart';
import 'preview.dart';

@widgetbook.UseCase(
  name: 'Inline height editor states',
  type: ProfileInlineHeightEditor,
  path: '[P1 product surfaces]/Profiles/Inline Editors',
)
Widget profileInlineHeightEditorStates(BuildContext context) {
  return WidgetbookProfileProfileCatalog(
    title: 'ProfileInlineHeightEditor',
    contractId: 'screen.profile.inline.height',
    children: [
      WidgetbookProfileStateCard(
        label: 'expanded stepper',
        child: WidgetbookProfileSectionFrame(
          height: WidgetbookPreviewLayout.profileInlinePreviewHeight,
          child: ProfileInlineHeightEditor(
            icon: CatchIcons.height,
            label: 'Height',
            value: '172 cm',
            currentValue: 172,
            isExpanded: true,
            onTap: () {},
            onSaved: () {},
            onCancel: () {},
            patchForValue: (value) => UpdateUserProfilePatch(height: value),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Canonical height stepper states',
  type: CatchStepper,
  path: '[P1 product surfaces]/Profiles/Inline Editors',
)
Widget profileHeightStepperControlsStates(BuildContext context) {
  return WidgetbookProfileProfileCatalog(
    title: 'CatchStepper',
    contractId: 'catch.number_stepper',
    children: [
      WidgetbookProfileStateCard(
        label: 'enabled',
        child: WidgetbookProfileSectionFrame(
          height: WidgetbookPreviewLayout.profileCompactPreviewHeight,
          child: Center(
            child: CatchStepper(
              value: 172,
              min: 120,
              max: 220,
              unit: 'cm',
              enabled: true,
              decreaseSemanticLabel: 'Decrease height',
              increaseSemanticLabel: 'Increase height',
              onChanged: (_) {},
            ),
          ),
        ),
      ),
      WidgetbookProfileStateCard(
        label: 'disabled',
        child: WidgetbookProfileSectionFrame(
          height: WidgetbookPreviewLayout.profileCompactPreviewHeight,
          child: Center(
            child: CatchStepper(
              value: 172,
              min: 120,
              max: 220,
              unit: 'cm',
              enabled: false,
              decreaseSemanticLabel: 'Decrease height',
              increaseSemanticLabel: 'Increase height',
              onChanged: (_) {},
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Canonical height stepper bounds',
  type: CatchStepper,
  path: '[P1 product surfaces]/Profiles/Inline Editors',
)
Widget profileHeightStepButtonStates(BuildContext context) {
  return WidgetbookProfileProfileCatalog(
    title: 'CatchStepper bounds',
    contractId: 'catch.number_stepper.bounds',
    children: [
      WidgetbookProfileStateCard(
        label: 'minimum and maximum endpoints',
        child: WidgetbookProfileSectionFrame(
          height: WidgetbookPreviewLayout.profileInlinePreviewHeight,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CatchStepper(
                value: 120,
                min: 120,
                max: 220,
                unit: 'cm',
                decreaseSemanticLabel: 'Decrease height',
                increaseSemanticLabel: 'Increase height',
                onChanged: (_) {},
              ),
              gapH16,
              CatchStepper(
                value: 220,
                min: 120,
                max: 220,
                unit: 'cm',
                decreaseSemanticLabel: 'Decrease height',
                increaseSemanticLabel: 'Increase height',
                onChanged: (_) {},
              ),
            ],
          ),
        ),
      ),
    ],
  );
}
