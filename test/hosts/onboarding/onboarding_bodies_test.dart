import 'package:catch_dating_app/hosts/onboarding/code_body.dart';
import 'package:catch_dating_app/hosts/onboarding/setup_details_body.dart';
import 'package:catch_dating_app/hosts/onboarding/setup_done_body.dart';
import 'package:catch_dating_app/hosts/onboarding/setup_find_body.dart';
import 'package:catch_dating_app/hosts/onboarding/setup_payments_body.dart';
import 'package:catch_dating_app/hosts/onboarding/setup_state.dart';
import 'package:catch_dating_app/hosts/onboarding/sign_in_body.dart';
import 'package:catch_kernel/city_catalog.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

import 'onboarding_fixtures.dart';

final _cities = defaultCityOptions
    .where((city) => city.hostCreatable)
    .toList(growable: false);

void main() {
  group('sign in', () {
    Future<List<String>> pump(
      WidgetTester tester, {
      bool canSend = true,
      bool sending = false,
      String? sendError,
      String? phoneError,
    }) async {
      final calls = <String>[];
      await pumpOnboardingBody(
        tester,
        HostSignInBody(
          countryCode: '+91',
          initialPhoneNumber: '9820144718',
          canSend: canSend,
          sending: sending,
          sendError: sendError,
          phoneError: phoneError,
          onPhoneChanged: (value) => calls.add('phone:$value'),
          onSend: () => calls.add('send'),
          onGetCatch: () => calls.add('catch'),
        ),
      );
      return calls;
    }

    testWidgets('shows the kicker, stats, promise, phone and both actions', (
      tester,
    ) async {
      final calls = await pump(tester);

      expect(find.text('Catch Host'), findsOneWidget);
      expect(find.text('18'), findsOneWidget);
      expect(find.text('of 26 in'), findsOneWidget);
      expect(find.text('41%'), findsOneWidget);
      expect(find.text('Run nights people come back to.'), findsOneWidget);
      expect(find.text('Your phone number'), findsWidgets);
      expect(find.text('+91'), findsOneWidget);
      expect(find.text('Continue with Google'), findsNothing);

      await tester.tap(find.text('Text me a code'));
      await tester.tap(find.text('Get Catch'));
      await tester.enterText(find.byType(EditableText), '98201');
      expect(calls, ['send', 'catch', 'phone:98201']);
    });

    testWidgets('a number that cannot be sent keeps Text me a code off', (
      tester,
    ) async {
      final calls = await pump(
        tester,
        canSend: false,
        phoneError: 'Enter a valid phone number',
      );

      expect(find.text('Enter a valid phone number'), findsOneWidget);
      await tester.tap(find.text('Text me a code'));
      expect(calls, isEmpty);
    });

    testWidgets('a failed request shows why', (tester) async {
      await pump(tester, sendError: 'Too many attempts. Try again later.');

      expect(find.text('Too many attempts. Try again later.'), findsOneWidget);
    });
  });

  group('code', () {
    Future<List<String>> pump(
      WidgetTester tester, {
      int seconds = 24,
      bool canVerify = false,
      String? verifyError,
      String code = '4819',
    }) async {
      final calls = <String>[];
      final controller = TextEditingController(text: code);
      addTearDown(controller.dispose);
      await pumpOnboardingBody(
        tester,
        HostCodeBody(
          controller: controller,
          secondsUntilResend: seconds,
          canResend: seconds == 0,
          resending: false,
          canVerify: canVerify,
          verifying: false,
          verifyError: verifyError,
          onChanged: (value) => calls.add('changed:$value'),
          onSubmitted: (value) => calls.add('submitted:$value'),
          onResend: () => calls.add('resend'),
          onVerify: () => calls.add('verify'),
        ),
      );
      return calls;
    }

    testWidgets('counts down to a new code and explains autofill', (
      tester,
    ) async {
      final calls = await pump(tester);

      expect(find.text('Six digits, by SMS'), findsOneWidget);
      expect(find.text('Didn’t get it? Send again in 0:24.'), findsOneWidget);
      expect(find.text('Send again'), findsNothing);
      expect(
        find.text(
          'We fill it in for you when the message arrives. It works the same '
          'in Catch and Catch Host.',
        ),
        findsOneWidget,
      );
      expect(find.textContaining('WhatsApp'), findsNothing);
      await tester.tap(find.text('Continue'));
      expect(calls, isEmpty);
    });

    testWidgets('offers Send again at zero and Continue with six digits', (
      tester,
    ) async {
      final calls = await pump(tester, seconds: 0, canVerify: true);

      await tester.tap(find.text('Send again'));
      await tester.tap(find.text('Continue'));
      expect(calls, ['resend', 'verify']);
    });

    testWidgets('a rejected code says why', (tester) async {
      await pump(tester, verifyError: 'That code is not right.');

      expect(find.text('That code is not right.'), findsOneWidget);
    });
  });

  testWidgets('Start your page asks for the name, the city and the area', (
    tester,
  ) async {
    final calls = <String>[];
    await pumpOnboardingBody(
      tester,
      HostSetupFindBody(
        state: onboardingState(withDetails: false),
        cities: _cities,
        onNameChanged: (value) => calls.add('name:$value'),
        onCityChanged: (value) => calls.add('city:$value'),
        onAreaChanged: (value) => calls.add('area:$value'),
      ),
    );

    expect(
      find.textContaining('Catch has no page of yours yet'),
      findsOneWidget,
    );
    expect(find.text('Where you run things'), findsOneWidget);
    expect(find.text('Lantern Lane Social'), findsOneWidget);
    expect(find.text('Bandra West'), findsOneWidget);
    expect(find.text('Claim this page'), findsNothing);

    await tester.tap(find.text('Mumbai'));
    expect(calls, ['city:in-mh-mumbai']);
  });

  testWidgets('Check your details shows the logo, the formats and the link', (
    tester,
  ) async {
    final formats = <HostSetupFormat>[];
    var logo = 0;
    await pumpOnboardingBody(
      tester,
      HostSetupDetailsBody(
        state: onboardingState(step: HostSetupStep.details),
        onPickLogo: () => logo++,
        onDescriptionChanged: (_) {},
        onToggleFormat: formats.add,
        createError: 'Could not create the page.',
      ),
    );

    expect(find.text('What you run'), findsOneWidget);
    for (final label in [
      'Quizzes',
      'Social runs',
      'Suppers',
      'Racket sports',
      'Parties',
    ]) {
      expect(find.text(label), findsOneWidget);
    }
    expect(find.text('Your page'), findsOneWidget);
    expect(find.text('Your link is made when you finish'), findsOneWidget);
    expect(find.text('Could not create the page.'), findsOneWidget);

    await tester.tap(find.text('Social runs'));
    await tester.tap(find.text('Add a logo'));
    expect(formats, [HostSetupFormat.run]);
    expect(logo, 1);
  });

  group('getting paid', () {
    Future<int> pump(
      WidgetTester tester,
      HostSetupPayoutStatus status, {
      bool pending = false,
    }) async {
      var connects = 0;
      await pumpOnboardingBody(
        tester,
        HostSetupPaymentsBody(
          status: status,
          pending: pending,
          onConnect: () => connects++,
        ),
      );
      await tester.tap(
        find.byKey(const ValueKey<String>('host-setup-connect')),
        warnIfMissed: false,
      );
      return connects;
    }

    testWidgets('not connected offers Connect Razorpay, costs and the notice', (
      tester,
    ) async {
      expect(await pump(tester, HostSetupPayoutStatus.notConnected), 1);
      expect(find.text('Connect Razorpay'), findsNWidgets(2));
      expect(find.text('What Catch costs'), findsOneWidget);
      expect(find.textContaining('Only running free events'), findsOneWidget);
    });

    testWidgets('a stale connection offers Reconnect', (tester) async {
      expect(await pump(tester, HostSetupPayoutStatus.needsReconnect), 1);
      expect(find.text('Reconnect Razorpay'), findsOneWidget);
    });

    testWidgets('connected shows the badge and no button', (tester) async {
      expect(await pump(tester, HostSetupPayoutStatus.connected), 0);
      expect(find.text('Connected'), findsOneWidget);
    });

    testWidgets('a pending request cannot be sent twice', (tester) async {
      expect(
        await pump(tester, HostSetupPayoutStatus.notConnected, pending: true),
        0,
      );
    });
  });

  group('done', () {
    Future<List<Object>> pump(WidgetTester tester, {String? link}) async {
      final calls = <Object>[];
      await pumpOnboardingBody(
        tester,
        HostSetupDoneBody(
          name: 'Lantern Lane Social',
          live: link != null,
          link: link,
          onCopy: () => calls.add('copy'),
          onNextStep: calls.add,
          onCreateEvent: () => calls.add('event'),
        ),
      );
      return calls;
    }

    testWidgets('a published page shows Live, its link and Copy', (
      tester,
    ) async {
      final calls = await pump(
        tester,
        link: 'https://catchdates.com/lanternlane',
      );

      expect(find.text('Live'), findsOneWidget);
      expect(find.text('Lantern Lane Social is yours.'), findsOneWidget);
      expect(find.text('https://catchdates.com/lanternlane'), findsOneWidget);

      await tester.tap(find.text('Copy'));
      await tester.tap(find.text('Add your team'));
      await tester.tap(find.text('Create your first event'));
      expect(calls, ['copy', HostSetupNextStep.team, 'event']);
    });

    testWidgets('an unpublished page says when its link comes', (tester) async {
      await pump(tester);

      expect(find.text('Page created'), findsOneWidget);
      expect(
        find.text('Your link appears here once the page is published.'),
        findsOneWidget,
      );
      expect(find.text('Copy'), findsNothing);
      expect(find.text('Put the link in your Instagram bio'), findsOneWidget);
      expect(find.text('Rehearse a night'), findsOneWidget);
    });
  });
}
