class ChatsSearchHeaderController {
  ChatsSearchHeaderController() : _searchOpen = false;

  bool _searchOpen;

  bool get searchOpen => _searchOpen;

  bool isSearchActive(String query) => _searchOpen || query.trim().isNotEmpty;

  void setExpanded(bool expanded) {
    _searchOpen = expanded;
  }

  bool closeAfterSubmitted(String value) {
    if (value.trim().isNotEmpty || !_searchOpen) return false;
    _searchOpen = false;
    return true;
  }

  bool closeAfterFocusChanged({required bool focused, required String query}) {
    if (focused || !_searchOpen || query.trim().isNotEmpty) return false;
    _searchOpen = false;
    return true;
  }
}
