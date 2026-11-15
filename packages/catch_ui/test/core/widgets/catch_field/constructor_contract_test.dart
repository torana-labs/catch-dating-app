import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

String label(String text) => text;
String nullableLabel(String? text) => text ?? '';
String lengthLabel(String text, int length) => '$text $length';
void tap() {}
void toggle(bool value) {}
const copy = CatchFieldCopy(
  label: CatchFieldLabelTextCopy(
    optionalLabel: 'Optional',
    optionalSuffix: ' Optional',
    optionalSemantics: label,
  ),
  validation: CatchFormValidationCopy(
    requiredMessage: label,
    minLengthMessage: lengthLabel,
    maxLengthMessage: lengthLabel,
    patternMessage: label,
  ),
  cancelLabel: 'Cancel',
  doneLabel: 'Done',
  savingLabel: 'Saving',
  savingSemanticLabel: 'Saving',
  savedSemanticLabel: 'Saved',
  emptyValueText: label,
  selectPlaceholder: nullableLabel,
  clearTooltip: nullableLabel,
);
const constraint = CatchContractFieldConstraints(
  path: 'test.value',
  maxLength: 12,
);
const key = ValueKey('identity');
const slot = SizedBox(width: 44);
void main() {
  test('row constructors reject hidden label modes', () {
    for (final mode in [
      CatchFieldLabelTextMode.hidden,
      CatchFieldLabelTextMode.hiddenOptional,
    ]) {
      expect(
        () => CatchField.content(
          copy: copy,
          title: 'Title',
          body: 'Body',
          labelMode: mode,
        ),
        throwsAssertionError,
      );
      expect(
        () => CatchField.control(
          copy: copy,
          title: 'Title',
          labelMode: mode,
          child: slot,
        ),
        throwsAssertionError,
      );
    }
  });

  test('const input uses contract bounds when the caller omits them', () {
    const field = CatchField.input(
      copy: copy,
      key: key,
      title: 'Input',
      contract: constraint,
      initialValue: 'Draft',
    );
    expect(field.initialValue, 'Draft');
    expect(field.maxLength, 12);
    expect(field.inputFormatters, isNull);
    expect(field.maxLines, 1);
    expect(field.enabled, isTrue);
    expect(field.floatingLabel, isTrue);
    expect(field.fieldDividerLeadingInset, 0);
    expect(field.key, key);
  });

  test(
    'input configuration retains the caller formatter without wrapping it',
    () {
      final formatter = FilteringTextInputFormatter.digitsOnly;
      final formatters = [formatter];
      final field = CatchField.input(
        copy: copy,
        title: 'Input',
        contract: constraint,
        maxLength: 8,
        inputFormatters: formatters,
      );
      expect(field.maxLength, 8);
      expect(field.inputFormatters, same(formatters));
      expect(field.inputFormatters!.single, same(formatter));
    },
  );

  test(
    'const sortable configuration retains its leading lane and callback',
    () {
      const field = CatchField.sortable(
        copy: copy,
        title: 'Sortable',
        metadata: 'Metadata',
        leading: slot,
        onTap: tap,
      );
      expect(field.leading, same(slot));
      expect(field.onTap, same(tap));
      expect(field.inlineMetadata, 'Metadata');
      expect(field.fieldDividerLeadingInset, greaterThan(0));
      expect(field.showChevron, isTrue);
    },
  );
}
