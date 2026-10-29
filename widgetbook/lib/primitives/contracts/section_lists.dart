import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/contract_preview.dart';
import 'package:widgetbook_workspace/support/widgetbook_harness.dart';

import '../../preview_layout_contracts.dart';
import '../section_layout_use_cases.dart' show WidgetbookScrolledSectionPage;

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchRecordLayout,
  path: '[Core primitives]/Content',
)
Widget catchRecordRowContractStates(
  BuildContext context,
) => WidgetbookContractFrame(
  title: 'CatchRecordLayout in Field',
  contractId: 'catch.field',
  states: const ['read-only', 'navigable', 'multiline', 'facts'],
  children: [
    WidgetbookContractStateCard(
      label: 'facts',
      child: CatchField.navigate(
        onActivate: widgetbookNoop,
        content: CatchRecordLayout(
          title: 'Friday Evening Trivia Night at The Daily Bar',
          icon: CatchIcons.eventConfirmed,
          facts: const ['8:00 PM · The Daily Bar', '24 of 30 registered'],
        ),
      ),
    ),
    WidgetbookContractStateCard(
      label: 'read-only',
      child: CatchField.read(
        content: CatchRecordLayout(
          title: 'WhatsApp permission',
          description: 'No participant permission is recorded.',
          icon: CatchIcons.verified,
        ),
      ),
    ),
    WidgetbookContractStateCard(
      label: 'navigable',
      child: CatchField.navigate(
        onActivate: widgetbookNoop,
        content: CatchRecordLayout(
          title: 'Sunday Run sign-up',
          metadata: 'Form response · 20 May 2026',
          icon: CatchIcons.document,
        ),
      ),
    ),
    WidgetbookContractStateCard(
      label: 'multiline',
      child: CatchField.read(
        content: CatchRecordLayout(
          title: 'Message received',
          metadata: 'Catch · 18 June 2026',
          description:
              'I’ll bring two friends next week. We would prefer the smaller weekend event, if there is space.',
          icon: CatchIcons.chat,
        ),
      ),
    ),
  ],
);

