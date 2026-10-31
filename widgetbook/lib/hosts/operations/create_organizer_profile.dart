import 'package:catch_dating_app/hosts/presentation/host_operations_screen.dart';
import 'package:catch_dating_app/hosts/presentation/organizer_management/create/widgets/create_organizer_contact_section.dart';
import 'package:catch_dating_app/hosts/presentation/organizer_management/create/widgets/create_organizer_photos_picker.dart';
import 'package:catch_dating_app/hosts/presentation/organizer_management/create/widgets/organizer_basics_step.dart';
import 'package:catch_dating_app/hosts/presentation/organizer_management/create/widgets/organizer_details_step.dart';
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
  type: OrganizerBasicsStep,
  path: '[P1 product surfaces]/Host create club',
)
Widget organizerBasicsStepCatalogStates(BuildContext context) {
  return const WidgetbookPageCatalogFrame(
    title: 'OrganizerBasicsStep',
    contractId: 'component.host.club.basics_step',
    children: [
      WidgetbookPageStateCard(
        label: 'prefilled',
        child: WidgetbookHostDeviceFrame(child: _OrganizerBasicsStepFrame()),
      ),
      WidgetbookPageStateCard(
        label: 'validation',
        child: WidgetbookHostDeviceFrame(
          child: _OrganizerBasicsStepFrame(validate: true),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Form states',
  type: OrganizerDetailsStep,
  path: '[P1 product surfaces]/Host create club',
)
Widget organizerDetailsStepCatalogStates(BuildContext context) {
  return const WidgetbookPageCatalogFrame(
    title: 'OrganizerDetailsStep',
    contractId: 'component.host.club.details_step',
    children: [
      WidgetbookPageStateCard(
        label: 'prefilled',
        child: WidgetbookHostDeviceFrame(child: _OrganizerDetailsStepFrame()),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contact states',
  type: CreateOrganizerContactSection,
  path: '[P1 product surfaces]/Host create club',
)
Widget createOrganizerContactFieldsCatalogStates(BuildContext context) {
  return const WidgetbookPageCatalogFrame(
    title: 'CreateOrganizerContactSection',
    contractId: 'component.host.club.contact_fields',
    children: [
      WidgetbookPageStateCard(
        label: 'filled',
        child: WidgetbookHostDeviceFrame(
          child: _CreateOrganizerContactSectionFrame(),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Media states',
  type: CreateOrganizerPhotosPicker,
  path: '[P1 product surfaces]/Host create club',
)
Widget createOrganizerPhotosPickerCatalogStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'CreateOrganizerPhotosPicker',
    contractId: 'component.host.club.photos_picker',
    children: [
      WidgetbookPageStateCard(
        label: 'empty',
        child: WidgetbookHostDeviceFrame(
          child: CreateOrganizerPhotosPicker(
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
          child: CreateOrganizerPhotosPicker(
            photos: widgetbookOrderedPhotoPreviews('club-photo', 3),
            onAddPhotos: () {},
            onRemovePhoto: (_) {},
            onReorderPhoto: (_, _) {},
            variant: CreateOrganizerPhotosPickerVariant.editStrip,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: '24-photo scalable gallery',
        child: WidgetbookHostDeviceFrame(
          child: CreateOrganizerPhotosPicker(
            photos: widgetbookOrderedPhotoPreviews('large-club-photo', 24),
            onAddPhotos: () {},
            onRemovePhoto: (_) {},
            onReorderPhoto: (_, _) {},
            variant: CreateOrganizerPhotosPickerVariant.editStrip,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'failed upload',
        child: WidgetbookHostDeviceFrame(
          child: CreateOrganizerPhotosPicker(
            photos: widgetbookOrderedPhotoPreviews(
              'failed-club-photo',
              3,
              failedIndex: 0,
            ),
            onAddPhotos: () {},
            onRemovePhoto: (_) {},
            onReorderPhoto: (_, _) {},
            onRetryPhoto: (_) {},
            variant: CreateOrganizerPhotosPickerVariant.editStrip,
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
      header: CreateOrganizerProfileImagePicker(
        imageBytes: widgetbookCreateOrganizerPngBytes(),
        onTap: () {},
        onRemove: () {},
        variant: CreateOrganizerProfileImagePickerVariant.editLogo,
      ),
    ),
  );
}

@widgetbook.UseCase(
  name: 'Role-sized summary states',
  type: HostOrganizerMediaRail,
  path: '[P1 product surfaces]/Host organizer',
)
Widget hostOrganizerMediaRailCatalogStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'HostOrganizerMediaRail',
    contractId: 'component.host.club.photos_picker',
    children: [
      WidgetbookPageStateCard(
        label: 'logo, cover, and gallery',
        child: WidgetbookHostDeviceFrame(
          child: HostOrganizerMediaRail(
            logoImageBytes: widgetbookCreateOrganizerPngBytes(),
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
          child: HostOrganizerMediaRail(
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
  type: HostOrganizerLogoManagerHeader,
  path: '[P1 product surfaces]/Host organizer',
)
Widget hostOrganizerLogoManagerHeaderStates(BuildContext context) =>
    widgetbookHostComponentStates('HostOrganizerLogoManagerHeader', [
      (
        'logo picked',
        HostOrganizerLogoManagerHeader(
          imageBytes: widgetbookCreateOrganizerPngBytes(),
          existingImageUrl: null,
          onPickLogo: () async => null,
          onRemoveLogo: () async {},
        ),
      ),
      (
        'no logo',
        HostOrganizerLogoManagerHeader(
          imageBytes: null,
          existingImageUrl: null,
          onPickLogo: () async => null,
          onRemoveLogo: () async {},
        ),
      ),
    ]);

@widgetbook.UseCase(
  name: 'Save dock',
  type: HostOrganizerMediaManagerDock,
  path: '[P1 product surfaces]/Host organizer',
)
Widget hostOrganizerMediaManagerDockStates(BuildContext context) =>
    widgetbookHostComponentStates('HostOrganizerMediaManagerDock', [
      (
        'ready to save',
        HostOrganizerMediaManagerDock(
          onSave: () async => false,
          errorText: (_) => null,
        ),
      ),
    ]);

@widgetbook.UseCase(
  name: 'Image states',
  type: CreateOrganizerProfileImagePicker,
  path: '[P1 product surfaces]/Host create club',
)
Widget createOrganizerProfileImagePickerCatalogStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'CreateOrganizerProfileImagePicker',
    contractId: 'component.host.club.profile_image_picker',
    children: [
      WidgetbookPageStateCard(
        label: 'standard',
        child: WidgetbookHostDeviceFrame(
          child: CreateOrganizerProfileImagePicker(
            imageBytes: widgetbookCreateOrganizerPngBytes(),
            onTap: () {},
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'edit logo',
        child: WidgetbookHostDeviceFrame(
          child: CreateOrganizerProfileImagePicker(
            imageBytes: widgetbookCreateOrganizerPngBytes(),
            onTap: () {},
            onRemove: () {},
            variant: CreateOrganizerProfileImagePickerVariant.editLogo,
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Profile image tile states',
  type: OrganizerProfileImageTile,
  path: '[P1 product surfaces]/Host create club',
)
Widget organizerProfileImageTileCatalogStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'OrganizerProfileImageTile',
    contractId: 'component.host.club.profile_image_tile',
    children: [
      WidgetbookPageStateCard(
        label: 'empty large',
        child: OrganizerProfileImageTile(
          imageBytes: null,
          existingImageUrl: null,
          onTap: () {},
          size: CatchLayout.organizerProfileImagePickerExtent,
          showEmptyLabel: true,
        ),
      ),
      WidgetbookPageStateCard(
        label: 'logo filled',
        child: OrganizerProfileImageTile(
          imageBytes: widgetbookCreateOrganizerPngBytes(),
          existingImageUrl: null,
          onTap: () {},
          size: 64,
        ),
      ),
    ],
  );
}

class _OrganizerBasicsStepFrame extends StatefulWidget {
  const _OrganizerBasicsStepFrame({this.validate = false});

  final bool validate;

  @override
  State<_OrganizerBasicsStepFrame> createState() =>
      _OrganizerBasicsStepFrameState();
}

class _OrganizerBasicsStepFrameState extends State<_OrganizerBasicsStepFrame> {
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
        : cityOptionByName(widgetbookOrganizer.location);
  }

  @override
  void dispose() {
    _nameController.dispose();
    _areaController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return OrganizerBasicsStep(
      formKey: _formKey,
      autovalidateMode: widget.validate
          ? AutovalidateMode.always
          : AutovalidateMode.disabled,
      nameController: _nameController,
      selectedCity: _selectedCity,
      onCityChanged: (city) => setState(() => _selectedCity = city),
      areaController: _areaController,
      organizerPhotoPreviews: widget.validate
          ? const []
          : widgetbookOrderedPhotoPreviews('club-basics-photo', 2),
      existingImageUrl: null,
      profileImageBytes: widget.validate
          ? null
          : widgetbookCreateOrganizerPngBytes(),
      existingProfileImageUrl: null,
      onPickOrganizerPhotos: () {},
      onRemoveOrganizerPhoto: (_) {},
      onReorderOrganizerPhoto: (_, _) {},
      onPickProfileImage: () {},
      onRemoveProfileImage: () {},
    );
  }
}

class _OrganizerDetailsStepFrame extends StatefulWidget {
  const _OrganizerDetailsStepFrame();

  @override
  State<_OrganizerDetailsStepFrame> createState() =>
      _OrganizerDetailsStepFrameState();
}

class _OrganizerDetailsStepFrameState
    extends State<_OrganizerDetailsStepFrame> {
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
    return OrganizerDetailsStep(
      formKey: _formKey,
      descriptionController: _descriptionController,
      instagramController: _instagramController,
      phoneController: _phoneController,
      emailController: _emailController,
    );
  }
}

class _CreateOrganizerContactSectionFrame extends StatefulWidget {
  const _CreateOrganizerContactSectionFrame();

  @override
  State<_CreateOrganizerContactSectionFrame> createState() =>
      _CreateOrganizerContactSectionFrameState();
}

class _CreateOrganizerContactSectionFrameState
    extends State<_CreateOrganizerContactSectionFrame> {
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
      child: CreateOrganizerContactSection(
        instagramController: _instagramController,
        phoneController: _phoneController,
        emailController: _emailController,
      ),
    );
  }
}
