import 'dart:math';

import 'package:catch_dating_app/auth/data/authenticated_session.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/event_success/data/event_assignment_feature_choice_repository.dart';
import 'package:catch_dating_app/event_success/domain/event_assignment_feature_choice.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// The current session's private answer review and independent grant controls.
class EventAssignmentFeatureChoicesPageBody extends ConsumerStatefulWidget {
  const EventAssignmentFeatureChoicesPageBody({
    super.key,
    required this.eventId,
    required this.session,
  });
  final String eventId;
  final AuthenticatedSession session;
  @override
  ConsumerState<EventAssignmentFeatureChoicesPageBody> createState() =>
      _EventAssignmentFeatureChoicesPageBodyState();
}

class _EventAssignmentFeatureChoicesPageBodyState
    extends ConsumerState<EventAssignmentFeatureChoicesPageBody>
    with WidgetsBindingObserver {
  EventAssignmentFeatureChoices? _review;
  Object? _error;
  Object? _mutationError;
  bool _loading = true;
  bool _saved = false;
  bool _active = true;
  String? _savingFeatureId;
  int _generation = 0;
  int _writeGeneration = 0;

  EventAssignmentFeatureChoiceStore get _repository =>
      ref.read(eventAssignmentFeatureChoiceStoreProvider);

  bool _isCurrent(int generation) =>
      mounted &&
      _active &&
      generation == _generation &&
      identical(
        ref.read(authenticatedSessionProvider).asData?.value,
        widget.session,
      );

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _reload();
  }

  @override
  void dispose() {
    _generation++;
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _active = true;
      _reload(clearMutationError: true);
    } else if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.inactive ||
        state == AppLifecycleState.hidden) {
      _generation++;
      _writeGeneration++;
      _active = false;
      setState(() {
        _review = null;
        _error = null;
        _mutationError = null;
        _savingFeatureId = null;
        _saved = false;
        _loading = true;
      });
    }
  }

  Future<void> _reload({bool clearMutationError = false}) async {
    final generation = ++_generation;
    setState(() {
      _loading = true;
      _review = null;
      _error = null;
      if (clearMutationError) _mutationError = null;
      _saved = false;
    });
    try {
      final review = await _repository.list(widget.eventId);
      if (!_isCurrent(generation)) return;
      setState(() {
        _review = review;
        _loading = false;
      });
    } catch (error) {
      if (!_isCurrent(generation)) return;
      setState(() {
        _error = error;
        _loading = false;
      });
    }
  }

  Future<void> _decide(EventAssignmentFeatureChoice choice) async {
    final generation = _generation;
    if (_savingFeatureId != null || !_isCurrent(generation)) return;
    final writeGeneration = ++_writeGeneration;
    final grant = !choice.isGranted;
    if (grant && !choice.canGrant) return;
    final random = Random.secure();
    final requestId = List.generate(
      16,
      (_) => random.nextInt(256).toRadixString(16).padLeft(2, '0'),
    ).join();
    setState(() {
      _savingFeatureId = choice.featureId;
      _mutationError = null;
    });
    try {
      await _repository.decide(
        eventId: widget.eventId,
        choice: choice,
        grant: grant,
        requestId: requestId,
      );
      if (!_isCurrent(generation)) return;
      await _reload();
      if (writeGeneration == _writeGeneration &&
          _isCurrent(_generation) &&
          _review != null) {
        setState(() => _saved = true);
      }
    } catch (error) {
      if (writeGeneration != _writeGeneration || !_isCurrent(generation)) {
        return;
      }
      // A timed-out write is uncertain; never show a local optimistic grant.
      setState(() => _mutationError = error);
      await _reload();
    } finally {
      if (writeGeneration == _writeGeneration && _isCurrent(_generation)) {
        setState(() => _savingFeatureId = null);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    if (_loading) return const CatchLoadingIndicator();
    if (_error case final error?) {
      return CatchLocalizedErrorBanner(
        error,
        onRetry: () => _reload(clearMutationError: true),
      );
    }
    final choices = _review?.choices ?? const <EventAssignmentFeatureChoice>[];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        CatchText(
          l.eventMatchingDisclosure,
          variant: CatchTextVariant.supporting,
        ),
        gapH12,
        CatchText(
          l.eventMatchingCoverageNote,
          variant: CatchTextVariant.supporting,
        ),
        if (_mutationError case final error?) ...[
          gapH12,
          CatchLocalizedErrorBanner(
            error,
            onRetry: () => _reload(clearMutationError: true),
          ),
        ],
        if (_saved) ...[
          gapH12,
          CatchText(
            l.eventMatchingSaved,
            variant: CatchTextVariant.supportingStrong,
          ),
        ],
        gapH12,
        if (choices.isEmpty)
          CatchText(
            l.eventMatchingNoChoices,
            variant: CatchTextVariant.supporting,
          ),
        for (final choice in choices) ...[
          CatchText(
            choice.questionLabel ?? l.eventMatchingUnavailable,
            variant: CatchTextVariant.supportingStrong,
          ),
          if (choice.answerLabel case final answer?)
            CatchText(
              '${l.eventMatchingAnswerLabel}: $answer',
              variant: CatchTextVariant.supporting,
            ),
          gapH8,
          CatchButton(
            label: choice.isGranted
                ? l.eventMatchingWithdraw
                : l.eventMatchingAllow,
            variant: choice.isGranted
                ? CatchButtonVariant.secondary
                : CatchButtonVariant.primary,
            onPressed:
                (_savingFeatureId == null &&
                    (choice.isGranted || choice.canGrant))
                ? () => _decide(choice)
                : null,
          ),
          gapH16,
        ],
      ],
    );
  }
}
