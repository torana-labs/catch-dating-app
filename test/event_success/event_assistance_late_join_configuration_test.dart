import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_late_join_setting_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_destination.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_setting.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_template.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_late_join_sheet.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';
import 'event_assistance_late_join_widget_fixtures.dart';

void main() {
  testWidgets(
    'custom controls update the exact typed preference only on save',
    (tester) async {
      final repository = LateJoinUiRepository();
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            uidProvider.overrideWith((ref) => Stream.value('host-1')),
            eventAssistanceLateJoinSettingRepositoryProvider.overrideWith(
              (ref) => repository,
            ),
          ],
          child: MaterialApp(
            theme: AppTheme.light,
            localizationsDelegates: AppLocalizations.localizationsDelegates,
            supportedLocales: AppLocalizations.supportedLocales,
            home: Scaffold(
              body: EventAssistanceLateJoinSheet(
                scope: lateJoinUiScope(),
                groupLabel: 'Whole event',
              ),
            ),
          ),
        ),
      );
      await pumpFeatureUi(tester);
      Future<void> tap(Finder finder) async {
        await tester.ensureVisible(finder);
        await tester.tap(finder);
        await pumpFeatureUi(tester);
      }

      await tap(find.byKey(const ValueKey('lateJoin.customize')));
      await tap(find.byKey(const ValueKey('lateJoin.destination')));
      await tap(find.text('Follow confirmed group progress').hitTestable());
      await tap(find.byKey(const ValueKey('lateJoin.maximum')));
      await tap(find.bySemanticsLabel('Increase limit').hitTestable());
      await tap(find.byKey(const ValueKey('lateJoin.unanswered')));
      await tap(find.text('Ask a host to review').hitTestable());
      await tap(find.byKey(const ValueKey('lateJoin.mode')));
      await tap(find.text('Send automatically').hitTestable());
      expect(repository.writes, isEmpty);
      await tap(find.byKey(const ValueKey('lateJoin.save')));
      final command = repository.writes.single.change;
      final preference = command.preference as LateJoinConfigured;
      expect(
        (preference.template.setting as AssistanceTemplateEnabled).authority,
        AssistanceTemplateAuthority.executeWithinPolicy,
      );
      expect(preference.template.destination, isA<LateJoinConfirmedProgress>());
      expect(preference.template.maxMessagesPerEpisode, 4);
      expect(preference.template.minimumMinutesBetweenMessages, 10);
      expect(
        preference.template.unanswered,
        LateJoinUnansweredRule.hostReviewAtDeadline,
      );
      expect(
        preference.template.cutoff.toJson(),
        (lateJoinUiView('custom').own!.preference as LateJoinConfigured)
            .template
            .cutoff
            .toJson(),
      );
      repository.writes.single.result.completeError(
        const NetworkException('unavailable', 'Lost reply'),
      );
      await pumpFeatureUi(tester);
      expect(find.text('Check save result'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );
}
