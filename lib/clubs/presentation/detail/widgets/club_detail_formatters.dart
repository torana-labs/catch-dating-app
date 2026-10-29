import 'package:catch_dating_app/contexts/organizers/domain/club.dart';

String clubEstablishedLabel(Club club) {
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
  final month = months[(club.createdAt.month - 1).clamp(0, 11)];
  return '$month ${club.createdAt.year}';
}
