import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Widget _host(Widget child, {double width = 390}) => MaterialApp(
  home: Scaffold(
    body: CatchRoot(
      size: CatchWindowSize.compact,
      child: Center(
        child: SizedBox(width: width, child: child),
      ),
    ),
  ),
);

void main() {
  testWidgets('screen body spaces its children by the chosen gap', (
    tester,
  ) async {
    Future<double> gapFor(CatchPageBodyGap gap) async {
      await tester.pumpWidget(
        _host(
          SizedBox(
            height: 400,
            child: CatchPageBody.screen(
              gap: gap,
              children: const [
                SizedBox(key: Key('a'), height: 20),
                SizedBox(key: Key('b'), height: 20),
              ],
            ),
          ),
        ),
      );
      return tester.getTopLeft(find.byKey(const Key('b'))).dy -
          tester.getBottomLeft(find.byKey(const Key('a'))).dy;
    }

    expect(
      await gapFor(CatchPageBodyGap.section),
      GeneratedCatchLayoutTokens.sectionGapCompact,
    );
    expect(await gapFor(CatchPageBodyGap.tight), CatchSpacing.s4);
    expect(await gapFor(CatchPageBodyGap.none), 0);
  });

  testWidgets('a badge with a dot draws the dot before its label', (
    tester,
  ) async {
    await tester.pumpWidget(
      _host(
        const Center(
          child: CatchBadge(
            label: 'Live',
            tone: CatchBadgeTone.success,
            dot: true,
          ),
        ),
      ),
    );
    expect(find.text('Live'), findsOneWidget);
    final dot = find.descendant(
      of: find.byType(CatchBadge),
      matching: find.byWidgetPredicate(
        (widget) =>
            widget is DecoratedBox &&
            widget.decoration is BoxDecoration &&
            (widget.decoration as BoxDecoration).shape == BoxShape.circle,
      ),
    );
    expect(dot, findsOneWidget);
  });

  testWidgets('choice and link chips read their count aloud', (tester) async {
    var pressed = 0;
    await tester.pumpWidget(
      _host(
        Wrap(
          children: [
            const CatchChip.choice(
              label: 'Regulars',
              selected: false,
              mode: CatchChipMode.single,
              onPressed: null,
              count: 84,
            ),
            CatchChip.link(
              label: 'Trivia regulars',
              onPressed: () => pressed++,
              count: 61,
            ),
          ],
        ),
      ),
    );
    expect(find.text('84'), findsOneWidget);
    expect(find.bySemanticsLabel('Regulars, 84'), findsOneWidget);
    await tester.tap(find.text('Trivia regulars'));
    expect(pressed, 1);
  });

  testWidgets('a filter chip is a plain action with no selected state', (
    tester,
  ) async {
    var pressed = 0;
    await tester.pumpWidget(
      _host(
        Center(
          child: CatchChip.filter(
            label: 'Add a tag',
            onPressed: () => pressed++,
            leading: Icon(CatchIcons.add),
          ),
        ),
      ),
    );
    final semantics = tester.getSemantics(find.byType(CatchChip));
    expect(semantics.flagsCollection.isButton, isTrue);
    expect(
      '${semantics.flagsCollection.isSelected}',
      isNot(contains('isTrue')),
    );
    await tester.tap(find.text('Add a tag'));
    expect(pressed, 1);
  });

  testWidgets('an inline notice action calls back', (tester) async {
    var pressed = 0;
    await tester.pumpWidget(
      _host(
        CatchNotice.inline(
          body: 'Pick several to offer places at once.',
          tone: CatchNoticeTone.neutral,
          action: CatchNoticeAction(
            label: 'Offer places',
            onPressed: () => pressed++,
          ),
        ),
      ),
    );
    await tester.tap(find.text('Offer places'));
    expect(pressed, 1);
  });

  testWidgets('the section kicker sits over the title', (tester) async {
    await tester.pumpWidget(
      _host(
        CatchSection(
          title: 'Tell me when',
          kicker: 'On your phone.',
          children: [CatchIndexRow(title: 'New booking', onTap: null)],
        ),
      ),
    );
    expect(
      tester.getTopLeft(find.text('On your phone.')).dy,
      lessThan(tester.getTopLeft(find.text('Tell me when')).dy),
    );
  });

  testWidgets('a button draws its trailing icon after the label', (
    tester,
  ) async {
    await tester.pumpWidget(
      _host(
        Center(
          child: CatchButton(
            label: 'Open Razorpay',
            onPressed: null,
            variant: CatchButtonVariant.quiet,
            size: CatchButtonSize.sm,
            trailing: Icon(CatchIcons.openExternal),
          ),
        ),
      ),
    );
    expect(
      tester.getTopLeft(find.byIcon(CatchIcons.openExternal)).dx,
      greaterThan(tester.getTopRight(find.text('Open Razorpay')).dx),
    );
  });

  testWidgets('a placeholder image takes its aspect without a url', (
    tester,
  ) async {
    await tester.pumpWidget(
      _host(
        const CatchNetworkImage(
          '',
          aspect: 2,
          corner: CatchNetworkImageSize.md,
          placeholder: CatchNetworkImageColor.games,
        ),
        width: 200,
      ),
    );
    expect(
      tester.getSize(find.byType(CatchNetworkImage)),
      const Size(200, 100),
    );
    expect(find.byType(ClipRRect), findsOneWidget);
  });

  testWidgets('system avatars take the system sizes and keep a colour', (
    tester,
  ) async {
    expect(CatchAvatarColor.of('Rhea'), CatchAvatarColor.of('Rhea'));
    await tester.pumpWidget(
      _host(
        Center(
          child: CatchAvatar.system(
            size: CatchAvatarSize.xl,
            name: 'Lantern Lane',
            color: CatchAvatarColor.games,
          ),
        ),
      ),
    );
    expect(
      tester.getSize(find.byType(CatchAvatar)),
      const Size.square(GeneratedCatchSizeTokens.avatarXl),
    );
    expect(find.text('LL'), findsOneWidget);
  });

  testWidgets('a field counter can stay painted at rest', (tester) async {
    Widget field(CatchFieldSupportRowMode counter) => _host(
      CatchField<void>.input(
        copy: _copy,
        title: 'One line',
        initialValue: 'Quizzes',
        maxLength: 80,
        counter: counter,
      ),
    );
    await tester.pumpWidget(field(CatchFieldSupportRowMode.whileFocused));
    expect(find.text('7 / 80'), findsNothing);
    await tester.pumpWidget(field(CatchFieldSupportRowMode.always));
    await tester.pumpAndSettle();
    expect(find.text('7 / 80'), findsOneWidget);
  });
}

String _label(String value) => value;
String _nullableLabel(String? value) => value ?? '';
String _length(String label, int length) => '$label $length';
const _copy = CatchFieldCopy(
  label: CatchFieldLabelTextCopy(
    optionalLabel: 'Optional',
    optionalSuffix: ' Optional',
    optionalSemantics: _label,
  ),
  validation: CatchFormValidationCopy(
    requiredMessage: _label,
    minLengthMessage: _length,
    maxLengthMessage: _length,
    patternMessage: _label,
  ),
  cancelLabel: 'Cancel',
  doneLabel: 'Done',
  savingLabel: 'Saving',
  savingSemanticLabel: 'Saving',
  savedSemanticLabel: 'Saved',
  emptyValueText: _label,
  selectPlaceholder: _nullableLabel,
  clearTooltip: _nullableLabel,
);
