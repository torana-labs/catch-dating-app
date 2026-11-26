import 'dart:async';

import 'package:catch_dating_app/hosts/people/add_person_body.dart';
import 'package:catch_dating_app/hosts/people/add_person_state.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customers_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// Add person, opened from People: the host adds someone by name with a
/// mobile number or email and an optional private note.
///
/// Add validates the fields, then runs the existing create-contact command
/// through [hostCustomersControllerProvider] and returns the new person to
/// People, which refreshes its list. Back is blocked while the person is
/// being added; a failure keeps every value for another try.
class HostAddPersonScreen extends ConsumerStatefulWidget {
  const HostAddPersonScreen({super.key, required this.organizerId});

  final String organizerId;

  @override
  ConsumerState<HostAddPersonScreen> createState() =>
      _HostAddPersonScreenState();
}

class _HostAddPersonScreenState extends ConsumerState<HostAddPersonScreen> {
  final _formKey = GlobalKey<FormState>();
  final _noteFormKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _email = TextEditingController();
  final _note = TextEditingController();
  bool _saving = false;
  bool _contactMethodMissing = false;

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _email.dispose();
    _note.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return PopScope(
      canPop: !_saving,
      child: CatchRoot(
        child: CatchScreen(
          key: const ValueKey<String>('host-add-person-screen'),
          topBar: CatchTopBar(
            variant: CatchTopBarVariant.tool,
            title: l10n.hostCustomersAddTitle,
            back: CatchTopBarBack(
              label: l10n.hostPeopleBackToPeople,
              onPressed: _saving
                  ? null
                  : () => Navigator.of(context).maybePop(),
            ),
          ),
          body: HostAddPersonBody(
            formKey: _formKey,
            noteFormKey: _noteFormKey,
            name: _name,
            phone: _phone,
            email: _email,
            note: _note,
            busy: _saving,
            contactMethodMissing: _contactMethodMissing,
            onContactMethodChanged: () {
              if (_contactMethodMissing) {
                setState(() => _contactMethodMissing = false);
              }
            },
            onSubmit: () => unawaited(_submit()),
          ),
          dock: CatchDock(
            primary: CatchDockAction(
              label: l10n.hostCustomersAdd,
              loading: _saving,
              onPressed: _saving ? null : () => unawaited(_submit()),
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _submit() async {
    if (_saving) return;
    final formValid = _formKey.currentState?.validate() ?? false;
    final draftNote = _note.text.trim();
    // The note's contract requires text only when a note is sent.
    final noteValid =
        draftNote.isEmpty || (_noteFormKey.currentState?.validate() ?? true);
    final draft = HostAddPersonDraft.typed(
      name: _name.text,
      phone: _phone.text,
      email: _email.text,
      note: _note.text,
    );
    setState(() => _contactMethodMissing = !draft.hasContactMethod);
    if (!formValid || !noteValid || !draft.valid) return;
    setState(() => _saving = true);
    try {
      // provider-graph: ownership-widget-async:_HostAddPersonScreenState._submit:await:hostCustomersControllerProvider.createCustomer watch CAT156 -- Adding a person runs the existing create-contact command; the screen holds only its local saving flag and pops the created person to People, which refreshes. Move the flag into a mutation in the CAT156 migration.
      final customer = await ref
          .read(hostCustomersControllerProvider)
          .createCustomer(
            organizerId: widget.organizerId,
            displayName: draft.name,
            phoneE164: draft.phone,
            email: draft.email,
            initialNote: draft.note,
          );
      if (mounted) context.pop(customer);
    } on Object catch (error) {
      if (mounted) {
        showCatchNoticeError(
          context,
          error,
          errorContext: AppErrorContext.customer,
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }
}