@widgetbook.UseCase(
  name: 'Inset sections',
  type: CatchSectionList,
  path: '[Core primitives]/Sections',
)
Widget catchSectionInsetStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'Inset sections',
    catalogId: 'catch.section_stack',
    children: [
      const WidgetbookContractStateCard(
        label: 'handoff-sections',
        child: CatchSectionList.inset(
          emptyStateOmitted: true,
          padding: EdgeInsets.zero,
          children: [
            CatchSection.divided(
              first: true,

              title: 'Room',
              count: 2,
              child: WidgetbookContractBodySpec(
                label: 'Lead section keeps no top rule.',
              ),
            ),
            CatchSection.divided(
              title: 'Guests',
              count: 24,
              child: WidgetbookContractBodySpec(
                label: 'Next sections own the divider.',
              ),
            ),
            CatchSection.divided(
              title: 'Follow up',
              child: WidgetbookContractBodySpec(
                label: 'No ad-hoc gaps needed.',
              ),
            ),
          ],
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'plain-sections',
        child: CatchSectionList.inset(
          emptyStateOmitted: true,
          padding: EdgeInsets.zero,
          children: [
            WidgetbookContractBodySpec(label: 'First plain section block'),
            WidgetbookContractBodySpec(
              label: 'Second block follows stack rhythm',
            ),
          ],
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'custom-gap',
        child: CatchSectionList.inset(
          emptyStateOmitted: true,
          padding: EdgeInsets.zero,
          gap: CatchSpacing.s3,
          children: [
            WidgetbookContractBodySpec(label: 'First block'),
            WidgetbookContractBodySpec(label: 'Second block with explicit gap'),
          ],
        ),
      ),
      WidgetbookContractStateCard(
        label: 'zero-padding',
        child: CatchSectionList.inset(
          emptyStateOmitted: true,
          padding: EdgeInsets.zero,
          children: [
            CatchSection.contained(
              children: [
                CatchField.read(
                  copy: catchFieldCopy(context.l10n),
                  title: 'Nested field',
                  body: 'Section stack can hold contracted primitives.',
                ),
              ],
            ),
          ],
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchSectionList,
  path: '[Core primitives]/Sections',
)
Widget catchSectionListContractStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'Section lists',
    contractId: 'catch.section_stack',
    states: const [
      'default-gap',
      'zero-gap',
      'custom-gap',
      'main-min',
      'empty',
      'empty-omitted',
      'handoff-sections',
      'plain-sections',
      'zero-padding',
      'detail-gutter',
      'section-owned-rhythm',
      'centered',
      'compact-fallback',
      'two-column',
      'single-lane-fallback',
      'floating-bottom-navigation',
      'no-bottom-navigation',
    ],
    children: [
      const WidgetbookContractStateCard(
        label: 'default-gap',
        child: SizedBox(
          width: WidgetbookPreviewLayout.standardContractWidth,
          child: CatchSectionList(
            emptyStateOmitted: true,
            children: [
              WidgetbookContractBodySpec(label: 'First semantic section'),
              WidgetbookContractBodySpec(label: 'Second semantic section'),
              WidgetbookContractBodySpec(label: 'Third semantic section'),
            ],
          ),
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'zero-gap',
        child: SizedBox(
          width: WidgetbookPreviewLayout.standardContractWidth,
          child: CatchSectionList(
            emptyStateOmitted: true,
            gap: 0,
            children: [
              WidgetbookContractBodySpec(label: 'A'),
              WidgetbookContractBodySpec(
                label: 'B follows without inserted rhythm',
              ),
            ],
          ),
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'custom-gap',
        child: SizedBox(
          width: WidgetbookPreviewLayout.standardContractWidth,
          child: CatchSectionList(
            emptyStateOmitted: true,
            gap: CatchSpacing.s3,
            children: [
              WidgetbookContractBodySpec(label: 'Compact section'),
              WidgetbookContractBodySpec(label: 'Compact section'),
            ],
          ),
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'main-min',
        child: SizedBox(
          width: WidgetbookPreviewLayout.standardContractWidth,
          child: CatchSectionList(
            emptyStateOmitted: true,
            mainAxisSize: MainAxisSize.min,
            children: [
              WidgetbookContractBodySpec(label: 'Content-sized list'),
              WidgetbookContractBodySpec(label: 'No expanded main axis'),
            ],
          ),
        ),
      ),

      const WidgetbookContractStateCard(
        label: 'handoff-sections',
        child: CatchSectionList.inset(
          emptyStateOmitted: true,
          padding: EdgeInsets.zero,
          children: [
            CatchSection.divided(
              first: true,

              title: 'Room',
              count: 2,
              child: WidgetbookContractBodySpec(
                label: 'Lead section keeps no top rule.',
              ),
            ),
            CatchSection.divided(
              title: 'Guests',
              count: 24,
              child: WidgetbookContractBodySpec(
                label: 'Next sections own the divider.',
              ),
            ),
            CatchSection.divided(
              title: 'Follow up',
              child: WidgetbookContractBodySpec(
                label: 'No ad-hoc gaps needed.',
              ),
            ),
          ],
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'plain-sections',
        child: CatchSectionList.inset(
          emptyStateOmitted: true,
          padding: EdgeInsets.zero,
          children: [
            WidgetbookContractBodySpec(label: 'First plain section block'),
            WidgetbookContractBodySpec(
              label: 'Second block follows stack rhythm',
            ),
          ],
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'custom-gap',
        child: CatchSectionList.inset(
          emptyStateOmitted: true,
          padding: EdgeInsets.zero,
          gap: CatchSpacing.s3,
          children: [
            WidgetbookContractBodySpec(label: 'First block'),
            WidgetbookContractBodySpec(label: 'Second block with explicit gap'),
          ],
        ),
      ),
      WidgetbookContractStateCard(
        label: 'zero-padding',
        child: CatchSectionList.inset(
          emptyStateOmitted: true,
          padding: EdgeInsets.zero,
          children: [
            CatchSection.contained(
              children: [
                CatchField.read(
                  copy: catchFieldCopy(context.l10n),
                  title: 'Nested field',
                  body: 'Section stack can hold contracted primitives.',
                ),
              ],
            ),
          ],
        ),
      ),

      WidgetbookContractStateCard(
        label: 'detail-gutter',
        child: WidgetbookContractBodyFrame(
          child: CustomScrollView(
            slivers: [
              CatchSectionList.sliver(
                emptyStateOmitted: true,
                children: [
                  CatchSection.divided(
                    first: true,

                    title: 'Overview',
                    child: WidgetbookContractBodySpec(
                      label: 'Detail body starts inset.',
                    ),
                  ),
                  CatchSection.divided(
                    title: 'Plan',
                    child: WidgetbookContractBodySpec(
                      label: 'Section owns its divider rhythm.',
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'custom-gap',
        child: WidgetbookContractBodyFrame(
          child: CustomScrollView(
            slivers: [
              CatchSectionList.sliver(
                emptyStateOmitted: true,
                gap: CatchSpacing.s4,
                topPadding: CatchSpacing.s4,
                bottomPadding: CatchSpacing.s4,
                children: [
                  CatchSection.contained(
                    child: WidgetbookContractBodySpec(
                      label: 'Contained card section',
                    ),
                  ),
                  CatchSection.plain(
                    title: 'Notes',
                    child: WidgetbookContractBodySpec(
                      label: 'Custom sliver gap.',
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),

      for (final setup in [
        (
          width: 760.0,
          mode: CatchSectionListMode.centered,
          secondary: true,
          label: 'Centered lane',
        ),
        (
          width: 659.0,
          mode: CatchSectionListMode.adaptiveTwoColumn,
          secondary: true,
          label: 'Compact ordering',
        ),
        (
          width: 660.0,
          mode: CatchSectionListMode.adaptiveTwoColumn,
          secondary: true,
          label: 'Two complete lanes',
        ),
        (
          width: 760.0,
          mode: CatchSectionListMode.adaptiveTwoColumn,
          secondary: false,
          label: 'One populated lane',
        ),
      ])
        WidgetbookContractStateCard(
          label: setup.label,
          child: FittedBox(
            fit: BoxFit.scaleDown,
            child: WidgetbookViewportFrame.device(
              size: Size(setup.width, 320),
              child: CatchSectionList.responsive(
                emptyStateOmitted: true,
                mode: setup.mode,
                items: [
                  for (final index in [0, 1])
                    CatchSectionListItem(
                      lane: index == 1 && setup.secondary
                          ? CatchSectionListPlacement.secondary
                          : CatchSectionListPlacement.primary,
                      child: CatchSection.fieldRows(
                        children: [
                          CatchField.read(
                            copy: catchFieldCopy(context.l10n),
                            title: index == 0 ? 'Primary' : 'Secondary',
                            body: 'Complete section',
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
          ),
        ),
      for (final floating in [false, true])
        WidgetbookContractStateCard(
          label: floating
              ? 'Floating bottom navigation'
              : 'No bottom navigation',
          child: WidgetbookScrolledSectionPage(floating: floating),
        ),
      WidgetbookContractStateCard(
        label: 'Explicit empty-state owner',
        child: CatchSectionList(
          emptyStateOmitted: false,
          emptyBuilder: (_) =>
              const WidgetbookContractBodySpec(label: 'No sections available'),
          children: const [],
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'Explicit omission',
        child: CatchSectionList(emptyStateOmitted: true, children: []),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Sliver section insets',
  type: CatchSectionList,
  path: '[Core primitives]/Sections',
)
Widget catchSectionSliverStates(BuildContext context) {
  return const WidgetbookCatalogFrame(
    title: 'Sliver section insets',
    catalogId: 'catch.section_stack',
    children: [
      WidgetbookContractStateCard(
        label: 'detail-gutter',
        child: WidgetbookContractBodyFrame(
          child: CustomScrollView(
            slivers: [
              CatchSectionList.sliver(
                emptyStateOmitted: true,
                children: [
                  CatchSection.divided(
                    first: true,

                    title: 'Overview',
                    child: WidgetbookContractBodySpec(
                      label: 'Detail body starts inset.',
                    ),
                  ),
                  CatchSection.divided(
                    title: 'Plan',
                    child: WidgetbookContractBodySpec(
                      label: 'Section owns its divider rhythm.',
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'custom-gap',
        child: WidgetbookContractBodyFrame(
          child: CustomScrollView(
            slivers: [
              CatchSectionList.sliver(
                emptyStateOmitted: true,
                gap: CatchSpacing.s4,
                topPadding: CatchSpacing.s4,
                bottomPadding: CatchSpacing.s4,
                children: [
                  CatchSection.contained(
                    child: WidgetbookContractBodySpec(
                      label: 'Contained card section',
                    ),
                  ),
                  CatchSection.plain(
                    title: 'Notes',
                    child: WidgetbookContractBodySpec(
                      label: 'Custom sliver gap.',
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    ],
  );
}
