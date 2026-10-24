// Default categories (SPEC §8). Names are editable by the user; `systemKey` marks the ones
// the importer and reports rely on. Icons are lucide names, checked against lucide-react 1.61.

export interface SeedCategory {
  name: string;
  icon: string;
  systemKey?: string;
  children?: SeedCategory[];
}

export const DEFAULT_CATEGORY_ICON = "circle-dashed";

export const EXPENSE_CATEGORIES: SeedCategory[] = [
  {
    name: "Food & Drinks",
    icon: "utensils",
    children: [
      { name: "Cafe", icon: "coffee" },
      { name: "Restaurant", icon: "chef-hat" },
      { name: "Groceries", icon: "shopping-basket" },
    ],
  },
  {
    name: "Transport",
    icon: "car",
    children: [
      { name: "Fuel", icon: "fuel" },
      { name: "Taxi & Ride", icon: "car-taxi-front" },
      { name: "Public transit", icon: "train-front" },
      { name: "Parking", icon: "square-parking" },
      { name: "Maintenance", icon: "wrench" },
    ],
  },
  {
    name: "Housing",
    icon: "house",
    children: [
      { name: "Rent", icon: "key-round" },
      { name: "Home repair", icon: "hammer" },
      { name: "Furniture", icon: "armchair" },
      { name: "Home service", icon: "sparkles" },
    ],
  },
  {
    name: "Bills",
    icon: "receipt",
    children: [
      { name: "Electricity", icon: "zap" },
      { name: "Water", icon: "droplet" },
      { name: "Phone", icon: "smartphone" },
      { name: "Internet", icon: "wifi" },
    ],
  },
  {
    name: "Shopping",
    icon: "shopping-bag",
    children: [
      { name: "Clothes", icon: "shirt" },
      { name: "Shoes", icon: "footprints" },
      { name: "Electronics", icon: "headphones" },
      { name: "Accessories", icon: "gem" },
    ],
  },
  {
    name: "Personal care",
    icon: "sparkle",
    children: [
      { name: "Laundry", icon: "washing-machine" },
      { name: "Haircut", icon: "scissors" },
      { name: "Toiletries", icon: "spray-can" },
    ],
  },
  {
    name: "Health",
    icon: "heart-pulse",
    children: [
      { name: "Medical", icon: "stethoscope" },
      { name: "Medicine", icon: "pill" },
      { name: "Sports", icon: "dumbbell" },
    ],
  },
  {
    name: "Entertainment",
    icon: "clapperboard",
    children: [
      { name: "Games", icon: "gamepad-2" },
      { name: "Movies", icon: "film" },
      { name: "Subscriptions", icon: "repeat" },
    ],
  },
  {
    name: "Gifts & Donations",
    icon: "gift",
    children: [
      { name: "Funeral", icon: "flower" },
      { name: "Wedding", icon: "heart" },
      { name: "Charity", icon: "hand-heart" },
    ],
  },
  {
    name: "Travel",
    icon: "plane",
    children: [
      { name: "Hotel", icon: "bed" },
      { name: "Flights", icon: "plane-takeoff" },
    ],
  },
  {
    name: "Education",
    icon: "graduation-cap",
    children: [
      { name: "Books", icon: "book-open" },
      { name: "Courses", icon: "school" },
    ],
  },
  { name: "Investment", icon: "trending-up" },
  { name: "Lottery", icon: "ticket" },
  { name: "Fees & Charges", icon: "landmark" },
  { name: "Other", icon: "circle-ellipsis", systemKey: "other-expense" },
];

export const INCOME_CATEGORIES: SeedCategory[] = [
  { name: "Salary", icon: "banknote", systemKey: "salary" },
  { name: "Bonus", icon: "award" },
  { name: "Interest", icon: "percent", systemKey: "interest" },
  {
    name: "Cashback",
    icon: "badge-percent",
    systemKey: "cashback",
    children: [
      { name: "Credit card", icon: "credit-card" },
      { name: "Other", icon: "circle-ellipsis", systemKey: "cashback-other" },
    ],
  },
  { name: "Gift", icon: "gift" },
  { name: "Sales", icon: "store" },
  { name: "Other income", icon: "circle-ellipsis", systemKey: "other-income" },
];
