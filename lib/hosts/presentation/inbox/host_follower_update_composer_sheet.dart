import 'package:catch_dating_app/contexts/organizers/data/organizer_callable_responses.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizer_posts_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_platform/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// Opens the route-specific composer for an organizer update to followers.
///
/// Signature of the post submission: the WhatsApp switch adds that channel.
typedef HostFollowerUpdateSubmit =
    Future<CreateOrganizerPostCallableResponse?> Function({
      required String requestId,
      required String text,
      required bool whatsapp,
    });

/// Returns true only after the callable accepts the post. Durable Home and
/// Activity delivery remains server-owned; dismissing the sheet returns false.
/// [whatsappAvailable] is true when the organiser's WhatsApp number and its
/// follower update template are ready; otherwise the switch stays off.
Future<bool> showHostFollowerUpdateComposer({
  required BuildContext context,
  required Organizer organizer,
  required int remainingQuota,
  required String Function() requestIdFactory,
  required HostFollowerUpdateSubmit onSubmitPost,
  bool whatsappAvailable = false,
}) async {
  final result = await showCatchBottomSheet<HostFollowerUpdatePosted>(
    context: context,
    builder: (_) => HostFollowerUpdateComposerSheet(
      organizer: organizer,
      remainingQuota: remainingQuota,
      requestIdFactory: requestIdFactory,
      onSubmitPost: onSubmitPost,
      whatsappAvailable: whatsappAvailable,
    ),
  );
  if (result != null && context.mounted) {
    final whatsapp = result.response?.whatsapp;
    showCatchNotice(
      context,
      whatsapp == null
          ? context.l10n.hostsHostOrganizerToolsCatchbuttonPostedToFollowers
          : context.l10n.hostFollowerUpdatePostedWhatsapp(
              count: whatsapp.queuedCount,
            ),
    );
  }
  return result != null;
}

/// What the composer returns once the callable accepted the post.
final class HostFollowerUpdatePosted {
  const HostFollowerUpdatePosted(this.response);

  final CreateOrganizerPostCallableResponse? response;
}

class HostFollowerUpdateComposerSheet extends StatefulWidget {
  const HostFollowerUpdateComposerSheet({
    super.key,
    required this.organizer,
    required this.remainingQuota,
    required this.requestIdFactory,
    required this.onSubmitPost,
    this.whatsappAvailable = false,
  });

  final Organizer organizer;
  final int remainingQuota;
  final String Function() requestIdFactory;
  final HostFollowerUpdateSubmit onSubmitPost;
  final bool whatsappAvailable;

  @override
  State<HostFollowerUpdateComposerSheet> createState() =>
      _HostFollowerUpdateComposerSheetState();
}

class _HostFollowerUpdateComposerSheetState
    extends State<HostFollowerUpdateComposerSheet> {
  final TextEditingController _controller = TextEditingController();
  Object? _error;
  bool _pending = false;
  bool _whatsapp = false;
  late String _requestId;

  @override
  void initState() {
    super.initState();
    _requestId = widget.requestIdFactory();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final text = _controller.text.trim();
    final canSubmit = !_pending && widget.remainingQuota > 0 && text.isNotEmpty;
    return CatchSheet.standard(
      title: context.l10n.hostsHostOrganizerToolsTitlePostToFollowers,
      subtitle: context.l10n
          .hostsHostOrganizerToolsSubtitleRemainingquotaOfWeeklyquotaPosts(
            remainingQuota: widget.remainingQuota,
            weeklyQuota: OrganizerPostsRepository.weeklyQuota,
          ),
      footer: CatchButton.sheet(
        role: CatchButtonEmphasis.commit,
        key: const ValueKey('host-follower-update-submit'),
        label: _pending
            ? context.l10n.hostsHostOrganizerToolsLabelPosting
            : context.l10n.hostsHostOrganizerToolsLabelPostUpdate,
        onPressed: canSubmit ? () => _submit(text) : null,
        status: (_pending) ? CatchButtonStatus.loading : CatchButtonStatus.idle,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CatchNotice(
            dismissLabel: context.l10n.coreCatchNoticeTooltipDismiss,
            notice: CatchNoticeData(
              id: 'host.follower-update.${widget.organizer.id}',
              title: context.l10n.hostSendsFollowerUpdateChannel,
              message: context.l10n.hostSendsFollowerUpdateDescription,
            ),
          ),
          gapH16,
          CatchFieldLanes.single(
            child: CatchField.input(
              copy: catchFieldCopy(context.l10n),
              key: const ValueKey('host-follower-update-text'),
              title: context.l10n.hostsHostOrganizerToolsTitleUpdate,
              contract: CatchContractConstraints
                  .createOrganizerPostCallablePayloadText,
              controller: _controller,
              placeholder: context
                  .l10n
                  .hostsHostOrganizerToolsPlaceholderShareARouteNote,
              keyboardType: TextInputType.multiline,
              textInputAction: TextInputAction.newline,
              textCapitalization: TextCapitalization.sentences,
              maxLines: 5,
              minLines: 3,
              helperText: context.l10n
                  .hostsHostOrganizerToolsHelpertextValue1CharactersLeft(
                    value1: 500 - _controller.text.length,
                  ),
              states: <WidgetState>{if (_pending) WidgetState.disabled},
              onChanged: (_) => setState(() {
                _requestId = widget.requestIdFactory();
              }),
            ),
          ),
          gapH12,
          CatchIndexRow(
            title: context.l10n.hostFollowerUpdateWhatsappToggle,
            subtitle: widget.whatsappAvailable
                ? context.l10n.hostFollowerUpdateWhatsappToggleBody
                : context.l10n.hostFollowerUpdateWhatsappUnavailable,
            onTap: null,
            trailing: CatchToggleInput(
              key: const ValueKey('host-follower-update-whatsapp'),
              value: widget.whatsappAvailable && _whatsapp,
              semanticLabel: context.l10n.hostFollowerUpdateWhatsappToggle,
              contractExemption:
                  'Adds whatsapp to the channels array sent with the post.',
              onChanged: widget.whatsappAvailable && !_pending
                  ? (value) => setState(() {
                      _whatsapp = value;
                      _requestId = widget.requestIdFactory();
                    })
                  : null,
            ),
          ),
          if (_error != null) ...[
            gapH10,
            CatchLegacyText(
              context.l10n.hostsHostOrganizerToolsTextCouldNotPostThis,
              variant: CatchLegacyTextVariant.supporting,
              color: CatchTokens.of(context).danger,
            ),
          ],
        ],
      ),
    );
  }

  Future<void> _submit(String text) async {
    if (_pending) return;
    setState(() {
      _pending = true;
      _error = null;
    });
    try {
      final response = await widget.onSubmitPost(
        requestId: _requestId,
        text: text,
        whatsapp: widget.whatsappAvailable && _whatsapp,
      );
      if (mounted) {
        Navigator.of(context).pop(HostFollowerUpdatePosted(response));
      }
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _pending = false;
        _error = error;
      });
    }
  }
}
