import 'package:catch_dating_app/hosts/presentation/host_event_manage_controller.dart';
import 'package:catch_dating_app/hosts/presentation/host_invite_link_state.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_event_private_access_section.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart';
import '../test_pump_helpers.dart';

void main() {
  testWidgets('invite link fields stay usable until the dialog closes', (
    tester,
  ) async {
    final l10n = AppLocalizationsEn();
    HostInviteLinkDraft? created;
    await pumpEventsTestApp(
      tester,
      Scaffold(
        body: HostInviteLinksSection(
          event: buildEvent(),
          inviteCode: 'INVITE',
          linksAsync: const AsyncData([]),
          state: HostInviteLinksListDisplayState.resolve(
            createPending: false,
            copyPending: false,
            disablePending: false,
          ),
          mutationError: null,
          onRetry: () {},
          onCreateInviteLink: (draft) async => created = draft,
          onCopyInviteLink: (_) {},
          onDisableInviteLink: (_) {},
        ),
      ),
    );

    await tester.tap(find.text(l10n.hostsHostEventManageScreenLabelNewLink));
    await pumpFeatureUi(tester);
    expect(tester.takeException(), isNull);

    final fields = find.byType(TextField);
    expect(fields, findsNWidgets(2));
    await tester.enterText(fields.at(0), 'Community invite');
    await tester.enterText(fields.at(1), 'community');
    await tester.pump();
    expect(created, isNull);

    await tester.tap(find.text(l10n.hostsHostEventManageScreenLabelCreate));
    await pumpFeatureUi(tester);
    expect(created?.label, 'Community invite');
    expect(created?.source, 'community');
    expect(find.byType(TextField), findsNothing);
    expect(tester.takeException(), isNull);
  });
}
