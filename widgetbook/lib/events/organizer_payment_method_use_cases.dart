import 'package:catch_dating_app/payments/presentation/organizer_payment_method_sheet.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/page_preview.dart';

@widgetbook.UseCase(
  name: 'Quote with and without a refund deadline',
  type: OrganizerPaymentMethodSheet,
  path: '[P1 product surfaces]/Events/Booking',
)
Widget organizerPaymentMethodSheetPreview(BuildContext context) =>
    WidgetbookScrollCatalogFrame(
      title: 'Payment page',
      catalogId: 'event.organizer_payment_method',
      children: [
        WidgetbookPageStateCard(
          label: 'Refundable until a deadline',
          child: WidgetbookContentFrame(
            child: OrganizerPaymentMethodSheet(
              amountPaise: 50000,
              currency: 'INR',
              refundDeadline: DateTime(2026, 11, 1, 19),
            ),
          ),
        ),
        const WidgetbookPageStateCard(
          label: 'No refund deadline',
          child: WidgetbookContentFrame(
            child: OrganizerPaymentMethodSheet(
              amountPaise: 12550,
              currency: 'INR',
            ),
          ),
        ),
      ],
    );
