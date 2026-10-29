// Corpus annotation names the internal owner; construction uses public Section.
// ignore_for_file: implementation_imports

import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:catch_ui/src/components/catch_dependent_row_section.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

@widgetbook.UseCase(
  name: 'Dependent configuration',
  type: CatchDependentRowSection,
  path: '[Core catalog]/Grouping',
)
Widget catchDependentConfigurationUseCase(BuildContext context) =>
    const _DependentConfiguration();

class _DependentConfiguration extends StatefulWidget {
  const _DependentConfiguration();

  @override
  State<_DependentConfiguration> createState() =>
      _DependentConfigurationState();
}

class _DependentConfigurationState extends State<_DependentConfiguration> {
  bool _pairs = true;
  final _capacity = TextEditingController(text: '4');

  @override
  void dispose() {
    _capacity.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final dependencies = CatchFormDependencies([
      const CatchFormDependency(id: 'pairs'),
      CatchFormDependency(id: 'capacity', parent: 'pairs', when: _pairs),
    ]);
    return Scaffold(
      body: SingleChildScrollView(
        child: CatchSectionList.inset(
          emptyStateOmitted: true,
          children: [
            CatchSection.dependentFieldRows(
              leading: CatchField.toggle(
                copy: catchFieldCopy(context.l10n),
                title: 'Reserve places for pairs',
                emphasis: CatchFieldEmphasis.title,
                titleMaxLines: 4,
                body:
                    'Keep part of the capacity available for people booking together.',
                bodyMaxLines: 8,
                value: _pairs,
                contractExemption:
                    'Catalog-only local decision; no persistence.',
                onChanged: (value) => setState(() => _pairs = value),
              ),
              children: [
                if (dependencies.isApplicable('capacity'))
                  CatchField.input(
                    copy: catchFieldCopy(context.l10n),
                    title: 'Reserved places',
                    helperText:
                        'Out of 20 total places. Each pair uses two places.',
                    controller: _capacity,
                    contractExemption:
                        'Catalog-only local amount; no persistence.',
                    keyboardType: TextInputType.number,
                  ),
              ],
            ),
            CatchSection.dependentFieldRows(
              states: const {WidgetState.error},
              leading: CatchField.read(
                content: CatchRecordLayout(
                  title: 'Require an invitation',
                  icon: CatchIcons.locked,
                  facts: const ['Only guests with the code can apply.'],
                ),
              ),
              children: [
                CatchField.input(
                  copy: catchFieldCopy(context.l10n),
                  title: 'Invitation code',
                  initialValue: 'WEEKEND',
                  contractExemption: 'Catalog invitation example.',
                  errorText: 'Choose a code that is not already in use.',
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
