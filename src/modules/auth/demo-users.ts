export const orgId = "00000000-0000-4000-8000-000000000001";
export const demoUsers = [
  {
    id: "00000000-0000-4000-8000-000000000011",
    name: "Alex Morgan",
    role: "REQUESTER",
    email: "alex@example.test",
    description: "Propose an AI use and follow its review.",
  },
  {
    id: "00000000-0000-4000-8000-000000000012",
    name: "Jordan Lee",
    role: "REVIEWER",
    email: "jordan@example.test",
    description: "Review assigned uses and record decisions.",
  },
  {
    id: "00000000-0000-4000-8000-000000000013",
    name: "Sam Rivera",
    role: "ADMINISTRATOR",
    email: "sam@example.test",
    description: "Manage policy, routing, and organizational oversight.",
  },
  {
    id: "00000000-0000-4000-8000-000000000014",
    name: "Casey Taylor",
    role: "AUDITOR",
    email: "casey@example.test",
    description: "Read approved records and their audit history.",
  },
  {
    id: "00000000-0000-4000-8000-000000000015",
    name: "Taylor Chen",
    role: "REVIEWER",
    email: "taylor@example.test",
    description: "Review high-risk uses and executive exceptions.",
  },
] as const;
