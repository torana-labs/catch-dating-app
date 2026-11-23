import 'package:catch_dating_app/contexts/audience/domain/guest_list_import_preview.dart';
import 'package:catch_dating_app/contexts/audience/domain/host_roster_import.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_guest_list_columns_sheet.dart';
import 'package:catch_platform/theme/app_theme.dart';
import 'package:catch_test_support/test_pump_helpers.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

// Every name below is fictional.

Map<String, Object?> _response({
  required bool needsMapping,
  int? nameColumn,
  int add = 0,
}) => {
  'commandId': 'guests.import-list',
  'status': needsMapping ? 'needs_input' : 'previewed',
  'summary': {
    'headline': needsMapping
        ? "We couldn't read this file's columns."
        : 'This adds $add guests and updates 0 guests.',
    'lines': ['Read as a guest list (columns matched by name).'],
  },
  'result': {
    'headers': ['Attendee', 'Contact'],
    'columnShapes': ['text', 'phone-like'],
    'mapping': {'displayName': nameColumn, 'phone': 1},
    'needsMapping': needsMapping,
    'sessionId': needsMapping ? null : 'hri_${'a' * 48}',
    'counts': {
      'add': add,
      'update': 0,
      'unchanged': 0,
      'excluded': 0,
      'needsReview': 0,
      'identityConflict': 0,
      'skipped': 0,
    },
    'rows': [
      if (!needsMapping)
        {'rowId': 'row-1', 'displayName': 'Asha Sample', 'kind': 'add'},
    ],
    'truncatedCount': 0,
  },
};

void main() {
  testWidgets(
    'unknown columns block review until the host picks the name column',
    (tester) async {
      final asked = <Map<HostRosterField, int?>>[];
      GuestListImportPreview? chosen;
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: Builder(
            builder: (context) => Scaffold(
              body: Center(
                child: ElevatedButton(
                  onPressed: () async {
                    chosen = await showHostGuestListColumns(
                      context,
                      initial: GuestListImportPreview.fromCallableData(
                        _response(needsMapping: true),
                      ),
                      repreview: (mapping, fallbackRevenue) async {
                        asked.add(mapping);
                        return GuestListImportPreview.fromCallableData(
                          _response(needsMapping: false, nameColumn: 0, add: 1),
                        );
                      },
                    );
                  },
                  child: const Text('open'),
                ),
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.text('open'));
      await pumpFeatureUi(tester);

      expect(
        find.text('Choose the column that holds each guest’s name.'),
        findsOneWidget,
      );
      expect(find.text('Looks like phone numbers'), findsOneWidget);
      CatchButton review() => tester.widget<CatchButton>(
        find.widgetWithText(CatchButton, 'Review guests'),
      );
      expect(review().onPressed, isNull);

      // The host picks the name column; the server reads the file again.
      await tester.tap(find.text('Guest name'));
      await pumpFeatureUi(tester);
      await tester.tap(find.text('Attendee'));
      await pumpFeatureUiFor(tester, CatchMotion.searchDebounce);
      await pumpFeatureUi(tester);

      expect(asked.single[HostRosterField.displayName], 0);
      expect(find.text('Asha Sample'), findsOneWidget);
      expect(review().onPressed, isNotNull);

      review().onPressed!();
      await pumpFeatureUi(tester);
      expect(chosen?.sessionId, 'hri_${'a' * 48}');
    },
  );
}
