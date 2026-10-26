// Riverpod reports the shared test-root ProviderScope overrides from the
// library entrypoint against this part file, so the adjacent entrypoint ignores
// cannot attach to the remapped diagnostics.
// ignore_for_file: riverpod_lint/scoped_providers_should_specify_dependencies

part of 'profile_widgets_test.dart';

void _registerProfileChoiceEditorsTests() {
  testWidgets('inline prompt choices exclude questions used by other cards', (
    tester,
  ) async {
    final repository = FakeProfileEditUserProfileRepository();
    final favoriteRoute = profilePromptDefinition('favoriteRoute');
    final usedPrompt = profilePromptDefinition('afterEvent');
    final user = buildUser(
      name: 'Suvrat Garg',
      profilePrompts: [
        profilePromptAnswerFor(
          definition: profilePromptDefinition(profilePromptPerfectEventId),
          answer: 'Here for the event.',
        ),
        profilePromptAnswerFor(
          definition: usedPrompt,
          answer: 'Post-run coffee.',
        ),
      ],
    );
    await _pumpEditableProfileTab(tester, user, repository);

    final promptEditor = find.byKey(
      const ValueKey('inline-profilePrompt-2-entry-editor'),
    );
    await _dragProfileTabUntilVisible(tester, promptEditor);
    tester.widget<ProfileInlinePromptEntryEditor>(promptEditor).onTap();
    await tester.pump();
    await _pumpProfileSheet(tester);
    expect(tester.widget<CatchField>(_promptQuestionField(2)).open, isTrue);
    expect(_catchChip(_perfectRunPromptTitle), findsNothing);
    expect(_catchChip(usedPrompt.title), findsNothing);
    expect(_catchChip(favoriteRoute.title), findsOneWidget);

    await tester.tap(_catchChip(favoriteRoute.title));
    await _pumpProfileSheet(tester);

    expect(
      tester.widget<CatchField>(_promptQuestionField(2)).body,
      favoriteRoute.title,
    );
    expect(repository.updatedFields, isNull);

    tester
        .widget<EditableText>(_promptAnswerEditableText(2))
        .focusNode
        .requestFocus();
    await tester.pump();
    await tester.enterText(
      _promptAnswerEditableText(2),
      'Sunday loops with a view.',
    );
    await _blurPromptAnswer(tester, index: 2);
    await _pumpProfileSheet(tester);

    expect(repository.updateHistory, isEmpty);
    expect(find.byKey(const ValueKey('catch-field-done')), findsOneWidget);

    await _tapInlineDone(tester);
    await _pumpProfileSheet(tester);

    expect(promptEditor, findsOneWidget);
    expect(find.byKey(const ValueKey('profile-prompt-card-2')), findsOneWidget);
    expect(_promptAnswerField(2), findsOneWidget);
    expect(repository.updateHistory, hasLength(1));

    final savedPrompts =
        repository.updatedFields?['profilePrompts'] as List<Object?>;
    expect(savedPrompts.map((prompt) => (prompt as Map)['promptId']), [
      profilePromptPerfectEventId,
      'afterEvent',
      'favoriteRoute',
    ]);
    expect((savedPrompts.last as Map)['answer'], 'Sunday loops with a view.');
    expect(find.byKey(const ValueKey('profile-prompt-add-3')), findsNothing);
  });

  testWidgets('inline email edit uses the email keyboard', (tester) async {
    final user = buildUser(name: 'Suvrat Garg');
    await _pumpProfileTab(tester, user);

    final emailTile = _profileInfoTile('Email');
    await _dragProfileTabUntilVisible(tester, emailTile);
    await tester.tap(emailTile);
    await _pumpProfileSheet(tester);

    final field = tester.widget<CatchField>(_profileInfoTile('Email'));
    expect(field.keyboardType, TextInputType.emailAddress);
    expect(field.autofillHints, contains(AutofillHints.email));
  });

  testWidgets('inline email edit keeps row geometry stable and actions close', (
    tester,
  ) async {
    final repository = FakeProfileEditUserProfileRepository();
    final user = buildUser(name: 'Suvrat Garg');
    await _pumpEditableProfileTab(tester, user, repository);

    final emailTile = _profileInfoTile('Email');
    await _dragProfileTabUntilVisible(tester, emailTile);
    final collapsedTileHeight = tester.getSize(emailTile).height;

    await tester.tap(emailTile);
    await _pumpProfileSheet(tester);
    await tester.enterText(
      _editableTextForProfileField('Email'),
      'hi@catch.app',
    );
    await tester.pump();
    await _tapInlineDone(tester);
    await _pumpProfileSheet(tester);

    final expandedTileHeight = tester.getSize(emailTile).height;

    expect(repository.updatedFields, {'email': 'hi@catch.app'});
    expect(expandedTileHeight, closeTo(collapsedTileHeight, 1));
    expect(tester.takeException(), isNull);
  });

  testWidgets('height inline edit uses bounded plus-minus controls', (
    tester,
  ) async {
    final user = buildUser(name: 'Suvrat Garg').copyWith(height: 172);
    await _pumpProfileTab(tester, user);

    final heightTile = _profileInfoTile('Height');
    await _dragProfileTabUntilVisible(tester, heightTile);
    await tester.tap(heightTile);
    await _pumpProfileSheet(tester);

    expect(tester.widget<CatchField>(heightTile).isOptional, isTrue);
    expect(find.text('172 cm'), findsNWidgets(2));
    expect(find.text('120-220 cm'), findsNothing);
    expect(find.byTooltip('Decrease height'), findsOneWidget);
    expect(find.byTooltip('Increase height'), findsOneWidget);
    expect(find.byKey(const ValueKey('catch-field-done')), findsOneWidget);

    await tester.tap(find.byTooltip('Increase height'));
    await tester.pump();

    expect(find.text('172 cm'), findsNothing);
    expect(find.text('173 cm'), findsNWidgets(2));

    await _tapInlineDone(tester);
    await _pumpProfileSheet(tester);

    expect(tester.takeException(), isNull);
  });

  testWidgets('height edit waits for save before closing', (tester) async {
    final repository = FakeProfileEditUserProfileRepository()
      ..updateCompleter = Completer<void>();
    final user = buildUser(name: 'Suvrat Garg').copyWith(height: 172);
    await _pumpEditableProfileTab(tester, user, repository);

    final heightTile = _profileInfoTile('Height');
    await _dragProfileTabUntilVisible(tester, heightTile);
    await tester.tap(heightTile);
    await _pumpProfileSheet(tester);

    await tester.tap(find.byTooltip('Increase height'));
    await tester.pump();
    await _tapInlineDone(tester);
    await tester.pump();

    expect(repository.updatedFields, {'height': 173});
    expect(find.byTooltip('Increase height'), findsOneWidget);
    expect(_loadingCatchButtonCount(tester), 1);
    expect(
      find.byWidgetPredicate(
        (widget) =>
            widget is CatchLoadingIndicator &&
            widget.variant == CatchLoadingIndicatorVariant.inline,
      ),
      findsOneWidget,
    );

    repository.updateCompleter!.complete();
    await _pumpProfileSheet(tester);

    expect(find.byTooltip('Increase height'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('prompt answer save failure stays inline with field error', (
    tester,
  ) async {
    final repository = FakeProfileEditUserProfileRepository()
      ..updateError = StateError('Save failed');
    final user = buildUser(name: 'Suvrat Garg');
    await _pumpEditableProfileTab(tester, user, repository);

    await tester.enterText(_inlinePromptEditableText(), 'Updated bio');
    await _blurPromptAnswer(tester);
    await _pumpProfileSheet(tester);

    expect(repository.updatedFields?['profilePrompts'], [
      containsPair('answer', 'Updated bio'),
    ]);
    expect(_inlinePromptEditableText(), findsOneWidget);
    expect(tester.widget<CatchField>(_promptAnswerField(0)).error, isNotNull);
    expect(
      find.text('Something went wrong. Please try again.'),
      findsOneWidget,
    );
  });

  testWidgets('prompt edit limits input to the callable length limit', (
    tester,
  ) async {
    final repository = FakeProfileEditUserProfileRepository();
    final user = buildUser(name: 'Suvrat Garg');
    await _pumpEditableProfileTab(tester, user, repository);

    await tester.enterText(
      _inlinePromptEditableText(),
      'a' * (maximumProfilePromptAnswerLength + 1),
    );
    await tester.pump();
    final editableText = tester.widget<EditableText>(
      _inlinePromptEditableText(),
    );

    expect(
      editableText.controller.text.length,
      maximumProfilePromptAnswerLength,
    );
    final counter = find.text(
      '$maximumProfilePromptAnswerLength / $maximumProfilePromptAnswerLength',
    );
    expect(counter, findsOneWidget);
    final answerBottom = tester.getBottomLeft(_inlinePromptEditableText()).dy;
    final counterTop = tester.getTopLeft(counter).dy;
    expect(answerBottom, lessThan(counterTop));
    expect(find.byKey(const ValueKey('catch-field-cancel')), findsNothing);
    expect(find.byKey(const ValueKey('catch-field-done')), findsNothing);

    await _blurPromptAnswer(tester);
    await _pumpProfileSheet(tester);

    expect(repository.updatedFields?['profilePrompts'], [
      containsPair('answer', 'a' * maximumProfilePromptAnswerLength),
    ]);
    expect(
      find.text(
        'Prompt must be $maximumProfilePromptAnswerLength characters or fewer',
      ),
      findsNothing,
    );
  });

  testWidgets('prompt edit collapses repeated empty lines while typing', (
    tester,
  ) async {
    final repository = FakeProfileEditUserProfileRepository();
    final user = buildUser(name: 'Suvrat Garg');
    await _pumpEditableProfileTab(tester, user, repository);

    await tester.enterText(
      _inlinePromptEditableText(),
      'first\n\n\nsecond\n \n \nthird',
    );
    await tester.pump();

    final editableText = tester.widget<EditableText>(
      _inlinePromptEditableText(),
    );
    expect(editableText.controller.text, 'first\n\nsecond\n\nthird');

    await _blurPromptAnswer(tester);
    await _pumpProfileSheet(tester);

    expect(repository.updatedFields?['profilePrompts'], [
      containsPair('answer', 'first\n\nsecond\n\nthird'),
    ]);
  });

  testWidgets('prompt answer shows saving then saved status after blur', (
    tester,
  ) async {
    final repository = FakeProfileEditUserProfileRepository()
      ..updateCompleter = Completer<void>();
    final user = buildUser(name: 'Suvrat Garg');
    await _pumpEditableProfileTab(tester, user, repository);

    await tester.enterText(_inlinePromptEditableText(), 'Updated bio');
    await _blurPromptAnswer(tester);

    expect(repository.updatedFields?['profilePrompts'], [
      containsPair('answer', 'Updated bio'),
    ]);
    expect(_inlinePromptEditableText(), findsOneWidget);
    expect(_promptAnswerSavingCount(0), 1);
    expect(tester.widget<CatchField>(_promptAnswerField(0)).readOnly, isTrue);

    repository.updateCompleter!.complete();
    await _pumpProfileSheet(tester);

    expect(_promptAnswerSavingCount(0), 0);
    expect(find.byKey(const ValueKey('catch-field-saved')), findsOneWidget);
    expect(tester.widget<CatchField>(_promptAnswerField(0)).readOnly, isFalse);
    expect(
      tester
          .widget<EditableText>(_inlinePromptEditableText())
          .focusNode
          .hasFocus,
      isFalse,
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'clearable single-choice inline editors open with no selected chip',
    (tester) async {
      final repository = FakeProfileEditUserProfileRepository();
      final user = buildUser(name: 'Suvrat Garg');
      await _pumpEditableProfileTab(tester, user, repository);

      for (final field in _nullableSingleChoiceFields) {
        final tile = _profileInfoTile(field.tileLabel);
        await _dragProfileTabUntilVisible(tester, tile);
        await tester.tap(tile);
        await _pumpProfileSheet(tester);

        final firstChip = tester.widget<CatchChip>(
          _catchChip(field.firstLabel),
        );
        expect(firstChip.selected, isFalse, reason: field.tileLabel);

        await _tapInlineCancel(tester);
        await _pumpProfileSheet(tester);
      }
    },
  );

  testWidgets('nullable drinking inline editor does not preselect Never', (
    tester,
  ) async {
    final repository = FakeProfileEditUserProfileRepository();
    final user = buildUser(name: 'Suvrat Garg');
    await _pumpEditableProfileTab(tester, user, repository);

    final drinkingTile = _profileInfoTile('Drinking');
    await _dragProfileTabUntilVisible(tester, drinkingTile);
    await tester.tap(drinkingTile);
    await _pumpProfileSheet(tester);

    final neverChip = tester.widget<CatchChip>(
      _catchChip(DrinkingHabit.never.label),
    );
    expect(neverChip.selected, isFalse);
  });

  testWidgets('inline chip editors do not repeat the field label', (
    tester,
  ) async {
    final repository = FakeProfileEditUserProfileRepository();
    final user = buildUser(name: 'Suvrat Garg');
    await _pumpEditableProfileTab(tester, user, repository);

    final childrenTile = _profileInfoTile('Children');
    await _dragProfileTabUntilTappable(tester, childrenTile);
    await tester.tap(childrenTile);
    await _pumpProfileSheet(tester);

    expect(find.text('Children'), findsOneWidget);
    expect(_catchChip(ChildrenStatus.dontHave.label), findsOneWidget);
  });

  testWidgets('ProfileSingleEnumRow renders through the inline editor', (
    tester,
  ) async {
    await tester.pumpWidget(
      _profileWidgetHarness(
        ProfileSingleEnumRow<EducationLevel>(
          icon: CatchIcons.education,
          label: 'Education',
          contract: CatchContractConstraints.updateUserProfilePatchEducation,
          contractValue: (value) => value.name,
          values: EducationLevel.values,
          value: EducationLevel.masters,
          fieldName: 'education',
          patchForValue: (value) => UpdateUserProfilePatch(education: value),
          isExpanded: false,
          onTap: () {},
          onSaved: () {},
          onCancel: () {},
        ),
      ),
    );

    expect(find.byType(ProfileSingleEnumRow<EducationLevel>), findsOneWidget);
    expect(
      find.byType(ProfileInlineSingleChoiceEntryEditor<EducationLevel>),
      findsOneWidget,
    );
    expect(find.text('Education'), findsOneWidget);
    expect(find.text(EducationLevel.masters.label), findsOneWidget);
  });

  testWidgets('ProfileMultiEnumRow renders through the inline editor', (
    tester,
  ) async {
    await tester.pumpWidget(
      _profileWidgetHarness(
        ProfileMultiEnumRow<Language>(
          icon: CatchIcons.web,
          label: 'Languages',
          contract: CatchContractConstraints.updateUserProfilePatchLanguages,
          contractValue: (value) => value.name,
          values: Language.values,
          selected: const [Language.english, Language.hindi],
          fieldName: 'languages',
          patchForValues: (values) => UpdateUserProfilePatch(languages: values),
          isExpanded: false,
          onTap: () {},
          onSaved: () {},
          onCancel: () {},
        ),
      ),
    );

    expect(find.byType(ProfileMultiEnumRow<Language>), findsOneWidget);
    expect(
      find.byType(ProfileInlineMultiChoiceEntryEditor<Language>),
      findsOneWidget,
    );
    expect(find.text('Languages'), findsOneWidget);
    expect(find.text('English · Hindi'), findsOneWidget);
  });

  testWidgets('single-choice chip saves only after Done', (tester) async {
    final repository = FakeProfileEditUserProfileRepository();
    final user = buildUser(name: 'Suvrat Garg');
    await _pumpEditableProfileTab(tester, user, repository);

    final educationTile = _profileInfoTile('Education');
    await _dragProfileTabUntilVisible(tester, educationTile);
    await tester.tap(educationTile);
    await _pumpProfileSheet(tester);
    await tester.tap(_catchChip(EducationLevel.values.first.label));
    await _pumpProfileSheet(tester);

    expect(repository.updatedFields, isNull);
    expect(
      tester
          .widget<CatchChip>(_catchChip(EducationLevel.values.first.label))
          .selected,
      isTrue,
    );

    await _tapInlineDone(tester);
    await _pumpProfileSheet(tester);

    expect(repository.updatedFields, {
      'education': EducationLevel.values.first.name,
    });
    expect(_catchChip(EducationLevel.values.first.label), findsNothing);
  });

  testWidgets('single-choice chip can be deselected and saved as null', (
    tester,
  ) async {
    final repository = FakeProfileEditUserProfileRepository();
    final user = buildUser(
      name: 'Suvrat Garg',
    ).copyWith(education: EducationLevel.highSchool);
    await _pumpEditableProfileTab(tester, user, repository);

    final educationTile = _profileInfoTile('Education');
    await _dragProfileTabUntilVisible(tester, educationTile);
    await tester.tap(educationTile);
    await _pumpProfileSheet(tester);

    expect(
      find.descendant(
        of: educationTile,
        matching: find.textContaining('Optional'),
      ),
      findsOneWidget,
    );
    expect(_catchChip(EducationLevel.highSchool.label), findsOneWidget);
    expect(
      tester
          .widget<CatchChip>(_catchChip(EducationLevel.highSchool.label))
          .selected,
      isTrue,
    );

    await tester.tap(_catchChip(EducationLevel.highSchool.label));
    await _pumpProfileSheet(tester);

    expect(find.text('Add education'), findsWidgets);
    expect(_catchChip(EducationLevel.highSchool.label), findsOneWidget);
    expect(
      tester
          .widget<CatchChip>(_catchChip(EducationLevel.highSchool.label))
          .selected,
      isFalse,
    );

    await _tapInlineDone(tester);
    await _pumpProfileSheet(tester);

    expect(repository.updatedFields, {'education': null});
    expect(_catchChip(EducationLevel.highSchool.label), findsNothing);
  });

  testWidgets('languages can clear the last value with Optional copy', (
    tester,
  ) async {
    final repository = FakeProfileEditUserProfileRepository();
    final user = buildUser(
      name: 'Suvrat Garg',
    ).copyWith(languages: const [Language.english]);
    await _pumpEditableProfileTab(tester, user, repository);

    final languagesTile = _profileInfoTile('Languages');
    await _dragProfileTabUntilVisible(tester, languagesTile);
    await tester.tap(languagesTile);
    await _pumpProfileSheet(tester);

    expect(
      find.descendant(
        of: languagesTile,
        matching: find.textContaining('Optional'),
      ),
      findsOneWidget,
    );
    await tester.tap(_catchChip(Language.english.label));
    await _pumpProfileSheet(tester);
    expect(
      tester.widget<CatchChip>(_catchChip(Language.english.label)).selected,
      isFalse,
    );

    await _tapInlineDone(tester);
    await _pumpProfileSheet(tester);

    expect(repository.updatedFields, {'languages': <String>[]});
  });

  testWidgets('single-choice empty draft does not show stale saved value', (
    tester,
  ) async {
    final repository = FakeProfileEditUserProfileRepository();
    final user = buildUser(
      name: 'Suvrat Garg',
    ).copyWith(relationshipGoal: RelationshipGoal.relationship);
    await _pumpEditableProfileTab(tester, user, repository);

    final lookingForTile = _profileInfoTile('Looking for');
    await _dragProfileTabUntilVisible(tester, lookingForTile);
    await tester.tap(lookingForTile);
    await _pumpProfileSheet(tester);

    expect(_catchChip(RelationshipGoal.relationship.label), findsOneWidget);

    await tester.tap(_catchChip(RelationshipGoal.relationship.label));
    await _pumpProfileSheet(tester);

    final relationshipTexts = find.text(RelationshipGoal.relationship.label);
    expect(relationshipTexts, findsOneWidget);
    expect(find.text('Add looking for'), findsWidgets);
    expect(
      tester
          .widget<CatchChip>(_catchChip(RelationshipGoal.relationship.label))
          .selected,
      isFalse,
    );
  });

  testWidgets('multi-choice selected chips move into the row value slot', (
    tester,
  ) async {
    final repository = FakeProfileEditUserProfileRepository();
    final user = buildUser(
      name: 'Suvrat Garg',
    ).copyWith(languages: [Language.english]);
    await _pumpEditableProfileTab(tester, user, repository);

    final languagesTile = _profileInfoTile('Languages');
    await _dragProfileTabUntilVisible(tester, languagesTile);
    await tester.tap(languagesTile);
    await _pumpProfileSheet(tester);

    expect(_catchChip(Language.english.label), findsOneWidget);
    final selectedLanguageChip = tester.widget<CatchChip>(
      _catchChip(Language.english.label),
    );
    expect(selectedLanguageChip.selected, isTrue);
    expect(selectedLanguageChip.mode, CatchChipMode.multiple);
    expect(
      find.descendant(
        of: _catchChip(Language.english.label),
        matching: find.byIcon(CatchIcons.check),
      ),
      findsOneWidget,
    );

    await tester.tap(_catchChip(Language.english.label));
    await _pumpProfileSheet(tester);

    expect(_catchChip(Language.english.label), findsOneWidget);
    expect(
      tester.widget<CatchChip>(_catchChip(Language.english.label)).selected,
      isFalse,
    );
    expect(repository.updatedFields, isNull);
  });

  testWidgets('single-choice save shows pending state before closing', (
    tester,
  ) async {
    final repository = FakeProfileEditUserProfileRepository()
      ..updateCompleter = Completer<void>();
    final user = buildUser(name: 'Suvrat Garg');
    await _pumpEditableProfileTab(tester, user, repository);

    final educationTile = _profileInfoTile('Education');
    await _dragProfileTabUntilVisible(tester, educationTile);
    await tester.tap(educationTile);
    await _pumpProfileSheet(tester);
    await tester.tap(_catchChip(EducationLevel.values.first.label));
    await _pumpProfileSheet(tester);

    expect(repository.updatedFields, isNull);

    await _tapInlineDone(tester);
    await tester.pump();

    expect(repository.updatedFields, {
      'education': EducationLevel.values.first.name,
    });
    expect(_loadingCatchButtonCount(tester), 1);
    expect(
      find.byWidgetPredicate(
        (widget) =>
            widget is CatchLoadingIndicator &&
            widget.variant == CatchLoadingIndicatorVariant.inline,
      ),
      findsOneWidget,
    );
    expect(
      tester
          .widget<CatchChip>(_catchChip(EducationLevel.values.first.label))
          .enabled,
      isFalse,
    );

    repository.updateCompleter!.complete();
    await _pumpProfileSheet(tester);

    expect(_catchChip(EducationLevel.values.first.label), findsNothing);
  });

  testWidgets(
    'failed single-choice save clears pending selection and keeps editor open',
    (tester) async {
      final repository = FakeProfileEditUserProfileRepository()
        ..updateError = StateError('Save failed');
      final user = buildUser(name: 'Suvrat Garg');
      await _pumpEditableProfileTab(tester, user, repository);

      final educationTile = _profileInfoTile('Education');
      await _dragProfileTabUntilVisible(tester, educationTile);
      await tester.tap(educationTile);
      await _pumpProfileSheet(tester);
      await tester.tap(_catchChip(EducationLevel.values.first.label));
      await _tapInlineDone(tester);
      await _pumpProfileSheet(tester);

      expect(repository.updatedFields, {
        'education': EducationLevel.values.first.name,
      });
      expect(
        find.text('Something went wrong. Please try again.'),
        findsOneWidget,
      );
      expect(find.byType(CircularProgressIndicator), findsNothing);
      expect(
        tester
            .widget<CatchChip>(_catchChip(EducationLevel.values.first.label))
            .selected,
        isTrue,
      );
    },
  );

  testWidgets(
    'failed single-choice editors do not leak selection to another field',
    (tester) async {
      final repository = FakeProfileEditUserProfileRepository()
        ..updateError = StateError('Save failed');
      final user = buildUser(name: 'Suvrat Garg');
      await _pumpEditableProfileTab(tester, user, repository);

      final educationTile = _profileInfoTile('Education');
      await _dragProfileTabUntilVisible(tester, educationTile);
      await tester.tap(educationTile);
      await _pumpProfileSheet(tester);
      await tester.tap(_catchChip(EducationLevel.values.first.label));
      await _tapInlineDone(tester);
      await _pumpProfileSheet(tester);

      expect(
        tester
            .widget<CatchChip>(_catchChip(EducationLevel.values.first.label))
            .selected,
        isTrue,
      );

      await tester.tap(educationTile);
      await _pumpProfileSheet(tester);

      final drinkingTile = _profileInfoTile('Drinking');
      await _dragProfileTabUntilVisible(tester, drinkingTile);
      await tester.tap(drinkingTile);
      await _pumpProfileSheet(tester);

      expect(
        tester
            .widget<CatchChip>(_catchChip(DrinkingHabit.never.label))
            .selected,
        isFalse,
      );
    },
  );

  testWidgets('multi-choice edit saves before closing', (tester) async {
    final repository = FakeProfileEditUserProfileRepository();
    final user = buildUser(name: 'Suvrat Garg');
    await _pumpEditableProfileTab(tester, user, repository);

    final languagesTile = _profileInfoTile('Languages');
    await _dragProfileTabUntilVisible(tester, languagesTile);
    await tester.tap(languagesTile);
    await _pumpProfileSheet(tester);
    await tester.tap(_catchChip(Language.english.label));
    await _tapInlineDone(tester);
    await _pumpProfileSheet(tester);

    expect(repository.updatedFields, {
      'languages': [Language.english.name],
    });
    expect(_catchChip(Language.english.label), findsNothing);
  });

  testWidgets('pace range edit saves values before closing', (tester) async {
    final repository = FakeProfileEditUserProfileRepository();
    final user = buildUser(name: 'Suvrat Garg');
    await _pumpEditableProfileTab(tester, user, repository);

    await _openRunningPreferences(tester);
    final paceTile = _profileInfoTile('Pace range');
    await _dragProfileTabUntilTappable(tester, paceTile);
    await tester.tap(paceTile);
    await _pumpProfileSheet(tester);

    tester.widget<RangeSlider>(find.byType(RangeSlider)).onChanged!(
      const RangeValues(310, 370),
    );
    await tester.pump();
    await _tapInlineDone(tester);
    await _pumpProfileSheet(tester);

    expect(repository.updatedFields, {
      'activityPreferences': {
        'running': {
          'paceMinSecsPerKm': 310,
          'paceMaxSecsPerKm': 370,
          'preferredDistances': <String>[],
          'runningReasons': <String>[],
          'preferredRunTimes': <String>[],
          'version': 1,
        },
      },
    });
    expect(find.byType(RangeSlider), findsNothing);
  });
}
