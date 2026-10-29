import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/phone_contact_picker.dart';
import 'package:catch_dating_app/contexts/programmes/domain/phone_contact.dart';
import 'package:catch_dating_app/contexts/programmes/domain/phone_import_batch.dart';
import 'package:catch_dating_app/contexts/programmes/domain/phone_import_draft.dart';
import 'package:catch_dating_app/hosts/audience/phone_import/presentation/phone_import_controller.dart';
import 'package:catch_dating_app/hosts/audience/phone_import/presentation/phone_import_review_screen.dart';
import 'package:catch_dating_app/hosts/audience/phone_import/presentation/phone_import_route_controller.dart';
import 'package:catch_dating_app/hosts/audience/phone_import/presentation/phone_import_route_state.dart';
import 'package:catch_dating_app/hosts/audience/phone_import/presentation/phone_import_screen.dart';
import 'package:catch_dating_app/hosts/audience/phone_import/presentation/widgets/phone_import_guest_section.dart';
import 'package:catch_dating_app/hosts/audience/phone_import/presentation/widgets/phone_import_saved_review_section.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/page_preview.dart';
import 'package:widgetbook_workspace/support/widgetbook_harness.dart';

@widgetbook.UseCase(
  name: 'Local demo · empty and selected guests',
  type: PhoneImportReviewScreen,
  path: '[P1 product surfaces]/Host/Audience/Phone import demo',
)
Widget hostPhoneImportReviewStates(BuildContext context) =>
    WidgetbookScrollCatalogFrame(
      title: 'PhoneImportReviewScreen · unconnected demo',
      catalogId: 'host.phone_import_demo',
      children: [
        for (final selected in [false, true])
          WidgetbookPageStateCard(
            label: selected ? 'Guests need review' : 'Choose contacts',
            description: 'Synthetic contacts only. No save or CRM transport.',
            child: WidgetbookViewportFrame.constrainedDevice(
              size: const Size(390, 812),
              child: _PhoneImportDemo(selected: selected),
            ),
          ),
      ],
    );

@widgetbook.UseCase(
  name: 'Multiple numbers, no number, and household member',
  type: PhoneImportGuestSection,
  path: '[P1 product surfaces]/Host/Audience/Phone import demo',
)
Widget hostPhoneImportGuestStates(BuildContext context) =>
    WidgetbookScrollCatalogFrame(
      title: 'PhoneImportGuestSection',
      catalogId: 'host.phone_import_guest_demo',
      children: [
        for (final (index, entry) in _guestEntries.indexed)
          WidgetbookPageStateCard(
            label: switch (index) {
              0 => 'Choose a number and enter a name',
              1 => 'No-number contact stays invalid',
              _ => 'Household member without a phone',
            },
            child: WidgetbookContentFrame(
              child: PhoneImportGuestSection(
                entry: entry,
                guestNumber: index + 1,
                busy: false,
                sharedPhone: false,
                onRename: (_) {},
                onChoosePhone: (_) {},
                onFamilySideChanged: (_) {},
                onHouseholdChanged: (_) {},
                onRemove: () {},
              ),
            ),
          ),
      ],
    );

class _PhoneImportDemo extends StatefulWidget {
  const _PhoneImportDemo({required this.selected});
  final bool selected;

  @override
  State<_PhoneImportDemo> createState() => _PhoneImportDemoState();
}

class _PhoneImportDemoState extends State<_PhoneImportDemo> {
  late final _controller = PhoneImportController(picker: _SyntheticPicker());

