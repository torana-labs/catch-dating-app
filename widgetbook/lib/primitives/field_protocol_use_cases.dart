import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/primitives/viewport_layout_use_cases.dart';
import 'package:widgetbook_workspace/support/widgetbook_harness.dart';

@widgetbook.UseCase(
  name: 'Localized constraint messages',
  type: CatchFormValidationCopy,
  path: '[Core primitives]/Field protocols',
)
Widget fieldValidationCopyStates(BuildContext context) {
  final copy = catchFormValidationCopy(context.l10n);
  const contract = CatchContractFieldConstraints(
    path: 'preview.name',
    required: true,
    minLength: 3,
    maxLength: 5,
    pattern: r'^[a-z]+$',
  );
  return WidgetbookCatalogFrame(
    title: 'Validation messages',
    catalogId: 'catch.field',
    children: [
      for (final value in ['', 'a', 'abcdef', 'ABC', 'abc'])
        CatchField.input(
          copy: catchFieldCopy(context.l10n),
          title: 'Name',
          initialValue: value,
          error: CatchContractFieldPolicy.validateText(
            copy: copy,
            label: 'Name',
            value: value,
            contract: contract,
          ),
        ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Exclusive field disclosure',
  type: CatchAccordionController,
  path: '[Core primitives]/Field protocols',
)
Widget accordionControllerStates(BuildContext context) =>
    const WidgetbookCatalogFrame(
      title: 'One expanded editor',
      catalogId: 'catch.field.accordion_controller',
      children: [_AccordionFields()],
    );

class _AccordionFields extends StatefulWidget {
  const _AccordionFields();

  @override
  State<_AccordionFields> createState() => _AccordionFieldsState();
}

class _AccordionFieldsState extends State<_AccordionFields> {
  final _controller = CatchAccordionController(initialExpanded: 'Timing');

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: _controller,
    builder: (context, _) => CatchSection.fieldRows(
      children: [
        for (final title in ['Timing', 'Channel'])
          CatchField<String>.choices(
            copy: catchFieldCopy(context.l10n),
            title: title,
            values: const ['Default', 'Custom'],
            itemLabelBuilder: (value) => value,
            selected: const {'Default'},
            onSelectionChanged: (_) {},
            disclosureMode: _controller.isExpanded(title)
                ? CatchFieldMode.controlledExpanded
                : CatchFieldMode.controlledCollapsed,
            onOpenChanged: (open) {
              if (open) {
                _controller.toggle(title);
              } else if (_controller.isExpanded(title)) {
                _controller.collapse();
              }
            },
          ),
      ],
    ),
  );
}

Widget _openField(BuildContext context) => CatchField<String>.choices(
  copy: catchFieldCopy(context.l10n),
  title: 'Reminder',
  values: const ['Before', 'After'],
  itemLabelBuilder: (value) => value,
  selected: const {'Before'},
  onSelectionChanged: (_) {},
  disclosureMode: CatchFieldMode.localExpanded,
);

@widgetbook.UseCase(
  name: 'Gutters and active silhouettes',
  type: CatchFieldGeometryScope,
  path: '[Core primitives]/Field protocols',
)
Widget fieldGeometryStates(BuildContext context) => WidgetbookCatalogFrame(
  title: 'Field geometry',
  catalogId: 'catch.field.geometry_scope',
  children: [
    for (final gutter in CatchFieldGeometryScopeMode.values) ...[
      Text('${gutter.name} gutter', style: CatchTextStyles.bodyM(context)),
      CatchFieldGeometryScope(
        gutterOwnership: gutter,
        child: CatchField.read(
          copy: catchFieldCopy(context.l10n),
          title: 'Name',
          body: 'Alex',
        ),
      ),
    ],
    for (final shape in CatchFieldGeometryScopeVariant.values) ...[
      Text(shape.name, style: CatchTextStyles.bodyM(context)),
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: CatchSpacing.s4),
        child: CatchFieldInteractionPlaneScope(
          outsets: const EdgeInsets.symmetric(horizontal: CatchSpacing.s4),
          child: CatchFieldGeometryScope(
            gutterOwnership: CatchFieldGeometryScopeMode.container,
            interactionShape: shape,
            child: _openField(context),
          ),
        ),
      ),
    ],
  ],
);

