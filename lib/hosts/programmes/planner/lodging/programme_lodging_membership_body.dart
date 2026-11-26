import 'package:catch_dating_app/contexts/programmes/domain/program_lodging_setup.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// Social membership review for one guest at a time.
///
/// Pick a guest to read their membership (`readMembership`); choose the
/// groups to include; Save membership choices runs `decideMembership`,
/// which records the unchosen groups as explicit exclusions. Each source
/// suggestion shows its group, status and source. These choices never
/// create a room-sharing party. It keeps nothing itself.
class HostProgrammeLodgingMembershipBody extends StatelessWidget {
  const HostProgrammeLodgingMembershipBody({
    super.key,
    required this.catalog,
    required this.membership,
    required this.selectedGroups,
    required this.busy,
    required this.error,
    required this.onChooseGuest,
    required this.onGroupsChanged,
    required this.onSave,
  });

  final ProgramLodgingCatalog catalog;

  /// The chosen guest's membership; null until a guest is picked.
  final ProgramLodgingMembership? membership;
  final Set<String> selectedGroups;
  final bool busy;
  final Object? error;
  final ValueChanged<String> onChooseGuest;
  final ValueChanged<Set<String>> onGroupsChanged;
  final VoidCallback onSave;

  /// The most groups one membership may include.
  static const maxGroups = 20;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final copy = catchFieldCopy(l10n);
    final membership = this.membership;
    final groups = {
      for (final group in catalog.rows('groups'))
        requiredString(group, 'id'): requiredString(group, 'label'),
      if (membership != null)
        for (final group in mapList(membership.json['groups'], 'groups'))
          requiredString(group, 'id'): requiredString(group, 'label'),
    };
    String evidence(String groupId, String source, String status) =>
        l10n.hostProgrammeLodgingMembershipEvidence(
          group: groups[groupId]!,
          source: source,
          status: status,
        );
    return CatchPageBody.screen(
      children: [
        CatchText(
          l10n.hostProgrammeLodgingMembershipHint,
          variant: CatchTextVariant.bodySmall,
          tone: CatchTextTone.secondary,
        ),
        CatchSection(
          dividers: CatchSectionPlacement.none,
          children: [
            CatchField<String>.choices(
              key: const ValueKey<String>(
                'host-programme-lodging-member-guest',
              ),
              copy: copy,
              title: l10n.hostProgrammeLodgingGuest,
              values: catalog
                  .rows('guests')
                  .map((g) => requiredString(g, 'id'))
                  .toList(),
              selected: {?membership?.guestId},
              itemLabelBuilder: (id) =>
                  requiredString(catalog.row('guests', id), 'label'),
              onSelectionChanged: busy
                  ? null
                  : (ids) {
                      if (ids.firstOrNull case final id?) onChooseGuest(id);
                    },
            ),
            if (membership != null)
              CatchField<String>.choices(
                key: const ValueKey<String>(
                  'host-programme-lodging-member-groups',
                ),
                copy: copy,
                title: l10n.hostProgrammeLodgingGroups,
                body: membership.label,
                mode: CatchChipMode.multiple,
                allowEmptySelection: true,
                values: groups.keys.toList(),
                selected: selectedGroups,
                itemLabelBuilder: (id) => groups[id]!,
                onSelectionChanged: busy ? null : onGroupsChanged,
              ),
          ],
        ),
        if (membership != null)
          CatchSection(
            children: [
              for (final row in membership.evidence)
                CatchIndexRow(
                  title: evidence(
                    requiredString(row, 'groupId'),
                    requiredString(row, 'sourceLabel'),
                    row['selected'] == true
                        ? (row['included'] == true
                              ? l10n.hostProgrammeLodgingMembershipIncluded
                              : l10n.hostProgrammeLodgingMembershipExcluded)
                        : l10n.hostProgrammeLodgingMembershipSuggested,
                  ),
                  titleMaxLines: 3,
                  onTap: null,
                ),
              for (final groupId in membership.groupIds)
                if (!membership.evidence.any(
                  (e) => e['selected'] == true && e['groupId'] == groupId,
                ))
                  CatchIndexRow(
                    title: evidence(
                      groupId,
                      l10n.hostProgrammeLodgingMembershipCanonical,
                      l10n.hostProgrammeLodgingMembershipIncluded,
                    ),
                    titleMaxLines: 3,
                    onTap: null,
                  ),
            ],
          ),
        if (error case final error?)
          CatchNotice.inline(
            tone: CatchNoticeTone.danger,
            icon: CatchIcons.error,
            body: appErrorMessage(
              error,
              l10n: l10n,
              context: AppErrorContext.event,
            ),
          ),
        if (membership != null)
          CatchButton(
            key: const ValueKey<String>('host-programme-lodging-member-save'),
            label: l10n.hostProgrammeLodgingMembershipSave,
            fullWidth: true,
            onPressed: busy || selectedGroups.length > maxGroups
                ? null
                : onSave,
          ),
      ],
    );
  }
}
