import 'package:catch_dating_app/hosts/presentation/club_management/create/widgets/club_basics_step.dart';
import 'package:catch_dating_app/hosts/presentation/club_management/create/widgets/club_details_step.dart';
import 'package:catch_dating_app/hosts/presentation/club_management/create/widgets/create_club_contact_section.dart';
import 'package:catch_dating_app/hosts/presentation/club_management/create/widgets/create_club_photos_picker.dart';
import 'package:catch_dating_app/hosts/presentation/host_operations_screen.dart';
import 'package:catch_dating_app/kernel/city_catalog.dart';
import 'package:catch_dating_app/platform/media/ordered_photo_picker.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/page_preview.dart';
import 'fixtures.dart';
import 'preview.dart';

@widgetbook.UseCase(
  name: 'Form states',
  type: ClubBasicsStep,
  path: '[P1 product surfaces]/Host create club',
)
Widget clubBasicsStepCatalogStates(BuildContext context) {
  return const WidgetbookPageCatalogFrame(
    title: 'ClubBasicsStep',
    contractId: 'component.host.club.basics_step',
    children: [
      WidgetbookPageStateCard(
        label: 'prefilled',
        child: WidgetbookHostDeviceFrame(child: _ClubBasicsStepFrame()),
      ),
      WidgetbookPageStateCard(
        label: 'validation',
        child: WidgetbookHostDeviceFrame(
          child: _ClubBasicsStepFrame(validate: true),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Form states',
  type: ClubDetailsStep,
  path: '[P1 product surfaces]/Host create club',
)
Widget clubDetailsStepCatalogStates(BuildContext context) {
  return const WidgetbookPageCatalogFrame(
    title: 'ClubDetailsStep',
    contractId: 'component.host.club.details_step',
    children: [
      WidgetbookPageStateCard(
        label: 'prefilled',
        child: WidgetbookHostDeviceFrame(child: _ClubDetailsStepFrame()),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contact states',
  type: CreateClubContactSection,
  path: '[P1 product surfaces]/Host create club',
)
Widget createClubContactFieldsCatalogStates(BuildContext context) {
  return const WidgetbookPageCatalogFrame(
    title: 'CreateClubContactSection',
    contractId: 'component.host.club.contact_fields',
    children: [
      WidgetbookPageStateCard(
        label: 'filled',
        child: WidgetbookHostDeviceFrame(
          child: _CreateClubContactSectionFrame(),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Media states',
  type: CreateClubPhotosPicker,
  path: '[P1 product surfaces]/Host create club',
)
Widget createClubPhotosPickerCatalogStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'CreateClubPhotosPicker',
    contractId: 'component.host.club.photos_picker',
    children: [
      WidgetbookPageStateCard(
        label: 'empty',
        child: WidgetbookHostDeviceFrame(
          child: CreateClubPhotosPicker(
            photos: const [],
            onAddPhotos: () {},
            onRemovePhoto: (_) {},
            onReorderPhoto: (_, _) {},
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'edit strip',
        child: WidgetbookHostDeviceFrame(
          child: CreateClubPhotosPicker(
            photos: widgetbookOrderedPhotoPreviews('club-photo', 3),
            onAddPhotos: () {},
            onRemovePhoto: (_) {},
            onReorderPhoto: (_, _) {},
            variant: CreateClubPhotosPickerVariant.editStrip,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: '24-photo scalable gallery',
        child: WidgetbookHostDeviceFrame(
          child: CreateClubPhotosPicker(
            photos: widgetbookOrderedPhotoPreviews('large-club-photo', 24),
            onAddPhotos: () {},
            onRemovePhoto: (_) {},
            onReorderPhoto: (_, _) {},
            variant: CreateClubPhotosPickerVariant.editStrip,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'failed upload',
        child: WidgetbookHostDeviceFrame(
          child: CreateClubPhotosPicker(
            photos: widgetbookOrderedPhotoPreviews(
              'failed-club-photo',
              3,
              failedIndex: 0,
            ),
            onAddPhotos: () {},
            onRemovePhoto: (_) {},
            onReorderPhoto: (_, _) {},
            onRetryPhoto: (_) {},
            variant: CreateClubPhotosPickerVariant.editStrip,
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Scalable gallery manager',
  type: OrderedPhotoManagerScreen,
  path: '[P1 product surfaces]/Host create club',
)
Widget orderedPhotoManagerCatalogState(BuildContext context) {
  return WidgetbookHostDeviceFrame(
    child: OrderedPhotoManagerScreen(
      photos: widgetbookOrderedPhotoPreviews('manager-photo', 24),
      onAddPhotos: () {},
      onRemovePhoto: (_) {},
      onReorderPhoto: (_, _) {},
      onRetryPhoto: (_) {},
      canAdd: true,
      header: CreateClubProfileImagePicker(
        imageBytes: widgetbookCreateClubPngBytes(),
        onTap: () {},
        onRemove: () {},
        variant: CreateClubProfileImagePickerVariant.editLogo,
      ),
    ),
  );
}

@widgetbook.UseCase(
  name: 'Role-sized summary states',
  type: HostClubMediaRail,
  path: '[P1 product surfaces]/Host organizer',
)
Widget hostClubMediaRailCatalogStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'HostClubMediaRail',
    contractId: 'component.host.club.photos_picker',
    children: [
      WidgetbookPageStateCard(
        label: 'logo, cover, and gallery',
        child: WidgetbookHostDeviceFrame(
          child: HostClubMediaRail(
            logoImageBytes: widgetbookCreateClubPngBytes(),
            logoImageUrl: null,
            photos: widgetbookOrderedPhotoPreviews('summary-photo', 3),
            logoBadgeLabel: 'LOGO',
            addPhotosLabel: 'Add photos',
            onManageMedia: () {},
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'compact empty',
        child: WidgetbookHostDeviceFrame(
          child: HostClubMediaRail(
            logoImageBytes: null,
            logoImageUrl: null,
            photos: const [],
            logoBadgeLabel: 'LOGO',
            addPhotosLabel: 'Add photos',
            onManageMedia: () {},
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Logo states',
  type: HostClubLogoManagerHeader,
  path: '[P1 product surfaces]/Host organizer',
)
Widget hostClubLogoManagerHeaderStates(BuildContext context) =>
    widgetbookHostComponentStates('HostClubLogoManagerHeader', [
      (
        'logo picked',
        HostClubLogoManagerHeader(
          imageBytes: widgetbookCreateClubPngBytes(),
          existingImageUrl: null,
          onPickLogo: () async => null,
          onRemoveLogo: () async {},
        ),
      ),
      (
        'no logo',
        HostClubLogoManagerHeader(
          imageBytes: null,
          existingImageUrl: null,
          onPickLogo: () async => null,
          onRemoveLogo: () async {},
        ),
      ),
    ]);

@widgetbook.UseCase(
  name: 'Save dock',
  type: HostClubMediaManagerDock,
  path: '[P1 product surfaces]/Host organizer',
)
Widget hostClubMediaManagerDockStates(BuildContext context) =>
    widgetbookHostComponentStates('HostClubMediaManagerDock', [
      (
        'ready to save',
        HostClubMediaManagerDock(
          onSave: () async => false,
          errorText: (_) => null,
        ),
      ),
    ]);

@widgetbook.UseCase(
  name: 'Image states',
  type: CreateClubProfileImagePicker,
  path: '[P1 product surfaces]/Host create club',
)
Widget createClubProfileImagePickerCatalogStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'CreateClubProfileImagePicker',
    contractId: 'component.host.club.profile_image_picker',
    children: [
      WidgetbookPageStateCard(
        label: 'standard',
        child: WidgetbookHostDeviceFrame(
          child: CreateClubProfileImagePicker(
            imageBytes: widgetbookCreateClubPngBytes(),
            onTap: () {},
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'edit logo',
        child: WidgetbookHostDeviceFrame(
          child: CreateClubProfileImagePicker(
            imageBytes: widgetbookCreateClubPngBytes(),
            onTap: () {},
            onRemove: () {},
            variant: CreateClubProfileImagePickerVariant.editLogo,
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Profile image tile states',
  type: ClubProfileImageTile,
  path: '[P1 product surfaces]/Host create club',
)
Widget clubProfileImageTileCatalogStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'ClubProfileImageTile',
    contractId: 'component.host.club.profile_image_tile',
    children: [
      WidgetbookPageStateCard(
        label: 'empty large',
        child: ClubProfileImageTile(
          imageBytes: null,
          existingImageUrl: null,
          onTap: () {},
          size: CatchLayout.clubProfileImagePickerExtent,
          showEmptyLabel: true,
        ),
      ),
      WidgetbookPageStateCard(
        label: 'logo filled',
        child: ClubProfileImageTile(
          imageBytes: widgetbookCreateClubPngBytes(),
          existingImageUrl: null,
          onTap: () {},
          size: 64,
        ),
      ),
    ],
  );
}

class _ClubBasicsStepFrame extends StatefulWidget {
  const _ClubBasicsStepFrame({this.validate = false});

  final bool validate;

  @override
  State<_ClubBasicsStepFrame> createState() => _ClubBasicsStepFrameState();
}

class _ClubBasicsStepFrameState extends State<_ClubBasicsStepFrame> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameController;
  late final TextEditingController _areaController;
  CityOption? _selectedCity;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(
      text: widget.validate ? '' : 'Sea Face Social Run Club',
    );
    _areaController = TextEditingController(
      text: widget.validate ? '' : 'Bandra West',
    );
    _selectedCity = widget.validate
        ? null
        : cityOptionByName(widgetbookClub.location);
  }

  @override
  void dispose() {
    _nameController.dispose();
    _areaController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ClubBasicsStep(
      formKey: _formKey,
      autovalidateMode: widget.validate
          ? AutovalidateMode.always
          : AutovalidateMode.disabled,
      nameController: _nameController,
      selectedCity: _selectedCity,
      onCityChanged: (city) => setState(() => _selectedCity = city),
      areaController: _areaController,
      clubPhotoPreviews: widget.validate
          ? const []
          : widgetbookOrderedPhotoPreviews('club-basics-photo', 2),
      existingImageUrl: null,
      profileImageBytes: widget.validate
          ? null
          : widgetbookCreateClubPngBytes(),
      existingProfileImageUrl: null,
      onPickClubPhotos: () {},
      onRemoveClubPhoto: (_) {},
      onReorderClubPhoto: (_, _) {},
      onPickProfileImage: () {},
      onRemoveProfileImage: () {},
    );
  }
}

class _ClubDetailsStepFrame extends StatefulWidget {
  const _ClubDetailsStepFrame();

  @override
  State<_ClubDetailsStepFrame> createState() => _ClubDetailsStepFrameState();
}

class _ClubDetailsStepFrameState extends State<_ClubDetailsStepFrame> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _descriptionController;
  late final TextEditingController _instagramController;
  late final TextEditingController _phoneController;
  late final TextEditingController _emailController;

  @override
  void initState() {
    super.initState();
    _descriptionController = TextEditingController(
      text:
          'Structured social runs with warm arrivals, conversational pacing, and a post-run cafe table.',
    );
    _instagramController = TextEditingController(text: 'seafaceruns');
    _phoneController = TextEditingController(text: '9876543210');
    _emailController = TextEditingController(text: 'hosts@seaface.example');
  }

  @override
  void dispose() {
    _descriptionController.dispose();
    _instagramController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ClubDetailsStep(
      formKey: _formKey,
      descriptionController: _descriptionController,
      instagramController: _instagramController,
      phoneController: _phoneController,
      emailController: _emailController,
    );
  }
}

class _CreateClubContactSectionFrame extends StatefulWidget {
  const _CreateClubContactSectionFrame();

  @override
  State<_CreateClubContactSectionFrame> createState() =>
      _CreateClubContactSectionFrameState();
}

class _CreateClubContactSectionFrameState
    extends State<_CreateClubContactSectionFrame> {
  late final TextEditingController _instagramController;
  late final TextEditingController _phoneController;
  late final TextEditingController _emailController;

  @override
  void initState() {
    super.initState();
    _instagramController = TextEditingController(text: 'seafaceruns');
    _phoneController = TextEditingController(text: '9876543210');
    _emailController = TextEditingController(text: 'hosts@seaface.example');
  }

  @override
  void dispose() {
    _instagramController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: CatchInsets.content,
      child: CreateClubContactSection(
        instagramController: _instagramController,
        phoneController: _phoneController,
        emailController: _emailController,
      ),
    );
  }
}