@widgetbook.UseCase(
  name: 'Page and lane paint extents',
  type: CatchFieldInteractionPlaneScope,
  path: '[Core primitives]/Field protocols',
)
Widget fieldInteractionPlaneStates(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'Interaction plane',
      catalogId: 'catch.field.interaction_plane_scope',
      children: [
        for (final outset in [0.0, CatchSpacing.s6]) ...[
          Text(
            outset == 0 ? 'Lane edge' : 'Page edge',
            style: CatchTextStyles.bodyM(context),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: CatchSpacing.s6),
            child: CatchFieldInteractionPlaneScope(
              outsets: EdgeInsets.symmetric(horizontal: outset),
              child: CatchSection.fieldRows(
                interaction: CatchDividedFieldInteractionScopeMode.fullBleed,
                children: [_openField(context)],
              ),
            ),
          ),
        ],
      ],
    );

@widgetbook.UseCase(
  name: 'Section interaction policies',
  type: CatchDividedFieldInteractionScope,
  path: '[Core primitives]/Field protocols',
)
Widget dividedFieldInteractionStates(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'Divided section policy',
      catalogId: 'catch.field.divided_interaction_scope',
      children: [
        for (final interaction
            in CatchDividedFieldInteractionScopeMode.values) ...[
          Text(interaction.name, style: CatchTextStyles.bodyM(context)),
          CatchPageBody.screen(
            variant: CatchPageBodyVariant.fixed,
            padding: const EdgeInsets.symmetric(horizontal: CatchSpacing.s4),
            child: CatchDividedFieldInteractionScope(
              interaction: interaction,
              child: CatchSection.fieldRows(children: [_openField(context)]),
            ),
          ),
        ],
      ],
    );

@widgetbook.UseCase(
  name: 'Compact and split section defaults',
  type: CatchResponsiveFieldInteractionPolicy,
  path: '[Core primitives]/Field protocols',
)
Widget responsiveFieldInteractionStates(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'Responsive field policy',
      catalogId: 'catch.field.responsive_interaction_policy',
      children: [
        for (final width in [360.0, 760.0]) ...[
          Text(
            width < 660 ? 'Single column' : 'Split panes',
            style: CatchTextStyles.bodyM(context),
          ),
          WidgetbookLayoutViewport(
            size: Size(width, width < 660 ? 560 : 280),
            child: CatchPageBody.screen(
              variant: CatchPageBodyVariant.fixed,
              child: CatchSectionList.responsive(
                emptyStateOmitted: true,
                mode: CatchSectionListMode.adaptiveTwoColumn,
                fieldInteractionPolicy:
                    const CatchResponsiveFieldInteractionPolicy(),
                items: [
                  for (final lane in [
                    CatchSectionListPlacement.primary,
                    CatchSectionListPlacement.secondary,
                  ])
                    CatchSectionListItem(
                      lane: lane,
                      child: CatchSection.fieldRows(
                        children: [_openField(context)],
                      ),
                    ),
                ],
              ),
            ),
          ),
        ],
      ],
    );

@widgetbook.UseCase(
  name: 'Disclosure clears bottom obstruction',
  type: CatchFieldVisibilityScope,
  path: '[Core primitives]/Field protocols',
)
Widget fieldVisibilityStates(BuildContext context) => WidgetbookCatalogFrame(
  title: 'Disclosure visibility',
  catalogId: 'catch.field.visibility_scope',
  children: [
    Text(
      'Open the editor: its actions clear the bottom overlay.',
      style: CatchTextStyles.bodyM(context),
    ),
    const _ObstructedDisclosure(),
  ],
);

