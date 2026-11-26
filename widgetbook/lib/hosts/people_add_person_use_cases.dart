import 'package:catch_dating_app/hosts/people/add_person_body.dart';
import 'package:catch_dating_app/hosts/people/add_person_screen.dart';
import 'package:catch_test_support/design_fixtures/host_operations_fixtures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

// Add person, opened from People: the name, a mobile number or email, and
// an optional private note.

const _path = '[P1 product surfaces]/Host/People';

@widgetbook.UseCase(name: 'Empty form', type: HostAddPersonScreen, path: _path)
Widget hostAddPersonScreenUseCase(BuildContext context) => ProviderScope(
  child: HostAddPersonScreen(
    organizerId: HostOperationsFixtures.primaryOrganizer.id,
  ),
);

@widgetbook.UseCase(
  name: 'No way to reach them',
  type: HostAddPersonBody,
  path: _path,
)
Widget hostAddPersonBodyMissingContactUseCase(BuildContext context) =>
    HostAddPersonBody(
      formKey: GlobalKey<FormState>(),
      noteFormKey: GlobalKey<FormState>(),
      name: TextEditingController(text: 'Maya Kapoor'),
      phone: TextEditingController(),
      email: TextEditingController(),
      note: TextEditingController(),
      contactMethodMissing: true,
      onContactMethodChanged: () {},
      onSubmit: () {},
    );

@widgetbook.UseCase(name: 'Adding', type: HostAddPersonBody, path: _path)
Widget hostAddPersonBodyBusyUseCase(BuildContext context) => HostAddPersonBody(
  formKey: GlobalKey<FormState>(),
  noteFormKey: GlobalKey<FormState>(),
  name: TextEditingController(text: 'Maya Kapoor'),
  phone: TextEditingController(text: '+919876543210'),
  email: TextEditingController(),
  note: TextEditingController(text: 'Came with the Thursday run group.'),
  busy: true,
  onContactMethodChanged: () {},
  onSubmit: () {},
);
