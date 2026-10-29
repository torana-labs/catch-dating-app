import 'dart:typed_data';

import 'package:catch_dating_app/contexts/organizers/domain/club.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/hosts/presentation/club_management/create/widgets/create_club_photos_picker.dart';
import 'package:catch_dating_app/kernel/city_catalog.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/media/ordered_photo_picker.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class ClubBasicsStep extends StatelessWidget {
  const ClubBasicsStep({
    super.key,
    required this.formKey,
    this.autovalidateMode = AutovalidateMode.disabled,
    required this.nameController,
    this.selectedOrganizerType = OrganizerType.club,
    this.onOrganizerTypeChanged,
    required this.selectedCity,
    required this.onCityChanged,
    required this.areaController,
    required this.clubPhotoPreviews,
    required this.existingImageUrl,
    required this.profileImageBytes,
    required this.existingProfileImageUrl,
    required this.onPickClubPhotos,
    required this.onRemoveClubPhoto,
    required this.onReorderClubPhoto,
    required this.onPickProfileImage,
    required this.onRemoveProfileImage,
    this.detailsEnabled = true,
  });

  final GlobalKey<FormState> formKey;
  final AutovalidateMode autovalidateMode;
  final TextEditingController nameController;
  final OrganizerType selectedOrganizerType;
  final ValueChanged<OrganizerType>? onOrganizerTypeChanged;
  final CityOption? selectedCity;
  final ValueChanged<CityOption?> onCityChanged;
  final TextEditingController areaController;
  final List<OrderedPhotoPreview> clubPhotoPreviews;
  final String? existingImageUrl;
  final Uint8List? profileImageBytes;
  final String? existingProfileImageUrl;
  final VoidCallback? onPickClubPhotos;
  final ValueChanged<int>? onRemoveClubPhoto;
  final void Function(int fromIndex, int toIndex)? onReorderClubPhoto;
  final VoidCallback? onPickProfileImage;
  final VoidCallback? onRemoveProfileImage;
  final bool detailsEnabled;

  @override
  Widget build(BuildContext context) {
    return Form(
      key: formKey,
      autovalidateMode: autovalidateMode,
      child: SingleChildScrollView(
        padding: CatchInsets.formStepBodyWithBottomActions,
        child: CatchSectionList(
          emptyStateOmitted: true,
          gap: 0,
          children: [
            CatchSection.plain(
              child: Column(
                children: [
                  CreateClubProfileImagePicker(
                    imageBytes: profileImageBytes,
                    existingImageUrl: existingProfileImageUrl,
                    onTap: onPickProfileImage,
                    onRemove: onRemoveProfileImage,
                  ),
                  gapH16,
                  CreateClubPhotosPicker(
                    photos: clubPhotoPreviews,
                    existingImageUrl: existingImageUrl,
                    onAddPhotos: onPickClubPhotos,
                    onRemovePhoto: onRemoveClubPhoto,
                    onReorderPhoto: onReorderClubPhoto,
                  ),
                ],
              ),
            ),
            CatchSection.fieldRows(
              children: [
                CatchField<OrganizerType>.choices(
                  copy: catchFieldCopy(context.l10n),
                  title: context.l10n.hostsOrganizerTypeLabel,
                  contract: CatchContractConstraints
                      .createClubCallablePayloadOrganizerType,
                  contractValueBuilder: (value) => value.name,
                  body: _organizerTypeLabel(context, selectedOrganizerType),
                  icon: CatchIcons.people,
                  values: OrganizerType.values,
                  itemLabelBuilder: (type) =>
                      _organizerTypeLabel(context, type),
                  selected: {selectedOrganizerType},
                  states: <WidgetState>{
                    if (!detailsEnabled) WidgetState.disabled,
                  },
                  onSelectionChanged: detailsEnabled
                      ? (selection) {
                          if (selection.isNotEmpty) {
                            onOrganizerTypeChanged?.call(selection.single);
                          }
                        }
                      : null,
                ),
                CatchField.input(
                  copy: catchFieldCopy(context.l10n),
                  title: context.l10n.hostsClubBasicsStepTitleClubName,
                  contract:
                      CatchContractConstraints.createClubCallablePayloadName,
                  controller: nameController,
                  icon: CatchIcons.people,
                  states: <WidgetState>{
                    if (!detailsEnabled) WidgetState.disabled,
                  },
                  textCapitalization: TextCapitalization.words,
                  textInputAction: TextInputAction.next,
                  onValidate: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return context
                          .l10n
                          .hostsClubBasicsStepVisiblecopyPleaseEnterAClub;
                    }
                    return null;
                  },
                ),
                FormField<CityOption>(
                  key: ValueKey<String>(
                    'create-club-city-${selectedCity?.effectiveMarketId ?? 'empty'}',
                  ),
                  initialValue: selectedCity,
                  validator: (value) => value == null
                      ? context
                            .l10n
                            .hostsClubBasicsStepVisiblecopyPleaseSelectACity
                      : null,
                  builder: (field) => CatchFieldLanes.single(
                    child: CatchField<CityOption>.choices(
                      copy: catchFieldCopy(context.l10n),
                      title: context.l10n.hostsClubBasicsStepTitleCity,
                      contract: CatchContractConstraints
                          .createClubCallablePayloadLocation,
                      contractValueBuilder: (city) => city.effectiveMarketId,
                      body: selectedCity?.label,
                      icon: CatchIcons.city,
                      values: defaultCityOptions
                          .where((city) => city.hostCreatable)
                          .toList(growable: false),
                      itemLabelBuilder: (city) => city.label,
                      selected: selectedCity == null
                          ? const <CityOption>{}
                          : {selectedCity!},
                      states: <WidgetState>{
                        if (!detailsEnabled) WidgetState.disabled,
                      },
                      error: field.errorText,
                      onSelectionChanged: detailsEnabled
                          ? (selection) {
                              final next = selection.isEmpty
                                  ? null
                                  : selection.single;
                              field.didChange(next);
                              field.validate();
                              onCityChanged(next);
                            }
                          : null,
                    ),
                  ),
                ),
                CatchField.input(
                  copy: catchFieldCopy(context.l10n),
                  title: context.l10n.hostsClubBasicsStepTitleAreaNeighbourhood,
                  contract:
                      CatchContractConstraints.createClubCallablePayloadArea,
                  controller: areaController,
                  icon: CatchIcons.location,
                  states: <WidgetState>{
                    if (!detailsEnabled) WidgetState.disabled,
                  },
                  inputHint: context
                      .l10n
                      .hostsClubBasicsStepPlaceholderEGBandraKoramangala,
                  textCapitalization: TextCapitalization.words,
                  textInputAction: TextInputAction.next,
                  onValidate: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return context
                          .l10n
                          .hostsClubBasicsStepVisiblecopyPleaseEnterAnArea;
                    }
                    return null;
                  },
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

String _organizerTypeLabel(BuildContext context, OrganizerType type) =>
    switch (type) {
      OrganizerType.club => context.l10n.hostsOrganizerTypeClub,
      OrganizerType.community => context.l10n.hostsOrganizerTypeCommunity,
      OrganizerType.individual => context.l10n.hostsOrganizerTypeIndividual,
      OrganizerType.eventProducer =>
        context.l10n.hostsOrganizerTypeEventProducer,
      OrganizerType.venue => context.l10n.hostsOrganizerTypeVenue,
      OrganizerType.brand => context.l10n.hostsOrganizerTypeBrand,
    };
