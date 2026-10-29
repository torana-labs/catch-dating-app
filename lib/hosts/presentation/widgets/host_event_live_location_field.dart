import 'dart:async';

import 'package:catch_dating_app/contexts/events/data/event_live_position_service.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/route_event_plan.dart';
import 'package:catch_dating_app/core/device_location.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class HostEventLiveLocationField extends ConsumerStatefulWidget {
  const HostEventLiveLocationField({
    super.key,
    required this.event,
    this.clock = DateTime.now,
  });

  final Event event;
  final DateTime Function() clock;

  @override
  ConsumerState<HostEventLiveLocationField> createState() =>
      _HostEventLiveLocationFieldState();
}

class _HostEventLiveLocationFieldState
    extends ConsumerState<HostEventLiveLocationField>
    with WidgetsBindingObserver {
  StreamSubscription<EventLivePositionSample>? _subscription;
  bool _sharing = false;
  bool _pending = false;
  bool _publishing = false;
  Object? _error;
  DateTime? _lastPublishedAt;
  late final EventLivePositionPublisher _publisher;

  @override
  void initState() {
    super.initState();
    _publisher = ref.read(eventLivePositionPublisherProvider);
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state != AppLifecycleState.resumed && _sharing) {
      unawaited(_stopSharing());
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    unawaited(_subscription?.cancel());
    if (_sharing) {
      unawaited(_publisher.stop(eventId: widget.event.id));
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final policy = widget.event.eventFormat.routePlan?.liveTrackingPolicy;
    if (policy == null || !policy.enabled) return const SizedBox.shrink();
    final helperText = switch (_error) {
      DeviceLocationFailure.servicesDisabled =>
        context.l10n.hostEventLiveLocationServicesDisabled,
      DeviceLocationFailure.permissionDenied ||
      DeviceLocationFailure.permissionDeniedForever =>
        context.l10n.hostEventLiveLocationPermissionDenied,
      final Object _ => context.l10n.hostEventLiveLocationFailed,
      null =>
        _sharing
            ? context.l10n.hostEventLiveLocationActive
            : context.l10n.hostEventLiveLocationPrivacy,
    };
    return CatchFieldLanes.single(
      child: CatchField.toggle(
        copy: catchFieldCopy(context.l10n),
        key: const ValueKey<String>('host_event_live_location_toggle'),
        title: context.l10n.hostEventLiveLocationTitle,
        body: context.l10n.hostEventLiveLocationBody,
        icon: CatchIcons.location,
        value: _sharing,
        status: _pending ? CatchFieldStatus.saving : CatchFieldStatus.idle,
        helperText: helperText,
        contractExemption:
            'Explicit foreground-only operational sharing backed by a '
            'server-owned short-lived event position document.',
        onChanged: _pending
            ? null
            : (sharing) =>
                  unawaited(sharing ? _startSharing() : _stopSharing()),
      ),
    );
  }

  Future<void> _startSharing() async {
    setState(() {
      _pending = true;
      _error = null;
    });
    final result = await ref.read(deviceLocationProvider.notifier).request();
    if (!mounted) return;
    final location = result.location;
    if (location == null) {
      setState(() {
        _pending = false;
        _error = result.failure ?? DeviceLocationFailure.unavailable;
      });
      return;
    }
    try {
      await _publisher.publish(
        eventId: widget.event.id,
        position: EventLivePositionSample(
          latitude: location.latitude,
          longitude: location.longitude,
        ),
      );
      _lastPublishedAt = widget.clock();
      await _subscription?.cancel();
      _subscription = ref
          .read(eventLivePositionStreamGatewayProvider)
          .watch()
          .listen(
            (position) => unawaited(_publish(position)),
            onError: (Object error, StackTrace stackTrace) {
              if (!mounted) return;
              setState(() => _error = error);
            },
          );
      if (!mounted) return;
      setState(() {
        _sharing = true;
        _pending = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _pending = false;
        _error = error;
      });
    }
  }

  Future<void> _publish(EventLivePositionSample position) async {
    if (!_sharing || _publishing) return;
    final now = widget.clock();
    final lastPublishedAt = _lastPublishedAt;
    if (lastPublishedAt != null &&
        now.difference(lastPublishedAt) <
            CatchMotion.liveLocationPublishThrottle) {
      return;
    }
    _publishing = true;
    try {
      await _publisher.publish(eventId: widget.event.id, position: position);
      _lastPublishedAt = now;
    } catch (error) {
      if (mounted) setState(() => _error = error);
    } finally {
      _publishing = false;
    }
  }

  Future<void> _stopSharing() async {
    setState(() {
      _pending = true;
      _error = null;
    });
    await _subscription?.cancel();
    _subscription = null;
    try {
      await _publisher.stop(eventId: widget.event.id);
      if (!mounted) return;
      setState(() {
        _sharing = false;
        _pending = false;
        _lastPublishedAt = null;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _sharing = false;
        _pending = false;
        _error = error;
      });
    }
  }
}
