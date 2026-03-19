export const MOCK_TASKS = [
  {
    id: "task-101",
    taskDescription:
      "Configured Supabase database schema, established foreign keys, and tested the Google OAuth Context provider.",
    categoryId: "IT-BE-01",
    loggedByName: "Sean Soriano",
    status: "COMPLETE",
    priority: "HIGH",
    createdAt: new Date().toISOString(),
  },
  {
    id: "task-102",
    taskDescription:
      "Drafted the HR Master Log wireframes. Need to figure out the best way to display the date picker for payroll filtering.",
    categoryId: "IT-FE-02",
    loggedByName: "Sean Soriano",
    status: "INCOMPLETE",
    priority: "MEDIUM",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "task-103",
    taskDescription: "Meeting.",
    categoryId: "GEN-00",
    loggedByName: "Sean Soriano",
    status: "REJECTED",
    priority: "LOW",
    createdAt: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: "task-104",
    taskDescription:
      "Implemented login page UI and integrated Tailwind styles.",
    categoryId: "IT-FE-02",
    loggedByName: "Mikael Gutierrez",
    status: "INCOMPLETE",
    priority: "HIGH",
    createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
  },
  {
    id: "task-105",
    taskDescription: "Set up email notifications for booking confirmations.",
    categoryId: "IT-BE-01",
    loggedByName: "John Lorenz Malsi",
    status: "COMPLETE",
    priority: "MEDIUM",
    createdAt: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
  },
  {
    id: "task-106",
    taskDescription: "Review mobile layout responsiveness for dashboard page.",
    categoryId: "IT-FE-02",
    loggedByName: "Sean Soriano",
    status: "INCOMPLETE",
    priority: "LOW",
    createdAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
  },
  {
    id: "task-107",
    taskDescription: "Fix bug in task filtering logic on the HR panel.",
    categoryId: "IT-BE-01",
    loggedByName: "William Vera",
    status: "REJECTED",
    priority: "HIGH",
    createdAt: new Date(Date.now() - 432000000).toISOString(), // 5 days ago
  },
  {
    id: "task-108",
    taskDescription: "Add hover and focus states for buttons in design system.",
    categoryId: "IT-FE-02",
    loggedByName: "John Denzel Aldave",
    status: "COMPLETE",
    priority: "MEDIUM",
    createdAt: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
  },
  {
    id: "task-109",
    taskDescription: "Prepare database backup scripts for production server.",
    categoryId: "IT-BE-01",
    loggedByName: "Mikael Gutierrez",
    status: "INCOMPLETE",
    priority: "HIGH",
    createdAt: new Date(Date.now() - 604800000).toISOString(), // 7 days ago
  },
  {
    id: "task-110",
    taskDescription: "Test virtual tour integration for OLFU360 project.",
    categoryId: "IT-FE-02",
    loggedByName: "Sean Soriano",
    status: "COMPLETE",
    priority: "MEDIUM",
    createdAt: new Date(Date.now() - 864000000).toISOString(), // 10 days ago
  },
  {
    id: "task-111",
    taskDescription: "Update Supabase RLS policies for new tables.",
    categoryId: "IT-BE-01",
    loggedByName: "William Vera",
    status: "INCOMPLETE",
    priority: "HIGH",
    createdAt: new Date(Date.now() - 21600000).toISOString(), // 6 hours ago
  },
  {
    id: "task-112",
    taskDescription: "Design icon set for dashboard and sidebar components.",
    categoryId: "IT-FE-02",
    loggedByName: "John Lorenz Malsi",
    status: "COMPLETE",
    priority: "LOW",
    createdAt: new Date(Date.now() - 345600000).toISOString(), // 4 days ago
  },
  {
    id: "task-113",
    taskDescription: "Fix z-index issue with overlay in search input.",
    categoryId: "IT-FE-02",
    loggedByName: "Sean Soriano",
    status: "REJECTED",
    priority: "MEDIUM",
    createdAt: new Date(Date.now() - 5400000).toISOString(), // 1.5 hours ago
  },
  {
    id: "task-114",
    taskDescription:
      "Draft user permissions and roles document for HR approval.",
    categoryId: "GEN-00",
    loggedByName: "Mikael Gutierrez",
    status: "INCOMPLETE",
    priority: "HIGH",
    createdAt: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
  },
  {
    id: "task-115",
    taskDescription: "Optimize dashboard charts performance using memoization.",
    categoryId: "IT-FE-02",
    loggedByName: "John Denzel Aldave",
    status: "COMPLETE",
    priority: "MEDIUM",
    createdAt: new Date(Date.now() - 43200000).toISOString(), // 12 hours ago
  },
];
