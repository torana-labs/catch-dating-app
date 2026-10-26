part of '../host_operations_screen.dart';

/// Identity and contact row descriptors for [HostClubEditBody].
extension _HostClubEditRows on _HostClubEditBodyState {
  List<CatchFormRowDescriptor<UpdateClubPatch>> _identityRows(
    BuildContext context,
    Club club,
    List<_HostClubCityOption> cityOptions,
  ) {
    final organizerTypeOptions = [
      for (final type in OrganizerType.values)
        _HostOrganizerTypeOption(
          value: type,
          label: _hostOrganizerTypeLabel(context, type),
        ),
    ];
    final selectedOrganizerType = organizerTypeOptions.firstWhere(
      (option) => option.value == club.organizerType,
    );
    if (!widget.isOwner) {
      return [
        CatchFormReadRow<UpdateClubPatch>(
          id: HostClubEditFieldKeys.organizerType,
          icon: CatchIcons.people,
          label: context.l10n.hostsOrganizerTypeLabel,
          body: selectedOrganizerType.label,
        ),
        CatchFormReadRow<UpdateClubPatch>(
          id: HostClubEditFieldKeys.name,
          icon: CatchIcons.people,
          label: context.l10n.hostsHostClubProfileLabelClubName,
          body: club.name,
        ),
        CatchFormReadRow<UpdateClubPatch>(
          id: HostClubEditFieldKeys.location,
          icon: CatchIcons.city,
          label: context.l10n.hostsHostClubProfileLabelCity,
          body: cityLabel(club.location),
        ),
        CatchFormReadRow<UpdateClubPatch>(
          id: HostClubEditFieldKeys.area,
          icon: CatchIcons.location,
          label: context.l10n.hostsHostClubProfileLabelAreaNeighbourhood,
          body: _valueOrDash(club.area),
        ),
        CatchFormReadRow<UpdateClubPatch>(
          id: HostClubEditFieldKeys.description,
          icon: CatchIcons.document,
          label: context.l10n.hostsHostClubProfileLabelDescription,
          body: _valueOrDash(club.description),
        ),
      ];
    }
    return [
      CatchFormSingleChoiceRow<UpdateClubPatch, _HostOrganizerTypeOption>(
        itemLabel: (value) => value.label,
        id: HostClubEditFieldKeys.organizerType,
        icon: CatchIcons.people,
        label: context.l10n.hostsOrganizerTypeLabel,
        values: organizerTypeOptions,
        value: selectedOrganizerType,
        allowEmptySelection: false,
        contract: CatchContractConstraints.updateClubPatchOrganizerType,
        contractValue: (option) => option.value.name,
        patchForValue: (value) => UpdateClubPatch(organizerType: value!.value),
      ),
      CatchFormTextRow<UpdateClubPatch>(
        validationCopy: catchFormValidationCopy(context.l10n),
        id: HostClubEditFieldKeys.name,
        icon: CatchIcons.people,
        label: context.l10n.hostsHostClubProfileLabelClubName,
        currentValue: club.name,
        currentFieldValue: club.name,
        placeholder: club.name,
        normalizeInput: _normalizeSingleLineInput,
        contract: CatchContractConstraints.updateClubPatchName,
        patchForValue: (value) => UpdateClubPatch(name: value as String),
      ),
      CatchFormSingleChoiceRow<UpdateClubPatch, _HostClubCityOption>(
        itemLabel: (value) => value.label,
        id: HostClubEditFieldKeys.location,
        icon: CatchIcons.city,
        label: context.l10n.hostsHostClubProfileLabelCity,
        values: cityOptions,
        value: cityOptions.firstWhere((city) => city.value == club.location),
        allowEmptySelection: false,
        contract: CatchContractConstraints.updateClubPatchLocation,
        contractValue: (option) => option.value,
        patchForValue: (value) => UpdateClubPatch(location: value!.value),
      ),
      CatchFormTextRow<UpdateClubPatch>(
        validationCopy: catchFormValidationCopy(context.l10n),
        id: HostClubEditFieldKeys.area,
        icon: CatchIcons.location,
        label: context.l10n.hostsHostClubProfileLabelAreaNeighbourhood,
        currentValue: club.area,
        currentFieldValue: club.area,
        placeholder: _valueOrDash(club.area),
        normalizeInput: _normalizeSingleLineInput,
        contract: CatchContractConstraints.updateClubPatchArea,
        patchForValue: (value) => UpdateClubPatch(area: value as String),
      ),
      CatchFormTextRow<UpdateClubPatch>(
        validationCopy: catchFormValidationCopy(context.l10n),
        id: HostClubEditFieldKeys.description,
        icon: CatchIcons.document,
        label: context.l10n.hostsHostClubProfileLabelDescription,
        currentValue: club.description,
        currentFieldValue: club.description,
        placeholder: _valueOrDash(club.description),
        keyboardType: TextInputType.multiline,
        maxLines: 3,
        minLines: 2,
        normalizeInput: _normalizeMultilineInput,
        contract: CatchContractConstraints.updateClubPatchDescription,
        patchForValue: (value) => UpdateClubPatch(description: value as String),
      ),
    ];
  }

