import 'package:catch_dating_app/hosts/organizer/page_edit_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_platform/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// Which page field a change is for.
enum PageEditField { name, about, area, instagram, phone, email }

/// Your page in board order: the logo, the photos, the fields, the kinds of
/// night, the links and what shows on the page. It holds no draft: every
/// change goes back to the screen, which keeps it until Save changes.
class OrganizerPageEditBody extends StatelessWidget {
  const OrganizerPageEditBody({
    super.key,
    required this.state,
    required this.onField,
    required this.onFormat,
    required this.onListed,
    required this.onChangeLogo,
    required this.onAddPhotos,
    required this.onRemovePhoto,
  });

  final OrganizerPageEditState state;
  final void Function(PageEditField field, String value) onField;
  final ValueChanged<CatchFormat> onFormat;
  final ValueChanged<bool> onListed;
  final VoidCallback onChangeLogo;
  final VoidCallback onAddPhotos;

  /// The photo at this place on the page.
  final ValueChanged<int> onRemovePhoto;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final copy = catchFieldCopy(l10n);
    final draft = state.draft;
    final organizer = state.organizer;
    final busy = state.saving || state.mediaPending;
    final photos = state.photoUrls;
    final tiles = <Widget>[
      for (final (index, url) in photos.indexed)
        CatchSurface(
          key: ValueKey<String>('page-edit-photo-$index'),
          block: CatchSurfaceBlock.plain,
          semanticLabel: l10n.hostOrganizerPagePhotoRemove,
          onPress: busy ? null : () => onRemovePhoto(index),
          child: CatchNetworkImage(
            url,
            aspect: 1,
            corner: CatchNetworkImageSize.md,
            placeholder: _placeholders[index % _placeholders.length],
          ),
        ),
      CatchChoiceTile(
        key: const ValueKey<String>('page-edit-add-photo'),
        variant: CatchChoiceTileVariant.add,
        title: l10n.hostOrganizerPagePhotoAdd,
        contract: CatchContractConstraints
            .updateOrganizerCallablePayloadFieldsOrganizerPhotos,
        onTap: busy ? null : onAddPhotos,
      ),
    ];
    final revision = '${organizer.id}-${state.revision}';
    CatchField field(
      PageEditField id,
      String title,
      String value, {
      int? minLines,
      TextInputType? keyboardType,
      String? prefixText,
    }) => CatchField.input(
      key: ValueKey<String>('page-edit-${id.name}-$revision'),
      copy: copy,
      title: title,
      contract: switch (id) {
        PageEditField.name =>
          CatchContractConstraints.updateOrganizerCallablePayloadFieldsName,
        PageEditField.about =>
          CatchContractConstraints
              .updateOrganizerCallablePayloadFieldsDescription,
        PageEditField.area =>
          CatchContractConstraints.updateOrganizerCallablePayloadFieldsArea,
        PageEditField.instagram =>
          CatchContractConstraints
              .updateOrganizerCallablePayloadFieldsInstagramHandle,
        PageEditField.phone =>
          CatchContractConstraints
              .updateOrganizerCallablePayloadFieldsPhoneNumber,
        PageEditField.email =>
          CatchContractConstraints.updateOrganizerCallablePayloadFieldsEmail,
      },
      initialValue: value,
      minLines: minLines,
      maxLines: minLines == null ? 1 : null,
      keyboardType: keyboardType,
      prefixText: prefixText,
      onChanged: (value) => onField(id, value),
    );
    return CatchPageBody.screen(
      variant: CatchPageBodyVariant.fixed,
      gap: CatchPageBodyGap.tight,
      children: [
        CatchStack(
          direction: CatchStackDirection.row,
          gap: CatchStackGap.g16,
          align: CatchStackAlign.center,
          children: [
            CatchAvatar.system(
              size: CatchAvatarSize.xl,
              name: draft.name,
              imageUrl: organizer.logoPhotoUrl,
              color: _avatarColor(draft.formats),
              variant: CatchAvatarVariant.square,
            ),
            Expanded(
              child: CatchStack(
                gap: CatchStackGap.g8,
                align: CatchStackAlign.start,
                children: [
                  CatchText(
                    l10n.hostOrganizerPageLogoNote,
                    variant: CatchTextVariant.bodySmall,
                    tone: CatchTextTone.secondary,
                  ),
                  CatchButton(
                    key: const ValueKey<String>('page-edit-change-logo'),
                    label: l10n.hostOrganizerPageChangeLogo,
                    variant: CatchButtonVariant.secondary,
                    size: CatchButtonSize.sm,
                    status: state.mediaPending
                        ? CatchButtonStatus.loading
                        : CatchButtonStatus.idle,
                    onPressed: busy ? null : onChangeLogo,
                  ),
                ],
              ),
            ),
          ],
        ),
        CatchStack(
          gap: CatchStackGap.g8,
          children: [
            CatchText(
              l10n.hostOrganizerPagePhotos,
              variant: CatchTextVariant.labelAction,
            ),
            for (var start = 0; start < tiles.length; start += 3)
              CatchStack(
                direction: CatchStackDirection.row,
                gap: CatchStackGap.g8,
                equal: true,
                children: [
                  ...tiles.skip(start).take(3),
                  for (var gap = tiles.length - start; gap < 3; gap += 1)
                    const CatchStack(children: []),
                ],
              ),
            CatchText(
              l10n.hostOrganizerPagePhotosNote,
              variant: CatchTextVariant.bodySmall,
              tone: CatchTextTone.secondary,
            ),
          ],
        ),
        field(PageEditField.name, l10n.hostOrganizerPageName, draft.name),
        field(
          PageEditField.about,
          l10n.hostOrganizerPageAbout,
          draft.about,
          minLines: 4,
        ),
        field(PageEditField.area, l10n.hostOrganizerPageArea, draft.area),
        CatchStack(
          children: [
            CatchText(
              l10n.hostOrganizerPageFormats,
              variant: CatchTextVariant.labelAction,
            ),
            CatchStack(
              direction: CatchStackDirection.row,
              gap: CatchStackGap.g8,
              wrap: true,
              children: [
                for (final (format, _) in pageEditFormats)
                  CatchChip.choice(
                    key: ValueKey<String>('page-edit-format-${format.name}'),
                    label: switch (format) {
                      CatchFormat.games => l10n.hostOrganizerFormatGames,
                      CatchFormat.run => l10n.hostOrganizerFormatRun,
                      CatchFormat.dinner => l10n.hostOrganizerFormatDinner,
                      CatchFormat.courts => l10n.hostOrganizerFormatCourts,
                      CatchFormat.nightsOut =>
                        l10n.hostOrganizerFormatNightsOut,
                    },
                    selected: draft.formats.contains(format),
                    mode: CatchChipMode.multiple,
                    dot: format,
                    colourWhenSelected: true,
                    onPressed: busy ? null : () => onFormat(format),
                  ),
              ],
            ),
          ],
        ),
        CatchSection(
          title: l10n.hostOrganizerPageLinks,
          dividers: CatchSectionPlacement.none,
          children: [
            field(
              PageEditField.instagram,
              l10n.hostOrganizerPageInstagram,
              draft.instagram,
              prefixText: '@',
            ),
            field(
              PageEditField.phone,
              l10n.hostOrganizerPagePhone,
              draft.phone,
              keyboardType: TextInputType.phone,
            ),
            field(
              PageEditField.email,
              l10n.hostOrganizerPageEmail,
              draft.email,
              keyboardType: TextInputType.emailAddress,
            ),
          ],
        ),
        if (state.isOwner)
          CatchSection(
            title: l10n.hostOrganizerPageOnYourPage,
            children: [
              CatchIndexRow(
                title: l10n.hostOrganizerPageListed,
                subtitle: l10n.hostOrganizerPageListedNote,
                density: CatchIndexRowSize.regular,
                trailing: CatchToggleInput(
                  key: const ValueKey<String>('page-edit-listed'),
                  value: draft.listed,
                  semanticLabel: l10n.hostOrganizerPageListed,
                  contract: CatchContractConstraints
                      .updateOrganizerCallablePayloadFieldsPublicListingEnabled,
                  onChanged: busy ? null : onListed,
                ),
                onTap: null,
              ),
            ],
          ),
      ],
    );
  }

  static const _placeholders = [
    CatchNetworkImageColor.games,
    CatchNetworkImageColor.dinner,
    CatchNetworkImageColor.run,
    CatchNetworkImageColor.courts,
    CatchNetworkImageColor.nightsOut,
  ];

  static CatchAvatarColor? _avatarColor(Set<CatchFormat> formats) =>
      switch (formats.firstOrNull) {
        CatchFormat.games => CatchAvatarColor.games,
        CatchFormat.run => CatchAvatarColor.run,
        CatchFormat.dinner => CatchAvatarColor.dinner,
        CatchFormat.courts => CatchAvatarColor.courts,
        CatchFormat.nightsOut => CatchAvatarColor.nightsOut,
        null => null,
      };
}
