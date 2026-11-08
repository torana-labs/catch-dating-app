import 'package:catch_dating_app/design_fixtures/host_operations_fixtures.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customer_editor.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/page_preview.dart';
import 'preview.dart';
import 'shell_fixture.dart';

/// The add-a-person route is the one legacy Customers surface still routed.
Widget _hostAddCustomerCatalog(String title) => WidgetbookPageCatalogFrame(
  title: title,
  contractId: 'screen.host.customers',
  children: [
    WidgetbookPageStateCard(
      label: 'full-page add customer',
      child: WidgetbookHostDeviceFrame(
        child: WidgetbookHostShellScope(
          child: HostAddCustomerScreen(
            organizerId: HostOperationsFixtures.primaryOrganizer.id,
          ),
        ),
      ),
    ),
  ],
);

@widgetbook.UseCase(
  name: 'Full-page add state',
  type: HostAddCustomerScreen,
  path: '[P1 product surfaces]/Host operations/Customers',
)
Widget hostAddCustomerScreenStates(BuildContext context) =>
    _hostAddCustomerCatalog('HostAddCustomerScreen');

@widgetbook.UseCase(
  name: 'Identity input states',
  type: HostCustomerIdentityInputSection,
  path: '[P1 product surfaces]/Host operations/Customers',
)
Widget hostCustomerIdentityInputStates(BuildContext context) =>
    _hostAddCustomerCatalog('HostCustomerIdentityInputSection');
