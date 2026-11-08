import 'package:catch_dating_app/hosts/live/formats/formats_crawl_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// Changing a stop on the night, in a contained sheet: the new place and
/// its address, the message everyone booked will get, and Change and tell
/// everyone.
///
/// The sheet holds only the text being typed; the screen sends the change.
class HostFormatsCrawlChangeSheet extends StatefulWidget {
  const HostFormatsCrawlChangeSheet({
    super.key,
    required this.stop,
    required this.number,
    required this.onChange,
    this.sending = false,
  });

  /// The stop as tonight runs it now.
  final HostFormatsStop stop;

  /// Its place on the route, counted from one.
  final int number;

  /// Sends the new title, address and the message everyone gets.
  final void Function(String title, String? address, String message) onChange;
  final bool sending;

  @override
  State<HostFormatsCrawlChangeSheet> createState() =>
      _HostFormatsCrawlChangeSheetState();
}

class _HostFormatsCrawlChangeSheetState
    extends State<HostFormatsCrawlChangeSheet> {
  late String _title = widget.stop.stop.title;
  late String _address = widget.stop.address ?? '';

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final title = _title.trim();
    final address = _address.trim();
    final place = address.isEmpty
        ? title
        : l10n.hostFormatsMovePlace(stop: title, address: address);
    final message = l10n.hostFormatsStopChangedMessage(
      number: widget.number,
      place: place,
    );
    final canSend = !widget.sending && title.isNotEmpty;
    return CatchSheet.contained(
      key: const ValueKey<String>('formats-crawl-change-sheet'),
      title: l10n.hostFormatsStopChangeTitle(number: widget.number),
      footer: CatchButton(
        key: const ValueKey<String>('formats-crawl-change-send'),
        label: l10n.hostFormatsStopChangeSend,
        fullWidth: true,
        status: widget.sending
            ? CatchButtonStatus.loading
            : CatchButtonStatus.idle,
        onPressed: canSend
            ? () => widget.onChange(
                title,
                address.isEmpty ? null : address,
                message,
              )
            : null,
      ),
      child: CatchStack(
        gap: CatchStackGap.g16,
        children: [
          CatchSection(
            dividers: CatchSectionPlacement.none,
            children: [
              CatchField.input(
                key: const ValueKey<String>('formats-crawl-change-title'),
                copy: catchFieldCopy(l10n),
                title: l10n.hostFormatsStopChangePlace,
                contractExemption: 'A crawl stop name, capped at 80.',
                initialValue: _title,
                maxLength: 80,
                onChanged: (value) => setState(() => _title = value),
              ),
              CatchField.input(
                key: const ValueKey<String>('formats-crawl-change-address'),
                copy: catchFieldCopy(l10n),
                title: l10n.hostFormatsStopChangeAddress,
                contractExemption: 'A crawl stop address, capped at 200.',
                initialValue: _address,
                maxLength: 200,
                onChanged: (value) => setState(() => _address = value),
              ),
            ],
          ),
          CatchChatBubble(
            text: message,
            variant: CatchChatBubbleVariant.host,
            format: CatchFormat.nightsOut,
          ),
        ],
      ),
    );
  }
}
