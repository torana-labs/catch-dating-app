import 'dart:async';

import 'package:catch_dating_app/event_success/domain/event_success_assignment.dart';
import 'package:catch_dating_app/event_success/domain/event_success_exclusion_ledger.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class EventSuccessExclusionAlertBanner extends StatefulWidget {
  const EventSuccessExclusionAlertBanner({
    super.key,
    required this.attendeeUids,
    required this.trackingStartedAtByUid,
    required this.assignments,
    required this.trackingStartedAt,
    required this.trackingEndedAt,
    required this.alertThreshold,
    required this.referenceNow,
  });

  final List<String> attendeeUids;
  final Map<String, DateTime> trackingStartedAtByUid;
  final List<EventSuccessAssignment> assignments;
  final DateTime trackingStartedAt;
  final DateTime trackingEndedAt;
  final Duration alertThreshold;
  final DateTime? referenceNow;

  @override
  State<EventSuccessExclusionAlertBanner> createState() =>
      _EventSuccessExclusionAlertBannerState();
}

class _EventSuccessExclusionAlertBannerState
    extends State<EventSuccessExclusionAlertBanner> {
  Timer? _thresholdTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _scheduleThreshold());
  }

  @override
  void didUpdateWidget(covariant EventSuccessExclusionAlertBanner oldWidget) {
    super.didUpdateWidget(oldWidget);
    _scheduleThreshold();
  }

  @override
  void dispose() {
    _thresholdTimer?.cancel();
    super.dispose();
  }

  DateTime get _now => widget.referenceNow ?? DateTime.now();

  EventSuccessExclusionLedgerSnapshot _snapshot() =>
      buildEventSuccessExclusionLedger(
        attendeeUids: widget.attendeeUids,
        assignments: widget.assignments,
        trackingStartedAt: widget.trackingStartedAt,
        trackingStartedAtByUid: widget.trackingStartedAtByUid,
        trackingEndedAt: widget.trackingEndedAt,
        now: _now,
        alertThreshold: widget.alertThreshold,
      );

  void _scheduleThreshold() {
    _thresholdTimer?.cancel();
    if (!mounted || widget.referenceNow != null) return;
    final delay = _snapshot().nextAlertDelay;
    if (delay == null) return;
    _thresholdTimer = Timer(delay + CatchMotion.eventSuccessThresholdTick, () {
      if (!mounted) return;
      setState(() {});
      _scheduleThreshold();
    });
  }

  @override
  Widget build(BuildContext context) {
    final alertCount = _snapshot().alertEntries.length;
    if (alertCount == 0) return const SizedBox.shrink();
    final thresholdMinutes = widget.alertThreshold.inMinutes;
    return Semantics(
      liveRegion: true,
      child: CatchSurface(
        duration: Duration.zero,
        radius: CatchRadius.none,
        backgroundColor: CatchTokens.of(context).surface,
        child: Padding(
          padding: CatchInsets.pageHorizontal.copyWith(
            top: CatchSpacing.s3,
            bottom: CatchSpacing.s2,
          ),
          child: CatchBanner(
            key: const ValueKey('event_success.exclusion_alert'),
            icon: CatchIcons.findPerson,
            tone: CatchBannerTone.warning,
            title: context.l10n.eventSuccessControlRoomExclusionAlertTitle,
            message: context.l10n.eventSuccessControlRoomExclusionAlertBody(
              count: alertCount,
              minutes: thresholdMinutes,
            ),
          ),
        ),
      ),
    );
  }
}
