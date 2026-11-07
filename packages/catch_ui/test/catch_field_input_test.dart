import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('field input edits and validates a plain data configuration', (
    tester,
  ) async {
    final changes = <String>[];
    final controller = TextEditingController();
    final focus = FocusNode();
    final fieldKey = GlobalKey<FormFieldState<String>>();
    var hasError = false;
    addTearDown(controller.dispose);
    addTearDown(focus.dispose);

    await tester.pumpWidget(
      MaterialApp(
        theme: CatchTheme.light,
        home: Scaffold(
          body: CatchFieldInput(
            configuration: _InputData(changes.add),
            formFieldKey: fieldKey,
            controller: controller,
            focusNode: focus,
            tapRegionGroupId: EditableText,
            onValidationErrorChanged: (value) => hasError = value,
            onSubmitted: (_) {},
            mode: CatchFieldInputMode.standalone,
            states: const {},
            emptyValueText: null,
            inputHintText: null,
            addTextSpan: const TextSpan(),
            headerTrailingReserve: 0,
          ),
        ),
      ),
    );
    expect(find.byType(CatchField), findsNothing);
    await tester.enterText(find.byType(TextField), 'A');
    expect(changes, ['A']);
    expect(fieldKey.currentState!.validate(), isFalse);
    await tester.pump();
    expect(find.text('Use at least two letters.'), findsOneWidget);
    expect(hasError, isTrue);

    await tester.enterText(find.byType(TextField), 'ABCD');
    expect(controller.text, 'ABC');
    expect(changes.last, 'ABC');
    expect(fieldKey.currentState!.validate(), isTrue);
    await tester.pump();
    expect(find.text('Use at least two letters.'), findsNothing);
    expect(hasError, isFalse);
    expect(tester.takeException(), isNull);
  });
}

// Deliberately owns no Widget, State, controller or production field instance.
class _InputData implements CatchFieldInputConfiguration {
  const _InputData(this.onChanged);
  @override
  final Widget? actions = null;
  @override
  final Iterable<String>? autofillHints = null;
  @override
  final bool autofocus = false;
  @override
  final String? badgeLabel = null;
  @override
  final CatchBadgeTone? badgeTone = null;
  @override
  final CatchContractFieldConstraints? contract = null;
  @override
  final CatchFieldCopy copy = _copy;
  @override
  final String? error = null;
  @override
  final String? errorText = null;
  @override
  final String? helperText = null;
  @override
  final CatchFieldSupportRowTone helperTone = CatchFieldSupportRowTone.neutral;
  @override
  final List<TextInputFormatter>? inputFormatters = null;
  @override
  final CatchTextInputVariant inputVariant = CatchTextInputVariant.plain;
  @override
  final CatchFieldLabelTextMode labelMode = CatchFieldLabelTextMode.visible;
  @override
  final TextInputType? keyboardType = null;
  @override
  final Widget? leading = null;
  @override
  final String? leadingUnit = null;
  @override
  final int? maxLength = 3;
  @override
  final CatchFieldSupportRowMode counter =
      CatchFieldSupportRowMode.whileFocused;
  @override
  final int? maxLines = 1;
  @override
  final int? minLines = null;
  @override
  final List<FontFeature>? fontFeatures = null;
  @override
  final ValueChanged<String>? onChanged;
  @override
  final VoidCallback? onTap = null;
  @override
  final FormFieldValidator<String>? onValidate = _validate;
  @override
  final String? prefixText = null;
  @override
  final CatchTextInputMode inputMode = CatchTextInputMode.editable;
  @override
  final VoidCallback? onEditingComplete = null;
  @override
  final bool showClearButton = false;
  @override
  final CatchFieldSize size = CatchFieldSize.md;
  @override
  final Set<WidgetState> states = const <WidgetState>{};
  @override
  final String? suffixText = null;
  @override
  final TextAlign textAlign = TextAlign.start;
  @override
  final TextCapitalization textCapitalization = TextCapitalization.none;
  @override
  final TextInputAction? textInputAction = null;
  @override
  final String? title = 'Code';
  @override
  final int titleMaxLines = 1;
  @override
  final CatchFieldTone tone = CatchFieldTone.normal;
  @override
  final Widget? trailing = null;
  @override
  final CatchFieldVariant variant = CatchFieldVariant.underline;
}

String? _validate(String? value) =>
    (value?.length ?? 0) < 2 ? 'Use at least two letters.' : null;
String _label(String value) => value;
String _nullableLabel(String? value) => value ?? '';
String _length(String label, int length) => '$label $length';
const _copy = CatchFieldCopy(
  label: CatchFieldLabelTextCopy(
    optionalLabel: 'Optional',
    optionalSuffix: ' Optional',
    optionalSemantics: _label,
  ),
  validation: CatchFormValidationCopy(
    requiredMessage: _label,
    minLengthMessage: _length,
    maxLengthMessage: _length,
    patternMessage: _label,
  ),
  cancelLabel: 'Cancel',
  doneLabel: 'Done',
  savingLabel: 'Saving',
  savingSemanticLabel: 'Saving',
  savedSemanticLabel: 'Saved',
  emptyValueText: _label,
  selectPlaceholder: _nullableLabel,
  clearTooltip: _nullableLabel,
);