  List<CatchFormRowDescriptor<UpdateClubPatch>> _contactRows(
    BuildContext context,
    Club club,
  ) {
    if (!widget.isOwner) {
      return [
        CatchFormReadRow<UpdateClubPatch>(
          id: HostClubEditFieldKeys.instagramHandle,
          icon: CatchIcons.handle,
          label: context.l10n.hostsHostClubProfileLabelInstagram,
          body: _valueOrDash(club.instagramHandle),
        ),
        CatchFormReadRow<UpdateClubPatch>(
          id: HostClubEditFieldKeys.phoneNumber,
          icon: CatchIcons.phone,
          label: context.l10n.hostsHostClubProfileLabelPhone,
          body: _valueOrDash(club.phoneNumber),
        ),
        CatchFormReadRow<UpdateClubPatch>(
          id: HostClubEditFieldKeys.email,
          icon: CatchIcons.email,
          label: context.l10n.hostsHostClubProfileLabelEmail,
          body: _valueOrDash(club.email),
        ),
      ];
    }
    return [
      CatchFormTextRow<UpdateClubPatch>(
        validationCopy: catchFormValidationCopy(context.l10n),
        id: HostClubEditFieldKeys.instagramHandle,
        icon: CatchIcons.handle,
        label: context.l10n.hostsHostClubProfileLabelInstagram,
        currentValue: club.instagramHandle ?? '',
        currentFieldValue: club.instagramHandle,
        placeholder: context.l10n.hostsHostClubProfilePlaceholderYourclub
            .replaceFirst(RegExp(r'^@'), ''),
        keyboardType: TextInputType.text,
        normalizeInput: (value) =>
            _normalizeSingleLineInput(value).replaceFirst(RegExp(r'^@'), ''),
        toFieldValue: _optionalStringFieldValue,
        contract: CatchContractConstraints.updateClubPatchInstagramHandle,
        patchForValue: (value) => UpdateClubPatch(instagramHandle: value),
      ),
      CatchFormTextRow<UpdateClubPatch>(
        validationCopy: catchFormValidationCopy(context.l10n),
        id: HostClubEditFieldKeys.phoneNumber,
        icon: CatchIcons.phone,
        label: context.l10n.hostsHostClubProfileLabelPhone,
        currentValue: club.phoneNumber ?? '',
        currentFieldValue: club.phoneNumber,
        placeholder: '98765 43210',
        keyboardType: TextInputType.phone,
        normalizeInput: _normalizeSingleLineInput,
        toFieldValue: _optionalStringFieldValue,
        contract: CatchContractConstraints.updateClubPatchPhoneNumber,
        patchForValue: (value) => UpdateClubPatch(phoneNumber: value),
      ),
      CatchFormTextRow<UpdateClubPatch>(
        validationCopy: catchFormValidationCopy(context.l10n),
        id: HostClubEditFieldKeys.email,
        icon: CatchIcons.email,
        label: context.l10n.hostsHostClubProfileLabelEmail,
        currentValue: club.email ?? '',
        currentFieldValue: club.email,
        placeholder:
            context.l10n.hostsHostClubProfilePlaceholderHelloYourclubCom,
        keyboardType: TextInputType.emailAddress,
        normalizeInput: _normalizeSingleLineInput,
        validator: (value) => _optionalEmailValidator(value, context.l10n),
        toFieldValue: _optionalStringFieldValue,
        contract: CatchContractConstraints.updateClubPatchEmail,
        patchForValue: (value) => UpdateClubPatch(email: value),
      ),
    ];
  }
}

final class _HostClubCityOption implements Labelled {
  const _HostClubCityOption({required this.value, required this.label});

  final String value;
  @override
  final String label;
}

final class _HostOrganizerTypeOption implements Labelled {
  const _HostOrganizerTypeOption({required this.value, required this.label});

  final OrganizerType value;
  @override
  final String label;
}

String _hostOrganizerTypeLabel(BuildContext context, OrganizerType type) =>
    switch (type) {
      OrganizerType.club => context.l10n.hostsOrganizerTypeClub,
      OrganizerType.community => context.l10n.hostsOrganizerTypeCommunity,
      OrganizerType.individual => context.l10n.hostsOrganizerTypeIndividual,
      OrganizerType.eventProducer =>
        context.l10n.hostsOrganizerTypeEventProducer,
      OrganizerType.venue => context.l10n.hostsOrganizerTypeVenue,
      OrganizerType.brand => context.l10n.hostsOrganizerTypeBrand,
    };
