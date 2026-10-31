part of '../host_operations_screen.dart';

/// Identity and contact row descriptors for [HostOrganizerEditBody].
extension _HostOrganizerEditRows on _HostOrganizerEditBodyState {
  List<CatchFormRowDescriptor<UpdateOrganizerPatch>> _identityRows(
    BuildContext context,
    Organizer organizer,
    List<_HostOrganizerCityOption> cityOptions,
  ) {
    final organizerTypeOptions = [
      for (final type in OrganizerType.values)
        _HostOrganizerTypeOption(
          value: type,
          label: _hostOrganizerTypeLabel(context, type),
        ),
    ];
    final selectedOrganizerType = organizerTypeOptions.firstWhere(
      (option) => option.value == organizer.organizerType,
    );
    if (!widget.isOwner) {
      return [
        CatchFormReadRow<UpdateOrganizerPatch>(
          id: HostOrganizerEditFieldKeys.organizerType,
          icon: CatchIcons.people,
          label: context.l10n.hostsOrganizerTypeLabel,
          body: selectedOrganizerType.label,
        ),
        CatchFormReadRow<UpdateOrganizerPatch>(
          id: HostOrganizerEditFieldKeys.name,
          icon: CatchIcons.people,
          label: context.l10n.hostsHostOrganizerProfileLabelOrganizerName,
          body: organizer.name,
        ),
        CatchFormReadRow<UpdateOrganizerPatch>(
          id: HostOrganizerEditFieldKeys.location,
          icon: CatchIcons.city,
          label: context.l10n.hostsHostOrganizerProfileLabelCity,
          body: cityLabel(organizer.location),
        ),
        CatchFormReadRow<UpdateOrganizerPatch>(
          id: HostOrganizerEditFieldKeys.area,
          icon: CatchIcons.location,
          label: context.l10n.hostsHostOrganizerProfileLabelAreaNeighbourhood,
          body: _valueOrDash(organizer.area),
        ),
        CatchFormReadRow<UpdateOrganizerPatch>(
          id: HostOrganizerEditFieldKeys.description,
          icon: CatchIcons.document,
          label: context.l10n.hostsHostOrganizerProfileLabelDescription,
          body: _valueOrDash(organizer.description),
        ),
      ];
    }
    return [
      CatchFormSingleChoiceRow<UpdateOrganizerPatch, _HostOrganizerTypeOption>(
        itemLabel: (value) => value.label,
        id: HostOrganizerEditFieldKeys.organizerType,
        icon: CatchIcons.people,
        label: context.l10n.hostsOrganizerTypeLabel,
        values: organizerTypeOptions,
        value: selectedOrganizerType,
        allowEmptySelection: false,
        contract: CatchContractConstraints.updateOrganizerCallablePayloadFieldsOrganizerType,
        contractValue: (option) => option.value.name,
        patchForValue: (value) =>
            UpdateOrganizerPatch(organizerType: value!.value),
      ),
      CatchFormTextRow<UpdateOrganizerPatch>(
        validationCopy: catchFormValidationCopy(context.l10n),
        id: HostOrganizerEditFieldKeys.name,
        icon: CatchIcons.people,
        label: context.l10n.hostsHostOrganizerProfileLabelOrganizerName,
        currentValue: organizer.name,
        currentFieldValue: organizer.name,
        placeholder: organizer.name,
        normalizeInput: _normalizeSingleLineInput,
        contract: CatchContractConstraints.updateOrganizerCallablePayloadFieldsName,
        patchForValue: (value) => UpdateOrganizerPatch(name: value as String),
      ),
      CatchFormSingleChoiceRow<UpdateOrganizerPatch, _HostOrganizerCityOption>(
        itemLabel: (value) => value.label,
        id: HostOrganizerEditFieldKeys.location,
        icon: CatchIcons.city,
        label: context.l10n.hostsHostOrganizerProfileLabelCity,
        values: cityOptions,
        value: cityOptions.firstWhere(
          (city) => city.value == organizer.location,
        ),
        allowEmptySelection: false,
        contract: CatchContractConstraints.updateOrganizerCallablePayloadFieldsLocation,
        contractValue: (option) => option.value,
        patchForValue: (value) => UpdateOrganizerPatch(location: value!.value),
      ),
      CatchFormTextRow<UpdateOrganizerPatch>(
        validationCopy: catchFormValidationCopy(context.l10n),
        id: HostOrganizerEditFieldKeys.area,
        icon: CatchIcons.location,
        label: context.l10n.hostsHostOrganizerProfileLabelAreaNeighbourhood,
        currentValue: organizer.area,
        currentFieldValue: organizer.area,
        placeholder: _valueOrDash(organizer.area),
        normalizeInput: _normalizeSingleLineInput,
        contract: CatchContractConstraints.updateOrganizerCallablePayloadFieldsArea,
        patchForValue: (value) => UpdateOrganizerPatch(area: value as String),
      ),
      CatchFormTextRow<UpdateOrganizerPatch>(
        validationCopy: catchFormValidationCopy(context.l10n),
        id: HostOrganizerEditFieldKeys.description,
        icon: CatchIcons.document,
        label: context.l10n.hostsHostOrganizerProfileLabelDescription,
        currentValue: organizer.description,
        currentFieldValue: organizer.description,
        placeholder: _valueOrDash(organizer.description),
        keyboardType: TextInputType.multiline,
        maxLines: 3,
        minLines: 2,
        normalizeInput: _normalizeMultilineInput,
        contract: CatchContractConstraints.updateOrganizerCallablePayloadFieldsDescription,
        patchForValue: (value) =>
            UpdateOrganizerPatch(description: value as String),
      ),
    ];
  }

