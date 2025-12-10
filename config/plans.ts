export const plans = {
  starter: {
    name: "Starter",
    price: 79,
    features: {
      maxAgents: 5,
      maxMinutesPerMonth: 1000,
      maxIntegrations: 2,
      storageGB: 10,
    },
    features_list: [
      "5 AI agents",
      "1,000 minutes/month",
      "2 provider integrations",
      "10GB storage",
      "Email support",
      "Basic analytics",
    ],
  },
  professional: {
    name: "Professional",
    price: 249,
    features: {
      maxAgents: 25,
      maxMinutesPerMonth: 5000,
      maxIntegrations: -1,
      storageGB: 50,
    },
    features_list: [
      "25 AI agents",
      "5,000 minutes/month",
      "Unlimited integrations",
      "50GB storage",
      "Priority support",
      "Custom branding",
      "Advanced analytics",
      "API access",
    ],
  },
  enterprise: {
    name: "Enterprise",
    price: null,
    features: {
      maxAgents: -1,
      maxMinutesPerMonth: -1,
      maxIntegrations: -1,
      storageGB: -1,
    },
    features_list: [
      "Unlimited agents",
      "Custom minute pools",
      "All integrations",
      "Dedicated infrastructure",
      "24/7 support",
      "White-label + custom domain",
      "SLA guarantees",
      "Dedicated account manager",
    ],
  },
}

export type PlanTier = keyof typeof plans
