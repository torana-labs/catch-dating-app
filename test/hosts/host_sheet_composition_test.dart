import 'package:catch_dating_app/core/riverpod_ui/catch_notice_overlay.dart';
import 'package:catch_dating_app/events/domain/event_draft.dart';
import 'package:catch_dating_app/hosts/domain/crm/host_crm_summary.dart';
import 'package:catch_dating_app/hosts/events/presentation/host_event_entry_sheet.dart';
import 'package:catch_dating_app/hosts/events/presentation/host_event_entry_state.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customers_screen.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/widgets/draft_picker_sheet.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';

void main() {
  testWidgets('Event and Program tabs return the selected creation intent', (
    tester,
  ) async {
    HostEventEntrySelection? selection;
    await tester.pumpWidget(
      _app(
        false,
        1,
        Builder(
          builder: (context) => TextButton(
            child: const Text('Open'),
            onPressed: () async {
              selection = await showCatchBottomSheet<HostEventEntrySelection>(
                context: context,
                builder: (_) => HostEventEntrySheet(
                  state: HostEventEntryState.resolve(organizerId: 'club'),
                ),
              );
            },
          ),
        ),
      ),
    );
    await tester.tap(find.text('Open'));
    await pumpFeatureUi(tester);
    expect(
      find.byKey(const ValueKey('host-event-entry-createEvent')),
      findsOneWidget,
    );
    expect(
      find.byKey(const ValueKey('host-event-entry-createProgram')),
      findsNothing,
    );
    await tester.tap(find.text('Program'));
    await tester.pump();
    expect(
      find.byKey(const ValueKey('host-event-entry-createEvent')),
      findsNothing,
    );
    final program = find.byKey(
      const ValueKey('host-event-entry-createProgram'),
    );
    expect(program, findsOneWidget);
    await tester.tap(program);
    await pumpFeatureUi(tester);
    expect(selection?.intent, HostEventEntryIntent.createProgram);
    expect(selection?.draft, isNull);
  });

  testWidgets(
    'combined entry returns the exact older draft without another picker',
    (tester) async {
      HostEventEntrySelection? selection;
      final older = EventDraft(
        id: 'older',
        clubId: 'club',
        name: 'Older breakfast',
        savedAt: DateTime(2026, 9, 20),
      );
      final newer = EventDraft(
        id: 'newer',
        clubId: 'club',
        name: 'Newer run',
        savedAt: DateTime(2026, 9, 21),
      );
      await tester.pumpWidget(
        _app(
          false,
          1,
          Builder(
            builder: (context) => TextButton(
              child: const Text('Open'),
              onPressed: () async {
                selection = await showCatchBottomSheet<HostEventEntrySelection>(
                  context: context,
                  builder: (_) => HostEventEntrySheet(
                    state: HostEventEntryState.resolve(
                      organizerId: 'club',
                      drafts: [older, newer],
                    ),
                  ),
                );
              },
            ),
          ),
        ),
      );
      await tester.tap(find.text('Open'));
      await pumpFeatureUi(tester);
      expect(find.text('Continue draft'), findsNothing);
      expect(
        tester.getTopLeft(find.text('Newer run')).dy,
        lessThan(tester.getTopLeft(find.text('Older breakfast')).dy),
      );
      await tester.tap(find.text('Older breakfast'));
      await pumpFeatureUi(tester);
      expect(selection?.intent, HostEventEntryIntent.resumeDraft);
      expect(selection?.draft, same(older));
      expect(find.byType(HostEventEntrySheet), findsNothing);
    },
  );

  testWidgets(
    'last draft deletion retains Start new and a failed delete retains its row',
    (tester) async {
      var fail = true;
      final draft = EventDraft(
        id: 'only',
        clubId: 'club',
        name: 'Saved breakfast',
        savedAt: DateTime(2026, 9, 20),
      );
      await tester.pumpWidget(
        _app(
          false,
          1,
          HostEventEntrySheet(
            state: HostEventEntryState.resolve(
              organizerId: 'club',
              drafts: [draft],
            ),
            onDeleteDraft: (_) async {
              if (fail) throw StateError('test failure');
            },
          ),
        ),
      );
      for (final failure in [true, false]) {
        fail = failure;
        await tester.tap(find.byIcon(CatchIcons.delete));
        await pumpFeatureUi(tester);
        await tester.tap(find.text('Delete'));
        await pumpFeatureUi(tester);
        expect(
          find.text('Saved breakfast'),
          failure ? findsOneWidget : findsNothing,
        );
        expect(
          find.byKey(const ValueKey('host-event-entry-createEvent')),
          findsOneWidget,
        );
        expect(find.text('Sell tickets with Catch'), findsNothing);
        expect(find.text('Use guest list'), findsNothing);
        expect(find.byType(HostEventEntrySheet), findsOneWidget);
      }
      expect(find.text('CONTINUE'), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );

  for (final dark in [false, true]) {
    for (final scale in [1.0, 2.0]) {
      testWidgets(
        'draft content and actions share a center: dark=$dark scale=$scale',
        (tester) async {
          tester.view.physicalSize = const Size(320, 874);
          tester.view.devicePixelRatio = 1;
          addTearDown(tester.view.reset);
          var selected = 0;
          var deleted = 0;
          final draft = EventDraft(
            id: 'review',
            clubId: 'club',
            savedAt: DateTime.now(),
            name: 'Sunday community breakfast and garden walk',
          );
          await tester.pumpWidget(
            _app(
              dark,
              scale,
              DraftCard(
                draft: draft,
                isDeleting: false,
                onSelect: () => selected++,
                onDelete: () => deleted++,
              ),
            ),
          );
          final content = find.byType(CatchFieldContentRow);
          final center = tester.getCenter(content).dy;
          for (final icon in [CatchIcons.document, CatchIcons.delete]) {
            expect(
              tester.getCenter(find.byIcon(icon)).dy,
              closeTo(center, 0.1),
            );
          }
          expect(find.byIcon(CatchIcons.disclosure), findsNothing);
          final title = tester.widget<Text>(find.text(draft.summary));
          final saved = tester.widget<Text>(find.textContaining('Saved '));
          expect(title.style!.fontSize!, greaterThan(saved.style!.fontSize!));
          final delete = find.byType(CatchIconAction);
          final target = tester.getSize(delete);
          final minimum = CatchPlatformTokens.minimumInteractiveExtent;
          expect(target.width, greaterThanOrEqualTo(minimum));
          expect(target.height, greaterThanOrEqualTo(minimum));
          await tester.tap(delete);
          expect(deleted, 1);
          expect(selected, 0);
          await tester.tap(find.text(draft.summary));
          expect(selected, 1);
          expect(deleted, 1);
          expect(tester.takeException(), isNull);
        },
      );
      testWidgets(
        'People filters use muted ruled groups without instructions: dark=$dark scale=$scale',
        (tester) async {
          tester.view.physicalSize = const Size(320, 874);
          tester.view.devicePixelRatio = 1;
          addTearDown(tester.view.reset);
          await tester.pumpWidget(
            _app(
              dark,
              scale,
              const HostCustomerFilterSheet(
                smsReadiness: HostCrmChannelReadiness.currentEventOnly,
                manualTagVocabulary: [],
              ),
            ),
          );
          final sheet = tester.widget<CatchSheet>(find.byType(CatchSheet));
          expect(sheet.subtitle, isNull);
          if (scale == 1) {
            expect(
              tester.getCenter(find.text('Filter people')).dy,
              closeTo(tester.getCenter(find.text('Reset all')).dy, 0.1),
            );
          }
          final headings = tester
              .widgetList<CatchSectionHeader>(find.byType(CatchSectionHeader))
              .toList();
          expect(headings.length, greaterThan(1));
          final tokens = CatchTokens.of(
            tester.element(find.byType(CatchSheet)),
          );
          for (final heading in headings) {
            expect(heading.color, tokens.ink2);
            expect(heading.textVariant, CatchKickerTextVariant.fieldSection);
            final group = find
                .ancestor(
                  of: find.byWidget(heading),
                  matching: find.byType(CatchSection),
                )
                .first;
            final divider = find
                .descendant(of: group, matching: find.byType(CatchDivider))
                .first;
            final chips = find.descendant(
              of: group,
              matching: find.byType(CatchChip),
            );
            expect(chips, findsWidgets);
            expect(
              tester.getTopLeft(chips.first).dy -
                  tester.getBottomLeft(divider).dy,
              closeTo(CatchFieldTokens.rowVerticalPadding, 0.1),
              reason: 'The divider must not touch the first chip surface.',
            );
          }
          final close = find.widgetWithText(CatchButton, 'Close');
          expect(
            tester.widget<CatchButton>(close).variant,
            CatchButtonVariant.secondary,
          );
          expect(close.hitTestable(), findsOneWidget);
        },
      );
    }
  }
}

Widget _app(bool dark, double scale, Widget child) => ProviderScope(
  child: MaterialApp(
    theme: dark ? CatchTheme.dark : CatchTheme.light,
    localizationsDelegates: AppLocalizations.localizationsDelegates,
    supportedLocales: AppLocalizations.supportedLocales,
    builder: (context, appChild) => MediaQuery(
      data: MediaQuery.of(
        context,
      ).copyWith(textScaler: TextScaler.linear(scale)),
      child: CatchNoticeOverlay(child: appChild!),
    ),
    home: Scaffold(
      body: Align(alignment: Alignment.bottomCenter, child: child),
    ),
  ),
);