  @override
  void initState() {
    super.initState();
    if (widget.selected) unawaited(_controller.pickContacts());
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => PhoneImportReviewScreen(
    controller: _controller,
    weddingName: 'Asha & Ravi · sample wedding',
  );
}

class _SyntheticPicker implements PhoneContactPicker {
  @override
  Future<PhoneContactPickerResult> pickContacts() async =>
      PhoneContactPickerResult(PhoneContactPickerStatus.selected, [
        PhoneContact(
          localId: 'sample-asha',
          displayName: 'Asha Shah',
          numbers: const [
            PhoneContactNumber(value: '+1 202 555 0106', label: 'Mobile'),
            PhoneContactNumber(value: '+1 202 555 0107', label: 'Home'),
          ],
        ),
        PhoneContact(
          localId: 'sample-nameless',
          displayName: '',
          numbers: const [PhoneContactNumber(value: '+1 202 555 0108')],
        ),
      ]);
}

final _guestEntries = [
  PhoneImportEntry(
    id: 'preview-multiple',
    displayName: '',
    numbers: const [
      PhoneContactNumber(value: '+1 202 555 0106', label: 'Mobile'),
      PhoneContactNumber(value: '+1 202 555 0107', label: 'Home'),
    ],
  ),
  PhoneImportEntry(
    id: 'preview-no-number',
    displayName: 'Ravi Rao',
    numbers: const [],
  ),
  PhoneImportEntry(
    id: 'preview-manual',
    displayName: 'Mira Rao',
    household: 'Rao household',
    familySide: PhoneImportFamilySide.partnerTwo,
    source: PhoneImportEntrySource.manualHouseholdMember,
    numbers: const [],
  ),
];

@widgetbook.UseCase(
  name: 'Saved review · synthetic read-only rows',
  type: PhoneImportSavedReviewSection,
  path: '[P1 product surfaces]/Host/Audience/Phone import demo',
)
Widget hostPhoneImportSavedReviewState(BuildContext context) =>
    WidgetbookScrollCatalogFrame(
      title: 'PhoneImportSavedReviewSection · synthetic review',
      catalogId: 'host.phone_import_saved_review_demo',
      children: [
        WidgetbookPageStateCard(
          label: 'Confirmed selected rows',
          description:
              'Synthetic retained command only. This preview sends no import.',
          child: WidgetbookContentFrame(
            child: PhoneImportSavedReviewSection(
              batch: PhoneImportBatch.fromReview(
                accountId: 'preview_actor',
                programId: 'preview_wedding',
                organizerId: 'preview_planner',
                familySideLabels: const {},
                review: PhoneImportReview(
                  reviewId: 'preview_operation_01',
                  entries: [
                    PhoneImportEntry(
                      id: 'preview_manual_member',
                      displayName: 'Synthetic household member',
                      household: 'Sample household',
                      source: PhoneImportEntrySource.manualHouseholdMember,
                      numbers: const [],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'Workspace route · access unavailable',
  type: PhoneImportScreen,
  path: '[P1 product surfaces]/Host/Audience/Phone import demo',
)
Widget hostPhoneImportAccessUnavailableState(
  BuildContext context,
) => WidgetbookScrollCatalogFrame(
  title: 'PhoneImportScreen · access unavailable demo',
  catalogId: 'host.phone_import_access_unavailable_demo',
  children: [
    WidgetbookPageStateCard(
      label: 'No current workspace authority',
      description:
          'Synthetic failure seam. No grant, Contacts permission or CRM transport.',
      child: WidgetbookViewportFrame.constrainedDevice(
        size: const Size(390, 812),
        child: ProviderScope(
          overrides: [
            phoneImportRouteControllerProvider.overrideWith(
              _UnavailablePhoneImportRouteController.new,
            ),
            uidProvider.overrideWith(
              (ref) => Stream<String?>.value('preview_actor'),
            ),
          ],
          child: const PhoneImportScreen(programId: 'preview_wedding'),
        ),
      ),
    ),
  ],
);

class _UnavailablePhoneImportRouteController
    extends PhoneImportRouteController {
  @override
  String? readAccountId() => 'preview_actor';
  @override
  Future<PhoneImportRouteSession> open({
    required String programId,
    required bool Function() isCurrent,
  }) async => throw const PermissionException(
    'Synthetic preview has no wedding authority.',
  );
}
