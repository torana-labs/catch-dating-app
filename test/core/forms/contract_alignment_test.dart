import 'package:catch_dating_app/contexts/organizers/domain/update_organizer_patch.dart';
import 'package:catch_dating_app/contexts/profiles/domain/photo_upload_state.dart';
import 'package:catch_dating_app/hosts/presentation/host_operations_screen.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:catch_dating_app/platform/app_config.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_dating_app/user_profile/presentation/self_profile_edit_tab_state.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../organizers/organizers_test_helpers.dart';

void main() {
  final l10n = AppLocalizationsEn();

  setUp(() => AppConfig.configureEntrypointRole(AppRole.host));
  tearDown(AppConfig.resetEntrypointRoleOverrideForTesting);

  test('consumer profile descriptors stay aligned with patch contracts', () {
    final state = SelfProfileEditTabState.fromProfile(
      l10n: l10n,
      user: buildUser(uid: 'profile-contract-user'),
      today: DateTime(2026, 7, 18),
      uploadState: const PhotoUploadState(),
    );

    expect(
      _alignmentIssues(state.aboutSectionRows, const {
        'displayName': 'updateUserProfilePatch.displayName',
        'email': 'updateUserProfilePatch.email',
        'instagramHandle': 'updateUserProfilePatch.instagramHandle',
        'height': 'updateUserProfilePatch.height',
        'city': 'updateUserProfilePatch.city',
        'occupation': 'updateUserProfilePatch.occupation',
        'company': 'updateUserProfilePatch.company',
        'education': 'updateUserProfilePatch.education',
        'religion': 'updateUserProfilePatch.religion',
        'relationshipGoal': 'updateUserProfilePatch.relationshipGoal',
      }),
      isEmpty,
    );
  });

  testWidgets('host club descriptors stay aligned with patch contracts', (
    tester,
  ) async {
    final organizer = buildOrganizer(
      id: 'club-contract',
      ownerUserId: 'host-contract-user',
      instagramHandle: 'catch.club',
      phoneNumber: '+91 98765 43210',
      email: 'hello@catch.club',
    );
    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: SingleChildScrollView(
              child: HostOrganizerEditBody(
                organizer: organizer,
                currentUid: 'host-contract-user',
                isOwner: true,
              ),
            ),
          ),
        ),
      ),
    );
    await tester.pump();

    final rows = tester
        .widgetList<CatchFormList<UpdateOrganizerPatch>>(
          find.byWidgetPredicate(
            (widget) => widget is CatchFormList<UpdateOrganizerPatch>,
          ),
        )
        .expand((list) => list.rows)
        .toList(growable: false);
    expect(
      _alignmentIssues(rows, const {
        'organizerType': 'updateOrganizerCallablePayload.fields.organizerType',
        'name': 'updateOrganizerCallablePayload.fields.name',
        'location': 'updateOrganizerCallablePayload.fields.location',
        'area': 'updateOrganizerCallablePayload.fields.area',
        'description': 'updateOrganizerCallablePayload.fields.description',
        'instagramHandle':
            'updateOrganizerCallablePayload.fields.instagramHandle',
        'phoneNumber': 'updateOrganizerCallablePayload.fields.phoneNumber',
        'email': 'updateOrganizerCallablePayload.fields.email',
      }),
      isEmpty,
    );
  });

  test('seeded overlong UI limit proves the alignment gate is non-vacuous', () {
    final seededDrift = CatchFormTextRow<Object?>(
      validationCopy: catchFormValidationCopy(l10n),
      id: 'displayName',
      icon: Icons.person,
      label: 'Display name',
      currentValue: 'Catch',
      patchForValue: (value) => value,
      contract: CatchContractConstraints.updateUserProfilePatchDisplayName,
      maxLength:
          CatchContractConstraints
              .updateUserProfilePatchDisplayName
              .maxLength! +
          1,
    );

    expect(
      _alignmentIssues(
        [seededDrift],
        const {'displayName': 'updateUserProfilePatch.displayName'},
      ),
      contains(contains('exceeds contract maxLength')),
    );
  });

  test('choice alignment includes values without an app label interface', () {
    final rows = <CatchFormRowDescriptor<Object?>>[
      CatchFormSingleChoiceRow<Object?, int>(
        id: 'single',
        icon: Icons.person,
        label: 'Single',
        values: const [1],
        value: 1,
        itemLabel: (value) => '$value',
        contract: const CatchContractFieldConstraints(path: 'test.single'),
        patchForValue: (value) => value,
      ),
      CatchFormMultiChoiceRow<Object?, int>(
        id: 'multiple',
        icon: Icons.people,
        label: 'Multiple',
        values: const [1],
        selected: const [1],
        itemLabel: (value) => '$value',
        contract: const CatchContractFieldConstraints(path: 'test.multiple'),
        patchForValues: (values) => values,
      ),
    ];
    expect(
      _alignmentIssues(rows, const {
        'single': 'test.single',
        'multiple': 'test.multiple',
      }),
      isEmpty,
    );
    expect(
      _alignmentIssues(rows, const {'single': 'wrong.path'}),
      contains('single: expected wrong.path, found test.single'),
    );
  });
}

List<String> _alignmentIssues<P>(
  Iterable<CatchFormRowDescriptor<P>> rows,
  Map<String, String> expectedContracts,
) {
  final issues = <String>[];
  final rowsById = {for (final row in rows) row.id: row};
  for (final entry in expectedContracts.entries) {
    final row = rowsById[entry.key];
    if (row == null) {
      issues.add('${entry.key}: descriptor missing');
      continue;
    }
    final contract = _contractFor(row);
    if (contract == null) {
      issues.add('${entry.key}: contract missing');
      continue;
    }
    if (contract.path != entry.value) {
      issues.add(
        '${entry.key}: expected ${entry.value}, found ${contract.path}',
      );
    }
    if (row case CatchFormTextRow<P>(
      maxLength: final explicitMax?,
    ) when contract.maxLength != null && explicitMax > contract.maxLength!) {
      issues.add(
        '${entry.key}: explicit maxLength $explicitMax exceeds contract '
        'maxLength ${contract.maxLength}',
      );
    }
  }
  return issues;
}

CatchContractFieldConstraints? _contractFor<P>(CatchFormRowDescriptor<P> row) {
  if (row is CatchFormTextRow<P>) return row.contract;
  if (row is CatchFormSingleChoiceRow<P, Object?>) return row.contract;
  if (row is CatchFormMultiChoiceRow<P, Object?>) return row.contract;
  if (row is CatchFormRangeRow<P>) return row.contract;
  if (row is CatchFormCustomRow<P>) return row.contract;
  return null;
}
