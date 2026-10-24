import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/theme/activity_palette.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/contract_preview.dart';

import '../../preview_layout_contracts.dart';

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchSection,
  path: '[Core primitives]/Sections',
)
Widget catchSectionContractStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchSection',
    contractId: 'catch.section',
    states: const [
      'divided-section',
      'contained-section',
      'action-primary',
      'action-secondary',
      'action-destructive',
      'action-loading',
      'action-disabled',
      'action-details',
      'collection-empty',
      'collection-populated',
      'collection-controls',
      'collection-loading-action',
      'collection-disabled-action',
      'status-module',
      'plain-section',
      'divided-field-rows',
      'divided-field-rows-full-bleed',
      'divided-field-rows-rounded-tile',
      'divided-field-rows-full-bleed-keyboard-focus',
      'contained-field-rows-external-header',
      'contained-field-rows-internal-header',
      'contained-field-groups',
      'contained-field-rows-child-active',
      'contained-field-rows-explicit-focused',
      'field-list',
      'mixed-modes',
      'single-field',
      'long-copy',
      'lead-accent',
      'contained-focused',
      'contained-error',
      'horizontal-embedded',
      'horizontal-full-bleed',
      'horizontal-intrinsic',
      'horizontal-fractional',
      'horizontal-footer',
    ],
    children: [
      for (final state in [
        'collection-empty',
        'collection-populated',
        'collection-controls',
        'collection-loading-action',
        'collection-disabled-action',
      ])
        WidgetbookContractStateCard(
          label: state,
          child: CatchSection.collection(
            title: 'Pickup points',
            emptyMessage:
                'Add airports, railway stations or other meeting points.',
            actionLabel: 'Add pickup point',
            onAction: state == 'collection-disabled-action'
                ? null
                : widgetbookNoop,
            actionStatus: state == 'collection-loading-action'
                ? CatchButtonStatus.loading
                : CatchButtonStatus.idle,
            leading: state == 'collection-controls'
                ? CatchChoiceInput<int>.segmented(
                    options: const [
                      CatchOption(value: 0, label: 'Day 1'),
                      CatchOption(value: 1, label: 'Day 2'),
                    ],
                    selected: 0,
                    onChanged: (_) {},
                    contractExemption:
                        'Local collection filter; no payload field.',
                  )
                : null,
            children: [
              if (state == 'collection-populated')
                const Text('Indore airport · Arrivals'),
            ],
          ),
        ),
      WidgetbookContractStateCard(
        label: 'status-module',
        child: CatchSection.status(
          title: 'Waiting for attendee feedback',
          message: 'The report appears once attendees share feedback.',
          icon: CatchIcons.autoAwesomeOutlined,
        ),
      ),
      for (final emphasis in CatchSectionEmphasis.values)
        WidgetbookContractStateCard(
          label: 'action-${emphasis.name}',
          child: CatchSection.action(
            title: 'Practice before event day',
            message:
                'Try the event controls with practice guests before your live event.',
            actionLabel: emphasis == CatchSectionEmphasis.destructive
                ? 'Reset practice'
                : 'Run a dress rehearsal',
            actionEmphasis: emphasis,
            onAction: () {},
          ),
        ),
      for (final loading in [true, false])
        WidgetbookContractStateCard(
          label: loading ? 'action-loading' : 'action-disabled',
          child: CatchSection.action(
            title: 'Public visibility',
            message: 'Only your Host team can access this organizer.',
            actionLabel: 'Make organizer public',
            actionStatus: loading
                ? CatchButtonStatus.loading
                : CatchButtonStatus.idle,
            onAction: null,
          ),
        ),
      WidgetbookContractStateCard(
        label: 'action-details',
        child: CatchSection.action(
          title: 'Public visibility',
          message: 'Only your Host team can access this organizer.',
          icon: CatchIcons.groups3Outlined,
          meta: const Text('Catch app: hidden · Public website: not enabled'),
          actionLabel: 'Make organizer public',
          onAction: () {},
        ),
      ),
      WidgetbookContractStateCard(
        label: 'contained-section',
        child: WidgetbookContractFieldWidth(
          child: CatchSection.contained(
            children: [
              CatchField.read(
                copy: catchFieldCopy(context.l10n),
                title: 'Host',
                body: 'Catch Hosts',
                icon: CatchIcons.hosted,
              ),
              CatchField.nav(
                copy: catchFieldCopy(context.l10n),
                title: 'Visibility',
                body: 'Private to attendees',
                icon: CatchIcons.lockOutlineRounded,
                onTap: widgetbookNoop,
              ),
              CatchField.toggle(
                copy: catchFieldCopy(context.l10n),
                title: 'Allow reminders',
                body: 'Push and email',
                icon: CatchIcons.notificationsOutlined,
                value: true,
                onChanged: (_) {},
              ),
            ],
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'contained-focused',
        child: WidgetbookContractFieldWidth(
          child: CatchSection.contained(
            states: {WidgetState.focused},
            children: [
              CatchField.input(
                copy: catchFieldCopy(context.l10n),
                title: 'Public name',
                initialValue: 'Bandra Social Run',
                icon: CatchIcons.groupsOutlined,
                states: const <WidgetState>{WidgetState.focused},
              ),
            ],
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'contained-error',
        child: WidgetbookContractFieldWidth(
          child: CatchSection.contained(
            states: {WidgetState.error},
            children: [
              CatchField.input(
                copy: catchFieldCopy(context.l10n),
                title: 'Invite code',
                initialValue: 'ABC',
                icon: CatchIcons.lockOutlineRounded,
                errorText: 'Use a 6-character invite code',
              ),
            ],
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'mixed-modes',
        child: WidgetbookContractFieldWidth(
          child: CatchSection.contained(
            children: [
              CatchField.input(
                copy: catchFieldCopy(context.l10n),
                title: 'Display name',
                initialValue: 'Suvrat',
                icon: CatchIcons.personOutlined,
              ),
              CatchField.input(
                copy: catchFieldCopy(context.l10n),
                title: 'Invite code',
                initialValue: 'ABC',
                icon: CatchIcons.keyOutlined,
                error: 'Use a six character invite code.',
              ),
              CatchField.add(
                copy: catchFieldCopy(context.l10n),
                title: 'Add another time',
                icon: CatchIcons.add,
                onTap: widgetbookNoop,
              ),
            ],
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'single-field',
        child: WidgetbookContractFieldWidth(
          child: CatchSection.contained(
            children: [
              CatchField.read(
                copy: catchFieldCopy(context.l10n),
                title: 'Event type',
                body: 'Dinner',
                icon: CatchIcons.dinner,
              ),
            ],
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'divided-section',
        child: CatchSection.divided(
          title: 'Account',
          children: [
            CatchField.read(
              copy: catchFieldCopy(context.l10n),
              icon: CatchIcons.phoneOutlined,
              title: 'Phone',
              body: '+91 98765 43210',
            ),
            CatchField.nav(
              copy: catchFieldCopy(context.l10n),
              icon: CatchIcons.lockOutlineRounded,
              title: 'Privacy',
              body: 'Private',
              onTap: widgetbookNoop,
            ),
          ],
        ),
      ),
      WidgetbookContractStateCard(
        label: 'divided-field-rows',
        child: WidgetbookContractFieldWidth(
          child: CatchSection.fieldRows(
            title: 'About you',
            count: '3 fields',
            children: [
              CatchField.input(
                copy: catchFieldCopy(context.l10n),
                title: 'Public name',
                initialValue: 'Suvrat',
                icon: CatchIcons.personOutlined,
              ),
              CatchField.nav(
                copy: catchFieldCopy(context.l10n),
                title: 'Home base',
                body: 'Bandra West',
                icon: CatchIcons.pinOutlined,
                onTap: widgetbookNoop,
              ),
              CatchField.input(
                copy: catchFieldCopy(context.l10n),
                title: 'Instagram',
                initialValue: '@catchapp',
                icon: CatchIcons.alternateEmailOutlined,
                showClearButton: true,
              ),
            ],
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'divided-field-rows-full-bleed',
        description:
            'The section-wide compact default reaches the nearest page interaction plane.',
        child: WidgetbookContractFieldWidth(
          child: CatchPageBody.screen(
            variant: CatchPageBodyVariant.fixed,
            padding: const EdgeInsets.symmetric(horizontal: CatchSpacing.s4),
            child: CatchSection.fieldRows(
              title: 'Notifications',
              interaction: CatchDividedFieldInteractionScopeMode.fullBleed,
              children: [
                CatchField.nav(
                  copy: catchFieldCopy(context.l10n),
                  title: 'Reminder timing',
                  body: 'Two hours before',
                  icon: CatchIcons.clock,
                  onTap: widgetbookNoop,
                ),
              ],
            ),
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'divided-field-rows-rounded-tile',
        description:
            'The retained section-level alternative uses one inset perimeter.',
        child: WidgetbookContractFieldWidth(
          child: CatchPageBody.screen(
            variant: CatchPageBodyVariant.fixed,
            padding: const EdgeInsets.symmetric(horizontal: CatchSpacing.s4),
            child: CatchSection.fieldRows(
              title: 'Notifications',
              interaction: CatchDividedFieldInteractionScopeMode.roundedTile,
              children: [
                CatchField.nav(
                  copy: catchFieldCopy(context.l10n),
                  title: 'Reminder timing',
                  body: 'Two hours before',
                  icon: CatchIcons.clock,
                  onTap: widgetbookNoop,
                ),
              ],
            ),
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'divided-field-rows-full-bleed-keyboard-focus',
        description:
            'Keyboard focus adds the approved 2 px inset perimeter to the same full-bleed plane.',
        child: WidgetbookContractFieldWidth(
          child: CatchPageBody.screen(
            variant: CatchPageBodyVariant.fixed,
            padding: const EdgeInsets.symmetric(horizontal: CatchSpacing.s4),
            child: CatchSection.fieldRows(
              title: 'Profile',
              interaction: CatchDividedFieldInteractionScopeMode.fullBleed,
              children: [
                CatchField.input(
                  copy: catchFieldCopy(context.l10n),
                  title: 'Public name',
                  initialValue: 'Suvrat',
                  icon: CatchIcons.personOutlined,
                  autofocus: true,
                ),
              ],
            ),
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'contained-field-rows-external-header',
        child: WidgetbookContractFieldWidth(
          child: CatchSectionList(
            emptyStateOmitted: true,
            gap: CatchSpacing.s6,
            children: [
              CatchSection.fieldRows(
                title: 'Divided fields',
                count: '1 field',
                trailing: Icon(CatchIcons.infoOutlineRounded),
                footer: const Text('8 px divided footer top inset'),
                children: [
                  CatchField.read(
                    copy: catchFieldCopy(context.l10n),
                    title: 'Name',
                    body: 'Suvrat',
                  ),
                ],
              ),
              CatchSection.containedFieldRows(
                title: 'Contained fields',
                count: '1 field',
                trailing: Icon(CatchIcons.infoOutlineRounded),
                footer: const Text('2 px contained footer top inset'),
                children: [
                  CatchField.read(
                    copy: catchFieldCopy(context.l10n),
                    title: 'Height',
                    body: '168 cm',
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'contained-field-rows-internal-header',
        child: WidgetbookContractFieldWidth(
          child: CatchSection.containedFieldRows(
            title: 'Event settings',
            count: '2 fields',
            trailing: Icon(CatchIcons.infoOutlineRounded),
            headerPlacement: CatchSectionHeaderPlacement.inside,
            children: [
              CatchField.read(
                copy: catchFieldCopy(context.l10n),
                title: 'Host',
                body: 'Catch Hosts',
                icon: CatchIcons.hosted,
              ),
              CatchField.nav(
                copy: catchFieldCopy(context.l10n),
                title: 'Location',
                body: 'Carter Road promenade',
                icon: CatchIcons.pinOutlined,
                onTap: widgetbookNoop,
              ),
            ],
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'contained-field-groups',
        child: WidgetbookContractFieldWidth(
          child: CatchSection.containedFieldGroups(
            groups: [
              CatchSectionFieldGroup(
                title: 'Continue',
                children: [
                  CatchField.action(
                    copy: catchFieldCopy(context.l10n),
                    title: 'Continue draft',
                    body: '5km · Carter Road Jetty · 24/6',
                    icon: CatchIcons.editNoteRounded,
                    onTap: widgetbookNoop,
                  ),
                  CatchField.action(
                    copy: catchFieldCopy(context.l10n),
                    title: 'Repeat last event',
                    body: 'Reuse Monday Evening Run',
                    icon: CatchIcons.refresh,
                    onTap: widgetbookNoop,
                  ),
                ],
              ),
              CatchSectionFieldGroup(
                title: 'Start new',
                children: [
                  CatchField.action(
                    copy: catchFieldCopy(context.l10n),
                    title: 'Sell tickets with Catch',
                    body: 'Tickets, waitlist, and payments in one place.',
                    icon: CatchIcons.confirmationNumberOutlined,
                    onTap: widgetbookNoop,
                  ),
                  CatchField.action(
                    copy: catchFieldCopy(context.l10n),
                    title: 'Use guest list',
                    body: 'Import CSV or XLSX.',
                    icon: CatchIcons.cloudUploadOutlined,
                    onTap: widgetbookNoop,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'contained-field-rows-child-active',
        child: WidgetbookContractFieldWidth(
          child: CatchSection.containedFieldRows(
            children: [
              CatchField<String>.choices(
                copy: catchFieldCopy(context.l10n),
                title: 'Languages',
                body: 'English · Hindi · Marathi',
                icon: CatchIcons.languageOutlined,
                values: const [
                  'English',
                  'Hindi',
                  'Marathi',
                  'Tamil',
                  'Gujarati',
                ],
                itemLabelBuilder: (value) => value,
                selected: const {'English', 'Hindi', 'Marathi'},
                mode: CatchChipMode.multiple,
                disclosureMode: CatchFieldMode.localExpanded,
                onSelectionChanged: (_) {},
                onCancel: widgetbookNoop,
                onSubmit: widgetbookNoop,
              ),
              CatchField.input(
                copy: catchFieldCopy(context.l10n),
                title: 'Answer',
                initialValue: 'Social miles and good coffee.',
                maxLines: null,
                minLines: 1,
              ),
            ],
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'contained-field-rows-explicit-focused',
        child: WidgetbookContractFieldWidth(
          child: CatchSection.containedFieldRows(
            states: {WidgetState.focused},
            children: [
              CatchField.read(
                copy: catchFieldCopy(context.l10n),
                title: 'Section-owned validation state',
                body: 'The outer perimeter is explicitly focused.',
                icon: CatchIcons.infoOutlineRounded,
              ),
            ],
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'field-list',
        child: WidgetbookContractFieldWidth(
          child: CatchSectionList(
            emptyStateOmitted: true,
            gap: CatchSpacing.s4,
            children: [
              CatchSection.fieldRows(
                title: 'First section',
                children: [
                  CatchField.read(
                    copy: catchFieldCopy(context.l10n),
                    title: 'Name',
                    body: 'Suvrat',
                  ),
                ],
              ),
              CatchSection.fieldRows(
                title: 'Second section',
                children: [
                  CatchField.read(
                    copy: catchFieldCopy(context.l10n),
                    title: 'City',
                    body: 'Delhi NCR',
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'long-copy',
        child: SizedBox(
          width: WidgetbookPreviewLayout.standardContractWidth,
          child: CatchSection.contained(
            children: [
              CatchField.read(
                copy: catchFieldCopy(context.l10n),
                title: 'Long public field label that should wrap cleanly',
                body:
                    'A very long value that needs to wrap without breaking the row group surface.',
                icon: CatchIcons.infoOutlineRounded,
              ),
              CatchField.nav(
                copy: catchFieldCopy(context.l10n),
                title: 'Detailed location',
                body: 'The east entrance by the fountain near the market',
                icon: CatchIcons.pinOutlined,
                onTap: widgetbookNoop,
              ),
            ],
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'lead-accent',
        child: CatchSection.divided(
          title: 'The plan',
          titleColor: ActivityPalette.resolve(
            context,
            ActivityKind.socialRun,
          ).accent,
          first: true,
          child: const Text('Lead sections may carry the activity accent.'),
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'plain-section',
        child: CatchSection.plain(
          title: 'Inline note',
          child: Text('Plain sections keep title rhythm without a container.'),
        ),
      ),

      for (final fullBleed in [false, true])
        WidgetbookContractStateCard(
          label: fullBleed ? 'horizontal-full-bleed' : 'horizontal-embedded',
          child: CatchSection.horizontal(
            title: 'Recommended',
            fullBleed: fullBleed,
            itemCount: 3,
            height: WidgetbookPreviewLayout.catalogRailHeight,
            itemBuilder: (context, index) => CatchSurface.card(
              width: WidgetbookPreviewLayout.catalogCardWidth,
              child: Text(
                'Card ${index + 1}',
                style: CatchTextStyles.statusLabel(context),
              ),
            ),
          ),
        ),
      WidgetbookContractStateCard(
        label:
            'horizontal-intrinsic / horizontal-fractional / horizontal-footer',
        child: CatchSection.horizontal(
          title: 'Your clubs',
          height: null,
          itemCount: 2,
          itemWidth: const CatchRailItemWidth.fractional(
            fraction: 0.75,
            min: 160,
            max: 260,
          ),
          itemBuilder: (context, index) => CatchSurface.card(
            child: Text(
              'Club ${index + 1}',
              style: CatchTextStyles.statusLabel(context),
            ),
          ),
          footer: CatchButton(label: 'More', onPressed: widgetbookNoop),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchSectionSurface,
  path: '[Core primitives]/Sections',
)
Widget catchSectionSurfaceContractStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchSectionSurface',
    contractId: 'catch.section.focus_surface',
    states: const [
      'default',
      'focused',
      'error',
      'field-rows-child-active',
      'field-rows-explicit-focused',
    ],
    children: [
      WidgetbookContractStateCard(
        label: 'default',
        child: WidgetbookContractFieldWidth(
          child: CatchSectionSurface(
            padding: CatchInsets.content,
            child: Text(
              'Contained section content',
              style: CatchTextStyles.bodyM(context),
            ),
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'focused',
        child: WidgetbookContractFieldWidth(
          child: CatchSectionSurface(
            padding: CatchInsets.content,
            states: {WidgetState.focused},
            child: Text(
              'Focused contained section content',
              style: CatchTextStyles.bodyM(context),
            ),
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'error',
        child: WidgetbookContractFieldWidth(
          child: CatchSectionSurface(
            padding: CatchInsets.content,
            states: {WidgetState.error},
            child: Text(
              'Error contained section content',
              style: CatchTextStyles.bodyM(context),
            ),
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'field-rows-child-active',
        child: WidgetbookContractFieldWidth(
          child: CatchSectionSurface.fieldRows(
            padding: EdgeInsets.zero,
            child: CatchField.input(
              copy: catchFieldCopy(context.l10n),
              title: 'Answer',
              initialValue: 'The child owns this focus ring.',
              states: const <WidgetState>{WidgetState.focused},
            ),
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'field-rows-explicit-focused',
        child: WidgetbookContractFieldWidth(
          child: CatchSectionSurface.fieldRows(
            padding: EdgeInsets.zero,
            states: {WidgetState.focused},
            child: CatchField.read(
              copy: catchFieldCopy(context.l10n),
              title: 'Section validation',
              body: 'Explicit focus belongs to the outer perimeter.',
            ),
          ),
        ),
      ),
    ],
  );
}
