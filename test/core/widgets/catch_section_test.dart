import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/theme/activity_palette.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

part 'catch_section_interaction_tests.dart';

void main() {
  _registerSectionInteractionTests();

  testWidgets(
    'CatchSection.fieldRows renders rows flush with lane-aligned dividers',
    (tester) async {
      await tester.pumpWidget(
        _wrap(
          SizedBox(
            width: 360,
            child: CatchSection.fieldRows(
              title: 'Details',
              children: [
                CatchField.read(
                  copy: catchFieldCopy(AppLocalizationsEn()),
                  title: 'First',
                  valueText: 'A',
                  icon: CatchIcons.help,
                ),
                CatchField.read(
                  copy: catchFieldCopy(AppLocalizationsEn()),
                  title: 'Second',
                  valueText: 'B',
                  icon: CatchIcons.time,
                ),
              ],
            ),
          ),
        ),
      );

      final sectionRect = tester.getRect(find.byType(CatchSection));
      final firstIconRect = tester.getRect(find.byIcon(CatchIcons.help));
      expect(firstIconRect.left, sectionRect.left);

      final dividerFinder = find.byWidgetPredicate(
        (widget) =>
            widget is ColoredBox &&
            widget.child is SizedBox &&
            (widget.child as SizedBox).height == CatchStroke.hairline,
      );
      final dividerRect = tester.getRect(dividerFinder.last);
      expect(dividerRect.left - sectionRect.left, CatchFieldRow.textLaneInset);
      expect(dividerRect.right, sectionRect.right);

      final dividerBox = tester.widget<ColoredBox>(dividerFinder.last);
      expect(
        dividerBox.color,
        CatchDivider.colorFor(
          CatchTokens.editorialLight,
          CatchDividerVariant.fieldSection,
        ),
      );
      final sectionDividers = tester
          .widgetList<CatchDivider>(find.byType(CatchDivider))
          .toList(growable: false);
      expect(sectionDividers.map((divider) => divider.variant), [
        CatchDividerVariant.section,
        CatchDividerVariant.fieldSection,
      ]);
      expect(
        sectionDividers
            .map(
              (divider) => CatchDivider.colorFor(
                CatchTokens.editorialLight,
                divider.variant,
              ),
            )
            .toSet(),
        {CatchTokens.editorialLight.line},
      );
    },
  );

  testWidgets('CatchSection aligns dividers to caller-owned leading extents', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        SizedBox(
          width: 360,
          child: CatchSection.fieldRows(
            title: 'Events',
            children: [
              CatchField.read(
                copy: catchFieldCopy(AppLocalizationsEn()),
                title: 'First',
                leading: const SizedBox(
                  key: ValueKey('first-leading'),
                  width: 48,
                  height: 32,
                ),
                leadingExtent: 48,
              ),
              CatchField.read(
                copy: catchFieldCopy(AppLocalizationsEn()),
                title: 'Second',
                leading: const SizedBox(width: 48, height: 32),
                leadingExtent: 48,
              ),
            ],
          ),
        ),
      ),
    );

    final sectionRect = tester.getRect(find.byType(CatchSection));
    final leadingRect = tester.getRect(
      find.byKey(const ValueKey('first-leading')),
    );
    final dividerRect = tester.getRect(
      find
          .byWidgetPredicate(
            (widget) => widget is Positioned && widget.child is CatchDivider,
          )
          .first,
    );

    expect(leadingRect.left, sectionRect.left);
    expect(
      dividerRect.left - sectionRect.left,
      48 + CatchFieldTokens.leadingGap,
    );
    expect(dividerRect.right, sectionRect.right);
  });

  testWidgets(
    'CatchSection.fieldRows paints dividers from the preceding row layer',
    (tester) async {
      await tester.pumpWidget(
        _wrap(
          SizedBox(
            width: 360,
            child: CatchSection.fieldRows(
              first: true,
              children: [
                CatchField.read(
                  copy: catchFieldCopy(AppLocalizationsEn()),
                  title: 'First',
                  body: 'A',
                ),
                CatchField.control(
                  copy: catchFieldCopy(AppLocalizationsEn()),
                  title: 'Second',
                  body: 'B',
                  disclosureMode: CatchFieldMode.localExpanded,
                  child: const Text('Second control'),
                ),
                CatchField.read(
                  copy: catchFieldCopy(AppLocalizationsEn()),
                  title: 'Third',
                  body: 'C',
                ),
              ],
            ),
          ),
        ),
      );

      final dividerPositions = tester
          .widgetList<Positioned>(find.byType(Positioned))
          .where((positioned) => positioned.child is CatchDivider)
          .toList(growable: false);

      expect(dividerPositions, hasLength(2));
      for (final positioned in dividerPositions) {
        expect(positioned.top, isNull);
        expect(positioned.bottom, -CatchStroke.hairline);
      }
    },
  );

  testWidgets(
    'CatchSection field dividers scale the token alpha in light and dark',
    (tester) async {
      for (final tokens in [
        CatchTokens.editorialLight,
        CatchTokens.editorialDark,
      ]) {
        expect(
          CatchDivider.colorFor(tokens, CatchDividerVariant.fieldSection),
          tokens.line,
        );
        final rowColor = CatchDivider.colorFor(
          tokens,
          CatchDividerVariant.fieldRow,
        );
        expect(
          rowColor.a,
          closeTo(tokens.line.a * CatchOpacity.fieldRowDivider, 0.0001),
        );
        expect(rowColor.a, lessThan(tokens.line.a));
      }
    },
  );

  testWidgets('CatchSection headerless field rows still own their top rule', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        SizedBox(
          width: 360,
          child: CatchSection.fieldRows(
            first: true,
            children: [
              CatchField.read(
                copy: catchFieldCopy(AppLocalizationsEn()),
                title: 'Log out',
              ),
            ],
          ),
        ),
      ),
    );

    final sectionRect = tester.getRect(find.byType(CatchSection));
    final ruleRect = tester.getRect(find.byType(CatchDivider));

    expect(ruleRect.top, sectionRect.top);
    expect(ruleRect.left, sectionRect.left);
    expect(ruleRect.right, sectionRect.right);
  });

  testWidgets(
    'CatchSection field rows preserve text-lane dividers for adapter children',
    (tester) async {
      await tester.pumpWidget(
        _wrap(
          SizedBox(
            width: 360,
            child: CatchSection.fieldRows(
              first: true,
              children: [
                SizedBox(
                  child: CatchField.read(
                    copy: catchFieldCopy(AppLocalizationsEn()),
                    title: 'First',
                  ),
                ),
                SizedBox(
                  child: CatchField.read(
                    copy: catchFieldCopy(AppLocalizationsEn()),
                    title: 'Second',
                  ),
                ),
              ],
            ),
          ),
        ),
      );

      final sectionRect = tester.getRect(find.byType(CatchSection));
      final dividerRect = tester.getRect(
        find
            .byWidgetPredicate(
              (widget) => widget is Positioned && widget.child is CatchDivider,
            )
            .first,
      );

      expect(
        dividerRect.left - sectionRect.left,
        CatchFieldTokens.textLaneInset,
      );
    },
  );

  testWidgets('CatchSection divided footer uses handoff spacing and caption', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        SizedBox(
          width: 360,
          child: CatchSection.fieldRows(
            first: true,
            footer: const Text('We never show your birth year.'),
            children: [
              CatchField.read(
                copy: catchFieldCopy(AppLocalizationsEn()),
                title: 'Date of birth',
                body: '12 Aug',
              ),
            ],
          ),
        ),
      ),
    );

    final fieldRect = tester.getRect(find.byType(CatchField));
    final footerFinder = find.text('We never show your birth year.');
    final footerRect = tester.getRect(footerFinder);
    final footerStyle = DefaultTextStyle.of(tester.element(footerFinder)).style;

    expect(
      footerRect.top - fieldRect.bottom,
      closeTo(CatchFieldTokens.dividedSectionFooterTopPadding, 0.001),
    );
    expect(footerStyle.color, CatchTokens.editorialLight.ink3);
    expect(footerStyle.height, 1.5);
  });

  testWidgets('CatchSection section variant renders row variants', (
    tester,
  ) async {
    var toggleValue = false;

    await tester.pumpWidget(
      _wrap(
        StatefulBuilder(
          builder: (context, setState) => CatchSection.divided(
            title: 'Account',
            first: true,
            children: [
              CatchField.nav(
                copy: catchFieldCopy(AppLocalizationsEn()),
                icon: CatchIcons.person,
                title: 'Aanya',
                body: 'Name',
                onTap: () {},
              ),
              CatchField.add(
                copy: catchFieldCopy(AppLocalizationsEn()),
                title: '+ Add bio',
              ),
              CatchField.toggle(
                copy: catchFieldCopy(AppLocalizationsEn()),
                title: 'Visible',
                value: toggleValue,
                onChanged: (value) => setState(() => toggleValue = value),
              ),
              CatchField.read(
                copy: catchFieldCopy(AppLocalizationsEn()),
                icon: CatchIcons.delete,
                title: 'Delete account',
                tone: CatchFieldTone.danger,
              ),
            ],
          ),
        ),
      ),
    );

    expect(find.text('ACCOUNT'), findsOneWidget);
    expect(find.text('Name'), findsOneWidget);
    expect(find.text('Aanya'), findsOneWidget);
    expect(find.text('+ Add bio'), findsOneWidget);
    expect(find.text('Delete account'), findsOneWidget);
    expect(find.byType(CatchKickerText), findsOneWidget);
    expect(find.bySemanticsLabel('Visible'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('catch-field-toggle')));
    await tester.pump();

    expect(toggleValue, isTrue);
  });

  testWidgets('CatchSection composes the shared kicker leaf', (tester) async {
    final semantics = tester.ensureSemantics();
    try {
      await tester.pumpWidget(
        _wrap(
          const CatchSection.divided(
            title: 'Why you might click',
            first: true,
            child: Text('Body copy'),
          ),
        ),
      );

      expect(find.byType(CatchKickerText), findsOneWidget);
      expect(find.text('WHY YOU MIGHT CLICK'), findsOneWidget);
      expect(find.text('Body copy'), findsOneWidget);
      expect(
        find.semantics.byLabel('WHY YOU MIGHT CLICK'),
        matchesSemantics(label: 'WHY YOU MIGHT CLICK', isHeader: true),
      );
    } finally {
      semantics.dispose();
    }
  });

  testWidgets('CatchSectionList lets Section own the handoff rhythm', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        const CatchSectionList.inset(
          emptyStateOmitted: true,
          children: [
            CatchSection.divided(
              title: 'First',
              first: true,
              child: Text('First body'),
            ),
            CatchSection.divided(title: 'Second', child: Text('Second body')),
          ],
        ),
      ),
    );

    final sections = find.byType(CatchSection);
    expect(
      tester.getBottomLeft(sections.first).dy,
      tester.getTopLeft(sections.last).dy,
    );
    final padding = CatchInsets.pageBody.resolve(TextDirection.ltr);
    final list = find.byType(CatchSectionList);
    expect(
      tester.getTopLeft(sections.first).dx - tester.getTopLeft(list).dx,
      padding.left,
    );
    expect(find.byType(Divider), findsNothing);
    expect(find.text('SECOND'), findsOneWidget);
  });

  testWidgets('CatchSection accents only a lead activity section', (
    tester,
  ) async {
    late Color activityAccent;

    await tester.pumpWidget(
      _wrap(
        Builder(
          builder: (context) {
            activityAccent = ActivityPalette.resolve(
              context,
              ActivityKind.socialRun,
            ).accent;
            return Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                CatchSection.divided(
                  title: 'The plan',
                  titleColor: activityAccent,
                  first: true,
                  child: const Text('Lead body'),
                ),
                const CatchSection.divided(
                  title: 'Details',
                  child: Text('Neutral body'),
                ),
              ],
            );
          },
        ),
      ),
    );

    final lead = tester.widget<Text>(find.text('THE PLAN'));
    final neutral = tester.widget<Text>(find.text('DETAILS'));
    expect(lead.style?.color, activityAccent);
    expect(neutral.style?.color, CatchTokens.editorialLight.ink);
  });

  testWidgets('CatchSection contained renders title and trailing', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        const CatchSection.contained(
          title: 'Profile strength',
          subtitle: '3 of 7 profile basics complete',
          trailing: Text('28%'),
          child: Text('Section body'),
        ),
      ),
    );

    expect(find.text('Profile strength'), findsOneWidget);
    expect(find.text('3 of 7 profile basics complete'), findsOneWidget);
    expect(find.text('28%'), findsOneWidget);
    expect(find.text('Section body'), findsOneWidget);
    expect(find.text('PROFILE STRENGTH'), findsNothing);
    expect(
      find.ancestor(
        of: find.text('Profile strength'),
        matching: find.byType(CatchSurface),
      ),
      findsOneWidget,
    );
    final surface = tester.widget<CatchSurface>(find.byType(CatchSurface));
    expect(surface.emphasis, CatchSurfaceEmphasis.flat);
  });

  testWidgets(
    'CatchSection contained field rows place the header outside the outline',
    (tester) async {
      await tester.pumpWidget(
        _wrap(
          SizedBox(
            width: 360,
            child: CatchSection.containedFieldRows(
              title: 'Where',
              count: '2 OF 4',
              trailing: const Text('Ready'),
              footer: const Text('Attendees see this on event cards.'),
              children: [
                CatchField.read(
                  copy: catchFieldCopy(AppLocalizationsEn()),
                  title: 'Location',
                  body: 'Bandra',
                ),
              ],
            ),
          ),
        ),
      );

      final surfaceFinder = find
          .descendant(
            of: find.byType(CatchSectionSurface),
            matching: find.byType(AnimatedContainer),
          )
          .first;
      final surfaceRect = tester.getRect(surfaceFinder);
      final titleRect = tester.getRect(find.text('WHERE'));
      final title = tester.widget<Text>(find.text('WHERE'));
      final countRect = tester.getRect(find.text('2 OF 4'));
      final trailingRect = tester.getRect(find.text('Ready'));
      final headerRect = tester.getRect(
        find
            .ancestor(
              of: find.text('WHERE'),
              matching: find.byWidgetPredicate(
                (widget) =>
                    widget is Padding &&
                    widget.padding ==
                        const EdgeInsets.symmetric(
                          horizontal: CatchFieldTokens.rowHorizontalPadding,
                        ),
              ),
            )
            .first,
      );
      final fieldRect = tester.getRect(find.byType(CatchField));
      final footerRect = tester.getRect(
        find.text('Attendees see this on event cards.'),
      );

      expect(find.text('Where · 2 OF 4'), findsNothing);
      expect(title.style?.fontSize, CatchFieldTokens.sectionKickerFontSize);
      expect(title.style?.fontWeight, FontWeight.w600);
      expect(
        title.style?.letterSpacing,
        CatchFieldTokens.sectionKickerLetterSpacing,
      );
      expect(
        titleRect.left - surfaceRect.left,
        CatchFieldTokens.rowHorizontalPadding,
      );
      expect(countRect.right, lessThan(trailingRect.left));
      expect(
        surfaceRect.right - trailingRect.right,
        CatchFieldTokens.rowHorizontalPadding,
      );
      expect(
        surfaceRect.top - headerRect.bottom,
        closeTo(CatchSpacing.s2, 0.001),
      );
      expect(fieldRect.top, surfaceRect.top + CatchStroke.hairline);
      expect(
        surfaceRect.bottom - footerRect.bottom,
        CatchStroke.hairline + CatchFieldTokens.rowVerticalPadding,
      );
      expect(
        footerRect.top - fieldRect.bottom,
        closeTo(CatchFieldTokens.containedSectionFooterTopPadding, 0.001),
      );
      expect(
        find.ancestor(
          of: find.text('WHERE'),
          matching: find.byType(AnimatedContainer),
        ),
        findsNothing,
      );
      expect(
        find.ancestor(
          of: find.text('2 OF 4'),
          matching: find.byType(AnimatedContainer),
        ),
        findsNothing,
      );
      expect(
        find.ancestor(
          of: find.text('Ready'),
          matching: find.byType(AnimatedContainer),
        ),
        findsNothing,
      );
      expect(
        find.ancestor(
          of: find.text('Attendees see this on event cards.'),
          matching: find.byType(AnimatedContainer),
        ),
        findsOneWidget,
      );
    },
  );

  testWidgets(
    'CatchSection headerless contained field rows start at the card edge',
    (tester) async {
      await tester.pumpWidget(
        _wrap(
          SizedBox(
            width: 360,
            child: CatchSection.containedFieldRows(
              children: [
                CatchField.read(
                  copy: catchFieldCopy(AppLocalizationsEn()),
                  title: 'Prompt 1',
                  body: 'Answer',
                ),
              ],
            ),
          ),
        ),
      );

      final surfaceRect = tester.getRect(
        find
            .descendant(
              of: find.byType(CatchSectionSurface),
              matching: find.byType(AnimatedContainer),
            )
            .first,
      );
      final fieldRect = tester.getRect(find.byType(CatchField));

      expect(fieldRect.top, surfaceRect.top + CatchStroke.hairline);
    },
  );

  testWidgets(
    'CatchSection internal contained field header owns an inset section rule',
    (tester) async {
      await tester.pumpWidget(
        _wrap(
          SizedBox(
            width: 360,
            child: CatchSection.containedFieldRows(
              title: 'Event settings',
              count: '2 fields',
              trailing: const Text('Ready'),
              headerPlacement: CatchSectionHeaderPlacement.inside,
              children: [
                CatchField.read(
                  copy: catchFieldCopy(AppLocalizationsEn()),
                  title: 'Host',
                  body: 'Catch Hosts',
                ),
              ],
            ),
          ),
        ),
      );

      final surfaceFinder = find
          .descendant(
            of: find.byType(CatchSectionSurface),
            matching: find.byType(AnimatedContainer),
          )
          .first;
      final surfaceRect = tester.getRect(surfaceFinder);
      final titleRect = tester.getRect(find.text('EVENT SETTINGS'));
      final fieldRect = tester.getRect(find.byType(CatchField));
      final dividerFinder = find.descendant(
        of: surfaceFinder,
        matching: find.byType(CatchDivider),
      );

      expect(dividerFinder, findsOneWidget);
      expect(
        find.ancestor(
          of: find.text('EVENT SETTINGS'),
          matching: find.byType(AnimatedContainer),
        ),
        findsOneWidget,
      );
      final divider = tester.widget<CatchDivider>(dividerFinder);
      final dividerRect = tester.getRect(dividerFinder);
      expect(divider.variant, CatchDividerVariant.section);
      expect(
        dividerRect.left - surfaceRect.left,
        CatchStroke.hairline + CatchFieldTokens.rowHorizontalPadding,
      );
      expect(
        surfaceRect.right - dividerRect.right,
        CatchStroke.hairline + CatchFieldTokens.rowHorizontalPadding,
      );
      expect(
        dividerRect.top - titleRect.bottom,
        closeTo(CatchFieldTokens.sectionRuleGap, 0.001),
      );
      expect(fieldRect.top, dividerRect.bottom);
    },
  );

  testWidgets(
    'CatchSection reflows a populated header instead of truncating at large text',
    (tester) async {
      await tester.pumpWidget(
        _wrap(
          SizedBox(
            width: 360,
            child: CatchSection.containedFieldRows(
              title: 'Media library',
              count: '3 photos',
              trailing: const Text('Manage images'),
              headerPlacement: CatchSectionHeaderPlacement.inside,
              children: [
                CatchField.read(
                  copy: catchFieldCopy(AppLocalizationsEn()),
                  title: 'Cover',
                  body: 'Hero image',
                ),
              ],
            ),
          ),
          textScale: 2,
        ),
      );

      final titleRect = tester.getRect(find.text('MEDIA LIBRARY'));
      final actionRect = tester.getRect(find.text('Manage images'));
      expect(actionRect.top, greaterThan(titleRect.bottom));
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'contained row press states use one group clip for every row position',
    (tester) async {
      Future<void> pumpRows(int count) {
        return tester.pumpWidget(
          _wrap(
            SizedBox(
              width: 360,
              child: CatchSection.containedFieldRows(
                children: [
                  for (var index = 0; index < count; index++)
                    CatchField.nav(
                      copy: catchFieldCopy(AppLocalizationsEn()),
                      key: ValueKey('row-$index'),
                      title: 'Row $index',
                      onTap: () {},
                    ),
                ],
              ),
            ),
          ),
        );
      }

      for (final rowCount in [1, 3]) {
        await pumpRows(rowCount);

        final clipFinder = find.byKey(CatchSectionSurface.rowGroupClipKey);
        final clip = tester.widget<ClipRRect>(clipFinder);
        expect(clip.clipBehavior, Clip.hardEdge);
        expect(
          clip.borderRadius,
          BorderRadius.circular(CatchFieldTokens.sectionRadius),
        );
        final clipRect = tester.getRect(clipFinder);
        final overlays = find.byKey(CatchField.pressOverlayKey);
        expect(overlays, findsNWidgets(rowCount));

        for (var index = 0; index < rowCount; index++) {
          final rowFinder = find.byKey(ValueKey('row-$index'));
          final overlayFinder = overlays.at(index);
          final overlayDecoration =
              tester.widget<AnimatedContainer>(overlayFinder).decoration!
                  as BoxDecoration;
          expect(overlayDecoration.color, Colors.transparent);
          expect(overlayDecoration.borderRadius, BorderRadius.zero);
          expect(overlayDecoration.border, isNull);
          expect(
            find.ancestor(of: overlayFinder, matching: clipFinder),
            findsOneWidget,
          );

          final gesture = await tester.startGesture(
            tester.getCenter(rowFinder),
          );
          await tester.pump();
          final pressedDecoration =
              tester.widget<AnimatedContainer>(overlayFinder).decoration!
                  as BoxDecoration;
          expect(pressedDecoration.color, isNot(Colors.transparent));
          expect(pressedDecoration.borderRadius, BorderRadius.zero);

          final overlayRect = tester.getRect(overlayFinder);
          expect(overlayRect.left, closeTo(clipRect.left, 0.001));
          expect(overlayRect.right, closeTo(clipRect.right, 0.001));
          if (index == 0) {
            expect(overlayRect.top, closeTo(clipRect.top, 0.001));
          }
          if (index == rowCount - 1) {
            expect(overlayRect.bottom, closeTo(clipRect.bottom, 0.001));
          } else {
            final nextOverlayRect = tester.getRect(overlays.at(index + 1));
            expect(
              overlayRect.bottom,
              greaterThanOrEqualTo(nextOverlayRect.top),
            );
          }
          await gesture.up();
          await tester.pump();
        }
      }
    },
  );

  testWidgets('CatchSection contained reflects descendant focus', (
    tester,
  ) async {
    final focusNode = FocusNode();
    addTearDown(focusNode.dispose);

    await tester.pumpWidget(
      _wrap(CatchSection.contained(child: TextField(focusNode: focusNode))),
    );

    focusNode.requestFocus();
    await tester.pump();

    final surface = tester.widget<CatchSurface>(find.byType(CatchSurface));
    expect(
      surface.borderSpec?.side,
      CatchBorder.resolve(
        CatchTokens.editorialLight,
        CatchBorderRole.focus,
      ).side,
    );
    expect(
      surface.boxShadow,
      CatchElevation.focusRing(CatchTokens.editorialLight),
    );
  });

  testWidgets(
    'CatchSection divided field rows expose the trailing header slot',
    (tester) async {
      await tester.pumpWidget(
        _wrap(
          SizedBox(
            width: 360,
            child: CatchSection.fieldRows(
              first: true,
              title: 'Prompts',
              count: '3 OF 3 ANSWERED',
              trailing: const Text('Edit'),
              children: [
                CatchField.read(
                  copy: catchFieldCopy(AppLocalizationsEn()),
                  title: 'Prompt',
                  body: 'Answer',
                ),
              ],
            ),
          ),
        ),
      );

      final titleRect = tester.getRect(find.text('PROMPTS'));
      final titleText = tester.widget<Text>(find.text('PROMPTS'));
      final countRect = tester.getRect(find.text('3 OF 3 ANSWERED'));
      final trailingRect = tester.getRect(find.text('Edit'));
      expect(titleRect.left, lessThan(countRect.left));
      expect(countRect.right, lessThan(trailingRect.left));
      expect(titleText.style?.color, CatchTokens.editorialLight.ink2);
      expect(titleText.style?.fontSize, CatchFieldTokens.sectionKickerFontSize);
      expect(titleText.style?.fontWeight, FontWeight.w600);
      expect(
        titleText.style?.letterSpacing,
        CatchFieldTokens.sectionKickerLetterSpacing,
      );
    },
  );

  testWidgets(
    'CatchSection contained field rows leave descendant focus to the field',
    (tester) async {
      final focusNode = FocusNode();
      addTearDown(focusNode.dispose);

      await tester.pumpWidget(
        _wrap(
          CatchSection.containedFieldRows(
            child: TextField(focusNode: focusNode),
          ),
        ),
      );

      focusNode.requestFocus();
      await tester.pump();

      final surface = tester.widget<AnimatedContainer>(
        find
            .descendant(
              of: find.byType(CatchSectionSurface),
              matching: find.byType(AnimatedContainer),
            )
            .first,
      );
      final decoration = surface.foregroundDecoration! as BoxDecoration;
      expect(
        decoration.border,
        Border.all(color: CatchTokens.editorialLight.line2),
      );
    },
  );

  testWidgets('CatchSection contained field rows honor explicit focus', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        const CatchSection.containedFieldRows(
          states: {WidgetState.focused},
          child: Text('Section body'),
        ),
      ),
    );

    final surface = tester.widget<AnimatedContainer>(
      find
          .descendant(
            of: find.byType(CatchSectionSurface),
            matching: find.byType(AnimatedContainer),
          )
          .first,
    );
    final decoration = surface.foregroundDecoration! as BoxDecoration;
    expect(
      decoration.border,
      CatchBorder.resolve(
        CatchTokens.editorialLight,
        CatchBorderRole.focus,
      ).all,
    );

    await tester.pumpWidget(
      _wrap(
        const CatchSection.containedFieldRows(
          states: {WidgetState.focused, WidgetState.error},
          child: Text('Section body'),
        ),
      ),
    );
    final errorSurface = tester.widget<AnimatedContainer>(
      find
          .descendant(
            of: find.byType(CatchSectionSurface),
            matching: find.byType(AnimatedContainer),
          )
          .first,
    );
    final errorDecoration = errorSurface.foregroundDecoration! as BoxDecoration;
    expect(
      errorDecoration.border,
      CatchBorder.resolve(
        CatchTokens.editorialLight,
        CatchBorderRole.danger,
      ).all,
    );
  });

  testWidgets(
    'contained active states use one group clip for every row position',
    (tester) async {
      Future<void> pump({required int rowCount, required int activeIndex}) {
        return tester.pumpWidget(
          _wrap(
            SizedBox(
              width: 360,
              child: CatchSection.containedFieldRows(
                children: [
                  for (var index = 0; index < rowCount; index++)
                    CatchField.control(
                      copy: catchFieldCopy(AppLocalizationsEn()),
                      key: ValueKey('active-row-$index'),
                      title: 'Row $index',
                      body: 'Value $index',
                      disclosureMode: index == activeIndex
                          ? CatchFieldMode.controlledExpanded
                          : CatchFieldMode.controlledCollapsed,
                      onOpenChanged: (_) {},
                      child: Text('Control $index'),
                    ),
                ],
              ),
            ),
          ),
        );
      }

      for (final rowCount in [1, 3]) {
        for (var activeIndex = 0; activeIndex < rowCount; activeIndex++) {
          await pump(rowCount: rowCount, activeIndex: activeIndex);
          final surface = tester.widget<AnimatedContainer>(
            find
                .descendant(
                  of: find.byType(CatchSectionSurface),
                  matching: find.byType(AnimatedContainer),
                )
                .first,
          );
          final background = surface.decoration! as BoxDecoration;
          final perimeter = surface.foregroundDecoration! as BoxDecoration;
          final activeOverlayFinder = find.byWidgetPredicate((widget) {
            if (widget is! AnimatedContainer ||
                widget.key != const ValueKey('catch-field-active-overlay')) {
              return false;
            }
            final decoration = widget.decoration;
            return decoration is BoxDecoration && decoration.border != null;
          }, description: 'active CatchField overlay with a painted border');
          final activeFieldFinder = find.ancestor(
            of: activeOverlayFinder,
            matching: find.byType(CatchField),
          );
          final clipFinder = find.byKey(CatchSectionSurface.rowGroupClipKey);
          expect(activeOverlayFinder, findsOneWidget);
          expect(activeFieldFinder, findsOneWidget);
          expect(
            find.ancestor(of: activeOverlayFinder, matching: clipFinder),
            findsOneWidget,
          );
          final activeOverlay = tester.widget<AnimatedContainer>(
            activeOverlayFinder,
          );
          final activeDecoration = activeOverlay.decoration! as BoxDecoration;
          final activeOverlayRect = tester.getRect(activeOverlayFinder);
          final surfaceRect = tester.getRect(find.byType(CatchSectionSurface));
          final activeFieldRect = tester.getRect(activeFieldFinder);

          expect(background.border, isNull);
          expect(
            perimeter.border,
            Border.all(color: CatchTokens.editorialLight.line2),
          );
          expect(activeDecoration.borderRadius, BorderRadius.zero);
          expect(activeOverlayRect.left, closeTo(surfaceRect.left, 0.1));
          expect(activeOverlayRect.right, closeTo(surfaceRect.right, 0.1));
          expect(
            activeFieldRect.left,
            closeTo(surfaceRect.left + CatchStroke.hairline, 0.1),
          );
          expect(
            activeFieldRect.right,
            closeTo(surfaceRect.right - CatchStroke.hairline, 0.1),
          );
          if (activeIndex == 0) {
            expect(activeOverlayRect.top, lessThanOrEqualTo(surfaceRect.top));
          } else {
            expect(activeOverlayRect.top, greaterThan(surfaceRect.top));
          }
          if (activeIndex == rowCount - 1) {
            expect(
              activeOverlayRect.bottom,
              greaterThanOrEqualTo(surfaceRect.bottom),
            );
          } else {
            expect(activeOverlayRect.bottom, lessThan(surfaceRect.bottom));
          }
        }
      }
    },
  );

  testWidgets(
    'CatchSectionSurface field rows own active edge geometry directly',
    (tester) async {
      await tester.pumpWidget(
        _wrap(
          SizedBox(
            width: 360,
            child: CatchSectionSurface.fieldRows(
              padding: EdgeInsets.zero,
              child: CatchField.input(
                copy: catchFieldCopy(AppLocalizationsEn()),
                title: 'Answer',
                initialValue: 'The child owns this focus ring.',
                states: const <WidgetState>{WidgetState.focused},
              ),
            ),
          ),
        ),
      );

      final surfaceRect = tester.getRect(find.byType(CatchSectionSurface));
      final fieldRect = tester.getRect(find.byType(CatchField));
      final activeOverlayRect = tester.getRect(
        find.byKey(const ValueKey('catch-field-active-overlay')),
      );
      final activeOverlay = tester.widget<AnimatedContainer>(
        find.byKey(const ValueKey('catch-field-active-overlay')),
      );

      expect(
        (activeOverlay.decoration! as BoxDecoration).borderRadius,
        BorderRadius.zero,
      );
      expect(activeOverlayRect.left, closeTo(surfaceRect.left, 0.1));
      expect(activeOverlayRect.right, closeTo(surfaceRect.right, 0.1));
      expect(
        fieldRect.left,
        closeTo(surfaceRect.left + CatchStroke.hairline, 0.1),
      );
      expect(
        fieldRect.right,
        closeTo(surfaceRect.right - CatchStroke.hairline, 0.1),
      );
    },
  );

  testWidgets(
    'CatchSection contained renders field rows flush to card padding',
    (tester) async {
      await tester.pumpWidget(
        _wrap(
          SizedBox(
            width: 360,
            child: CatchSection.contained(
              child: CatchField.read(
                copy: catchFieldCopy(AppLocalizationsEn()),
                title: 'Notifications',
                valueText: 'On',
                icon: CatchIcons.help,
              ),
            ),
          ),
        ),
      );

      final surfaceRect = tester.getRect(find.byType(CatchSurface));
      final iconRect = tester.getRect(find.byIcon(CatchIcons.help));
      final labelLeft = tester.getTopLeft(find.text('Notifications')).dx;
      final valueRight = tester.getTopRight(find.text('On')).dx;

      expect(iconRect.left, closeTo(surfaceRect.left + CatchSpacing.s4, 0.1));
      expect(
        labelLeft,
        closeTo(
          surfaceRect.left + CatchSpacing.s4 + CatchFieldRow.textLaneInset,
          0.2,
        ),
      );
      expect(valueRight, closeTo(surfaceRect.right - CatchSpacing.s4, 0.1));
    },
  );
}

void _noop() {}
Widget _wrap(Widget child, {ThemeData? theme, double textScale = 1}) {
  return MaterialApp(
    theme: theme ?? AppTheme.light,
    home: MediaQuery(
      data: MediaQueryData(textScaler: TextScaler.linear(textScale)),
      child: Scaffold(body: Center(child: child)),
    ),
  );
}
