import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/hosts/organizer/page_edit_state.dart';
import 'package:catch_dating_app/hosts/presentation/host_organizer_publication_state.dart';
import 'package:catch_kernel/city_catalog.dart';
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
///
/// Only the owner changes the page details; a manager sees them read-only
/// with a note saying so, and still changes the logo and photos, as the
/// organizer update allows.
class OrganizerPageEditBody extends StatelessWidget {
  const OrganizerPageEditBody({
    super.key,
    required this.state,
    required this.onField,
    required this.onType,
    required this.onCity,
    required this.onFormat,
    required this.onListed,
    required this.onChangeLogo,
    required this.onAddPhotos,
    required this.onPhoto,
    required this.onRetryUpload,
    required this.onDropUpload,
    this.onRemoveLogo,
  });

  final OrganizerPageEditState state;
  final void Function(PageEditField field, String value) onField;
  final ValueChanged<OrganizerType> onType;

  /// The city, as its market id.
  final ValueChanged<String> onCity;
  final ValueChanged<CatchFormat> onFormat;
  final ValueChanged<bool> onListed;
  final VoidCallback onChangeLogo;
  final VoidCallback onAddPhotos;

  /// Takes the logo off the page; null while there is none.
  final VoidCallback? onRemoveLogo;

  /// The photo at this place on the page, to move or remove.
  final ValueChanged<int> onPhoto;

  /// Sends a failed upload again, by its id.
  final ValueChanged<String> onRetryUpload;