class _ObstructedDisclosure extends StatefulWidget {
  const _ObstructedDisclosure();

  @override
  State<_ObstructedDisclosure> createState() => _ObstructedDisclosureState();
}

class _ObstructedDisclosureState extends State<_ObstructedDisclosure> {
  bool _open = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) setState(() => _open = true);
    });
  }

  @override
  Widget build(BuildContext context) => SizedBox(
    height: 600,
    child: Stack(
      children: [
        CatchFieldVisibilityScope(
          bottomObstruction: 96,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 112),
            children: [
              const SizedBox(height: 380),
              CatchSection.fieldRows(
                children: [
                  CatchField<String>.choices(
                    copy: catchFieldCopy(context.l10n),
                    title: 'Reminder',
                    values: const ['Before', 'After'],
                    itemLabelBuilder: (value) => value,
                    selected: const {'Before'},
                    onSelectionChanged: (_) {},
                    disclosureMode: _open
                        ? CatchFieldMode.controlledExpanded
                        : CatchFieldMode.controlledCollapsed,
                    onOpenChanged: (open) => setState(() => _open = open),
                    onCancel: () => setState(() => _open = false),
                    onSubmit: () => setState(() => _open = false),
                  ),
                ],
              ),
            ],
          ),
        ),
        Align(
          alignment: Alignment.bottomCenter,
          child: SizedBox(
            height: 96,
            width: double.infinity,
            child: ColoredBox(
              color: CatchTokens.of(context).surface,
              child: Center(
                child: Text(
                  'Shell obstruction',
                  style: CatchTextStyles.bodyM(context),
                ),
              ),
            ),
          ),
        ),
      ],
    ),
  );
}

@widgetbook.UseCase(
  name: 'Single, custom and divided rows',
  type: CatchFieldLanes,
  path: '[Core primitives]/Field protocols',
)
Widget fieldLaneStates(BuildContext context) => WidgetbookCatalogFrame(
  title: 'Field composition lanes',
  catalogId: 'catch.field.lanes',
  children: [
    CatchFieldLanes.single(
      child: CatchField.read(
        copy: catchFieldCopy(context.l10n),
        title: 'Single lane',
        body: 'One independent row',
      ),
    ),
    CatchFieldLanes.custom(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          CatchField.read(
            copy: catchFieldCopy(context.l10n),
            title: 'Custom lane',
            body: 'Specialized layout',
          ),
          SizedBox(height: CatchSpacing.s4),
          CatchFieldSupportRow(
            text: 'Caller-owned spacing between controls',
            color: CatchTokens.of(context).ink2,
          ),
        ],
      ),
    ),
    CatchFieldLanes.divided(
      children: [
        CatchField.read(
          copy: catchFieldCopy(context.l10n),
          title: 'Divided group',
          body: 'First row',
        ),
        CatchField.read(
          copy: catchFieldCopy(context.l10n),
          title: 'Shared separators',
          body: 'Second row',
        ),
      ],
    ),
  ],
);

@widgetbook.UseCase(
  name: 'Default and overridden search copy',
  type: CatchSearchFieldCopy,
  path: '[Core primitives]/Search copy',
)
Widget searchCopyDefaultAndOverriddenStates(BuildContext context) {
  final copy = catchSearchFieldCopy(context.l10n);
  return WidgetbookCatalogFrame(
    title: 'Search copy',
    catalogId: 'catch.search_field',
    children: [
      CatchSearchField(copy: copy),
      CatchSearchField(
        copy: copy,
        placeholder: 'Find a person',
        value: 'Taylor',
      ),
      CatchSearchField.expanding(copy: copy, onCloseSearch: () {}),
      CatchSearchField.expanding(
        copy: copy,
        status: CatchSearchFieldStatus.collapsed,
        onOpenSearch: () {},
      ),
    ],
  );
}
