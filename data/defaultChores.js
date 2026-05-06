// 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
export const defaultChores = [
  { title: "Vacuum all floors",       room: "Whole House", schedule: "every 1 weeks",  dayOfWeek: 6 },
  { title: "Take out trash",          room: "Whole House", schedule: "every 1 weeks",  dayOfWeek: 3 },
  { title: "Mop hard floors",         room: "Whole House", schedule: "every 2 weeks",  dayOfWeek: 6 },
  { title: "Wipe counters & stovetop",room: "Kitchen",     schedule: "every 1 weeks",  dayOfWeek: 0 },
  { title: "Clean refrigerator",      room: "Kitchen",     schedule: "every 1 months", dayOfWeek: null },
  { title: "Clean toilets",           room: "Bathrooms",   schedule: "every 1 weeks",  dayOfWeek: 0 },
  { title: "Scrub shower & tub",      room: "Bathrooms",   schedule: "every 2 weeks",  dayOfWeek: 0 },
  { title: "Wipe sinks & mirrors",    room: "Bathrooms",   schedule: "every 1 weeks",  dayOfWeek: 0 },
  { title: "Change bed sheets",       room: "Bedroom",     schedule: "every 1 weeks",  dayOfWeek: 6 },
  { title: "Do laundry",              room: "Laundry",     schedule: "every 1 weeks",  dayOfWeek: 6 },
  { title: "Dust surfaces",           room: "Living Room", schedule: "every 2 weeks",  dayOfWeek: null },
];