  List<CatchFormRowDescriptor<UpdateOrganizerPatch>> _contactRows(
    BuildContext context,
    Organizer organizer,
  ) {
    if (!widget.isOwner) {
      return [
        CatchFormReadRow<UpdateOrganizerPatch>(
          id: HostOrganizerEditFieldKeys.instagramHandle,
          icon: CatchIcons.handle,
          label: context.l10n.hostsHostOrganizerProfileLabelInstagram,
          body: _valueOrDash(organizer.instagramHandle),
        ),
        CatchFormReadRow<UpdateOrganizerPatch>(
          id: HostOrganizerEditFieldKeys.phoneNumber,
          icon: CatchIcons.phone,
          label: context.l10n.hostsHostOrganizerProfileLabelPhone,
          body: _valueOrDash(organizer.phoneNumber),
        ),
        CatchFormReadRow<UpdateOrganizerPatch>(
          id: HostOrganizerEditFieldKeys.email,
          icon: CatchIcons.email,
          label: context.l10n.hostsHostOrganizerProfileLabelEmail,
          body: _valueOrDash(organizer.email),
        ),
      ];
    }
    return [
      CatchFormTextRow<UpdateOrganizerPatch>(
        validationCopy: catchFormValidationCopy(context.l10n),
        id: HostOrganizerEditFieldKeys.instagramHandle,
        icon: CatchIcons.handle,
        label: context.l10n.hostsHostOrganizerProfileLabelInstagram,
        currentValue: organizer.instagramHandle ?? '',
        currentFieldValue: organizer.instagramHandle,
        placeholder: context
            .l10n
            .hostsHostOrganizerProfilePlaceholderYourorganizer
            .replaceFirst(RegExp(r'^@'), ''),
        keyboardType: TextInputType.text,
        normalizeInput: (value) =>
            _normalizeSingleLineInput(value).replaceFirst(RegExp(r'^@'), ''),
        toFieldValue: _optionalStringFieldValue,
        contract: CatchContractConstraints.updateOrganizerCallablePayloadFieldsInstagramHandle,
        patchForValue: (value) => UpdateOrganizerPatch(instagramHandle: value),
      ),
      CatchFormTextRow<UpdateOrganizerPatch>(
        validationCopy: catchFormValidationCopy(context.l10n),
        id: HostOrganizerEditFieldKeys.phoneNumber,
        icon: CatchIcons.phone,
        label: context.l10n.hostsHostOrganizerProfileLabelPhone,
        currentValue: organizer.phoneNumber ?? '',
        currentFieldValue: organizer.phoneNumber,
        placeholder: '98765 43210',
        keyboardType: TextInputType.phone,
        normalizeInput: _normalizeSingleLineInput,
        toFieldValue: _optionalStringFieldValue,
        contract: CatchContractConstraints.updateOrganizerCallablePayloadFieldsPhoneNumber,
        patchForValue: (value) => UpdateOrganizerPatch(phoneNumber: value),
      ),
      CatchFormTextRow<UpdateOrganizerPatch>(
        validationCopy: catchFormValidationCopy(context.l10n),
        id: HostOrganizerEditFieldKeys.email,
        icon: CatchIcons.email,
        label: context.l10n.hostsHostOrganizerProfileLabelEmail,
        currentValue: organizer.email ?? '',
        currentFieldValue: organizer.email,
        placeholder: context
            .l10n
            .hostsHostOrganizerProfilePlaceholderHelloYourorganizerCom,
        keyboardType: TextInputType.emailAddress,
        normalizeInput: _normalizeSingleLineInput,
        validator: (value) => _optionalEmailValidator(value, context.l10n),
        toFieldValue: _optionalStringFieldValue,
        contract: CatchContractConstraints.updateOrganizerCallablePayloadFieldsEmail,
        patchForValue: (value) => UpdateOrganizerPatch(email: value),
      ),
    ];
  }
}

final class _HostOrganizerCityOption implements Labelled {
  const _HostOrganizerCityOption({required this.value, required this.label});

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
