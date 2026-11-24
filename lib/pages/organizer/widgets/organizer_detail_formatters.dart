import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';

String organizerEstablishedLabel(Organizer organizer) {
  const months = <String>[
    'JAN',
    'FEB',
    'MAR',
    'APR',
    'MAY',
    'JUN',
    'JUL',
    'AUG',
    'SEP',
    'OCT',
    'NOV',
    'DEC',
  ];
  final month = months[(organizer.createdAt.month - 1).clamp(0, 11)];
  return '$month ${organizer.createdAt.year}';
}
