export const paymentsService = {
  summary: ({ tenant }: { tenant: string }) => ({
    tenant,
    status: "stub",
    providers: ["stripe", "nets"],
    nextReconciliation: new Date().toISOString()
  })
};
