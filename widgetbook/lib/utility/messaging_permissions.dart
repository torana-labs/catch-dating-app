import 'package:catch_dating_app/contexts/safety/domain/messaging_permission.dart';
import 'package:catch_dating_app/safety/presentation/messaging_permissions_controller.dart';
import 'package:catch_dating_app/safety/presentation/messaging_permissions_screen.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../support/page_preview.dart';
import '../support/widgetbook_harness.dart';
import 'preview.dart';

@widgetbook.UseCase(
  name: 'Independent sender permissions',
  type: MessagingPermissionsScreen,
  path: '[P3 utility surfaces]/Settings',
)
Widget messagingPermissionsScreenStates(BuildContext context) =>
    WidgetbookUtilityDeviceFrame(
      child: WidgetbookFixtureScope(
        overrides: [
          messagingPermissionsControllerProvider.overrideWith(
            _MessagingPreviewController.new,
          ),
        ],
        child: const MessagingPermissionsScreen(),
      ),
    );

@widgetbook.UseCase(
  name: 'Allowed, stopped, unknown and pending',
  type: MessagingPermissionsPageBody,
  path: '[P3 utility surfaces]/Settings',
)
Widget messagingPermissionsPageStates(BuildContext context) =>
    WidgetbookPageCatalogFrame(
      title: 'WhatsApp permissions',
      contractId: 'screen.settings.messaging_permissions',
      children: [
        for (final pending in [false, true])
          WidgetbookPageStateCard(
            label: pending ? 'withdrawal pending' : 'independent senders',
            child: WidgetbookUtilityDeviceFrame(
              child: CatchRouteScaffold(
                topBarBuilder: (_, _) =>
                    const CatchTopBar.route(title: 'WhatsApp permissions'),
                body: CatchRouteBody.standardConstrained(
                  child: MessagingPermissionsPageBody(
                    state: _state(pending: pending),
                    onWithdraw: (_) {},
                    onRefresh: () {},
                    onLoadMore: () {},
                  ),
                ),
              ),
            ),
          ),
      ],
    );

MessagingPermissionsState _state({bool pending = false}) =>
    MessagingPermissionsState(
      uid: 'preview-participant',
      pendingKey: pending ? 'catch' : null,
      page: MessagingPermissionPage(
        catchPermission: const MessagingPermission(
          organizerId: null,
          organizerName: null,
          status: MessagingPermissionStatus.optedIn,
          receiptId: 'catch-grant',
        ),
        organizers: const [
          MessagingPermission(
            organizerId: 'rsvp-demo',
            organizerName: 'RSVP Demo',
            status: MessagingPermissionStatus.optedIn,
            receiptId: 'rsvp-grant',
          ),
          MessagingPermission(
            organizerId: 'coffee-demo',
            organizerName: 'Coffee Club Demo',
            status: MessagingPermissionStatus.optedOut,
            receiptId: 'coffee-stop',
          ),
          MessagingPermission(
            organizerId: 'surf-demo',
            organizerName: 'Surf Demo',
            status: MessagingPermissionStatus.unknown,
            receiptId: null,
          ),
        ],
        nextCursor: null,
      ),
    );

class _MessagingPreviewController extends MessagingPermissionsController {
  @override
  Future<MessagingPermissionsState> build() async => _state();

  @override
  Future<void> withdraw(
    String uid,
    MessagingPermission permission, {
    MessagingPermissionPurpose? purpose,
  }) async {}

  @override
  Future<void> loadMore() async {}
}
