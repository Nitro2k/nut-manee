export const strings = {
  appName: "NoMoney",
  today: "Today",
  yesterday: "Yesterday",
  loadError: "Couldn't open the database. Close and reopen the app.",

  // Privacy
  showAmounts: "Show amounts",
  hiddenAmount: "Hidden amount, tap to show",
  privacy: "Privacy",
  privacyHint: "Hidden amounts show as ฿ ••••. Tap one to show it, tap again to hide.",
  autoHideOnBackground: "Hide again when leaving the app",
  autoHideHint: "Also blurs the app in the app switcher.",

  // Entry sheet
  addEntry: "Add entry",
  editEntry: "Edit entry",
  entrySheetHint: "Type the amount, pick a category, then save.",
  type: "Type",
  save: "Save",
  saved: "Saved",
  saveFailed: "Couldn't save. Your entry is still here, try again.",
  delete: "Delete",
  undo: "Undo",
  entryDeleted: "Entry deleted",
  note: "Note",
  notePlaceholder: "Note (optional)",
  pickDate: "Pick a date",
  general: "General",
  goToMonth: "Go to month",
  savedTo: (month: string) => `Saved to ${month}`,

  // Home
  home: "Home",
  reports: "Reports",
  search: "Search",
  more: "More",
  add: "Add",
  previousMonth: "Previous month",
  nextMonth: "Next month",
  noEntries: "No entries this month",
  noEntriesHint: "Tap + to add one.",
  comingSoon: "Coming in a later update.",
  swipeToDelete: "Swipe left to delete",

  // Offline / install
  updateAvailable: "Update available",
  reload: "Reload",
  installTitle: "Add NoMoney to your Home Screen",
  installBody:
    "Tap Share, then Add to Home Screen. In a normal Safari tab, your data can be cleared after 7 days without use.",
  dismiss: "Dismiss",

  // Storage
  storage: "Storage",
  storageUsed: "Used on this device",
  storageUsedHint: "Your data plus the app's offline files.",
  storageOf: (used: string, quota: string) => `${used} of ${quota}`,
  storageUnknown: "Unknown",
  entries: "Entries",
  storagePersisted: "Protected from clearing",
  storagePersistedYes: "Yes",
  storagePersistedNo: "Not yet",
  storagePersistedHint: "Add to Home Screen so the browser keeps your data when space runs low.",

  // Summary
  income: "Income",
  expense: "Expense",
  net: "Net",
  balance: "Balance",
} as const;
