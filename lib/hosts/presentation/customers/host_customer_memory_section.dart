import 'dart:async';

import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/core/time_formatters.dart';
import 'package:catch_dating_app/hosts/domain/crm/host_audience_contact.dart';
import 'package:catch_dating_app/hosts/domain/crm/host_audience_contact_detail.dart';
import 'package:catch_dating_app/hosts/domain/crm/host_customer_memory.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customers_controller.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class HostCustomerMemoryPreview extends StatelessWidget {
  const HostCustomerMemoryPreview({
    super.key,
    required this.customer,
    required this.onOpenMemory,
  });

  final HostAudienceContactDetail customer;
  final VoidCallback onOpenMemory;

  @override
  Widget build(BuildContext context) => CatchSection.rows(
    key: const ValueKey('host-customer-memory-preview'),
    title: context.l10n.hostCustomersMemory,
    children: [
      CatchField.navigate(
        onActivate: onOpenMemory,
        content: CatchRecordLayout(
          title: customer.manualTags.isEmpty
              ? context.l10n.hostCustomersNotes
              : customer.manualTags.map((tag) => tag.label).join(' · '),
          description:
              customer.notes.firstOrNull?.body ??
              (customer.notesCoverage == HostCustomerHistoryCoverage.unavailable
                  ? context.l10n.hostCustomersNotesUnavailableBody
                  : context.l10n.hostCustomersNoNotes),
          icon: CatchIcons.editNoteOutlined,
        ),
      ),
    ],
  );
}

class HostCustomerMemorySection extends StatelessWidget {
  const HostCustomerMemorySection({
    super.key,
    required this.customer,
    required this.currentUid,
    required this.onEditTags,
    required this.onAddNote,
    required this.onEditNote,
  });

  final HostAudienceContactDetail customer;
  final String? currentUid;
  final VoidCallback onEditTags;
  final VoidCallback onAddNote;
  final ValueChanged<HostCustomerNote> onEditNote;

  @override
  Widget build(BuildContext context) {
    final notes = customer.notes;
    return CatchSectionList(
      key: const ValueKey('host-customer-memory'),
      emptyStateOmitted: true,
      children: [
        CatchSection.rows(
          title: context.l10n.hostCustomersManualTags,
          children: [
            CatchField.nav(
              copy: catchFieldCopy(context.l10n),
              key: const ValueKey('host-customer-edit-tags'),
              title: context.l10n.hostCustomersEditTags,
              body: customer.manualTags.isEmpty
                  ? context.l10n.hostCustomersNoManualTags
                  : customer.manualTags.map((tag) => tag.label).join(' · '),
              titleMaxLines: 3,
              bodyMaxLines: 8,
              onTap: onEditTags,
            ),
          ],
        ),
        CatchSection.rows(
          title: context.l10n.hostCustomersNotes,
          trailing: CatchButton.text(
            key: const ValueKey('host-customer-add-note'),
            label: context.l10n.hostCustomersAddNote,
            onPressed: onAddNote,
          ),
          children: [
            if (notes.isEmpty)
              CatchField.read(
                copy: catchFieldCopy(context.l10n),
                body:
                    customer.notesCoverage ==
                        HostCustomerHistoryCoverage.unavailable
                    ? context.l10n.hostCustomersNotesUnavailableBody
                    : context.l10n.hostCustomersNoNotes,
                bodyMaxLines: 6,
              ),
            for (final note in notes)
              CatchField.content(
                key: ValueKey('host-customer-note-${note.noteId}'),
                copy: catchFieldCopy(context.l10n),
                title: _noteAttribution(context, note, currentUid),
                body: note.body,
                titleMaxLines: 3,
                bodyMaxLines: 10,
                onTap: () => onEditNote(note),
              ),
            if (notes.isNotEmpty &&
                customer.notesCoverage ==
                    HostCustomerHistoryCoverage.unavailable)
              CatchField.read(
                copy: catchFieldCopy(context.l10n),
                bodyMaxLines: 6,
                body: context.l10n.hostCustomersNotesUnavailableBody,
              ),
            if (customer.notesTruncated)
              CatchField.read(
                copy: catchFieldCopy(context.l10n),
                bodyMaxLines: 6,
                body: context.l10n.hostCustomersNotesTruncated,
              ),
          ],
        ),
        CatchSection.content(
          child: CatchText(
            context.l10n.hostCustomersMemoryHelp,
            variant: CatchTextVariant.bodyS,
            color: CatchTokens.of(context).ink2,
          ),
        ),
      ],
    );
  }
}

