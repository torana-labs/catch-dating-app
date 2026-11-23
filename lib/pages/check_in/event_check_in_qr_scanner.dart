import 'package:catch_dating_app/contexts/bookings/domain/event_check_in_qr_payload.dart';
import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

enum EventCheckInQrScanResult {
  ignored,
  invalid,
  wrongEvent,
  printableJoinOnly,
  matchedVenueSession,

  /// One guest's ticket for this event; the door resolves it.
  matchedTicket,
}

class EventCheckInQrScan {
  const EventCheckInQrScan(
    this.result, {
    this.venueSessionToken,
    this.ticketCode,
  });

  final EventCheckInQrScanResult result;
  final String? venueSessionToken;
  final String? ticketCode;
}

EventCheckInQrScanResult classifyEventCheckInQrCode(
  String? rawValue, {
  required String eventId,
}) {
  return parseEventCheckInQrCode(rawValue, eventId: eventId).result;
}

EventCheckInQrScan parseEventCheckInQrCode(
  String? rawValue, {
  required String eventId,
}) {
  if (rawValue == null) {
    return const EventCheckInQrScan(EventCheckInQrScanResult.ignored);
  }
  final code = EventCheckInQrCode.tryParse(rawValue);
  if (code == null) {
    return const EventCheckInQrScan(EventCheckInQrScanResult.invalid);
  }
  if (code.eventId != eventId) {
    return const EventCheckInQrScan(EventCheckInQrScanResult.wrongEvent);
  }
  return switch (code) {
    EventVenueSessionQrPayload(:final venueSessionToken) => EventCheckInQrScan(
      EventCheckInQrScanResult.matchedVenueSession,
      venueSessionToken: venueSessionToken,
    ),
    EventTicketQrPayload(:final ticketCode) => EventCheckInQrScan(
      EventCheckInQrScanResult.matchedTicket,
      ticketCode: ticketCode,
    ),
    EventCheckInQrPayload() => const EventCheckInQrScan(
      EventCheckInQrScanResult.printableJoinOnly,
    ),
  };
}

class EventCheckInQrScanner extends StatefulWidget {
  const EventCheckInQrScanner({
    super.key,
    required this.eventId,
    required this.onResult,
  });

  final String eventId;
  final ValueChanged<EventCheckInQrScan> onResult;

  @override
  State<EventCheckInQrScanner> createState() => _EventCheckInQrScannerState();
}

class _EventCheckInQrScannerState extends State<EventCheckInQrScanner> {
  late final MobileScannerController _controller = MobileScannerController(
    formats: const [BarcodeFormat.qrCode],
  );
  bool _matched = false;

  /// The last ticket read, so a code held in front of the camera is handed
  /// on once rather than every frame. The door keeps scanning after it.
  String? _lastTicketCode;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MobileScanner(controller: _controller, onDetect: _handleCapture);
  }

  void _handleCapture(BarcodeCapture capture) {
    if (_matched) return;
    for (final barcode in capture.barcodes) {
      final scan = parseEventCheckInQrCode(
        barcode.rawValue,
        eventId: widget.eventId,
      );
      if (scan.result == EventCheckInQrScanResult.ignored) continue;
      if (scan.result == EventCheckInQrScanResult.matchedTicket) {
        if (scan.ticketCode == _lastTicketCode) continue;
        _lastTicketCode = scan.ticketCode;
      }
      if (scan.result == EventCheckInQrScanResult.matchedVenueSession) {
        _matched = true;
      }
      widget.onResult(scan);
      if (_matched) return;
    }
  }
}
