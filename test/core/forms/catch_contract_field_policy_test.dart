import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final copy = CatchFormValidationCopy(
    requiredMessage: (label) => 'Obligatoire : $label',
    minLengthMessage: (label, count) => '$count caractères minimum : $label',
    maxLengthMessage: (label, count) => '$count caractères maximum : $label',
    patternMessage: (label) => 'Format incorrect : $label',
  );
  const contract = CatchContractFieldConstraints(
    path: 'test.name',
    required: true,
    minLength: 3,
    maxLength: 5,
    pattern: r'^[a-z]+$',
  );

  test(
    'validation uses caller messages with unchanged constraint precedence',
    () {
      for (final entry in <String, String?>{
        '   ': 'Obligatoire : Nom',
        'A': '3 caractères minimum : Nom',
        'ABCDEF': '5 caractères maximum : Nom',
        'ABC': 'Format incorrect : Nom',
        'abc': null,
        'abcde': null,
      }.entries) {
        expect(
          CatchContractFieldPolicy.validateText(
            copy: copy,
            label: 'Nom',
            value: entry.key,
            contract: contract,
          ),
          entry.value,
          reason: 'value ${entry.key}',
        );
      }
    },
  );

  test('explicit product validation remains authoritative', () {
    expect(
      CatchContractFieldPolicy.validateText(
        copy: copy,
        label: 'Nom',
        value: '',
        contract: contract,
        explicitValidator: (_) => 'Ce nom est réservé',
      ),
      'Ce nom est réservé',
    );
    expect(
      CatchContractFieldPolicy.validateText(
        copy: copy,
        label: 'Nom',
        value: '',
        contract: contract,
        explicitValidator: (_) => null,
      ),
      'Obligatoire : Nom',
    );
  });

  test('optional empty text skips length and pattern messages', () {
    expect(
      CatchContractFieldPolicy.validateText(
        copy: copy,
        label: 'Nom',
        value: '',
        contract: const CatchContractFieldConstraints(
          path: 'test.optionalName',
          minLength: 3,
          pattern: r'^[a-z]+$',
        ),
      ),
      isNull,
    );
  });

  test('unconstrained values still run explicit validation', () {
    expect(
      CatchContractFieldPolicy.validateText(
        copy: copy,
        label: 'Nom',
        value: 'ABCDEF',
      ),
      isNull,
    );
    expect(
      CatchContractFieldPolicy.validateText(
        copy: copy,
        label: 'Nom',
        value: 'ABCDEF',
        explicitValidator: (_) => 'Ce nom est réservé',
      ),
      'Ce nom est réservé',
    );
  });

  test('app adapter retains the existing localized validation messages', () {
    final l10n = AppLocalizationsEn();
    final appCopy = catchFormValidationCopy(l10n);
    for (final entry in <String, String?>{
      '': l10n.coreCatchFormValidationRequired(field: 'Name'),
      'a': l10n.coreCatchFormValidationMinLength(field: 'Name', minLength: 3),
      'abcdef': l10n.coreCatchFormValidationMaxLength(
        field: 'Name',
        maxLength: 5,
      ),
      'ABC': l10n.coreCatchFormValidationPattern(field: 'Name'),
      'abc': null,
    }.entries) {
      expect(
        CatchContractFieldPolicy.validateText(
          copy: appCopy,
          label: 'Name',
          value: entry.key,
          contract: contract,
        ),
        entry.value,
      );
    }
  });
}
