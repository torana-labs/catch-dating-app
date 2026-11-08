import 'package:catch_dating_app/contexts/bookings/domain/event_check_in_qr_payload.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:qr_flutter/qr_flutter.dart';

/// A guest's ticket QR for the door to scan, with the line under it.
class EventTicketCodeQr extends StatelessWidget {
  const EventTicketCodeQr({super.key, required this.ticket});

  final EventTicketQrPayload ticket;

  @override
  Widget build(BuildContext context) => CatchStack(
    children: [
      Center(
        child: QrImageView(
          key: const ValueKey<String>('event-ticket-code-qr'),
          data: ticket.encode(),
          size: CatchLayout.eventSuccessVenueQrExtent,
          backgroundColor: CatchTokens.editorialWhite,
          semanticsLabel: context.l10n.eventTicketCodeQrLabel,
        ),
      ),
      CatchText(
        context.l10n.eventTicketCodeHint,
        tone: CatchTextTone.secondary,
        align: TextAlign.center,
      ),
    ],
  );
}
