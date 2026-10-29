import 'dart:async';

import 'package:catch_consumer_app/consumer_platform_app.dart';
import 'package:catch_dating_app/app_bootstrap.dart';
import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/auth/presentation/auth_screen.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club.dart';
import 'package:catch_dating_app/platform/app_config.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_participation_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_stream_utils.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/events/domain/event_viewer_state.dart';
import 'package:catch_dating_app/events/presentation/event_booking_controller.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/contexts/payments/data/payment_history_repository.dart';
import 'package:catch_dating_app/contexts/payments/domain/payment.dart';
import 'package:catch_dating_app/contexts/payments/domain/payment_confirmation_data.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'support/cat151_razorpay_acceptance_scope.dart';
import 'support/cat151_razorpay_attempt_ledger.dart';

Future<void> main() => runCatchApp(
  appRole: AppRole.consumer,
  rootOverrides: consumerPlatformOverrides(),
  app: const _Cat151AcceptanceApp(),
);

class _Cat151AcceptanceApp extends StatelessWidget {
  const _Cat151AcceptanceApp();

  @override
  Widget build(BuildContext context) => MaterialApp(
    debugShowCheckedModeBanner: false,
    title: 'CAT-151 Razorpay acceptance',
    localizationsDelegates: AppLocalizations.localizationsDelegates,
    supportedLocales: AppLocalizations.supportedLocales,
    theme: AppTheme.light,
    darkTheme: AppTheme.dark,
    home: const _AuthenticatedHarness(),
  );
}

class _AuthenticatedHarness extends ConsumerWidget {
  const _AuthenticatedHarness();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final uid = ref.watch(uidProvider);
    return switch (uid) {
      AsyncData(value: final signedInUid) =>
        signedInUid == null
            ? const AuthScreen(appRole: AppRole.consumer)
            : _Cat151AcceptanceScreen(uid: signedInUid),
      AsyncError() => const Scaffold(
        body: Center(child: Text('Authentication state failed closed.')),
      ),
      _ => const Scaffold(body: Center(child: CircularProgressIndicator())),
    };
  }
}

class _Cat151AcceptanceScreen extends ConsumerStatefulWidget {
  const _Cat151AcceptanceScreen({required this.uid});

  final String uid;

  @override
  ConsumerState<_Cat151AcceptanceScreen> createState() =>
      _Cat151AcceptanceScreenState();
}

