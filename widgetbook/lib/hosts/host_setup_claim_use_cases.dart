import 'package:catch_dating_app/contexts/organizers/domain/claimable_organizer.dart';
import 'package:catch_dating_app/hosts/onboarding/setup_claim_body.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/page_preview.dart';

import '../preview_layout_contracts.dart';

const _path = '[P1 product surfaces]/Host/Onboarding/Is this you?';

const _found = ClaimableOrganizer(
  organizerId: 'lantern-lane',
  sources: [
    ClaimableOrganizerSource.salesCrmVerified,
    ClaimableOrganizerSource.publicPage,
  ],
  prefill: ClaimableOrganizerPrefill(
    name: 'Lantern Lane Social',
    cityName: 'Mumbai',
    categoryLabel: 'Quiz nights',
  ),
  filled: [
    ClaimableOrganizerField.name,
    ClaimableOrganizerField.city,
    ClaimableOrganizerField.organizerType,
  ],
  missing: [
    ClaimableOrganizerField.description,
    ClaimableOrganizerField.photo,
    ClaimableOrganizerField.instagramHandle,
  ],
);

const _pending = ClaimableOrganizer(
  organizerId: 'moonmoth-supper',
  claimPending: true,
  sources: [ClaimableOrganizerSource.selfVerifiedSubmitter],
  prefill: ClaimableOrganizerPrefill(
    name: 'Moonmoth Supper Club',
    cityName: 'Bengaluru',
  ),
);

Widget _phone(Widget body) => SizedBox(
  width: WidgetbookPreviewLayout.phoneChromeWidth,
  height: WidgetbookPreviewLayout.hostEditorViewportHeight,
  child: CatchRoot(child: CatchScreen(body: body)),
);

@widgetbook.UseCase(
  name: 'Two pages found, one already claimed',
  type: HostSetupFoundBody,
  path: _path,
)
Widget hostSetupFoundStates(BuildContext context) => _phone(
  HostSetupFoundBody(
    candidates: const [_found, _pending],
    onClaim: (_) {},
    onNotMe: () {},
  ),
);

@widgetbook.UseCase(
  name: 'Name and role, and a failed send',
  type: HostSetupClaimFormBody,
  path: _path,
)
Widget hostSetupClaimFormStates(BuildContext context) =>
    WidgetbookScrollCatalogFrame(
      title: 'HostSetupClaimFormBody',
      catalogId: 'host.setup_claim_form',
      children: [
        for (final failed in [false, true])
          WidgetbookPageStateCard(
            label: failed ? 'Send failed' : 'Filled in',
            child: _phone(
              HostSetupClaimFormBody(
                organizer: _found,
                claimantName: 'Riya Kapoor',
                role: OrganizerClaimRole.founder,
                onNameChanged: (_) {},
                onRoleChanged: (_) {},
                sendError: failed
                    ? 'Catch could not send the claim. Try again.'
                    : null,
              ),
            ),
          ),
      ],
    );

@widgetbook.UseCase(
  name: 'What the page has and needs',
  type: HostSetupClaimSentBody,
  path: _path,
)
Widget hostSetupClaimSentStates(BuildContext context) =>
    _phone(HostSetupClaimSentBody(organizer: _found, onVerify: () {}));
