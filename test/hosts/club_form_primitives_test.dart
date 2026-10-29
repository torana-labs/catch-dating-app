import 'package:catch_dating_app/contexts/events/domain/event_policy_defaults.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club_host_defaults.dart';
import 'package:catch_dating_app/core/city_catalog.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/hosts/presentation/club_management/create/widgets/club_basics_step.dart';
import 'package:catch_dating_app/hosts/presentation/club_management/create/widgets/club_details_step.dart';
import 'package:catch_dating_app/hosts/presentation/club_management/create/widgets/club_host_defaults_step.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/widgets/event_age_range_field.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('club details uses description lanes and one contact section', (
    tester,
  ) async {
    final description = TextEditingController();
    final instagram = TextEditingController();
    final phone = TextEditingController();
    final email = TextEditingController();
    addTearDown(description.dispose);
    addTearDown(instagram.dispose);
    addTearDown(phone.dispose);
    addTearDown(email.dispose);

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: ClubDetailsStep(
            formKey: GlobalKey<FormState>(),
            descriptionController: description,
            instagramController: instagram,
            phoneController: phone,
            emailController: email,
          ),
        ),
      ),
    );

    expect(find.byType(CatchSectionList), findsOneWidget);
    expect(find.byType(CatchFieldLanes), findsOneWidget);
    expect(find.byType(CatchSection), findsOneWidget);
    expect(find.byType(CatchField), findsNWidgets(4));
  });

  testWidgets('club defaults use canonical choices and section rows', (
    tester,
  ) async {
    ClubHostDefaults? changed;

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: ClubHostDefaultsStep(
            formKey: GlobalKey<FormState>(),
            defaults: const ClubHostDefaults(),
            currencyCode: 'INR',
            onChanged: (value) => changed = value,
          ),
        ),
      ),
    );

    expect(find.byType(CatchSectionList), findsOneWidget);
    expect(find.byType(CatchSection), findsWidgets);
    expect(
      find.byWidgetPredicate(
        (widget) => widget is CatchChoiceInput,
        skipOffstage: false,
      ),
      findsWidgets,
    );
    expect(find.byType(CatchSurface, skipOffstage: false), findsWidgets);
    final activityField = tester.widget<CatchField>(
      find.byWidgetPredicate(
        (widget) => widget is CatchField && widget.title == 'Default activity',
      ),
    );
    expect(activityField.body, 'Social run');
    expect(
      activityField.helperText,
      'New events start from this activity. Hosts can still change the activity and override the event-specific setup.',
    );
    expect(find.byType(EventAgeRangeField), findsOneWidget);
    expect(
      find.byWidgetPredicate(
        (widget) =>
            widget is CatchField &&
            (widget.title == 'Min age' || widget.title == 'Max age'),
      ),
      findsNothing,
    );

    final admissionField = find.byWidgetPredicate(
      (widget) => widget is CatchField && widget.title == 'Admission format',
    );
    await tester.tap(admissionField);
    await tester.pump(CatchFieldTokens.reveal);

    final balanced = find.byWidgetPredicate(
      (widget) => widget is CatchChoiceTile && widget.title == 'BALANCED',
    );
    await tester.ensureVisible(balanced);
    tester.widget<CatchChoiceTile>(balanced).onTap!();
    await tester.pump(CatchFieldTokens.singleChoiceCloseDelay);
    await tester.pump(CatchFieldTokens.reveal);

    expect(changed?.eventPolicy.admissionPreset.name, 'balancedSingles');
  });

  testWidgets('club basics accepts a city restored after first build', (
    tester,
  ) async {
    final formKey = GlobalKey<FormState>();
    final name = TextEditingController(text: 'Sea Face Social');
    final area = TextEditingController(text: 'Bandra West');
    addTearDown(name.dispose);
    addTearDown(area.dispose);

    CityOption? selectedCity;
    late StateSetter setHarnessState;

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: StatefulBuilder(
          builder: (context, setState) {
            setHarnessState = setState;
            return Scaffold(
              body: ClubBasicsStep(
                formKey: formKey,
                nameController: name,
                selectedCity: selectedCity,
                onCityChanged: (value) => setState(() => selectedCity = value),
                areaController: area,
                clubPhotoPreviews: const [],
                existingImageUrl: null,
                profileImageBytes: null,
                existingProfileImageUrl: null,
                onPickClubPhotos: null,
                onRemoveClubPhoto: null,
                onReorderClubPhoto: null,
                onPickProfileImage: null,
                onRemoveProfileImage: null,
              ),
            );
          },
        ),
      ),
    );

    expect(
      find.byKey(const ValueKey<String>('create-club-city-empty')),
      findsOneWidget,
    );
    expect(formKey.currentState!.validate(), isFalse);
    await tester.pump();
    expect(find.text('Please select a city'), findsOneWidget);

    setHarnessState(() {
      selectedCity = cityOptionByName('in-mh-mumbai')!;
    });
    await tester.pump();

    expect(
      find.byKey(const ValueKey<String>('create-club-city-in-mh-mumbai')),
      findsOneWidget,
    );
    expect(find.text('Mumbai'), findsWidgets);
    expect(find.text('Please select a city'), findsNothing);
    expect(formKey.currentState!.validate(), isTrue);
  });

  testWidgets('club defaults rebuild cohort cap rows', (tester) async {
    final formKey = GlobalKey<FormState>();
    var defaults = const ClubHostDefaults();

    Finder field(String title) => find.byWidgetPredicate(
      (widget) => widget is CatchField && widget.title == title,
    );
    Finder choice(String label, {bool? selected}) => find.byWidgetPredicate(
      (widget) =>
          widget is CatchChoiceTile &&
          widget.title == label &&
          (selected == null || widget.selected == selected),
      skipOffstage: false,
    );

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: StatefulBuilder(
          builder: (context, setState) => Scaffold(
            body: ClubHostDefaultsStep(
              formKey: formKey,
              defaults: defaults,
              currencyCode: 'INR',
              onChanged: (value) => setState(() => defaults = value),
            ),
          ),
        ),
      ),
    );

    expect(choice('OPEN', selected: true), findsOneWidget);
    expect(field('Cohort caps'), findsOneWidget);
    expect(field('Max straight men'), findsNothing);
    expect(field('Max straight women'), findsNothing);

    final cohortCaps = field('Cohort caps');
    await tester.ensureVisible(cohortCaps);
    await tester.tap(cohortCaps);
    await tester.pump(CatchFieldTokens.standard);

    expect(
      defaults.eventPolicy.admissionPreset,
      EventAdmissionDefaultPreset.fixedCohortCaps,
    );
    expect(field('Max straight men'), findsOneWidget);
    expect(field('Max straight women'), findsOneWidget);
    final cohortPair = find
        .ancestor(of: field('Max straight men'), matching: find.byType(Row))
        .first;
    expect(
      find.descendant(of: cohortPair, matching: field('Max straight women')),
      findsOneWidget,
    );

    expect(formKey.currentState!.validate(), isTrue);
  });

  testWidgets('club defaults rebuild pricing rows from disclosed choices', (
    tester,
  ) async {
    final formKey = GlobalKey<FormState>();
    var defaults = const ClubHostDefaults();

    Finder field(String title) => find.byWidgetPredicate(
      (widget) => widget is CatchField && widget.title == title,
    );
    Finder choice(String label, {bool? selected}) => find.byWidgetPredicate(
      (widget) =>
          widget is CatchChoiceTile &&
          widget.title == label &&
          (selected == null || widget.selected == selected),
      skipOffstage: false,
    );

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: StatefulBuilder(
          builder: (context, setState) => Scaffold(
            body: ClubHostDefaultsStep(
              formKey: formKey,
              defaults: defaults,
              currencyCode: 'INR',
              onChanged: (value) => setState(() => defaults = value),
            ),
          ),
        ),
      ),
    );

    final admissionField = tester.widget<CatchField>(field('Admission format'));
    expect(admissionField.open, isNull);
    expect(admissionField.initiallyOpen, isFalse);
    await tester.tap(field('Admission format'));
    await tester.pump(CatchFieldTokens.reveal);
    final balanced = choice('BALANCED');
    tester.widget<CatchChoiceTile>(balanced).onTap!();
    await tester.pump(CatchFieldTokens.singleChoiceCloseDelay);
    await tester.pump(CatchFieldTokens.reveal);

    expect(
      defaults.eventPolicy.admissionPreset,
      EventAdmissionDefaultPreset.balancedSingles,
    );
    expect(field('Demand pricing'), findsOneWidget);

    final demandPricing = field('Demand pricing');
    await tester.ensureVisible(demandPricing);
    await tester.tap(demandPricing);
    await tester.pump(CatchFieldTokens.standard);

    expect(defaults.eventPolicy.dynamicPricingEnabled, isTrue);
    expect(defaults.eventPolicy.dynamicPricingStepInPaise, 25000);
    expect(defaults.eventPolicy.dynamicPricingMaxInPaise, 150000);
    expect(field('Step'), findsOneWidget);
    expect(field('Max'), findsOneWidget);
    final pricingPair = find
        .ancestor(of: field('Step'), matching: find.byType(Row))
        .first;
    expect(
      find.descendant(of: pricingPair, matching: field('Max')),
      findsOneWidget,
    );
    expect(formKey.currentState!.validate(), isTrue);
  });
}
