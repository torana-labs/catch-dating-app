import 'package:catch_dating_app/core/labelled.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../preview_layout_contracts.dart';
import 'preview.dart';

@widgetbook.UseCase(
  name: 'Typed descriptor prototype',
  type: CatchFormList,
  path: '[P1 product surfaces]/Profiles/Inline Editors',
)
Widget catchFormRowListStates(BuildContext context) {
  return _catchFormDescriptorPreview(context);
}

@widgetbook.UseCase(
  name: 'Typed descriptor prototype',
  type: CatchFormTextField,
  path: '[P1 product surfaces]/Profiles/Inline Editors',
)
Widget catchFormTextFieldStates(BuildContext context) {
  return _catchFormDescriptorPreview(context);
}

@widgetbook.UseCase(
  name: 'Typed descriptor prototype',
  type: CatchFormChoiceField,
  path: '[P1 product surfaces]/Profiles/Inline Editors',
)
Widget catchFormChoiceFieldStates(BuildContext context) {
  return _catchFormDescriptorPreview(context);
}

@widgetbook.UseCase(
  name: 'Typed descriptor prototype',
  type: CatchFormRangeField,
  path: '[P1 product surfaces]/Profiles/Inline Editors',
)
Widget catchFormRangeFieldStates(BuildContext context) {
  return _catchFormDescriptorPreview(context);
}

Widget _catchFormDescriptorPreview(BuildContext context) {
  return WidgetbookProfileProfileCatalog(
    title: 'CatchFormList',
    contractId: 'catch.form.descriptors.prototype',
    children: [
      WidgetbookProfileStateCard(
        label:
            'read, explicit-confirm text, choice, multi-choice, and range rows',
        child: SizedBox(
          width: WidgetbookPreviewLayout.phoneChromeWidth,
          height: WidgetbookPreviewLayout.profileSheetPreviewHeight,
          child: CatchFormList<_WidgetbookFormPatch>(
            fieldCopy: catchFieldCopy(context.l10n),
            title: 'About you',
            rows: [
              CatchFormReadRow<_WidgetbookFormPatch>(
                id: 'identity',
                icon: CatchIcons.person,
                label: 'Identity',
                body: 'Verified',
              ),
              CatchFormTextRow<_WidgetbookFormPatch>(
                validationCopy: catchFormValidationCopy(context.l10n),
                id: 'name',
                icon: CatchIcons.person,
                label: 'Name',
                currentValue: 'Aarav',
                patchForValue: (value) => _WidgetbookFormPatch('name', value),
              ),
              CatchFormSingleChoiceRow<
                _WidgetbookFormPatch,
                _WidgetbookFormOption
              >(
                itemLabel: (value) => value.label,
                id: 'city',
                icon: CatchIcons.location,
                label: 'City',
                values: _WidgetbookFormOption.values,
                value: _WidgetbookFormOption.mumbai,
                patchForValue: (value) => _WidgetbookFormPatch('city', value),
              ),
              CatchFormMultiChoiceRow<
                _WidgetbookFormPatch,
                _WidgetbookFormOption
              >(
                itemLabel: (value) => value.label,
                id: 'communities',
                icon: CatchIcons.people,
                label: 'Communities',
                values: _WidgetbookFormOption.values,
                selected: const [_WidgetbookFormOption.mumbai],
                patchForValues: (values) =>
                    _WidgetbookFormPatch('communities', values),
              ),
              CatchFormRangeRow<_WidgetbookFormPatch>(
                id: 'pace',
                icon: CatchIcons.activity,
                label: 'Pace',
                value: '5:00 - 6:00 min/km',
                currentMin: 300,
                currentMax: 360,
                sliderMin: 240,
                sliderMax: 540,
                divisions: 20,
                labelText: (value) => '${value.round()} sec/km',
                patchForRange: (min, max) =>
                    _WidgetbookFormPatch('pace', (min, max)),
              ),
            ],
            onSave: (_) async => true,
            errorTextBuilder: (_, error) => error.toString(),
          ),
        ),
      ),
    ],
  );
}

final class _WidgetbookFormPatch {
  const _WidgetbookFormPatch(this.field, this.value);

  final String field;
  final Object? value;
}

enum _WidgetbookFormOption implements Labelled {
  mumbai('Mumbai'),
  delhi('Delhi'),
  bengaluru('Bengaluru');

  const _WidgetbookFormOption(this.label);

  @override
  final String label;
}
