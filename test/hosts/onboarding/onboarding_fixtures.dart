import 'package:catch_dating_app/contexts/organizers/domain/organizer_draft.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_host_defaults.dart';
import 'package:catch_dating_app/hosts/onboarding/setup_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

/// The fixed time setup drafts are stamped with.
final onboardingNow = DateTime(2026, 11, 8, 19, 30);

/// Lantern Lane Social, filled in as far as [step].
HostSetupState onboardingState({
  HostSetupStep step = HostSetupStep.start,
  bool withDetails = true,
  String? organizerId,
  bool hasLogo = false,
}) => HostSetupState(
  step: step,
  hasLogo: hasLogo,
  organizerId: organizerId,
  draft: OrganizerDraft(
    savedAt: onboardingNow,
    name: 'Lantern Lane Social',
    location: 'in-mh-mumbai',
    area: 'Bandra West',
    description: withDetails ? 'Quiz nights and supper clubs.' : null,
    hostDefaults: withDetails
        ? hostSetupDefaultsFor(const OrganizerHostDefaults(), {
            HostSetupFormat.games,
            HostSetupFormat.dinner,
          })
        : const OrganizerHostDefaults(),
  ),
);

/// Pumps [body] the way its screen hosts it, on a phone.
Future<void> pumpOnboardingBody(
  WidgetTester tester,
  Widget body, {
  Size size = const Size(390, 1400),
}) async {
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    MaterialApp(
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: CatchRoot(child: CatchScreen(body: body)),
    ),
  );
  await tester.pump();
}
