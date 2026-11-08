import 'package:catch_dating_app/contexts/programmes/domain/program_whatsapp_models.dart';
import 'package:catch_dating_app/hosts/programmes/planner/assistant_settings/programme_assistant_body.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_state.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../../../support/catch_test_fonts.dart';
import '../planner_test_pump.dart';
import '../planner_whatsapp_fixtures.dart';

void main() {
  setUpAll(loadCatchTestFonts);

  test('a change sends only the fields it names', () {
    expect(
      const ProgramAssistantSettingsChange(
        enabled: false,
        languages: [ProgramAssistantLanguage.hi],
      ).toJson(),
      {
        'enabled': false,
        'languages': ['hi'],
      },
    );
    expect(
      plannerAssistantSettings.sender?.verifiedName,
      'Aditi and Kabir’s wedding',
    );
    expect(plannerAssistantSettings.staff, hasLength(2));
  });

  testWidgets('the settings show the number and save each change', (
    tester,
  ) async {
    final changes = <ProgramAssistantSettingsChange>[];
    await pumpPlannerBody(
      tester,
      HostProgrammeAssistantBody(
        status: HostProgrammeStatus.ready,
        settings: plannerAssistantSettings,
        onChange: changes.add,
        onRetry: () {},
        onTry: (_) {},
      ),
    );
    expect(find.text('+91 98765 01234'), findsOneWidget);
    expect(find.text('Shows as “Aditi and Kabir’s wedding”'), findsOneWidget);
    expect(find.text('Connected'), findsOneWidget);
    expect(find.text('Meher Shah'), findsOneWidget);
    expect(find.text('Never shares another guest’s details'), findsOneWidget);
    await tester.tap(
      find.byKey(const ValueKey<String>('host-programme-assistant-on')),
    );
    expect(changes.last.enabled, isFalse);
    await tester.tap(
      find.byKey(
        const ValueKey<String>('host-programme-assistant-within-hour'),
      ),
    );
    expect(changes.last.replyWithin, ProgramAssistantReplyWithin.hour);
    await tester.tap(
      find.byKey(
        const ValueKey<String>('host-programme-assistant-language-gu'),
      ),
    );
    expect(changes.last.languages, [
      ProgramAssistantLanguage.en,
      ProgramAssistantLanguage.hi,
      ProgramAssistantLanguage.gu,
    ]);
    await tester.ensureVisible(
      find.byKey(const ValueKey<String>('host-programme-assistant-topic-rsvp')),
    );
    await tester.tap(
      find.byKey(const ValueKey<String>('host-programme-assistant-topic-rsvp')),
    );
    expect(changes.last.answerTopics, contains(ProgramAssistantTopic.rsvp));
  });
}