class HostCustomerNoteSheet extends ConsumerStatefulWidget {
  const HostCustomerNoteSheet({super.key, required this.customer, this.note});

  final HostAudienceContactDetail customer;
  final HostCustomerNote? note;

  @override
  ConsumerState<HostCustomerNoteSheet> createState() =>
      _HostCustomerNoteSheetState();
}

class _HostCustomerNoteSheetState extends ConsumerState<HostCustomerNoteSheet> {
  late final TextEditingController _bodyController = TextEditingController(
    text: widget.note?.body,
  );
  bool _saving = false;

  @override
  void dispose() {
    _bodyController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => CatchSheet.standard(
    footer: CatchButton.sheet(
      role: CatchButtonEmphasis.commit,

      key: const ValueKey('host-customer-save-note'),
      label: context.l10n.hostCustomersSaveNote,
      status: (_saving) ? CatchButtonStatus.loading : CatchButtonStatus.idle,
      onPressed: _saving ? null : _save,
    ),
    title: widget.note == null
        ? context.l10n.hostCustomersAddNote
        : context.l10n.hostCustomersEditNote,
    subtitle: context.l10n.hostCustomersMemoryHelp,
    child: CatchFieldLanes.custom(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          CatchField.input(
            copy: catchFieldCopy(context.l10n),
            key: const ValueKey('host-customer-note-body'),
            title: context.l10n.hostCustomersNoteBody,
            contract: widget.note == null
                ? CatchContractConstraints
                      .createOrganizerContactNoteCallablePayloadBody
                : CatchContractConstraints
                      .mutateOrganizerContactNoteCallablePayloadBody,
            controller: _bodyController,
            minLines: 4,
            maxLines: 8,
            textCapitalization: TextCapitalization.sentences,
            autofocus: true,
          ),
        ],
      ),
    ),
  );

  Future<void> _save() async {
    final body = _bodyController.text.trim();
    if (_saving || body.isEmpty) return;
    setState(() => _saving = true);
    try {
      final controller = ref.read(hostCustomersControllerProvider);
      final note = widget.note;
      if (note == null) {
        await controller.createNote(
          organizerId: widget.customer.organizerId,
          contactId: widget.customer.contactId,
          body: body,
        );
      } else {
        await controller.editNote(
          organizerId: widget.customer.organizerId,
          contactId: widget.customer.contactId,
          note: note,
          body: body,
        );
      }
      if (mounted) Navigator.of(context).pop(true);
    } on Object catch (error) {
      if (mounted) {
        showCatchNoticeError(
          context,
          error,
          errorContext: AppErrorContext.club,
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }
}

class HostCustomerTagsSheet extends ConsumerStatefulWidget {
  const HostCustomerTagsSheet({super.key, required this.customer});

  final HostAudienceContactDetail customer;

  @override
  ConsumerState<HostCustomerTagsSheet> createState() =>
      _HostCustomerTagsSheetState();
}

class _HostCustomerTagsSheetState extends ConsumerState<HostCustomerTagsSheet> {
  static const _contactTagCap = 5;
  static const _vocabularyTagCap = 20;

  late final Set<String> _selectedIds = widget.customer.manualTags
      .map((tag) => tag.tagId)
      .toSet();
  final List<String> _newLabels = [];
  final TextEditingController _newTagController = TextEditingController();
  String? _error;
  bool _saving = false;

  List<HostManualTag> get _vocabulary {
    final byId = <String, HostManualTag>{
      for (final tag in widget.customer.manualTagVocabulary) tag.tagId: tag,
      for (final tag in widget.customer.manualTags) tag.tagId: tag,
    };
    final result = byId.values.toList(growable: false);
    result.sort((a, b) => a.label.compareTo(b.label));
    return result;
  }

  int get _selectionCount => _selectedIds.length + _newLabels.length;

  @override
  void dispose() {
    _newTagController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => CatchSheet.standard(
    footer: CatchButton.sheet(
      role: CatchButtonEmphasis.commit,

      key: const ValueKey('host-customer-save-tags'),
      label: context.l10n.hostCustomersSaveTags,
      status: (_saving) ? CatchButtonStatus.loading : CatchButtonStatus.idle,
      onPressed: _saving ? null : _save,
    ),
    title: context.l10n.hostCustomersTagSheetTitle,
    subtitle: context.l10n.hostCustomersTagSheetSubtitle,
    child: CatchFieldLanes.custom(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (_vocabulary.isNotEmpty)
            Wrap(
              spacing: CatchSpacing.s2,
              runSpacing: CatchSpacing.s2,
              children: [
                for (final tag in _vocabulary)
                  CatchChip.selectable(
                    key: ValueKey('host-customer-tag-choice-${tag.tagId}'),
                    label: tag.label,
                    leading: Icon(CatchIcons.editNoteOutlined),
                    selected: _selectedIds.contains(tag.tagId),
                    enabled:
                        _selectedIds.contains(tag.tagId) ||
                        _selectionCount < _contactTagCap,
                    accent: CatchTokens.of(context).ink2,
                    contractExemption:
                        'Manual tags are organizer-owned CRM vocabulary.',
                    onChanged: (selected) => _toggle(tag.tagId, selected),
                  ),
              ],
            ),
          if (_vocabulary.isNotEmpty) gapH16,
          CatchField.input(
            copy: catchFieldCopy(context.l10n),
            key: const ValueKey('host-customer-new-tag'),
            title: context.l10n.hostCustomersNewTag,
            contract: CatchContractConstraints
                .mutateOrganizerContactCallablePayloadManualTagsItems,
            controller: _newTagController,
            textCapitalization: TextCapitalization.sentences,
            textInputAction: TextInputAction.done,
            errorText: _error,
            onSubmitted: (_) => _addTag(),
          ),
          gapH8,
          CatchButton(
            label: context.l10n.hostCustomersAddTag,
            variant: CatchButtonVariant.secondary,
            size: CatchButtonSize.sm,
            onPressed: _selectionCount >= _contactTagCap ? null : _addTag,
          ),
          if (_newLabels.isNotEmpty) ...[
            gapH12,
            Wrap(
              spacing: CatchSpacing.s2,
              runSpacing: CatchSpacing.s2,
              children: [
                for (final label in _newLabels)
                  CatchChip.removable(
                    label: label,
                    tintColor: CatchTokens.of(context).raised,
                    inkColor: CatchTokens.of(context).ink,
                    onRemove: () => setState(() => _newLabels.remove(label)),
                  ),
              ],
            ),
          ],
        ],
      ),
    ),
  );

  void _toggle(String tagId, bool selected) {
    if (selected && _selectionCount >= _contactTagCap) {
      setState(() => _error = context.l10n.hostCustomersTagContactLimit);
      return;
    }
    setState(() {
      _error = null;
      if (selected) {
        _selectedIds.add(tagId);
      } else {
        _selectedIds.remove(tagId);
      }
    });
  }

  void _addTag() {
    final label = _newTagController.text.trim();
    if (label.isEmpty) return;
    if (_selectionCount >= _contactTagCap) {
      setState(() => _error = context.l10n.hostCustomersTagContactLimit);
      return;
    }
    final normalized = label.toLowerCase();
    for (final tag in _vocabulary) {
      if (tag.label.toLowerCase() == normalized) {
        setState(() {
          _selectedIds.add(tag.tagId);
          _newTagController.clear();
          _error = null;
        });
        return;
      }
    }
    if (_newLabels.any((value) => value.toLowerCase() == normalized)) {
      _newTagController.clear();
      return;
    }
    if (_vocabulary.length + _newLabels.length >= _vocabularyTagCap) {
      setState(() => _error = context.l10n.hostCustomersTagVocabularyLimit);
      return;
    }
    setState(() {
      _newLabels.add(label);
      _newTagController.clear();
      _error = null;
    });
  }

  Future<void> _save() async {
    if (_saving) return;
    setState(() => _saving = true);
    try {
      final labels = [
        for (final tag in _vocabulary)
          if (_selectedIds.contains(tag.tagId)) tag.label,
        ..._newLabels,
      ];
      await ref
          .read(hostCustomersControllerProvider)
          .mutateCustomer(
            organizerId: widget.customer.organizerId,
            contactId: widget.customer.contactId,
            expectedRevision: widget.customer.revision,
            manualTags: labels,
          );
      if (mounted) Navigator.of(context).pop(true);
    } on Object catch (error) {
      if (mounted) {
        showCatchNoticeError(
          context,
          error,
          errorContext: AppErrorContext.club,
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }
}

String _noteAttribution(
  BuildContext context,
  HostCustomerNote note,
  String? currentUid,
) {
  final date = AppTimeFormatters.shortDate(note.updatedAt);
  final attribution = currentUid != null && currentUid == note.authorUid
      ? context.l10n.hostCustomersNoteByYou(date: date)
      : context.l10n.hostCustomersNoteByTeam(date: date);
  return note.wasEdited
      ? '$attribution · ${context.l10n.hostCustomersNoteEdited}'
      : attribution;
}
