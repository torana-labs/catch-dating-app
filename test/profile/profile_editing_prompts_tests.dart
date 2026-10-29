// Riverpod reports the shared test-root ProviderScope overrides from the
// library entrypoint against a part file chosen by offset, so the adjacent
// entrypoint ignores cannot attach to the remapped diagnostics. Every part of
// this library carries the ignore so moving imports cannot strand it.
// ignore_for_file: riverpod_lint/scoped_providers_should_specify_dependencies

part of 'profile_widgets_test.dart';

void _registerProfileEditingPromptsTests() {
  testWidgets('ProfileTab starts with handoff profile edit sections', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1.0;
    tester.view.physicalSize = const Size(390, 844);
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final user = buildUser(name: 'Suvrat Garg');

    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: ProfileTabBody(
              user: user,
              uploadState: const PhotoUploadState(),
              builder: (context, children) => ListView(
                key: const ValueKey('profile-tab-scroll-view'),
                padding: CatchInsets.pageBody.copyWith(left: 0, right: 0),
                children: children,
              ),
            ),
          ),
        ),
      ),
    );
    await tester.pump();

    expect(tester.takeException(), isNull);
    expect(find.byType(PhotoGrid), findsOneWidget);
    expect(find.text('Profile strength'), findsNothing);
    expect(find.textContaining('PHOTOS', findRichText: true), findsOneWidget);
    expect(find.textContaining('PROMPTS', findRichText: true), findsOneWidget);
    expect(find.text('ABOUT YOU'), findsOneWidget);
    expect(find.text('ACTIVITY PREFERENCES'), findsOneWidget);
    expect(find.text('LIFESTYLE'), findsOneWidget);
    expect(_profileInfoTile(_perfectRunPromptTitle), findsOneWidget);

    final photosSection = find.ancestor(
      of: find.byType(PhotoGrid),
      matching: find.byType(CatchSection),
    );
    final photosRule = find.descendant(
      of: photosSection,
      matching: find.byType(CatchDivider),
    );
    expect(photosRule, findsOneWidget);
    expect(tester.getRect(photosRule).left, tester.getRect(photosSection).left);
    expect(
      tester.getRect(photosRule).right,
      tester.getRect(photosSection).right,
    );
    expect(
      tester.getRect(find.byType(PhotoGrid)).top -
          tester.getRect(photosRule).bottom,
      CatchSpacing.s3,
    );
  });

  testWidgets('Profile photo skeleton preserves the ready header rule rhythm', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1.0;
    tester.view.physicalSize = const Size(390, 844);
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      _profileWidgetHarness(
        const Padding(
          padding: CatchInsets.content,
          child: ProfilePhotosSkeletonSection(),
        ),
      ),
    );

    final section = find.byType(CatchSection);
    final rule = find.descendant(
      of: section,
      matching: find.byType(CatchDivider),
    );
    final grid = find.byType(GridView);
    expect(rule, findsOneWidget);
    expect(tester.getRect(rule).left, tester.getRect(section).left);
    expect(tester.getRect(rule).right, tester.getRect(section).right);
    expect(
      tester.getRect(grid).top - tester.getRect(rule).bottom,
      CatchSpacing.s3,
    );
  });

  testWidgets('ProfileTab separates full-width rows from content gutters', (
    tester,
  ) async {
    final user = buildUser(name: 'Suvrat Garg');
    await _pumpProfileTab(tester, user);

    final displayNameTile = _profileInfoTile('Display name');
    expect(displayNameTile, findsOneWidget);

    final rowRect = tester.getRect(displayNameTile);
    expect(rowRect.left, 0);
    expect(rowRect.right, 390);

    // Interaction reaches the edges while the leading content stays inset.
    final leadingIcon = find
        .descendant(of: displayNameTile, matching: find.byType(Icon))
        .first;
    expect(tester.getRect(leadingIcon).left, CatchSpacing.screenPx);

    // Every section divider aligns to the field text lane (derived from the
    // leading-slot metrics) and terminates at the trailing content edge.
    final aboutSection = find.ancestor(
      of: displayNameTile,
      matching: find.byType(CatchSection),
    );
    final dividers = find.descendant(
      of: aboutSection,
      matching: find.byWidgetPredicate(
        (widget) =>
            widget is CatchDivider &&
            widget.variant == CatchDividerVariant.fieldRow,
      ),
    );
    expect(dividers, findsWidgets);
    for (final element in dividers.evaluate()) {
      final coloredBox = find.descendant(
        of: find.byElementPredicate((candidate) => candidate == element),
        matching: find.byType(ColoredBox),
      );
      final box = tester.renderObject<RenderBox>(coloredBox);
      final dividerRect = box.localToGlobal(Offset.zero) & box.size;
      expect(
        dividerRect.left - rowRect.left,
        CatchSpacing.screenPx + CatchFieldRow.textLaneInset,
      );
      expect(dividerRect.right, rowRect.right - CatchSpacing.screenPx);
    }
  });

  testWidgets(
    'ProfileTab edits display name and keeps legal identity readonly',
    (tester) async {
      final user = buildUser(
        name: 'Suvrat Garg',
        firstName: 'Suvrat',
        lastName: 'Garg',
        displayName: 'S.',
      ).copyWith(instagramHandle: 'suvrat_events');
      await _pumpProfileTab(tester, user);

      final displayNameTile = tester.widget<CatchField>(
        _profileInfoTile('Display name'),
      );
      final dobTile = tester.widget<CatchField>(
        _profileInfoTile('Date of birth'),
      );
      final genderTile = tester.widget<CatchField>(_profileInfoTile('Gender'));

      expect(displayNameTile.enabled, isTrue);
      expect(displayNameTile.controller, isNotNull);
      expect(displayNameTile.showClearButton, isTrue);
      expect(
        find.descendant(
          of: _profileInfoTile('Display name'),
          matching: find.text('S.'),
        ),
        findsWidgets,
      );
      expect(find.text('Name'), findsNothing);
      expect(dobTile.controller, isNull);
      expect(dobTile.onTap, isNull);
      expect(genderTile.controller, isNull);
      expect(genderTile.onTap, isNull);
      expect(
        find.descendant(
          of: _profileInfoTile('Display name'),
          matching: find.byIcon(CatchIcons.expand),
        ),
        findsOneWidget,
      );
      for (final label in ['Date of birth', 'Gender']) {
        expect(
          find.descendant(
            of: _profileInfoTile(label),
            matching: find.byIcon(CatchIcons.disclosure),
          ),
          findsNothing,
        );
        expect(
          find.descendant(
            of: _profileInfoTile(label),
            matching: find.byIcon(CatchIcons.expand),
          ),
          findsNothing,
        );
      }
      expect(_profileInfoTile(_perfectRunPromptTitle), findsOneWidget);

      final instagramTile = tester.widget<CatchField>(
        _profileInfoTile('Instagram'),
      );
      expect(instagramTile.enabled, isTrue);
      expect(instagramTile.controller, isNotNull);
      expect(instagramTile.leadingUnit, isNull);
      expect(instagramTile.showClearButton, isTrue);
      expect(find.text('@'), findsNothing);
      expect(find.text('suvrat_events'), findsOneWidget);
      expect(
        find.descendant(
          of: _profileInfoTile('Instagram'),
          matching: find.byIcon(CatchIcons.clear),
        ),
        findsNothing,
      );
      expect(
        tester.getSize(_profileInfoTile('Display name')).height,
        lessThanOrEqualTo(
          tester.getSize(_profileInfoTile('Date of birth')).height,
        ),
      );
    },
  );

  testWidgets('display name edit validates and saves trimmed public name', (
    tester,
  ) async {
    final repository = FakeProfileEditUserProfileRepository();
    final user = buildUser(
      name: 'Suvrat Garg',
      firstName: 'Suvrat',
      lastName: 'Garg',
      displayName: 'Suvrat',
    );
    await _pumpEditableProfileTab(tester, user, repository);

    final displayNameTile = _profileInfoTile('Display name');
    await tester.tap(displayNameTile);
    await _pumpProfileSheet(tester);

    expect(_editableTextForProfileField('Display name'), findsOneWidget);
    expect(find.text('Display name'), findsOneWidget);

    var inlineEditable = _editableTextForProfileField('Display name');
    await tester.enterText(inlineEditable, '   ');
    await tester.testTextInput.receiveAction(TextInputAction.done);
    await tester.pump();

    expect(find.text('Display name is required'), findsOneWidget);
    expect(repository.updatedFields, isNull);

    inlineEditable = _editableTextForProfileField('Display name');
    await tester.enterText(inlineEditable, ' S. ');
    await tester.testTextInput.receiveAction(TextInputAction.done);
    await _pumpProfileSheet(tester);

    expect(repository.updatedFields, {'displayName': 'S.'});
  });

  testWidgets('direct text Saved state survives an equal profile refresh', (
    tester,
  ) async {
    final repository = FakeProfileEditUserProfileRepository();
    final user = buildUser(
      name: 'Suvrat Garg',
      firstName: 'Suvrat',
      lastName: 'Garg',
      displayName: 'Suvrat',
    );
    await _pumpEditableProfileTab(tester, user, repository);

    final displayNameTile = _profileInfoTile('Display name');
    await tester.tap(displayNameTile);
    await _pumpProfileSheet(tester);
    await tester.enterText(_editableTextForProfileField('Display name'), 'S.');
    await tester.pump();
    await _tapInlineDone(tester);
    await _pumpProfileSheet(tester);

    Finder savedStatus() => find.descendant(
      of: displayNameTile,
      matching: find.byKey(const ValueKey('catch-field-saved')),
    );
    expect(savedStatus(), findsOneWidget);

    final refreshed = user.copyWith(displayName: 'S.');
    repository.latestProfile = refreshed;
    await tester.pumpWidget(_editableProfileTab(refreshed, repository));
    await tester.pump();

    expect(savedStatus(), findsOneWidget);
  });

  testWidgets('profile inline drawers animate open and closed', (tester) async {
    final user = buildUser(name: 'Suvrat Garg').copyWith(height: 172);
    await _pumpProfileTab(tester, user);

    final heightTile = _profileInfoTile('Height');
    await _dragProfileTabUntilVisible(tester, heightTile);
    final collapsedTop = tester.getTopLeft(heightTile).dy;
    final collapsedHeight = tester.getSize(heightTile).height;
    await tester.tap(heightTile);
    await tester.pump();
    await pumpFeatureUiFor(
      tester,
      Duration(milliseconds: CatchFieldTokens.reveal.inMilliseconds ~/ 2),
    );
    final openingHeight = tester.getSize(heightTile).height;
    expect(openingHeight, greaterThan(collapsedHeight));
    expect(tester.getTopLeft(heightTile).dy, closeTo(collapsedTop, 0.1));

    await pumpFeatureUiFor(
      tester,
      Duration(milliseconds: CatchFieldTokens.reveal.inMilliseconds ~/ 2),
    );
    final expandedHeight = tester.getSize(heightTile).height;
    expect(openingHeight, lessThan(expandedHeight));

    expect(find.byTooltip('Increase height'), findsOneWidget);
    expect(find.byKey(const ValueKey('catch-field-done')), findsOneWidget);
    expect(
      find.descendant(
        of: heightTile,
        matching: find.textContaining('Optional'),
      ),
      findsOneWidget,
    );
    expect(find.text('Cancel'), findsOneWidget);

    await _tapInlineCancel(tester);
    await pumpFeatureUiFor(
      tester,
      Duration(milliseconds: CatchFieldTokens.reveal.inMilliseconds ~/ 2),
    );
    final closingHeight = tester.getSize(heightTile).height;
    expect(closingHeight, greaterThan(collapsedHeight));
    expect(closingHeight, lessThan(expandedHeight));

    await pumpFeatureUiFor(
      tester,
      Duration(milliseconds: CatchFieldTokens.reveal.inMilliseconds ~/ 2),
    );

    expect(find.byTooltip('Increase height'), findsNothing);
    expect(tester.getSize(heightTile).height, closeTo(collapsedHeight, 0.1));
    expect(tester.takeException(), isNull);
  });

  testWidgets('choice tiles keep their controls through the close animation', (
    tester,
  ) async {
    var open = true;

    await tester.pumpWidget(
      _profileWidgetHarness(
        StatefulBuilder(
          builder: (context, setState) => ProfileMultiEnumRow<Language>(
            icon: CatchIcons.web,
            label: 'Languages',
            contract: CatchContractConstraints.updateUserProfilePatchLanguages,
            contractValue: (value) => value.name,
            values: Language.values,
            selected: const [Language.english, Language.hindi],
            fieldName: 'languages',
            patchForValues: (values) =>
                UpdateUserProfilePatch(languages: values),
            isExpanded: open,
            onTap: () => setState(() => open = !open),
            onSaved: () => setState(() => open = false),
            onCancel: () => setState(() => open = false),
          ),
        ),
      ),
    );

    expect(_catchChip(Language.english.label), findsOneWidget);
    await _tapInlineCancel(tester);
    await pumpFeatureUiFor(
      tester,
      Duration(milliseconds: CatchFieldTokens.reveal.inMilliseconds ~/ 2),
    );

    expect(_catchChip(Language.english.label), findsOneWidget);

    await pumpFeatureUiFor(
      tester,
      Duration(milliseconds: CatchFieldTokens.reveal.inMilliseconds ~/ 2),
    );
    expect(_catchChip(Language.english.label), findsNothing);
  });

  testWidgets('equal profile refresh preserves a multi-choice draft', (
    tester,
  ) async {
    late StateSetter rebuild;
    var selected = <Language>[Language.english];

    await tester.pumpWidget(
      _profileWidgetHarness(
        StatefulBuilder(
          builder: (context, setState) {
            rebuild = setState;
            return ProfileMultiEnumRow<Language>(
              icon: CatchIcons.web,
              label: 'Languages',
              contract:
                  CatchContractConstraints.updateUserProfilePatchLanguages,
              contractValue: (value) => value.name,
              values: Language.values,
              selected: List<Language>.of(selected),
              fieldName: 'languages',
              patchForValues: (values) =>
                  UpdateUserProfilePatch(languages: values),
              isExpanded: true,
              onTap: () {},
              onSaved: () {},
              onCancel: () {},
            );
          },
        ),
      ),
    );

    await tester.tap(_catchChip(Language.hindi.label));
    await _pumpProfileSheet(tester);
    expect(
      tester.widget<CatchChip>(_catchChip(Language.hindi.label)).selected,
      isTrue,
    );

    rebuild(() => selected = <Language>[Language.english]);
    await _pumpProfileSheet(tester);

    expect(
      tester.widget<CatchChip>(_catchChip(Language.hindi.label)).selected,
      isTrue,
    );
  });

  testWidgets('ProfileTab omits private discovery filters', (tester) async {
    final user = buildUser(name: 'Suvrat Garg');
    await _pumpProfileTab(tester, user);

    expect(find.text('Discovery'), findsNothing);
    expect(find.text('Interested in'), findsNothing);
    expect(find.text('Age range'), findsNothing);
    expect(find.textContaining('18 – 60+'), findsNothing);
  });

  testWidgets(
    'ProfileTab keeps activity preferences optional and collapsed before setup',
    (tester) async {
      final user = buildUser(name: 'Suvrat Garg', runPreferencesVersion: 0);
      await _pumpProfileTab(tester, user);

      expect(find.text('ACTIVITY PREFERENCES'), findsOneWidget);
      expect(_profileInfoTile('Pace range'), findsNothing);
      await _openRunningPreferences(tester);
      expect(_profileInfoTile('Pace range'), findsOneWidget);
    },
  );

  testWidgets('Pace range expands inline with shared RangeSlider', (
    tester,
  ) async {
    final user = buildUser(name: 'Suvrat Garg');
    await _pumpProfileTab(tester, user);

    await _openRunningPreferences(tester);

    // Scroll to and tap the pace range row.
    final paceTile = _profileInfoTile('Pace range');
    await _dragProfileTabUntilTappable(tester, paceTile);
    await tester.tap(paceTile);
    await _pumpProfileSheet(tester);

    // Inline editor is open with the shared range slider and Done button.
    expect(find.byType(CatchRangeInput), findsOneWidget);
    expect(find.byType(RangeSlider), findsOneWidget);
    expect(find.text('5:00/km - 7:00/km'), findsOneWidget);
    final catchRangeSlider = tester.widget<CatchRangeInput>(
      find.byType(CatchRangeInput),
    );
    expect(catchRangeSlider.minLabel, isNull);
    expect(catchRangeSlider.maxLabel, isNull);
    final rangeSlider = tester.widget<RangeSlider>(find.byType(RangeSlider));
    expect(rangeSlider.labels, isNull);
    rangeSlider.onChanged!(const RangeValues(270, 540));
    await tester.pump();
    expect(find.text('4:30/km - 9:00/km'), findsOneWidget);
    expect(
      tester
          .widget<SliderTheme>(
            find.ancestor(
              of: find.byType(RangeSlider),
              matching: find.byType(SliderTheme),
            ),
          )
          .data
          .inactiveTickMarkColor,
      Colors.transparent,
    );
    expect(find.text('Done'), findsOneWidget);

    // Dismiss with Done button.
    await tester.tap(find.text('Done'));
    await _pumpProfileSheet(tester);

    // Sheet closed, no exceptions.
    expect(tester.takeException(), isNull);
  });

  testWidgets('prompt card separates explicit question and blur-save answer', (
    tester,
  ) async {
    final repository = FakeProfileEditUserProfileRepository();
    final user = buildUser(name: 'Suvrat Garg');
    await _pumpEditableProfileTab(tester, user, repository);

    final card = find.byKey(const ValueKey('profile-prompt-card-0'));
    final question = _promptQuestionField(0);
    final answer = _promptAnswerField(0);
    expect(card, findsOneWidget);
    expect(
      find.descendant(of: card, matching: find.byType(CatchField)),
      findsNWidgets(2),
    );

    final collapsedQuestion = tester.widget<CatchField>(question);
    expect(collapsedQuestion.title, 'Prompt 1');
    expect(collapsedQuestion.body, _perfectRunPromptTitle);
    expect(collapsedQuestion.open, isFalse);

    final answerField = tester.widget<CatchField>(answer);
    expect(answerField.title, 'Answer');
    expect(answerField.variant, CatchFieldVariant.row);
    expect(answerField.keyboardType, TextInputType.multiline);
    expect(answerField.textInputAction, TextInputAction.newline);
    expect(answerField.maxLines, isNull);
    expect(answerField.minLines, 1);
    expect(answerField.maxLength, maximumProfilePromptAnswerLength);
    expect(answerField.inputFormatters, hasLength(1));
    expect(_promptAnswerEditableText(0), findsOneWidget);
    expect(
      find.descendant(of: question, matching: find.byType(TextField)),
      findsNothing,
    );

    await tester.tap(question);
    await _pumpProfileSheet(tester);

    expect(tester.widget<CatchField>(question).open, isTrue);
    expect(find.byKey(const ValueKey('catch-field-cancel')), findsOneWidget);
    expect(find.byKey(const ValueKey('catch-field-done')), findsOneWidget);
    expect(_catchChip(_perfectRunPromptTitle), findsOneWidget);
    expect(_promptAnswerEditableText(0), findsOneWidget);

    BoxDecoration promptSurfaceDecoration() {
      final surface = tester.widget<AnimatedContainer>(
        find
            .descendant(of: card, matching: find.byType(AnimatedContainer))
            .first,
      );
      return surface.foregroundDecoration! as BoxDecoration;
    }

    int highlightedPromptFields() => tester
        .widgetList<AnimatedContainer>(
          find.descendant(
            of: card,
            matching: find.byKey(const ValueKey('catch-field-active-overlay')),
          ),
        )
        .where(
          (overlay) => (overlay.decoration! as BoxDecoration).border != null,
        )
        .length;

    Rect highlightedPromptFieldRect() {
      final overlays = find.descendant(
        of: card,
        matching: find.byKey(
          const ValueKey<String>('catch-field-active-overlay'),
        ),
      );
      final activeIndex =
          List.generate(
            overlays.evaluate().length,
            (index) => index,
          ).singleWhere((index) {
            final overlay = tester.widget<AnimatedContainer>(
              overlays.at(index),
            );
            return (overlay.decoration! as BoxDecoration).border != null;
          });
      return tester.getRect(overlays.at(activeIndex));
    }

    Rect promptSurfaceRect() => tester.getRect(
      find.descendant(of: card, matching: find.byType(CatchSectionSurface)),
    );

    void expectPromptEdgesShareGeometry() {
      final surfaceRect = promptSurfaceRect();
      final fieldRect = highlightedPromptFieldRect();
      expect(fieldRect.left, closeTo(surfaceRect.left, 0.1));
      expect(fieldRect.right, closeTo(surfaceRect.right, 0.1));
    }

    expect(
      promptSurfaceDecoration().border,
      Border.all(color: CatchTokens.editorialLight.line2),
    );
    expect(highlightedPromptFields(), 1);
    expectPromptEdgesShareGeometry();
    final highlightedOverlay = tester.widget<AnimatedContainer>(
      find.descendant(
        of: card,
        matching: find.byWidgetPredicate((widget) {
          if (widget is! AnimatedContainer ||
              widget.key !=
                  const ValueKey<String>('catch-field-active-overlay')) {
            return false;
          }
          final decoration = widget.decoration;
          return decoration is BoxDecoration && decoration.border != null;
        }),
      ),
    );
    expect(
      (highlightedOverlay.decoration! as BoxDecoration).borderRadius,
      BorderRadius.zero,
    );
    expect(
      find.ancestor(
        of: find.byWidget(highlightedOverlay),
        matching: find.byType(ClipRRect),
      ),
      findsWidgets,
    );

    await tester.tap(_promptAnswerEditableText(0));
    await _pumpProfileSheet(tester);
    expect(tester.widget<CatchField>(question).open, isFalse);
    expect(
      promptSurfaceDecoration().border,
      Border.all(color: CatchTokens.editorialLight.line2),
    );
    expect(highlightedPromptFields(), 1);
    expectPromptEdgesShareGeometry();
    expect(find.byKey(const ValueKey('catch-field-cancel')), findsNothing);
    expect(find.byKey(const ValueKey('catch-field-done')), findsNothing);
    expect(_promptAnswerEditableText(0), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('prompt answer trims and saves implicitly when focus leaves', (
    tester,
  ) async {
    final repository = FakeProfileEditUserProfileRepository();
    final user = buildUser(name: 'Suvrat Garg');
    await _pumpEditableProfileTab(tester, user, repository);

    await tester.enterText(_inlinePromptEditableText(), ' Updated bio ');
    expect(find.byKey(const ValueKey('catch-field-done')), findsNothing);

    await _blurPromptAnswer(tester);
    await _pumpProfileSheet(tester);

    expect(repository.updatedFields?['profilePrompts'], [
      containsPair('answer', 'Updated bio'),
    ]);
    expect(
      tester
          .widget<EditableText>(_inlinePromptEditableText())
          .focusNode
          .hasFocus,
      isFalse,
    );
    expect(find.byKey(const ValueKey('catch-field-saved')), findsOneWidget);
  });

  testWidgets(
    'prompt answer blur preserves a question selection until explicit Done',
    (tester) async {
      final repository = FakeProfileEditUserProfileRepository();
      final user = buildUser(name: 'Suvrat Garg');
      final originalPromptId = user.profilePrompts.first.promptId;
      final alternatePrompt = profilePromptDefinition('favoriteRoute');
      await _pumpEditableProfileTab(tester, user, repository);

      await tester.tap(_promptQuestionField(0));
      await _pumpProfileSheet(tester);
      await tester.tap(_catchChip(alternatePrompt.title));
      await tester.pump();
      expect(
        tester.widget<CatchField>(_promptQuestionField(0)).body,
        alternatePrompt.title,
      );

      await tester.enterText(
        _promptAnswerEditableText(0),
        'Answer saved against the committed question.',
      );
      await _blurPromptAnswer(tester);
      await _pumpProfileSheet(tester);

      final savedPrompts =
          repository.updatedFields?['profilePrompts'] as List<Object?>;
      expect((savedPrompts.single as Map)['promptId'], originalPromptId);
      expect(
        (savedPrompts.single as Map)['answer'],
        'Answer saved against the committed question.',
      );
      expect(
        tester.widget<CatchField>(_promptQuestionField(0)).body,
        alternatePrompt.title,
      );
    },
  );

  testWidgets('prompt Done and answer blur serialize without dropping either', (
    tester,
  ) async {
    final repository = FakeProfileEditUserProfileRepository()
      ..updateCompleter = Completer<void>();
    final user = buildUser(name: 'Suvrat Garg');
    final originalAnswer = user.profilePrompts.first.answer;
    final alternatePrompt = profilePromptDefinition('favoriteRoute');
    const updatedAnswer = 'The answer that blurred while Done was saving.';
    await _pumpEditableProfileTab(tester, user, repository);

    await tester.tap(_promptQuestionField(0));
    await _pumpProfileSheet(tester);
    await tester.tap(_catchChip(alternatePrompt.title));
    await tester.pump();
    await tester.enterText(_promptAnswerEditableText(0), updatedAnswer);

    final doneButton = tester.widget<TextButton>(
      find.descendant(
        of: find.byKey(const ValueKey('catch-field-done')),
        matching: find.byType(TextButton),
      ),
    );
    doneButton.onPressed!.call();
    tester
        .widget<EditableText>(_promptAnswerEditableText(0))
        .focusNode
        .unfocus();
    await tester.pump();

    expect(repository.updateHistory, hasLength(1));
    final questionSave =
        repository.updateHistory.single['profilePrompts'] as List<Object?>;
    expect((questionSave.single as Map)['promptId'], alternatePrompt.id);
    expect((questionSave.single as Map)['answer'], originalAnswer);

    repository.updateCompleter!.complete();
    await _pumpProfileSheet(tester);

    expect(repository.updateHistory, hasLength(2));
    final answerSave =
        repository.updateHistory.last['profilePrompts'] as List<Object?>;
    expect((answerSave.single as Map)['promptId'], alternatePrompt.id);
    expect((answerSave.single as Map)['answer'], updatedAnswer);
    expect(repository.updatedFields, repository.updateHistory.last);
  });

  testWidgets(
    'profile prompt cards remain capped at the three-prompt contract',
    (tester) async {
      final prompts = [
        for (final promptId in defaultProfilePromptIds.take(
          maxProfilePromptAnswers,
        ))
          profilePromptAnswerFor(
            definition: profilePromptDefinition(promptId),
            answer: 'Answer for $promptId',
          ),
      ];
      await _pumpProfileTab(
        tester,
        buildUser(name: 'Suvrat Garg', profilePrompts: prompts),
      );

      expect(
        find.byType(ProfileInlinePromptEntryEditor),
        findsNWidgets(maxProfilePromptAnswers),
      );
      for (var index = 0; index < maxProfilePromptAnswers; index++) {
        expect(
          find.byKey(ValueKey('profile-prompt-card-$index')),
          findsOneWidget,
        );
      }
      expect(
        find.byKey(const ValueKey('inline-profilePrompt-3-entry-editor')),
        findsNothing,
      );
    },
  );
}