class _Cat151AcceptanceScreenState
    extends ConsumerState<_Cat151AcceptanceScreen> {
  static const _evidenceDeadline = Duration(minutes: 2);
  static const _refundDeadline = Duration(minutes: 3);

  final _expectedUid = TextEditingController();
  final _seedPrefix = TextEditingController();
  final _eventId = TextEditingController();
  final _inviteCode = TextEditingController();
  final _secondAttemptConfirmation = TextEditingController();
  final _ledger = Cat151AttemptLedger();

  bool _testModeConfirmed = false;
  bool _busy = false;
  String _status = 'Enter the isolated fixture scope and run preflight.';
  List<String> _rejections = const [];
  Cat151AttemptLedgerState? _ledgerState;
  Event? _event;
  Payment? _payment;

  @override
  void dispose() {
    _expectedUid.dispose();
    _seedPrefix.dispose();
    _eventId.dispose();
    _inviteCode.dispose();
    _secondAttemptConfirmation.dispose();
    super.dispose();
  }

  Future<void> _runPreflight() => _guarded(() async {
    final result = await _readPreflight();
    Cat151AttemptLedgerState? durable;
    final existing = await _ledger.load(result.projectId);
    if (result.scope.isAccepted) {
      durable = await _ledger.bindScope(
        projectId: result.projectId,
        uid: widget.uid,
        eventId: result.event.id,
        seedPrefix: result.inputs.seedPrefix,
      );
    } else if (existing != null &&
        existing.uid == widget.uid &&
        existing.eventId == result.event.id &&
        existing.seedPrefix == result.inputs.seedPrefix) {
      // A prior attempt may now be admitted/refunded. Preserve recovery access
      // without binding a fresh ledger to already-effectful server state.
      durable = existing;
    }
    if (!mounted) return;
    setState(() {
      _event = result.event;
      _payment = result.payment;
      _ledgerState = durable;
      _rejections = result.scope.rejections;
      _status = result.scope.isAccepted
          ? 'Preflight passed. No order has been created.'
          : durable == null
          ? 'Preflight failed closed.'
          : 'Preflight blocks a new order; durable recovery remains available.';
    });
  });

  Future<_PreflightResult> _readPreflight() async {
    final inputs = _HarnessInputs(
      expectedUid: _expectedUid.text.trim(),
      seedPrefix: _seedPrefix.text.trim(),
      eventId: _eventId.text.trim(),
      inviteCode: _inviteCode.text.trim(),
      testModeConfirmed: _testModeConfirmed,
    );
    final eventId = inputs.eventId;
    final inviteCode = inputs.inviteCode;
    final signedInUid = ref.read(uidProvider).asData?.value;
    if (eventId.isEmpty || signedInUid == null) {
      throw StateError('A signed-in UID and event ID are required.');
    }

    final db = ref.read(firebaseFirestoreProvider);
    final projectId = Firebase.app().options.projectId;
    final repositories = (
      event: ref.read(eventRepositoryProvider),
      participation: ref.read(eventParticipationRepositoryProvider),
    );
    final values = await Future.wait<Object?>([
      db
          .collection('events')
          .doc(eventId)
          .get(const GetOptions(source: Source.server)),
      db
          .collection('users')
          .doc(signedInUid)
          .get(const GetOptions(source: Source.server)),
      db
          .collection('eventParticipations')
          .doc(eventParticipationId(eventId: eventId, uid: signedInUid))
          .get(const GetOptions(source: Source.server)),
      db
          .collection('payments')
          .where('userId', isEqualTo: signedInUid)
          .where('eventId', isEqualTo: eventId)
          .where('status', isEqualTo: PaymentStatus.completed.name)
          .where('signUpFailed', isEqualTo: false)
          .orderBy('createdAt', descending: true)
          .limit(1)
          .get(const GetOptions(source: Source.server)),
    ]);
    final rawEvent = values[0] as DocumentSnapshot<Map<String, dynamic>>;
    final event = publishedRichEvent(rawEvent);
    final rawUser = values[1] as DocumentSnapshot<Map<String, dynamic>>;
    final user = rawUser.data() == null
        ? null
        : UserProfile.fromJson({...rawUser.data()!, 'uid': rawUser.id});
    final rawParticipation =
        values[2] as DocumentSnapshot<Map<String, dynamic>>;
    final rawPayments = values[3] as QuerySnapshot<Map<String, dynamic>>;
    final payment = rawPayments.docs.isEmpty
        ? null
        : Payment.fromJson({
            ...rawPayments.docs.single.data(),
            'id': rawPayments.docs.single.id,
          });
    if (event == null || user == null || !rawUser.exists) {
      throw StateError('Required user or event fixture is unavailable.');
    }

    final followup = await Future.wait<Object?>([
      db
          .collection('organizers')
          .doc(event.organizerId)
          .get(const GetOptions(source: Source.server)),
      repositories.event.fetchViewerState(
        eventId: event.id,
        inviteCode: inviteCode,
      ),
      repositories.participation
          .watchParticipation(eventId: event.id, uid: signedInUid)
          .first,
    ]);
    final rawOrganizer = followup[0] as DocumentSnapshot<Map<String, dynamic>>;
    final organizer = rawOrganizer.data() == null
        ? null
        : Club.fromJson({...rawOrganizer.data()!, 'id': rawOrganizer.id});
    final viewer = followup[1] as EventViewerState;
    final participation = followup[2] as EventParticipation?;
    if (organizer == null) {
      throw StateError('Required organizer fixture is unavailable.');
    }
    final userData = rawUser.data()!;
    final policy = event.effectiveEventPolicy;
    final scope = Cat151AcceptanceScope(
      isConsumer: AppConfig.appRole == AppRole.consumer,
      isProfileMode: kProfileMode,
      isApprovedProduction: AppConfig.environment.isProduction,
      isSupportedNativePlatform:
          !kIsWeb &&
          (defaultTargetPlatform == TargetPlatform.android ||
              defaultTargetPlatform == TargetPlatform.iOS),
      usesLiveFirebase: !AppConfig.useFirebaseEmulators,
      usesProductionAppCheck:
          !AppConfig.useFirebaseAppCheckDebugProvider &&
          AppConfig.firebaseAppCheckDebugToken.trim().isEmpty,
      testModeConfirmed: inputs.testModeConfirmed,
      expectedUid: inputs.expectedUid,
      signedInUid: signedInUid,
      expectedSeedPrefix: inputs.seedPrefix,
      userSynthetic: userData['synthetic'] == true,
      userSeedPrefix: userData['seedPrefix'] as String?,
      eventSynthetic: event.synthetic,
      eventSeedPrefix: event.seedPrefix,
      organizerSynthetic: organizer.synthetic,
      organizerSeedPrefix: organizer.seedPrefix,
      eventActive: event.status == EventLifecycleStatus.active,
      currency: event.currency,
      bookingAuthority: event.eventOrigin?.bookingAuthority,
      inviteRequired: policy.admissionPolicy.inviteRequired,
      privateInviteRequired:
          policy.admissionPolicy.privateAccessPolicy.requiresInviteCode,
      inviteCode: inviteCode,
      eventId: event.id,
      organizerId: event.organizerId,
      viewerEventId: viewer.eventId,
      viewerOrganizerId: viewer.organizerId,
      viewerAllowed: viewer.allowed,
      viewerRoute: viewer.route,
      viewerQuoteInPaise: viewer.quotedPriceInPaise,
      viewerAdmission: viewer.admission,
      viewerPayment: viewer.payment,
      viewerWaitlisted: viewer.waitlisted,
      hasParticipation: rawParticipation.exists || participation != null,
      hasSuccessfulPayment: payment != null,
      beforeStart: event.startTime.difference(DateTime.now()),
      fullRefundUntilBeforeStart:
          policy.cancellationPolicy.fullRefundUntilBeforeStart,
    );
    return _PreflightResult(
      projectId: projectId,
      scope: scope,
      event: event,
      user: user,
      payment: payment,
      inputs: inputs,
    );
  }

  Future<void> _startCheckout() => _guarded(() async {
    final confirmed = await _confirm(
      title: 'Start one real TEST order?',
      body:
          'This reserves an attempt before opening native Razorpay. The amount must be exactly ₹10, and any uncertain result remains consumed.',
      confirmation: 'START ₹10 TEST CHECKOUT',
    );
    if (!confirmed || !mounted) return;

    // Human confirmation is deliberately before the final authority read.
    // A stale green screen or an unbounded dialog can never authorize an
    // order after its synthetic fixture or exact quote changes.
    final result = await _readPreflight();
    if (!result.scope.isAccepted) {
      setState(() {
        _rejections = result.scope.rejections;
        _status = 'Checkout blocked by a fresh preflight.';
      });
      return;
    }
    var ledgerState = await _ledger.bindScope(
      projectId: result.projectId,
      uid: widget.uid,
      eventId: result.event.id,
      seedPrefix: result.inputs.seedPrefix,
    );
    ledgerState = await _ledger.reserveNext(ledgerState);
    final attemptNumber = ledgerState.attempts.last.number;
    setState(() {
      _ledgerState = ledgerState;
      _event = result.event;
      _rejections = const [];
      _status =
          'Attempt $attemptNumber is durably reserved. Awaiting native checkout.';
    });

    PaymentConfirmationData confirmation;
    try {
      final value = await ref
          .read(eventBookingControllerProvider.notifier)
          .book(
            event: result.event,
            user: result.user,
            inviteCode: result.inputs.inviteCode,
            quotedPriceInPaise: Cat151AcceptanceScope.expectedAmountInPaise,
          );
      if (value == null) {
        throw StateError('Paid checkout returned no confirmation.');
      }
      confirmation = value;
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _status =
            'Attempt $attemptNumber is uncertain and remains consumed. Refresh evidence before considering attempt 2.';
      });
      return;
    }

    _requireConfirmationScope(confirmation, eventId: result.event.id);
    final evidence = await _waitForAdmission(
      uid: widget.uid,
      eventId: result.event.id,
      inviteCode: result.inputs.inviteCode,
      confirmation: confirmation,
      timeout: _evidenceDeadline,
    );
    ledgerState = await _ledger.markAdmitted(
      ledgerState,
      attemptNumber: attemptNumber,
      paymentId: evidence.payment.paymentId,
      orderId: evidence.payment.orderId,
    );
    if (!mounted) return;
    setState(() {
      _ledgerState = ledgerState;
      _payment = evidence.payment;
      _status =
          'Admission verified across viewer, participation, and payment. Cancellation is now available.';
    });
  });

  Future<void> _refreshEvidence() => _guarded(() async {
    final state = _ledgerState;
    final event = _event;
    final inviteCode = _inviteCode.text.trim();
    if (state == null || event == null || state.attempts.isEmpty) {
      throw StateError('Run preflight before refreshing durable evidence.');
    }
    final knownAttempt = state.attempts.last;
    final paymentRepository = ref.read(paymentHistoryRepositoryProvider);
    Payment? payment;
    if (knownAttempt.paymentId != null) {
      payment = await paymentRepository
          .watchPayment(knownAttempt.paymentId!)
          .first;
    }
    payment ??= await paymentRepository.fetchPaymentForEvent(
      userId: widget.uid,
      eventId: event.id,
    );
    if (payment == null) {
      if (mounted) {
        setState(() {
          _status =
              'No completed own payment is visible. The attempt remains uncertain and consumed.';
        });
      }
      return;
    }
    if (payment.status == PaymentStatus.refunded &&
        knownAttempt.status != Cat151AttemptStatus.reserved) {
      final evidence = await _waitForRefund(
        uid: widget.uid,
        eventId: event.id,
        inviteCode: inviteCode,
        paymentId: payment.paymentId,
        timeout: _refundDeadline,
      );
      final updated = knownAttempt.status == Cat151AttemptStatus.admitted
          ? await _ledger.markRefunded(
              state,
              attemptNumber: knownAttempt.number,
              paymentId: evidence.payment.paymentId,
              orderId: evidence.payment.orderId,
            )
          : state;
      if (!mounted) return;
      setState(() {
        _ledgerState = updated;
        _payment = evidence.payment;
        _status = 'Durable full-refund evidence recovered.';
      });
      return;
    }
    final confirmation = PaymentConfirmationData(
      paymentId: payment.paymentId,
      orderId: payment.orderId,
      amountInPaise: payment.amount,
      currency: payment.currency,
      eventId: payment.eventId,
      status: payment.status,
    );
    final evidence = await _waitForAdmission(
      uid: widget.uid,
      eventId: event.id,
      inviteCode: inviteCode,
      confirmation: confirmation,
      timeout: _evidenceDeadline,
    );
    final updated = knownAttempt.status == Cat151AttemptStatus.reserved
        ? await _ledger.markAdmitted(
            state,
            attemptNumber: knownAttempt.number,
            paymentId: evidence.payment.paymentId,
            orderId: evidence.payment.orderId,
          )
        : state;
    if (!mounted) return;
    setState(() {
      _ledgerState = updated;
      _payment = evidence.payment;
      _status = 'Durable admitted evidence recovered.';
    });
  });

  Future<void> _authorizeSecondAttempt() => _guarded(() async {
    final state = _ledgerState;
    final secondAttemptConfirmation = _secondAttemptConfirmation.text;
    if (state == null) throw StateError('No durable ledger is loaded.');
    // A fresh preflight is mandatory: any late payment/admission blocks this
    // path even after an operator typed the acknowledgement.
    final result = await _readPreflight();
    if (!result.scope.isAccepted) {
      if (mounted) {
        setState(() {
          _rejections = result.scope.rejections;
          _status = 'Attempt 2 authorization blocked by fresh evidence.';
        });
      }
      return;
    }
    final updated = await _ledger.authorizeSecondAttempt(
      state,
      confirmation: secondAttemptConfirmation,
    );
    if (!mounted) return;
    setState(() {
      _ledgerState = updated;
      _status =
          'Attempt 2 is explicitly authorized. Checkout still requires another fresh preflight.';
    });
  });

  Future<void> _cancelAndVerifyRefund() => _guarded(() async {
    final event = _event;
    final payment = _payment;
    final ledgerState = _ledgerState;
    final inviteCode = _inviteCode.text.trim();
    if (event == null || payment == null || ledgerState == null) {
      throw StateError('Verified admission evidence is required.');
    }
    final confirmed = await _confirm(
      title: 'Cancel and verify the full refund?',
      body:
          'This calls the production cancellation controller for the same isolated ₹10 booking, then reads until the refund is complete.',
      confirmation: 'CANCEL AND VERIFY REFUND',
    );
    if (!confirmed || !mounted) return;
    // Re-read server-owned event and payment authority after the unbounded
    // human dialog, then dispatch with that exact fresh event snapshot.
    final cancellationScope = await _verifyCancellationScope(
      event: event,
      payment: payment,
      ledgerState: ledgerState,
      inviteCode: inviteCode,
    );
    await ref
        .read(eventBookingControllerProvider.notifier)
        .cancelBooking(event: cancellationScope.event);
    final evidence = await _waitForRefund(
      uid: widget.uid,
      eventId: cancellationScope.event.id,
      inviteCode: inviteCode,
      paymentId: cancellationScope.payment.paymentId,
      timeout: _refundDeadline,
    );
    final admittedAttempt = ledgerState.attempts.lastWhere(
      (attempt) => attempt.status == Cat151AttemptStatus.admitted,
    );
    final updated = await _ledger.markRefunded(
      ledgerState,
      attemptNumber: admittedAttempt.number,
      paymentId: evidence.payment.paymentId,
      orderId: evidence.payment.orderId,
    );
    if (!mounted) return;
    setState(() {
      _ledgerState = updated;
      _payment = evidence.payment;
      _status =
          'PASS: admission was cancelled and the full ₹10 refund is complete.';
    });
  });

  Future<({Event event, Payment payment})> _verifyCancellationScope({
    required Event event,
    required Payment payment,
    required Cat151AttemptLedgerState ledgerState,
    required String inviteCode,
  }) async {
    final admittedAttempts = ledgerState.attempts
        .where((attempt) => attempt.status == Cat151AttemptStatus.admitted)
        .toList();
    final admittedAttempt = admittedAttempts.length == 1
        ? admittedAttempts.single
        : null;
    final admittedPaymentId = admittedAttempt?.paymentId;
    final currentUid = ref.read(uidProvider).asData?.value;
    if (currentUid != widget.uid ||
        admittedAttempt == null ||
        admittedPaymentId == null ||
        admittedPaymentId.isEmpty ||
        admittedAttempt.orderId == null ||
        payment.userId != widget.uid ||
        payment.eventId != event.id ||
        payment.paymentId != admittedPaymentId ||
        payment.orderId != admittedAttempt.orderId ||
        payment.amount != Cat151AcceptanceScope.expectedAmountInPaise ||
        payment.currency.toUpperCase() != 'INR' ||
        payment.status != PaymentStatus.completed ||
        payment.signUpFailed) {
      throw StateError(
        'Cancellation scope changed or is not the exact payment.',
      );
    }
    final db = ref.read(firebaseFirestoreProvider);
    final records = await Future.wait([
      db
          .collection('events')
          .doc(event.id)
          .get(const GetOptions(source: Source.server)),
      db
          .collection('payments')
          .doc(admittedPaymentId)
          .get(const GetOptions(source: Source.server)),
      db
          .collection('eventParticipations')
          .doc(eventParticipationId(eventId: event.id, uid: widget.uid))
          .get(const GetOptions(source: Source.server)),
    ]);
    final rawEvent = records[0];
    final currentEvent = publishedRichEvent(rawEvent);
    final rawPayment = records[1];
    final currentPayment = rawPayment.data() == null
        ? null
        : Payment.fromJson({...rawPayment.data()!, 'id': rawPayment.id});
    final rawParticipation = records[2];
    final currentParticipation = rawParticipation.data() == null
        ? null
        : EventParticipation.fromJson({
            ...rawParticipation.data()!,
            'id': rawParticipation.id,
          });
    final rawOrganizer = currentEvent == null
        ? null
        : await db
              .collection('organizers')
              .doc(currentEvent.organizerId)
              .get(const GetOptions(source: Source.server));
    final organizer = rawOrganizer?.data() == null
        ? null
        : Club.fromJson({...rawOrganizer!.data()!, 'id': rawOrganizer.id});
    final rawUser = await db
        .collection('users')
        .doc(widget.uid)
        .get(const GetOptions(source: Source.server));
    final viewer = await ref
        .read(eventRepositoryProvider)
        .fetchViewerState(eventId: event.id, inviteCode: inviteCode);
    final seed = ledgerState.seedPrefix;
    if (currentEvent == null ||
        currentPayment == null ||
        currentParticipation == null ||
        organizer == null ||
        ledgerState.uid != widget.uid ||
        ledgerState.eventId != event.id ||
        admittedAttempt.paymentId != payment.paymentId ||
        admittedAttempt.orderId != payment.orderId ||
        currentPayment.paymentId != payment.paymentId ||
        currentPayment.id != admittedPaymentId ||
        currentPayment.orderId != payment.orderId ||
        currentPayment.userId != widget.uid ||
        currentPayment.eventId != currentEvent.id ||
        currentPayment.amount != Cat151AcceptanceScope.expectedAmountInPaise ||
        currentPayment.currency.toUpperCase() != 'INR' ||
        currentPayment.status != PaymentStatus.completed ||
        currentPayment.signUpFailed ||
        currentParticipation.uid != widget.uid ||
        currentParticipation.eventId != currentEvent.id ||
        currentParticipation.status != EventParticipationStatus.signedUp ||
        currentParticipation.paymentId != currentPayment.paymentId ||
        viewer.eventId != currentEvent.id ||
        viewer.admission != EventViewerAdmission.nativeParticipation ||
        viewer.payment != EventViewerPayment.notRead ||
        !currentEvent.synthetic ||
        currentEvent.seedPrefix != seed ||
        currentEvent.currency.toUpperCase() != 'INR' ||
        currentEvent.eventOrigin?.bookingAuthority !=
            EventBookingAuthority.catchPlatform ||
        !organizer.synthetic ||
        organizer.seedPrefix != seed ||
        rawUser.data()?['synthetic'] != true ||
        rawUser.data()?['seedPrefix'] != seed ||
        currentEvent.startTime.difference(DateTime.now()) <
            currentEvent
                    .effectiveEventPolicy
                    .cancellationPolicy
                    .fullRefundUntilBeforeStart +
                Cat151AcceptanceScope.minimumExecutionBuffer) {
      throw StateError('Synthetic ownership or full-refund authority changed.');
    }
    return (event: currentEvent, payment: currentPayment);
  }

  Future<_AdmissionEvidence> _waitForAdmission({
    required String uid,
    required String eventId,
    required String inviteCode,
    required PaymentConfirmationData confirmation,
    required Duration timeout,
  }) => _poll(
    timeout: timeout,
    read: () async {
      final values = await Future.wait<Object?>([
        ref
            .read(eventRepositoryProvider)
            .fetchViewerState(eventId: eventId, inviteCode: inviteCode),
        ref
            .read(eventParticipationRepositoryProvider)
            .watchParticipation(eventId: eventId, uid: uid)
            .first,
        ref
            .read(paymentHistoryRepositoryProvider)
            .watchPayment(confirmation.paymentId)
            .first,
      ]);
      final viewer = values[0] as EventViewerState;
      final participation = values[1] as EventParticipation?;
      final payment = values[2] as Payment?;
      // Native participation owns payment evidence in the private payments
      // document. The canonical viewer deliberately reports `notRead` unless
      // a public-checkout payment id was supplied.
      if (viewer.eventId != eventId ||
          viewer.admission != EventViewerAdmission.nativeParticipation ||
          viewer.payment != EventViewerPayment.notRead ||
          participation == null ||
          participation.uid != uid ||
          participation.eventId != eventId ||
          participation.status != EventParticipationStatus.signedUp ||
          participation.paymentId != confirmation.paymentId ||
          payment == null ||
          payment.id != confirmation.paymentId ||
          payment.userId != uid ||
          payment.eventId != eventId ||
          payment.paymentId != confirmation.paymentId ||
          payment.orderId != confirmation.orderId ||
          payment.amount != Cat151AcceptanceScope.expectedAmountInPaise ||
          payment.currency.toUpperCase() != 'INR' ||
          payment.status != PaymentStatus.completed ||
          payment.signUpFailed) {
        return null;
      }
      return _AdmissionEvidence(payment: payment);
    },
  );

  Future<_RefundEvidence> _waitForRefund({
    required String uid,
    required String eventId,
    required String inviteCode,
    required String paymentId,
    required Duration timeout,
  }) => _poll(
    timeout: timeout,
    read: () async {
      final values = await Future.wait<Object?>([
        ref
            .read(eventRepositoryProvider)
            .fetchViewerState(eventId: eventId, inviteCode: inviteCode),
        ref
            .read(eventParticipationRepositoryProvider)
            .watchParticipation(eventId: eventId, uid: uid)
            .first,
        ref
            .read(paymentHistoryRepositoryProvider)
            .watchPayment(paymentId)
            .first,
      ]);
      final viewer = values[0] as EventViewerState;
      final participation = values[1] as EventParticipation?;
      final payment = values[2] as Payment?;
      final refund = payment?.cancellationRefund;
      // As above, native payment/refund state is verified from the caller-owned
      // payment document; the viewer proves only that admission was removed.
      if (viewer.eventId != eventId ||
          viewer.admission != EventViewerAdmission.none ||
          viewer.payment != EventViewerPayment.notRead ||
          participation == null ||
          participation.uid != uid ||
          participation.eventId != eventId ||
          participation.status != EventParticipationStatus.cancelled ||
          payment == null ||
          payment.id != paymentId ||
          payment.userId != uid ||
          payment.eventId != eventId ||
          payment.amount != Cat151AcceptanceScope.expectedAmountInPaise ||
          payment.status != PaymentStatus.refunded ||
          refund == null ||
          refund.state != PaymentCancellationRefundState.complete ||
          refund.targetAmountMinor !=
              Cat151AcceptanceScope.expectedAmountInPaise ||
          refund.confirmedAmountMinor !=
              Cat151AcceptanceScope.expectedAmountInPaise) {
        return null;
      }
      return _RefundEvidence(payment: payment);
    },
  );

  Future<T> _poll<T>({
    required Duration timeout,
    required Future<T?> Function() read,
  }) async {
    final deadline = DateTime.now().add(timeout);
    Object? lastError;
    while (DateTime.now().isBefore(deadline)) {
      try {
        final value = await read();
        if (value != null) return value;
      } catch (error) {
        lastError = error;
      }
      await Future<void>.delayed(const Duration(seconds: 2));
    }
    throw TimeoutException(
      lastError == null
          ? 'Bounded evidence polling timed out.'
          : 'Bounded evidence polling timed out after read failures.',
      timeout,
    );
  }

  void _requireConfirmationScope(
    PaymentConfirmationData confirmation, {
    required String eventId,
  }) {
    if (confirmation.eventId != eventId ||
        confirmation.amountInPaise !=
            Cat151AcceptanceScope.expectedAmountInPaise ||
        confirmation.currency.toUpperCase() != 'INR' ||
        confirmation.provider != 'razorpay' ||
        confirmation.status != PaymentStatus.completed ||
        confirmation.paymentId.trim().isEmpty ||
        confirmation.orderId.trim().isEmpty) {
      throw StateError('Native checkout confirmation escaped the exact scope.');
    }
  }

  Future<bool> _confirm({
    required String title,
    required String body,
    required String confirmation,
  }) async {
    final controller = TextEditingController();
    final result = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => AlertDialog(
        title: Text(title),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(body),
            const SizedBox(height: 16),
            SelectableText('Type exactly: $confirmation'),
            TextField(controller: controller, autocorrect: false),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Back'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(
              dialogContext,
              controller.text.trim() == confirmation,
            ),
            child: const Text('Confirm'),
          ),
        ],
      ),
    );
    controller.dispose();
    return result ?? false;
  }

  Future<void> _guarded(Future<void> Function() action) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      await action();
    } catch (error) {
      if (mounted) {
        setState(() {
          _status = _safeFailure(error);
        });
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  String _safeFailure(Object error) => switch (error) {
    Cat151AttemptLedgerException() =>
      '${error.message} No automatic retry was performed.',
    TimeoutException() =>
      'Bounded evidence polling timed out. No automatic retry was performed.',
    StateError() => '${error.message} No automatic retry was performed.',
    _ =>
      'Operation failed closed. No automatic retry was performed; inspect evidence before continuing.',
  };

  @override
  Widget build(BuildContext context) {
    final ledger = _ledgerState;
    final canStart =
        !_busy &&
        _rejections.isEmpty &&
        ledger != null &&
        (ledger.canReserveFirst || ledger.canReserveSecond);
    final canCancel =
        !_busy &&
        _payment?.status == PaymentStatus.completed &&
        ledger?.attempts.any(
              (attempt) => attempt.status == Cat151AttemptStatus.admitted,
            ) ==
            true;

    return Scaffold(
      appBar: AppBar(title: const Text('CAT-151 native acceptance')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Text(
              'Source-only supervised harness',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            Text(
              'Environment: ${AppConfig.environmentName}  •  Firebase: ${Firebase.app().options.projectId}\n'
              'No fixture creation, token minting, provider override, or automatic payment retry is available.',
            ),
            const SizedBox(height: 20),
            TextField(
              controller: _expectedUid,
              enabled: !_busy,
              decoration: const InputDecoration(
                labelText: 'Expected synthetic UID',
              ),
              autocorrect: false,
            ),
            TextField(
              controller: _seedPrefix,
              enabled: !_busy,
              decoration: const InputDecoration(
                labelText: 'Exact synthetic seed prefix',
              ),
              autocorrect: false,
            ),
            TextField(
              controller: _eventId,
              enabled: !_busy,
              decoration: const InputDecoration(
                labelText: 'Exact synthetic event ID',
              ),
              autocorrect: false,
            ),
            TextField(
              controller: _inviteCode,
              enabled: !_busy,
              decoration: const InputDecoration(
                labelText: 'Private invite code',
              ),
              autocorrect: false,
              obscureText: true,
            ),
            CheckboxListTile(
              contentPadding: EdgeInsets.zero,
              value: _testModeConfirmed,
              onChanged: _busy
                  ? null
                  : (value) => setState(() {
                      _testModeConfirmed = value ?? false;
                      _rejections = const ['Preflight must be rerun.'];
                    }),
              title: const Text(
                'I verified this production Firebase environment is bound to the Razorpay TEST merchant.',
              ),
            ),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: _busy ? null : _runPreflight,
              child: const Text('Run strict preflight'),
            ),
            const SizedBox(height: 8),
            FilledButton.tonal(
              onPressed: canStart ? _startCheckout : null,
              child: const Text('Reserve attempt and open ₹10 TEST checkout'),
            ),
            const SizedBox(height: 8),
            OutlinedButton(
              onPressed: !_busy && ledger != null && ledger.attempts.isNotEmpty
                  ? _refreshEvidence
                  : null,
              child: const Text('Refresh read-only evidence'),
            ),
            if (ledger?.canAuthorizeSecond == true) ...[
              const SizedBox(height: 12),
              TextField(
                controller: _secondAttemptConfirmation,
                enabled: !_busy,
                autocorrect: false,
                decoration: const InputDecoration(
                  labelText: cat151SecondAttemptConfirmation,
                ),
              ),
              OutlinedButton(
                onPressed: _busy ? null : _authorizeSecondAttempt,
                child: const Text('Durably authorize final attempt'),
              ),
            ],
            const SizedBox(height: 8),
            FilledButton(
              onPressed: canCancel ? _cancelAndVerifyRefund : null,
              child: const Text('Cancel booking and verify full refund'),
            ),
            const Divider(height: 32),
            Text(_status),
            if (_busy) const LinearProgressIndicator(),
            if (_rejections.isNotEmpty) ...[
              const SizedBox(height: 12),
              ..._rejections.map((reason) => Text('• $reason')),
            ],
            if (ledger != null) ...[
              const SizedBox(height: 12),
              Text(
                'Durable attempts: ${ledger.attempts.length}/2  •  '
                'attempt 2 authorized: ${ledger.secondAttemptAuthorized}',
              ),
              ...ledger.attempts.map(
                (attempt) =>
                    Text('Attempt ${attempt.number}: ${attempt.status.name}'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

final class _PreflightResult {
  const _PreflightResult({
    required this.projectId,
    required this.scope,
    required this.event,
    required this.user,
    required this.payment,
    required this.inputs,
  });

  final String projectId;
  final Cat151AcceptanceScope scope;
  final Event event;
  final UserProfile user;
  final Payment? payment;
  final _HarnessInputs inputs;
}

final class _HarnessInputs {
  const _HarnessInputs({
    required this.expectedUid,
    required this.seedPrefix,
    required this.eventId,
    required this.inviteCode,
    required this.testModeConfirmed,
  });

  final String expectedUid;
  final String seedPrefix;
  final String eventId;
  final String inviteCode;
  final bool testModeConfirmed;
}

final class _AdmissionEvidence {
  const _AdmissionEvidence({required this.payment});

  final Payment payment;
}

final class _RefundEvidence {
  const _RefundEvidence({required this.payment});

  final Payment payment;
}