  /// Lets a failed upload go, by its id.
  final ValueChanged<String> onDropUpload;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final copy = catchFieldCopy(l10n);
    final draft = state.draft;
    final organizer = state.organizer;
    final busy = state.saving || state.mediaPending;
    final editable = state.isOwner && !state.saving;
    final cities = _cityOptions(draft.city);
    final photos = state.photoUrls;
    final tiles = <Widget>[
      for (final (index, url) in photos.indexed)
        CatchSurface(
          key: ValueKey<String>('page-edit-photo-$index'),
          block: CatchSurfaceBlock.plain,
          semanticLabel: l10n.coreOrderedPhotoPickerActionPhotoOptions,
          onPress: busy ? null : () => onPhoto(index),
          child: CatchNetworkImage(
            url,
            aspect: 1,
            corner: CatchNetworkImageSize.md,
            placeholder: _placeholders[index % _placeholders.length],
          ),
        ),
      for (final upload in state.uploads)
        CatchSurface(
          key: ValueKey<String>('page-edit-upload-${upload.id}'),
          block: CatchSurfaceBlock.plain,
          child: CatchStack(
            gap: CatchStackGap.g8,
            align: CatchStackAlign.center,
            children: [
              CatchText(
                upload.failed
                    ? l10n.coreOrderedPhotoPickerStatusUploadFailed
                    : l10n.coreOrderedPhotoPickerStatusUploadingProgress(
                        percent: (upload.job.progress * 100).round(),
                      ),
                variant: CatchTextVariant.bodySmall,
                tone: upload.failed
                    ? CatchTextTone.danger
                    : CatchTextTone.secondary,
                align: TextAlign.center,
              ),
              if (upload.failed) ...[
                CatchButton(
                  key: ValueKey<String>('page-edit-retry-${upload.id}'),
                  label: l10n.coreOrderedPhotoPickerActionRetry,
                  variant: CatchButtonVariant.secondary,
                  size: CatchButtonSize.sm,
                  onPressed: state.mediaPending
                      ? null
                      : () => onRetryUpload(upload.id),
                ),
                CatchButton(
                  key: ValueKey<String>('page-edit-drop-${upload.id}'),
                  label: l10n.coreOrderedPhotoPickerActionRemove,
                  variant: CatchButtonVariant.quiet,
                  size: CatchButtonSize.sm,
                  onPressed: state.mediaPending
                      ? null
                      : () => onDropUpload(upload.id),
                ),
              ] else
                CatchMeter(
                  value: (upload.job.progress * 100).round(),
                  label: l10n.coreOrderedPhotoPickerStatusUploading,
                ),
            ],
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
      inputMode: state.isOwner
          ? CatchTextInputMode.editable
          : CatchTextInputMode.readOnly,
      errorText: id == PageEditField.email && !draft.emailValid
          ? l10n.hostsValidationEnterValidEmail
          : null,
      onChanged: (value) => onField(id, value),
    );
    return CatchPageBody.screen(
      variant: CatchPageBodyVariant.fixed,
      gap: CatchPageBodyGap.tight,
      children: [
        if (!state.isOwner)
          CatchNotice.inline(
            key: const ValueKey<String>('page-edit-owner-only'),
            tone: CatchNoticeTone.neutral,
            body: l10n.coreAppErrorMessageVisiblecopyOnlyTheOrganizerOwner,
          ),
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
                  CatchStack(
                    direction: CatchStackDirection.row,
                    gap: CatchStackGap.g8,
                    wrap: true,
                    children: [
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
                      if (onRemoveLogo case final remove?)
                        CatchButton(
                          key: const ValueKey<String>('page-edit-remove-logo'),
                          label: l10n
                              .hostsCreateOrganizerPhotosPickerActionRemoveLogo,
                          variant: CatchButtonVariant.quiet,
                          size: CatchButtonSize.sm,
                          onPressed: busy ? null : remove,
                        ),
                    ],
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
        CatchFieldLanes.single(
          child: CatchField<OrganizerType>.select(
            key: ValueKey<String>('page-edit-type-$revision'),
            copy: copy,
            title: l10n.hostsOrganizerTypeLabel,
            contract: CatchContractConstraints
                .updateOrganizerCallablePayloadFieldsOrganizerType,
            contractValueBuilder: (type) => type.name,
            values: OrganizerType.values,
            itemLabelBuilder: (type) => organizerTypeLabel(l10n, type),
            value: draft.type,
            onChanged: editable
                ? (type) {
                    if (type != null) onType(type);
                  }
                : null,
          ),
        ),
        CatchFieldLanes.single(
          child: CatchField<String>.select(
            key: ValueKey<String>('page-edit-city-$revision'),
            copy: copy,
            title: l10n.hostsHostOrganizerProfileLabelCity,
            contract: CatchContractConstraints
                .updateOrganizerCallablePayloadFieldsLocation,
            values: [for (final (id, _) in cities) id],
            itemLabelBuilder: (id) =>
                cities.firstWhere((city) => city.$1 == id).$2,
            value: draft.city,
            onChanged: editable
                ? (city) {
                    if (city != null) onCity(city);
                  }
                : null,
          ),
        ),
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
                    onPressed: busy || !state.isOwner
                        ? null
                        : () => onFormat(format),
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
                subtitle: switch (HostOrganizerPublicationState.fromOrganizer(
                  organizer,
                ).kind) {
                  // Catch and the website out of step say which is which.
                  HostOrganizerPublicationKind.catchOnly =>
                    l10n.hostsHostOrganizerPublicationBodyCatchOnly,
                  HostOrganizerPublicationKind.websiteOnly =>
                    l10n.hostsHostOrganizerPublicationBodyWebsiteOnly,
                  HostOrganizerPublicationKind.private ||
                  HostOrganizerPublicationKind.everywhere =>
                    l10n.hostOrganizerPageListedNote,
                },
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

  /// The cities a host can pick, with the organizer own city kept even when
  /// it is not one of them.
  static List<(String, String)> _cityOptions(String current) => [
    for (final city in defaultCityOptions.where((city) => city.hostCreatable))
      (city.effectiveMarketId, city.label),
    if (!defaultCityOptions.any(
      (city) => city.hostCreatable && city.effectiveMarketId == current,
    ))
      (current, cityLabel(current)),
  ];

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

/// The label for an organizer type.
String organizerTypeLabel(AppLocalizations l10n, OrganizerType type) =>
    switch (type) {
      OrganizerType.club => l10n.hostsOrganizerTypeClub,
      OrganizerType.community => l10n.hostsOrganizerTypeCommunity,
      OrganizerType.individual => l10n.hostsOrganizerTypeIndividual,
      OrganizerType.eventProducer => l10n.hostsOrganizerTypeEventProducer,
      OrganizerType.venue => l10n.hostsOrganizerTypeVenue,
      OrganizerType.brand => l10n.hostsOrganizerTypeBrand,
    };
