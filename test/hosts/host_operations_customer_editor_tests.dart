part of 'host_operations_screen_test.dart';

void _registerHostOperationsCustomerEditorTests() {
  testWidgets('customer identity edits and saves in place', (tester) async {
    String? savedDisplayName;
    String? savedPhone;
    String? savedEmail;
    final customer = _customerDetail(
      contactDetailsEditable: true,
      linkedAccount: false,
      identityState: HostAudienceIdentityState.unlinked,
      identityConfidence: 'unverified',
      phoneE164: '+919876543210',
    );
    await _pumpHostScreen(
      tester,
      Scaffold(
        body: HostCustomerIdentityCard(
          customer: customer,
          onSave: ({required displayName, phoneE164, email}) async {
            savedDisplayName = displayName;
            savedPhone = phoneE164;
            savedEmail = email;
          },
        ),
      ),
    );

    expect(find.text('+919876543210'), findsOneWidget);
    expect(find.text('Add email'), findsOneWidget);
    expect(
      find.descendant(
        of: find.byType(HostCustomerIdentityCard),
        matching: find.byIcon(CatchIcons.disclosure),
      ),
      findsNothing,
    );

    expect(
      find.byKey(const ValueKey('host-customer-name-field')),
      findsNothing,
    );
    expect(find.text('+919876543210'), findsOneWidget);
    expect(find.text('Add email'), findsOneWidget);
    final avatar = tester.widget<CatchAvatar>(find.byType(CatchAvatar));
    expect(avatar.size, CatchRecordTokens.avatarExtent);
    expect(find.text('Regular'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('host-customer-edit-details')));
    await tester.pump();

    expect(
      find.text('Added by your team · not verified by Catch'),
      findsOneWidget,
    );
    expect(find.byKey(const ValueKey('host-customer-edit-name')), findsOne);
    expect(find.byKey(const ValueKey('host-customer-edit-phone')), findsOne);
    expect(find.byKey(const ValueKey('host-customer-edit-email')), findsOne);
    expect(
      find.byKey(const ValueKey('host-customer-edit-details')),
      findsNothing,
    );
    expect(find.byKey(const ValueKey('catch-field-action-bar')), findsOne);

    await tester.enterText(
      find.descendant(
        of: find.byKey(const ValueKey('host-customer-edit-phone')),
        matching: find.byType(TextField),
      ),
      '',
    );
    await tester.enterText(
      find.descendant(
        of: find.byKey(const ValueKey('host-customer-edit-email')),
        matching: find.byType(TextField),
      ),
      '',
    );
    await tester.tap(find.byKey(const ValueKey('catch-field-done')));
    await pumpFeatureUi(tester);

    expect(
      find.text('Add or keep at least one mobile number or email address.'),
      findsOneWidget,
    );
    expect(savedDisplayName, isNull);

    await tester.enterText(
      find.descendant(
        of: find.byKey(const ValueKey('host-customer-edit-name')),
        matching: find.byType(TextField),
      ),
      'Ananya Kapoor',
    );
    await tester.enterText(
      find.descendant(
        of: find.byKey(const ValueKey('host-customer-edit-phone')),
        matching: find.byType(TextField),
      ),
      '+919999999999',
    );
    await tester.enterText(
      find.descendant(
        of: find.byKey(const ValueKey('host-customer-edit-email')),
        matching: find.byType(TextField),
      ),
      'NEW@Example.COM',
    );
    await tester.tap(find.byKey(const ValueKey('catch-field-done')));
    await pumpFeatureUi(tester);

    expect(savedDisplayName, 'Ananya Kapoor');
    expect(savedPhone, '+919999999999');
    expect(savedEmail, 'new@example.com');
    expect(find.text('Ananya Kapoor'), findsOneWidget);
    expect(find.text('+919999999999'), findsOneWidget);
    expect(find.text('new@example.com'), findsOneWidget);
    expect(find.byKey(const ValueKey('catch-field-action-bar')), findsNothing);
  });

  testWidgets('cancel restores customer details without saving', (
    tester,
  ) async {
    var saves = 0;
    final customer = _customerDetail(
      contactDetailsEditable: true,
      linkedAccount: false,
      identityState: HostAudienceIdentityState.unlinked,
      identityConfidence: 'unverified',
    );
    await _pumpHostScreen(
      tester,
      Scaffold(
        body: HostCustomerIdentityCard(
          customer: customer,
          onSave: ({required displayName, phoneE164, email}) async {
            saves += 1;
          },
        ),
      ),
    );

    await tester.tap(find.byKey(const ValueKey('host-customer-edit-details')));
    await tester.pump();
    await tester.tap(find.byKey(const ValueKey('catch-field-done')));
    await tester.pump();

    expect(saves, 0);
    expect(find.byKey(const ValueKey('host-customer-edit-name')), findsNothing);

    await tester.tap(find.byKey(const ValueKey('host-customer-edit-details')));
    await tester.pump();
    await tester.enterText(
      find.descendant(
        of: find.byKey(const ValueKey('host-customer-edit-name')),
        matching: find.byType(TextField),
      ),
      'Discarded name',
    );
    await tester.tap(find.byKey(const ValueKey('catch-field-cancel')));
    await tester.pump();

    expect(saves, 0);
    expect(find.text('Ananya Rao'), findsOneWidget);
    expect(find.text('Discarded name'), findsNothing);
    expect(find.byKey(const ValueKey('host-customer-edit-name')), findsNothing);
  });

  testWidgets('verified customer edits name while endpoints stay read-only', (
    tester,
  ) async {
    await _pumpHostScreen(
      tester,
      Scaffold(
        body: HostCustomerIdentityCard(
          customer: _customerDetail(),
          onSave: ({required displayName, phoneE164, email}) async {},
        ),
      ),
    );

    expect(find.text('Not saved'), findsNWidgets(2));
    await tester.tap(find.byKey(const ValueKey('host-customer-edit-details')));
    await tester.pump();

    expect(find.byKey(const ValueKey('host-customer-edit-name')), findsOne);
    expect(
      find.byKey(const ValueKey('host-customer-edit-phone')),
      findsNothing,
    );
    expect(
      find.byKey(const ValueKey('host-customer-edit-email')),
      findsNothing,
    );
    expect(
      tester
          .widget<CatchField>(
            find.byKey(const ValueKey('host-customer-phone-field')),
          )
          .onTap,
      isNull,
    );
    expect(
      tester
          .widget<CatchField>(
            find.byKey(const ValueKey('host-customer-email-field')),
          )
          .onTap,
      isNull,
    );
    expect(
      find.text(
        'Phone and email come from the source record and can’t be edited here.',
      ),
      findsOne,
    );
  });

  testWidgets('inline customer details keep invalid drafts open', (
    tester,
  ) async {
    var saves = 0;
    final customer = _customerDetail(
      contactDetailsEditable: true,
      linkedAccount: false,
      identityState: HostAudienceIdentityState.unlinked,
      identityConfidence: 'unverified',
    );
    await _pumpHostScreen(
      tester,
      Scaffold(
        body: HostCustomerIdentityCard(
          customer: customer,
          onSave: ({required displayName, phoneE164, email}) async {
            saves += 1;
          },
        ),
      ),
    );

    await tester.tap(find.byKey(const ValueKey('host-customer-edit-details')));
    await tester.pump();
    await tester.enterText(
      find.descendant(
        of: find.byKey(const ValueKey('host-customer-edit-name')),
        matching: find.byType(TextField),
      ),
      '   ',
    );
    await tester.tap(find.byKey(const ValueKey('catch-field-done')));
    await tester.pump();

    expect(saves, 0);
    expect(find.text('Enter the customer’s name.'), findsOneWidget);
    expect(find.byKey(const ValueKey('host-customer-edit-name')), findsOne);
  });
}
