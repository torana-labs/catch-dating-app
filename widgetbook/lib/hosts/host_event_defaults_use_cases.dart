import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/manager_event_setup_preferences.dart';
import 'package:catch_dating_app/hosts/events/event_defaults_details_body.dart';
import 'package:catch_dating_app/hosts/events/event_defaults_details_screen.dart';
import 'package:catch_dating_app/hosts/events/event_defaults_state.dart';
import 'package:catch_test_support/design_fixtures/host_operations_fixtures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

// The text and number event defaults editor: usual length, time zone and
// venue, offers, and payment suggestions, opened from Event defaults.

const _path = '[P1 product surfaces]/Host/Organizer';

@widgetbook.UseCase(
  name: 'Owner edits the defaults',
  type: HostEventDefaultsDetailsBody,
  path: _path,
)
Widget hostEventDefaultsDetailsBodyUseCase(BuildContext context) =>
    HostEventDefaultsDetailsBody(
      state: const HostEventDefaultsState(
        status: HostEventDefaultsStatus.ready,
        preferences: ManagerEventSetupPreferences(
          timezone: 'Asia/Kolkata',
          usualDurationMinutes: 120,
          offerValidityMinutes: 1440,
          collectionPreference: EventCollectionPreference.reusablePage,
          currency: 'INR',
          offerMessageTemplate: 'Your place is held for a day.',
          paymentInstructions: 'Pay on the page, then show the receipt.',
          reusablePaymentPage: ReusableOrganizerPaymentPage(
            'https://pay.example.com/sea-face',
            reusableForEvents: true,
          ),
        ),
      ),
      onChange: (_) {},
      onRetry: () {},
    );

@widgetbook.UseCase(
  name: 'A save on its way',
  type: HostEventDefaultsDetailsBody,
  path: _path,
)
Widget hostEventDefaultsDetailsBodySavingUseCase(BuildContext context) =>
    HostEventDefaultsDetailsBody(
      state: const HostEventDefaultsState(
        status: HostEventDefaultsStatus.ready,
        preferences: ManagerEventSetupPreferences(usualDurationMinutes: 90),
      ),
      onRetry: () {},
    );

@widgetbook.UseCase(
  name: 'Before the defaults load',
  type: HostEventDefaultsDetailsScreen,
  path: _path,
)
Widget hostEventDefaultsDetailsScreenUseCase(BuildContext context) =>
    ProviderScope(
      overrides: [uidProvider.overrideWith((ref) => Stream.value(null))],
      child: HostEventDefaultsDetailsScreen(
        organizerId: HostOperationsFixtures.primaryOrganizer.id,
        onChange: (_) {},
      ),
    );
