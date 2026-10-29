import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/programs/presentation/program_timezone_field.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../utility/preview.dart';

@widgetbook.UseCase(
  name: 'Searchable timezone selection',
  type: ProgramTimezoneField,
  path: '[P1 product surfaces]/Program workspace',
)
Widget programTimezoneSelection(BuildContext context) {
  var selected = 'Asia/Kolkata';
  var query = '';
  var open = false;
  return WidgetbookUtilityDeviceFrame(
    child: CatchScaffold.stepFlow(
      body: StatefulBuilder(
        builder: (context, setState) {
          final l10n = context.l10n;
          return ListView(
            children: [
              CatchSection.fieldRows(
                first: true,
                children: [
                  ProgramTimezoneField(
                    fieldCopy: catchFieldCopy(l10n),
                    searchCopy: catchSearchFieldCopy(l10n),
                    title: l10n.programsCreateTimezoneLabel,
                    placeholder: l10n.programsCreateTimezoneHint,
                    searchPlaceholder: l10n.programsTimezoneSearchHint,
                    emptyMessage: l10n.programsTimezoneNoMatches,
                    indiaLabel: l10n.programsTimezoneIndia,
                    helperText: l10n.programsTimezoneFromOrganizer,
                    selected: selected,
                    query: query,
                    date: DateTime(2026, 10, 16),
                    open: open,
                    enabled: true,
                    onOpenChanged: (value) => setState(() {
                      open = value;
                      query = '';
                    }),
                    onQueryChanged: (value) => setState(() => query = value),
                    onSelected: (value) => setState(() {
                      selected = value;
                      open = false;
                    }),
                  ),
                ],
              ),
            ],
          );
        },
      ),
    ),
  );
}
